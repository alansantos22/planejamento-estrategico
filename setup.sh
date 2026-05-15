#!/usr/bin/env bash
#
# setup.sh — Instalação inicial (bootstrap) do Planejamento Estratégico
#            numa VPS Ubuntu limpa (22.04 / 24.04).
#
# Faz, de uma vez só, os Passos 1 a 15 do DEPLOY.md:
#   - atualiza o sistema e configura o firewall
#   - cria o usuário "deploy" (o app NUNCA roda como root)
#   - instala Node 20, MySQL, Nginx, Git e Certbot
#   - cria o banco e o usuário do MySQL
#   - clona o repositório, gera as chaves de criptografia e escreve o .env
#   - sobe o backend como serviço systemd
#   - compila o frontend e configura o Nginx
#   - emite o certificado HTTPS (Let's Encrypt)
#
# COMO USAR (numa VPS recém-criada, logado como root):
#
#   wget https://raw.githubusercontent.com/alansantos22/planejamento-estrategico/main/setup.sh
#   bash setup.sh
#
# O script faz algumas perguntas no início e depois roda sozinho.
# É idempotente: pode ser rodado de novo sem quebrar nada.
#
set -euo pipefail

# ============================ CONFIGURAÇÃO ============================
APP_DIR="/var/www/planejamento-estrategico"
DEFAULT_REPO="https://github.com/alansantos22/planejamento-estrategico.git"
DB_NAME="planejamento_estrategico"
DB_USER="planejamento"
SERVICE="planejamento"
# ======================================================================

# --- cores -------------------------------------------------------------
C_OK=$'\e[32m'; C_INFO=$'\e[36m'; C_WARN=$'\e[33m'; C_ERR=$'\e[31m'; C_OFF=$'\e[0m'
log()  { echo; echo "${C_INFO}━━━ $* ━━━${C_OFF}"; }
ok()   { echo "${C_OK}✔${C_OFF} $*"; }
warn() { echo "${C_WARN}!${C_OFF} $*"; }
die()  { echo "${C_ERR}✖ $*${C_OFF}" >&2; exit 1; }

# --- precisa ser root --------------------------------------------------
[ "$(id -u)" -eq 0 ] || die "Rode este script como root: sudo bash setup.sh"

# helper: roda um comando como o usuário 'deploy'
as_deploy() { sudo -u deploy bash -lc "$*"; }

# ======================================================================
#  PERGUNTAS
# ======================================================================
log "Configuração inicial — responda as perguntas abaixo"

read -rp "Domínio do site (ex.: seudominio.com): " DOMAIN
[ -n "$DOMAIN" ] || die "O domínio é obrigatório."

read -rp "E-mail para o certificado HTTPS (avisos de expiração): " EMAIL
[ -n "$EMAIL" ] || die "O e-mail é obrigatório."

read -rp "URL do repositório Git [$DEFAULT_REPO]: " REPO_URL
REPO_URL="${REPO_URL:-$DEFAULT_REPO}"

read -rsp "Senha para o novo usuário 'deploy' (pra você logar depois): " DEPLOY_PASS
echo
[ -n "$DEPLOY_PASS" ] || die "A senha do usuário 'deploy' é obrigatória."

read -rp "Chave da API do Gemini (Enter pra pular — só pros agentes de IA): " GEMINI_API_KEY

echo
echo "Resumo:"
echo "  Domínio ........: $DOMAIN"
echo "  E-mail .........: $EMAIL"
echo "  Repositório ....: $REPO_URL"
echo "  Gemini .........: $([ -n "$GEMINI_API_KEY" ] && echo 'configurada' || echo '(pulada)')"
read -rp "Confirma e inicia a instalação? [s/N] " CONFIRM
[[ "$CONFIRM" =~ ^[sSyY]$ ]] || die "Cancelado pelo usuário."

# segredos gerados automaticamente
DB_PASSWORD="$(openssl rand -hex 16)"
ENCRYPTION_KEY="$(openssl rand -hex 32)"
HMAC_KEY="$(openssl rand -hex 32)"
LEADS_ADMIN_TOKEN="$(openssl rand -hex 16)"

