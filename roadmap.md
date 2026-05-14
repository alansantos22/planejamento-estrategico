# Roadmap — Fases B, C, D, E

Documento autocontido para retomar o trabalho em **uma nova sessão de IA** sem precisar reler conversas antigas. Resume decisões já tomadas, estado atual e o que falta implementar em cada fase.

> Para o roadmap original e Fase 1 sistêmica detalhada, ver `todo.md`. Para a estrutura do projeto e instruções de uso, ver `README.md` e `server/README.md`. Memórias internas em `memory/`.

---

## 📍 Onde estamos (Fase A — concluída em 2026-05-14)

- Backend Node 20 + Fastify 5 + **MySQL 8** (`mysql2/promise` pool, colunas JSON nativas).
- IA via **Google Gemini** (`@google/genai`): `gemini-2.5-flash` nos 6 agentes estruturados; `gemini-2.5-pro` em 4 agentes de raciocínio (`insightsCoach`, `salesFunnelArchitect`, `problemDetector`, `productIdeaGenerator`).
- Tabelas:
  - `plans (id VARCHAR(64) PK, data JSON, created_at, updated_at)`
  - `leads (id BIGINT AI PK, plan_id VARCHAR(64) UNIQUE, person_name, company_name, email, phone, status ENUM('in_progress','completed','abandoned'), last_step, utm_source, utm_medium, utm_campaign, referrer, created_at, updated_at)`
- Endpoints do lead já prontos no backend: `PUT/GET/DELETE /leads/:planId` (validação básica, upsert parcial) e `GET /leads` admin (gated por `LEADS_ADMIN_TOKEN`).
- Frontend ainda **não usa** os endpoints de lead — é o que a Fase B vai amarrar.

---

## 🟧 Fase B — Lead capture distribuído nos 5 primeiros passos

### Regra de ouro

A coleta de lead **nunca** pode parecer formulário de captação. Cada campo tem uma justificativa contextual que faz o usuário entender por que pedimos. Telefone é **opcional**. Quem abandona no meio fica como lead `in_progress`/`abandoned` na tabela `leads`.

### Mapa dos 5 primeiros passos (novo)

| Passo | Etapa atual | Etapa nova | Campo de lead capturado | Justificativa visível ao usuário |
|---|---|---|---|---|
| 1 | (nenhum) | **Boas-vindas** | `personName` | "Como te chamo?" + pergunta-isca ("qual seu maior desafio hoje?") |
| 2 | Company | **Sua empresa** | `companyName` | Parte natural do contexto |
| 3 | Company (cont.) | **Contexto** (porte, faturamento, tempo, região) | — | Sem campo de lead, alivia |
| 4 | (nenhum) | **Receba o plano** | `email` | "Para onde enviamos seu plano consolidado quando terminar?" |
| 5 | (nenhum) | **Identidade da empresa** | `phone` (opcional) | "Para personalizar o perfil da sua empresa no final" |

A partir do passo 6, o wizard segue como hoje (Vision → ICP → Mercado → ...).

### Implementação no frontend

Arquivos a tocar:
- `js/frameworks.js` — quebrar o framework `company` em **5 frameworks separados** (`welcome`, `companyName`, `companyContext`, `emailDelivery`, `companyIdentity`) OU manter `company` e adicionar 4 frameworks novos antes/depois. Recomendo: criar 4 frameworks novos e enxugar `company` para conter só "Contexto" (passo 3).
- `js/storage.js` — adicionar campos novos em `defaultState()`:
  ```js
  lead: {
    personName: '',
    email: '',
    phone: '',
    challengeHint: '',          // resposta da pergunta-isca do passo 1
    utm: { source:'', medium:'', campaign:'' },
    referrer: ''
  }
  ```
  (companyName já existe em `state.company.name`)
- `js/app.js` — após `save()` em cada um dos 5 primeiros passos, disparar `Leads.upsert(planId, fields)` para o backend.
- Novo arquivo `js/leads.js`:
  ```js
  // Lead client — chama PUT /leads/:planId
  const Leads = (() => {
    const PLAN_ID = 'default';
    function backendUrl() { /* mesma lógica de storage.js */ }
    function capture() {
      // Lê UTMs do window.location.search e document.referrer
      // Persiste em sessionStorage só pra reusar entre passos da mesma visita
    }
    async function upsert(fields) {
      const url = `${backendUrl()}/leads/${PLAN_ID}`;
      return fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
        keepalive: true
      });
    }
    async function markCompleted() {
      return upsert({ status: 'completed' });
    }
    return { capture, upsert, markCompleted };
  })();
  ```
- No `app.js`, chamar `Leads.capture()` na primeira pageview e `Leads.upsert({lastStep: stepId, ...})` ao avançar.
- No final do wizard (botão "Concluir" no dashboard), chamar `Leads.markCompleted()`.

