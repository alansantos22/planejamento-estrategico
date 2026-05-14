# Backend — Planejamento Estratégico

Backend Node.js + Fastify que (1) persiste o plano e o lead em **MySQL** (`mysql2`) e (2) orquestra agentes de IA via **Gemini** (`@google/genai`).

## Stack

- **Runtime:** Node 20+
- **Web:** Fastify 5 + CORS + rate-limit
- **Banco:** MySQL 8 (pool `mysql2/promise`, colunas `JSON` nativas)
- **IA:** Google Gemini 2.5 Pro (raciocínio) + Gemini 2.5 Flash (tarefas estruturadas)

## Instalação (dev)

```bash
cd server
cp .env.example .env       # preencha credenciais do MySQL e (opcional) GEMINI_API_KEY
npm install
npm run db:init            # cria as tabelas plans + leads (idempotente)
npm start
```

Servidor sobe em `http://localhost:3001`. As tabelas também são criadas automaticamente na primeira requisição, então `db:init` é opcional em dev.

> Persistência **não** depende da chave do Gemini — ela só é necessária para os agentes de IA (botão "Assistente, me dê ideias").

## Endpoints

### Plano (estado completo do wizard)
- `GET    /plans/:id` — retorna o plano (404 se não existir)
- `PUT    /plans/:id` — upsert (body = JSON do estado)
- `DELETE /plans/:id` — apaga o plano

O frontend usa `id = "default"` por instalação anônima; quando o usuário fornece e-mail no wizard, o id passa a ser derivado dele.

### Leads (captura distribuída pelo wizard)
- `GET    /leads/:planId` — busca lead pelo plano
- `PUT    /leads/:planId` — upsert parcial (chame a cada passo concluído)
- `DELETE /leads/:planId`
- `GET    /leads` — listagem admin, protegida por header `x-admin-token` (apenas se `LEADS_ADMIN_TOKEN` estiver definido no .env)

Body aceito no `PUT /leads/:planId` (todos opcionais; só sobrescreve o que vier):
```json
{
  "personName":  "Alan",
  "companyName": "Unli Studios",
  "email":       "alan@unli.studio",
  "phone":       "+5511999999999",
  "status":      "in_progress",
  "lastStep":    "company",
  "utmSource":   "google",
  "utmMedium":   "cpc",
  "utmCampaign": "lancamento",
  "referrer":    "https://..."
}
```

### Diagnóstico e IA
- `GET  /health` — healthcheck
- `GET  /agents` — lista dos agentes disponíveis
- `POST /agents/:name` — invoca um agente com o payload relevante

## Agentes disponíveis

| Agente | Modelo | O que faz |
|---|---|---|
| `personaDetector`     | Gemini Flash | Sugere 2-3 personas/ICP |
| `idealPersonaCoach`   | Gemini Flash | Critica personas em rascunho |
| `swotDetector`        | Gemini Flash | Propõe itens de SWOT |
| `problemDetector`     | Gemini Pro   | Aponta problemas/riscos não capturados |
| `competitorResearcher`| Gemini Flash | Lista concorrentes prováveis |
| `productIdeaGenerator`| Gemini Pro   | Sugere ideias de produto/oferta |
| `pricingBenchmark`    | Gemini Flash | Estima faixa de preço de mercado |
| `marketSizer`         | Gemini Flash | Estima TAM/SAM/SOM |
| `salesFunnelArchitect`| Gemini Pro   | Desenha funil adequado ao segmento |
| `insightsCoach`       | Gemini Pro   | Revisão crítica do plano completo |

Tarefas estruturadas usam `responseMimeType: 'application/json'` para garantir JSON válido na resposta.

## Variáveis de ambiente

| Var | Default | Descrição |
|---|---|---|
| `GEMINI_API_KEY`        | —     | Obrigatória só pros agentes de IA |
| `PORT`                  | 3001  | Porta HTTP |
| `ALLOWED_ORIGINS`       | `*`   | CORS — lista separada por vírgula |
| `LOG_LEVEL`             | info  | nível do logger do Fastify |
| `DB_HOST`               | 127.0.0.1 | Host MySQL |
| `DB_PORT`               | 3306  | Porta MySQL |
| `DB_USER`               | root  | Usuário MySQL |
| `DB_PASSWORD`           | —     | Senha MySQL |
| `DB_NAME`               | planejamento_estrategico | Nome do schema |
| `DB_CONNECTION_LIMIT`   | 10    | Tamanho do pool |
| `LEADS_ADMIN_TOKEN`     | —     | Habilita `GET /leads` se definido |

## Deploy em VPS

Roteiro resumido (Ubuntu 22.04 / 24.04):

```bash
# 1. dependências do sistema
sudo apt update && sudo apt install -y nginx mysql-server
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 2. banco
sudo mysql -e "CREATE DATABASE planejamento_estrategico CHARACTER SET utf8mb4;"
sudo mysql -e "CREATE USER 'planejamento'@'localhost' IDENTIFIED BY 'TROQUE_AQUI';"
sudo mysql -e "GRANT ALL ON planejamento_estrategico.* TO 'planejamento'@'localhost'; FLUSH PRIVILEGES;"

# 3. app
cd /var/www
sudo git clone <repo>.git planejamento-estrategico
cd planejamento-estrategico/server
sudo cp .env.example .env
sudo nano .env               # preenche DB_PASSWORD, GEMINI_API_KEY, ALLOWED_ORIGINS
sudo npm install --omit=dev
sudo npm run db:init

# 4. process manager (systemd)
sudo tee /etc/systemd/system/planejamento.service > /dev/null <<'EOF'
[Unit]
Description=Planejamento Estrategico API
After=network.target mysql.service

[Service]
Type=simple
WorkingDirectory=/var/www/planejamento-estrategico/server
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl enable --now planejamento

# 5. nginx (reverse proxy + SSL via certbot)
# arquivo /etc/nginx/sites-available/planejamento com proxy_pass http://127.0.0.1:3001
```

Adicione SSL com `sudo certbot --nginx -d seu-dominio.com`. O `closePool()` em `SIGTERM`/`SIGINT` garante shutdown limpo no `systemctl restart`.