# ======================================================================
#  1. SISTEMA + FIREWALL
# ======================================================================
log "1/12 — Atualizando o sistema"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
ok "Sistema atualizado."

log "2/12 — Instalando pacotes (git, nginx, mysql, certbot, curl)"
apt-get install -y git nginx mysql-server certbot python3-certbot-nginx curl ufw
ok "Pacotes instalados."

log "3/12 — Configurando o firewall (UFW)"
ufw allow OpenSSH      >/dev/null
ufw allow 'Nginx Full' >/dev/null
ufw --force enable     >/dev/null
ok "Firewall ativo (SSH + HTTP/HTTPS liberados)."

# ======================================================================
#  2. USUÁRIO DEPLOY
# ======================================================================
log "4/12 — Criando o usuário 'deploy'"
if id deploy &>/dev/null; then
  ok "Usuário 'deploy' já existe — mantendo."
else
  adduser --disabled-password --gecos "" deploy
  usermod -aG sudo deploy
  ok "Usuário 'deploy' criado e adicionado ao grupo sudo."
fi
# define a senha informada
echo "deploy:$DEPLOY_PASS" | chpasswd
# copia as chaves SSH do root pro deploy (pra você logar com a mesma chave)
if [ -f /root/.ssh/authorized_keys ]; then
  mkdir -p /home/deploy/.ssh
  cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
  chown -R deploy:deploy /home/deploy/.ssh
  chmod 700 /home/deploy/.ssh
  chmod 600 /home/deploy/.ssh/authorized_keys
fi
ok "Acesso do usuário 'deploy' configurado."

# ======================================================================
#  3. NODE.JS 20
# ======================================================================
log "5/12 — Instalando o Node.js 20"
if command -v node &>/dev/null && [ "$(node -v | cut -d. -f1 | tr -d v)" -ge 20 ]; then
  ok "Node $(node -v) já instalado."
else
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
  ok "Node $(node -v) instalado."
fi

# ======================================================================
#  4. MYSQL — BANCO E USUÁRIO
# ======================================================================
log "6/12 — Configurando o MySQL (banco + usuário)"
systemctl enable --now mysql
mysql <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL
ok "Banco '${DB_NAME}' e usuário '${DB_USER}' prontos."

# ======================================================================
#  5. (opcional) SWAP — pra VPS com pouca RAM não falhar no build
# ======================================================================
MEM_KB="$(awk '/MemTotal/{print $2}' /proc/meminfo)"
if [ "$MEM_KB" -lt 1500000 ] && [ ! -f /swapfile ]; then
  log "RAM baixa detectada — criando 1 GB de swap"
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ok "Swap de 1 GB ativo."
fi

# ======================================================================
#  6. CLONAR O CÓDIGO
# ======================================================================
log "7/12 — Baixando o código do projeto"
mkdir -p "$(dirname "$APP_DIR")"
if [ -d "$APP_DIR/.git" ]; then
  chown -R deploy:deploy "$APP_DIR"
  as_deploy "cd '$APP_DIR' && git fetch origin main && git reset --hard origin/main"
  ok "Repositório já existia — atualizado."
else
  rm -rf "$APP_DIR"
  as_deploy "git clone '$REPO_URL' '$APP_DIR'"
  ok "Repositório clonado em $APP_DIR."
fi
chown -R deploy:deploy "$APP_DIR"

# ======================================================================
#  7. BACKEND — .env, dependências, banco
# ======================================================================
log "8/12 — Configurando o backend"
cat > "$APP_DIR/server/.env" <<ENV
# Gerado automaticamente pelo setup.sh
GEMINI_API_KEY=${GEMINI_API_KEY}

PORT=3001
ALLOWED_ORIGINS=https://${DOMAIN},https://www.${DOMAIN}
LOG_LEVEL=info

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}
DB_CONNECTION_LIMIT=10

LEADS_ADMIN_TOKEN=${LEADS_ADMIN_TOKEN}

ENCRYPTION_KEY=${ENCRYPTION_KEY}
HMAC_KEY=${HMAC_KEY}
ENCRYPTION_KEY_VERSION=1