### Detecção de abandono

`beforeunload`/`visibilitychange` já é usado em `storage.js` para salvar o plano. Adicionar no mesmo listener:
```js
fetch(`${backendUrl()}/leads/${PLAN_ID}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'abandoned', lastStep: currentStep }),
  keepalive: true
});
```
Só marcar `abandoned` se status atual for `in_progress` E `currentStep < ultimoPasso`.

### Endpoints já prontos no backend (não precisa mexer)

- `PUT /leads/:planId` aceita body `{ personName, companyName, email, phone, status, lastStep, utmSource, utmMedium, utmCampaign, referrer }` — todos opcionais, faz upsert parcial.
- `GET /leads/:planId` — debug.
- `GET /leads?status=...&limit=&offset=` — admin, exige header `x-admin-token` igual ao env `LEADS_ADMIN_TOKEN`.

### Validações UX

- E-mail: regex client-side (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) + feedback inline. Não bloquear avanço se inválido — só destacar.
- Telefone: máscara `+55 (XX) XXXXX-XXXX` opcional (usar inputmask ou regex puro, não puxar lib).
- Nome da pessoa: trim, mínimo 2 chars, máximo 160.
- Aceitar passo 1 sem nome preenchido (não bloquear, mas pedir gentilmente).

### Checklist Fase B

- [x] Quebrar fluxo de "Empresa" em 4 novos passos + manter contexto
- [x] `js/leads.js` (cliente do endpoint)
- [x] Capturar UTMs e referrer na 1ª pageview
- [x] Disparar upsert a cada passo concluído
- [x] Marcar `completed` no fim, `abandoned` no `beforeunload` (se status ainda for `in_progress`)
- [x] Estilo: removeria a sensação de formulário — usar layout conversacional ("Oi! Como te chamo?") nos passos 1, 4, 5

---

## 🟧 Fase C — Score de Saúde Estratégica

Implementação 100% determinística (sem IA), em `js/scoring.js`. Selo + breakdown no dashboard atual e depois reusado no Perfil da Empresa (Fase D).

### Fundamentação científica/consagrada

- **Balanced Scorecard** — Kaplan & Norton, *HBR 1992*. 4 perspectivas (Financeira, Cliente, Processos, Aprendizado). Inspira o agrupamento por dimensões.
- **EOS Company Checkup** — Gino Wickman, *Traction*. 20 perguntas em 6 componentes, escala 1–5. Inspira o formato de saída amigável.
- **Strategic Readiness Score** — Kaplan & Norton, 2004. Foco em alinhamento entre seções → mapeia direto na "coerência cruzada" que já temos.
- **PIMS** — Buzzell & Gale, 1987 (3.000+ empresas). Market share + qualidade percebida → ROI. Justifica o peso de "Diferenciação Competitiva".
- **VRIO** — Barney, 1991. Avaliação de recursos como vantagem competitiva → inspira critérios pra forças da SWOT.

### Composição

Cada dimensão retorna 0–100. Score final é média ponderada, menos penalidades.

| Dimensão | Peso | De onde vêm os pontos |
|---|---|---|
| **Clareza Estratégica**     | 20% | `vision.purpose/core/vision3to5/bigDream` preenchidos (5pts cada) + `pricing.statement` completo (40pts) + `product.focusReasoning` preenchido (20pts) |
| **Conhecimento de Mercado** | 25% | `ICP Fit` médio das personas (40pts) + sanity check TAM/SAM/SOM passa (20pts) + matriz competitiva com ≥3 concorrentes e ≥4 critérios (40pts) |
| **Capacidade de Execução**  | 20% | % de OKRs com KRs mensuráveis (regex de número/%/data, já existe) (40pts) + % de ações 5W2H com prazo definido (40pts) + nº mínimo de 3 ações (20pts) |
| **Saúde Comercial**         | 25% | LTV/CAC em faixa ideal (≥3:1) (40pts) + pricing positioning coerente com proposta (30pts) + funil reverso bate com meta (`leadsNecessários ≤ leadsAtuais × 1.5`) (30pts) |
| **Diferenciação Competitiva** | 10% | Média da diferença `selfScores − concorrentes` normalizada para 0–100. Já existe em `Scoring.competitionScore` |

### Penalidades

- **−5 pontos** por seção obrigatória vazia (Visão, ICP sem persona primária, SWOT vazia, OKRs sem objetivo, Ações vazia).
- **−3 pontos** por alerta de coerência cruzada não resolvido (já listamos em "Pontos de Atenção").
- **−2 pontos** se SOM > 5% do SAM em 12 meses.

### Classificação

| Faixa | Nota | Mensagem |
|---|---|---|
| ≥ 90  | A+ | Plano sólido e coerente |
| 80–89 | A  | Bom, com 1–2 pontos de atenção |
| 65–79 | B  | Funcional, falta refino |
| 50–64 | C  | Lacunas significativas |
| < 50  | D  | Plano incipiente ou inconsistente |

### API da função

```js
Scoring.strategicHealthScore(state) → {
  total: 78,                    // 0–100
  grade: 'B',
  breakdown: {
    clareza: 82,
    mercado: 70,
    execucao: 85,
    comercial: 60,
    diferenciacao: 90
  },
  penalties: [
    { reason: 'Seção SWOT vazia', points: -5 },
    { reason: 'SOM > 5% do SAM', points: -2 }
  ],
  explanations: [
    'Sua Saúde Comercial puxa o score pra baixo — LTV/CAC está em 1.4 (faixa crítica). Considere reduzir CAC ou aumentar retenção.',
    ...
  ]
}
```

### UI

- **Selo no dashboard:** círculo grande com nota (A+/A/B/C/D) + número (78) ao centro, label "Saúde Estratégica" embaixo. Cor por faixa (verde para A/A+, amarelo para B, laranja para C, vermelho para D).
- **Breakdown horizontal:** 5 barras horizontais (0–100) com nome da dimensão, número, e cor.
- **"Pontos a melhorar":** lista expansível com top-3 explicações (do array `explanations`).

### Checklist Fase C

Implementado tanto no frontend vanilla quanto no Vue.

- [x] `Scoring.strategicHealthScore(state)` em `js/scoring.js` (vanilla) e `frontend/src/lib/scoring.js` (Vue)
- [x] Helpers reusados (`competitionAnalysis`, `icpOverallScore`, `marketAnalysis`, `funnelAnalysis`, `pricingAnalysis`, `ltvCacAnalysis`, `coherenceChecks`)
- [x] Renderer do selo + breakdown em `js/app.js` e `frontend/src/views/DashboardView.vue`
- [x] CSS pro selo (círculo grande + cores por faixa) em `css/style.css` e `<style scoped>` do `DashboardView`
- [ ] Testes manuais com plano vazio (D), plano médio (B), plano completo (A+)

---

## 🟧 Fase D — Perfil da Empresa (capstone estilo LinkedIn)

Tela nova, acessada via botão "Ver perfil da empresa" no dashboard, ou direto via link público read-only após o usuário concluir o wizard.

### Estrutura visual (layout 2 colunas em desktop, 1 coluna em mobile)

```
┌────────────────────────────────────────────────────────────┐
│  [LOGO]  Nome da Empresa                           [A+ 92] │
│  Tagline da proposta de valor              ⏱ 3 anos | 🌐 BR│
├──────────────────────────┬─────────────────────────────────┤
│ COLUNA PRINCIPAL          │ COLUNA LATERAL                  │
│                           │                                  │
│ ▸ Sobre                   │  Contato                         │
│   Propósito + Visão       │  ✉ email@empresa.com             │
│                           │  📱 +55 11 99999-9999            │
│ ▸ Cliente ideal           │  📍 Brasil — Sudeste             │
│   Card persona primária   │                                  │
│   + ICP Fit 78/100        │  Detalhes                        │
│                           │  Porte: Pequena (10–49)          │
│ ▸ Posição no mercado      │  Setor: SaaS B2B                 │
│   Pirâmide TAM/SAM/SOM    │  Faturamento: R$ 50–200k/mês     │
│   Mapa competitivo        │                                  │
│                           │  Score por dimensão              │
│ ▸ Estratégia comercial    │  ▪ Clareza        82 ▓▓▓▓▓▓▓▓░░│
│   Funil + meta            │  ▪ Mercado        70 ▓▓▓▓▓▓▓░░░│
│   LTV/CAC                 │  ▪ Execução       85 ▓▓▓▓▓▓▓▓▓░│
│                           │  ▪ Comercial      60 ▓▓▓▓▓▓░░░░│
│ ▸ Forças & atenção        │  ▪ Diferenciação  90 ▓▓▓▓▓▓▓▓▓▓│
│   Top SWOT                │                                  │
│                           │  [🔗 Compartilhar perfil]        │
│ ▸ Próximas ações          │  [🖨 Imprimir / PDF]             │
│   Top 5 ações 5W2H        │                                  │
└──────────────────────────┴─────────────────────────────────┘
```

### Logo gerada automaticamente

Não pedimos upload (atrito alto). Geração no client:
- Pega a primeira letra (ou as 2 primeiras se composta) do `company.name`.
- Cor de fundo = hash do nome → escolhe em paleta de 8 cores derivada do laranja Pumpkin (#d35400 primária + neutros).
- Renderiza num `<div>` redondo com `border-radius: 50%`, fonte branca, peso 700.

### Link público read-only

- Endpoint novo no backend: `GET /public/profile/:slug` retorna versão pública do plano (sem `lead`, sem `ai.cache`).
- Slug = base64url(planId) truncado a 10 chars, ou um random gerado e salvo em coluna nova `plans.public_slug VARCHAR(20) UNIQUE NULL` (migration).
- Frontend: rota `/perfil/:slug` (renderiza só o perfil, sem topbar do wizard).
- Botão "Compartilhar perfil" copia link `https://<dominio>/perfil/<slug>` pro clipboard.

