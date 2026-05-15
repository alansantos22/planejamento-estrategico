#!/usr/bin/env bash
#
# deploy.sh — Deploy automatizado do Planejamento Estratégico na VPS.
#
# O que ele faz, em ordem:
#   1. Busca a última versão da branch main no GitHub
#   2. Atualiza o código local (git reset --hard, descarta alterações locais)
#   3. Se o backend mudou:  npm ci  +  db:init  +  reinicia o serviço
#   4. Se o frontend mudou: npm ci  +  npm run build  +  recarrega o Nginx
#   5. Faz um healthcheck pra confirmar que subiu
#
# Uso (rodar como o usuário "deploy", NUNCA como root):
#   ./deploy.sh            publica a versão atual da branch main agora
#   ./deploy.sh --auto     só publica se houver commits novos (ideal pra cron)
#   ./deploy.sh --force    reinstala e recompila tudo, mesmo sem mudanças
#
set -euo pipefail

# ============================ CONFIGURAÇÃO ============================
APP_DIR="/var/www/planejamento-estrategico"   # onde o projeto está clonado
BRANCH="main"                                 # branch que vai pra produção
SERVICE="planejamento"                         # nome do serviço systemd
HEALTH_URL="http://127.0.0.1:3001/health"      # endpoint pra checar se subiu
# ======================================================================

# --- cores pra deixar o log legível -----------------------------------
if [ -t 1 ]; then
  C_OK=$'\e[32m'; C_INFO=$'\e[36m'; C_WARN=$'\e[33m'; C_ERR=$'\e[31m'; C_OFF=$'\e[0m'
else
  C_OK=''; C_INFO=''; C_WARN=''; C_ERR=''; C_OFF=''
fi
log()  { echo "${C_INFO}▶${C_OFF} $*"; }
ok()   { echo "${C_OK}✔${C_OFF} $*"; }
warn() { echo "${C_WARN}!${C_OFF} $*"; }
die()  { echo "${C_ERR}✖ $*${C_OFF}" >&2; exit 1; }

# --- lê os argumentos --------------------------------------------------
AUTO=0
FORCE=0
for arg in "$@"; do
  case "$arg" in
    --auto)  AUTO=1 ;;
    --force) FORCE=1 ;;
    *) die "Argumento desconhecido: $arg (use --auto ou --force)" ;;
  esac
done

# --- segurança: não rodar como root -----------------------------------
if [ "$(id -u)" -eq 0 ]; then
  die "Não rode este script como root. Use o usuário 'deploy'."
fi

# --- backend muda? frontend muda? --------------------------------------
deploy_backend()  { echo "$CHANGED" | grep -qE '^server/'; }
deploy_frontend() { echo "$CHANGED" | grep -qE '^frontend/'; }

main() {
  cd "$APP_DIR" || die "Pasta do projeto não encontrada: $APP_DIR"

  # ---- 1. checar o que há de novo no GitHub --------------------------
  log "Buscando atualizações da branch '$BRANCH'…"
  git fetch --quiet origin "$BRANCH"

  local OLD NEW
  OLD="$(git rev-parse HEAD)"
  NEW="$(git rev-parse "origin/$BRANCH")"

  if [ "$OLD" = "$NEW" ] && [ "$FORCE" -eq 0 ]; then
    if [ "$AUTO" -eq 1 ]; then
      ok "Nada novo — já está na versão mais recente. Saindo."
      exit 0
    fi
    warn "Já está na versão mais recente. Use --force pra recompilar mesmo assim."
    exit 0
  fi

  # ---- 2. atualizar o código -----------------------------------------
  log "Atualizando código: ${OLD:0:7} → ${NEW:0:7}"
  git reset --hard "origin/$BRANCH" --quiet
  git clean -fd --quiet                       # remove arquivos não rastreados
  ok "Código atualizado."

  # quais arquivos mudaram entre a versão antiga e a nova
  CHANGED="$(git diff --name-only "$OLD" "$NEW")"
  if [ "$FORCE" -eq 1 ]; then
    CHANGED=$'server/\nfrontend/'             # --force: trata tudo como alterado
    warn "Modo --force: backend e frontend serão reconstruídos."
  fi

  # ---- 3. backend ----------------------------------------------------
  if deploy_backend; then
    log "Mudanças no backend detectadas — atualizando…"
    cd "$APP_DIR/server"
    npm ci --omit=dev
    npm run db:init
    log "Reiniciando o serviço '$SERVICE'…"
    sudo systemctl restart "$SERVICE"
    ok "Backend atualizado e reiniciado."
  else
    log "Backend sem mudanças — pulando."
  fi

  # ---- 4. frontend ---------------------------------------------------
  if deploy_frontend; then
    log "Mudanças no frontend detectadas — recompilando…"
    cd "$APP_DIR/frontend"
    npm ci
    npm run build
    log "Recarregando o Nginx…"
    sudo systemctl reload nginx
    ok "Frontend recompilado e publicado."
  else
    log "Frontend sem mudanças — pulando."
  fi

  # ---- 5. healthcheck ------------------------------------------------
  log "Verificando se o backend respondeu…"
  local tries=0
  until curl -fsS "$HEALTH_URL" >/dev/null 2>&1; do
    tries=$((tries + 1))
    [ "$tries" -ge 10 ] && die "Backend não respondeu no healthcheck ($HEALTH_URL). Veja: sudo journalctl -u $SERVICE -n 50"
    sleep 1
  done

  ok "Deploy concluído com sucesso — versão ${NEW:0:7} no ar. 🚀"
}

main "$@"