TRUST_PROXY=true
NODE_ENV=production
ENV
chown deploy:deploy "$APP_DIR/server/.env"
chmod 600 "$APP_DIR/server/.env"

as_deploy "cd '$APP_DIR/server' && npm ci --omit=dev"
as_deploy "cd '$APP_DIR/server' && npm run db:init"
ok "Backend configurado e tabelas criadas."

# ======================================================================
#  8. SERVIÇO SYSTEMD
# ======================================================================
log "9/12 — Criando o serviço systemd"
cat > /etc/systemd/system/${SERVICE}.service <<UNIT
[Unit]
Description=Planejamento Estrategico API
After=network.target mysql.service

[Service]
Type=simple
User=deploy
WorkingDirectory=${APP_DIR}/server
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now ${SERVICE}
ok "Serviço '${SERVICE}' ativo."

# ======================================================================
#  9. FRONTEND — build
# ======================================================================
log "10/12 — Compilando o frontend"
echo "VITE_BACKEND_URL=https://${DOMAIN}" > "$APP_DIR/frontend/.env.production"
chown deploy:deploy "$APP_DIR/frontend/.env.production"
as_deploy "cd '$APP_DIR/frontend' && npm ci && npm run build"
ok "Frontend compilado em frontend/dist."

# ======================================================================
#  10. NGINX
# ======================================================================
log "11/12 — Configurando o Nginx"
cat > /etc/nginx/sites-available/${SERVICE} <<NGINX
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    root ${APP_DIR}/frontend/dist;
    index index.html;

    location ~ ^/(plans|agents|health|leads|session|public)(/|\$) {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX
ln -sf /etc/nginx/sites-available/${SERVICE} /etc/nginx/sites-enabled/${SERVICE}
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
ok "Nginx configurado e recarregado."

# regra de sudo: 'deploy' pode reiniciar os serviços sem senha (pro deploy.sh)
cat > /etc/sudoers.d/deploy-planejamento <<SUDO
deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart ${SERVICE}, /usr/bin/systemctl reload nginx
SUDO
chmod 440 /etc/sudoers.d/deploy-planejamento
chmod +x "$APP_DIR/deploy.sh" 2>/dev/null || true

# ======================================================================
#  11. HTTPS (Let's Encrypt)
# ======================================================================
log "12/12 — Emitindo o certificado HTTPS"
if certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" \
     --non-interactive --agree-tos -m "$EMAIL" --redirect; then
  ok "HTTPS ativo."
  HTTPS_OK=1
else
  warn "Certbot falhou (DNS ainda não aponta pra esta VPS?)."
  warn "O site funciona em HTTP por enquanto. Quando o DNS propagar, rode:"
  warn "  sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
  HTTPS_OK=0
fi

# ======================================================================
#  FIM
# ======================================================================
echo
echo "${C_OK}╔══════════════════════════════════════════════════════════╗${C_OFF}"
echo "${C_OK}║              INSTALAÇÃO CONCLUÍDA  🎉                     ║${C_OFF}"
echo "${C_OK}╚══════════════════════════════════════════════════════════╝${C_OFF}"
echo
echo "  Site .................: https://${DOMAIN}"
echo "  Backend (interno) ....: http://127.0.0.1:3001"
echo
echo "${C_WARN}  GUARDE estes segredos (também estão em server/.env):${C_OFF}"
echo "  Senha do usuário deploy : (a que você digitou)"
echo "  Senha do MySQL .........: ${DB_PASSWORD}"
echo "  ENCRYPTION_KEY .........: ${ENCRYPTION_KEY}"
echo "  HMAC_KEY ...............: ${HMAC_KEY}"
echo "  LEADS_ADMIN_TOKEN ......: ${LEADS_ADMIN_TOKEN}"
echo
echo "  Próximos deploys (atualizações):"
echo "    ssh deploy@<IP> ; cd ${APP_DIR} ; ./deploy.sh"
echo
[ "${HTTPS_OK}" -eq 0 ] && echo "${C_WARN}  ⚠ Configure o HTTPS quando o DNS propagar (veja acima).${C_OFF}"
echo