### Componentes a criar

- `js/profile.js` — renderer do perfil completo
- `js/logo-gen.js` — gerador de logo (inicial + cor por hash)
- `css/profile.css` — estilos dedicados (separado pra impressão limpa)
- Possível adição em backend: rota `/public/profile/:slug` + coluna `public_slug` na tabela `plans`

### Checklist Fase D

Implementação foi no frontend **Vue** (`frontend/src/`), não no vanilla — o vanilla ficou só com a Fase C como referência.

- [x] Migration idempotente em `server/src/lib/db.js`: adiciona `public_slug VARCHAR(20) UNIQUE NULL` na tabela `plans` via `information_schema` check + `ALTER TABLE`.
- [x] Endpoint `GET /public/profile/:slug` em `server/src/routes/plans.js` (cache HTTP 60s, remove `lead` e `ai` da resposta). Pulado do rate limit (já pulado por `/plans` no `server.js`).
- [x] Endpoint `POST /plans/:id/share` que chama `ensurePublicSlug()` (idempotente).
- [x] `frontend/src/lib/logoGen.js` (inicial + cor por hash, paleta laranja Pumpkin).
- [x] `frontend/src/views/ProfileView.vue` (layout 2 colunas, header com logo+score, side bars compactas).
- [x] Estilos `scoped` no próprio `.vue` (print-friendly via `@media print`).
- [x] Rotas `/perfil` (preview interno) e `/perfil/:slug` (público) em `router/index.js`.
- [x] Botão "👁 Ver perfil" no `DashboardView`.
- [x] Botão "🔗 Compartilhar perfil" no `ProfileView` (gera slug, copia URL `#/perfil/<slug>`).
- [x] Impressão (PDF) — `@media print` esconde ações, mantém cores via `print-color-adjust`.
- [ ] Smoke test E2E (criar plano, ver perfil, gerar link, abrir em aba anônima)

---

## 🟧 Fase E — Deploy em VPS

Roteiro detalhado em `server/README.md` (seção "Deploy em VPS"). Resumo:

1. Ubuntu 22.04/24.04 + MySQL 8 + Node 20
2. `CREATE DATABASE planejamento_estrategico CHARACTER SET utf8mb4;` + usuário dedicado
3. Clonar repo em `/var/www/`, `cp .env.example .env`, preencher
4. `npm install --omit=dev && npm run db:init`
5. systemd unit (`/etc/systemd/system/planejamento.service`) com `Restart=on-failure`
6. nginx como reverse proxy (`proxy_pass http://127.0.0.1:3001`)
7. SSL via `certbot --nginx -d dominio.com`
8. Frontend: servir `index.html` + `css/` + `js/` via nginx no mesmo host (path `/`) com `<meta name="backend-url" content="https://dominio.com">`

### Checklist Fase E

- [ ] VPS provisionada (DigitalOcean, Hetzner, Contabo — qualquer plano básico aguenta)
- [ ] Domínio apontado (registro A para o IP da VPS)
- [ ] MySQL + usuário criados
- [ ] `.env` preenchido com `DB_PASSWORD`, `GEMINI_API_KEY`, `ALLOWED_ORIGINS=https://seudominio.com`, `LEADS_ADMIN_TOKEN`
- [ ] Service systemd ativo (`systemctl status planejamento`)
- [ ] nginx + SSL ok
- [ ] Smoke test: criar plano, avançar 5 passos, confirmar linha em `leads`, concluir, ver perfil

---

## 📌 Como retomar numa nova sessão

1. Abrir este `roadmap.md` + `memory/MEMORY.md` + arquivos linkados
2. Verificar o que já existe no código (`git log`, `git diff`)
3. Pegar a próxima fase pendente nos checklists acima
4. Implementar mantendo as regras das memory cards:
   - `feedback_ai_cost.md` — Flash > Pro, persistência sem chave
   - `feedback_lead_capture.md` — espalhar e justificar, nunca formulário corrido
   - `project_strategic_score.md` — fórmulas e classificação
   - `project_context.md` — stack atual

**Princípio que vale pra todas as fases:** cada uma entrega valor sozinha. Pode parar em qualquer ponto entre fases sem regredir.
