# TODO — Evolução do Planejamento Estratégico

Roadmap completo para transformar o wizard atual em uma ferramenta robusta de planejamento estratégico, com base sistêmica (sem IA) primeiro e camada de IA depois.

---

## Fase 1 — Inteligência sistêmica (frontend puro, sem IA)

Cada framework deve seguir o padrão existente: `{ id, title, desc, modeOnly?, render(state, save), validate(state) }` em `js/frameworks.js`, com algoritmos em `js/scoring.js` e seção no dashboard em `js/app.js`.

### 1.1 ICP / Persona — *Quem é o cliente ideal*
- [ ] Campos: nome da persona, cargo/papel, faixa etária, porte da empresa-cliente, dor principal, gatilho de compra, orçamento típico, autoridade de decisão, canal preferido
- [ ] Permitir múltiplas personas (primária + secundárias)
- [ ] **ICP Fit Score** (0–10): checklist ponderada (porte, dor, orçamento, urgência, autoridade) — algoritmo determinístico
- [ ] Classificação verde/amarelo/vermelho
- [ ] Posição no wizard: depois de "Empresa", antes da SWOT

### 1.2 Análise de Mercado (TAM / SAM / SOM)
- [ ] Campos: TAM (mercado total), SAM (mercado endereçável), SOM (fatia obtenível em 1 ano)
- [ ] Sanity-check: SOM deve ser ≤ 5% do SAM no ano 1 — flag de alerta
- [ ] Cálculo de % de penetração necessária
- [ ] Mostrar pirâmide visual TAM → SAM → SOM

### 1.3 Análise de Concorrência
- [ ] Matriz: N concorrentes × 4–6 critérios (preço, qualidade, experiência, atendimento, marca, inovação)
- [ ] Nota 1–5 para cada par
- [ ] **Mapa de posicionamento** (preço × qualidade, ou customizável)
- [ ] Identifica automaticamente o "espaço em branco" no mercado
- [ ] Score de diferenciação: média da diferença vs. concorrentes

### 1.4 Produto-foco / Portfólio (regra 80/20)
- [ ] Lista de ofertas/produtos: nome, %receita, %esforço, margem
- [ ] Flagga automaticamente: produtos que comem esforço > receita (sangrias)
- [ ] Recomenda produto-foco: maior receita × menor esforço × maior margem
- [ ] Visualização: gráfico esforço × receita (4 quadrantes)

### 1.5 Posicionamento + Pricing
- [ ] Statement de posicionamento (template: "Para [ICP], que [problema], nós oferecemos [produto] que [benefício] diferente de [concorrente] porque [razão]")
- [ ] Preço atual + faixa do mercado (mín, mediana, máx)
- [ ] Classificação automática: Penetração / Competitivo / Premium / Skim
- [ ] Margem-alvo vs. real

### 1.6 Go-to-Market + Funil de Vendas
- [ ] Etapas configuráveis (default: Visitantes → Leads → MQL → SQL → Propostas → Clientes)
- [ ] Taxas de conversão por etapa
- [ ] Ticket médio + ciclo de venda (dias)
- [ ] **Cálculo reverso**: pra bater a meta de receita, quantos visitantes/leads são necessários?
- [ ] Identifica o gargalo (etapa com menor conversão)
- [ ] Canais de aquisição (busca paga, orgânico, indicação, outbound) com %mix

### 1.7 Forecast / Meta de vendas
- [ ] Projeção 12 meses: ticket × clientes novos × retenção
- [ ] Cruza com LTV/CAC existente
- [ ] Cenários: pessimista / realista / otimista
- [ ] Gráfico de receita mensal acumulada

### 1.8 Coerência cruzada (validador silencioso)
- [ ] Regras `if/then` que apontam inconsistências entre seções:
  - ICP B2C × canal B2B
  - KR de "1000 clientes/mês" × funil que comporta 200
  - LTV/CAC bom × Pricing classificado como "Penetração"
  - Produto-foco não aparece no BMC
- [ ] Lista de alertas no dashboard ("Pontos de atenção")

### 1.9 Score geral expandido
- [ ] Adicionar 3 novos componentes ao score: **Mercado** (TAM/SOM coerentes), **Vendas** (funil completo + meta), **Foco** (clareza de produto-foco)
- [ ] Rebalancear pesos:
  - Enxuto: SWOT 20 + OKR 30 + Ações 15 + ICP 15 + Mercado 10 + Vendas 10
  - Completo: + Métricas 10 + Foco 10 (renormalizado)

### 1.10 Estado, persistência e import/export
- [ ] Atualizar `defaultState()` em `js/storage.js` com todos os campos novos
- [ ] Versionar para `v2` (manter retrocompatibilidade ao importar `v1`)
- [ ] Botão de import deve mesclar com defaults

### 1.11 Dashboard expandido
- [ ] Nova seção: "Cliente Ideal" com card de cada persona + ICP fit
- [ ] Nova seção: "Posição no Mercado" (TAM/SAM/SOM + mapa competitivo)
- [ ] Nova seção: "Estratégia Comercial" (funil + forecast + pricing)
- [ ] Nova seção: "Pontos de Atenção" (alertas de coerência)

### 1.12 CSS / UX
- [ ] Estilos para matriz competitiva (tabela responsiva)
- [ ] Pirâmide TAM/SAM/SOM (CSS puro, sem libs)
- [ ] Cards de persona
- [ ] Gráfico de funil (CSS puro)

---

## Fase 2 — Backend (Node.js + Fastify) + Camada de IA

A IA entra como **assistente sob demanda**: botão "🤖 Assistente, me dê ideias" em cada etapa relevante. Backend stateless serve apenas para esconder a API key e orquestrar agentes.

### 2.1 Estrutura do backend
- [x] `server/` na raiz com:
  - `package.json` (fastify, @fastify/cors, @google/genai, mysql2, dotenv)
  - `src/server.js` — bootstrap Fastify, CORS pra dev (localhost:5500 / file://)
  - `src/routes/agents.js` — endpoints `/agents/:name`
  - `src/routes/plans.js` — CRUD do plano em MySQL
  - `src/routes/leads.js` — CRUD do lead (captura distribuída)
  - `src/agents/` — um arquivo por agente especializado
  - `src/lib/gemini.js` — cliente Gemini compartilhado
  - `src/lib/db.js` — pool MySQL + schema `plans` + `leads`
  - `.env.example` (`GEMINI_API_KEY=`, `PORT=3001`, credenciais MySQL)
  - `README.md` com instruções `npm install && npm start` + guia de deploy em VPS
- [x] Modelo padrão: **gemini-2.5-flash** (custo baixo, JSON estruturado) — **gemini-2.5-pro** nos agentes que precisam de raciocínio (insightsCoach, salesFunnelArchitect, problemDetector, productIdeaGenerator)

### 2.2 Padrão de cada agente
- [ ] Recebe via POST: contexto relevante do `state` (NÃO o state inteiro — só o que importa pro agente)
- [ ] Retorna JSON estruturado com sugestões editáveis (não preenche direto — o usuário aceita/edita)
- [ ] Usa **prompt caching** na parte estática (system prompt do agente, regras do framework)
- [ ] Limite: 1 chamada por clique do botão; bloqueia cliques repetidos (debounce)
- [ ] Resposta cacheada localmente em `sessionStorage` por (agente + hash do input) — evita gastar 2x na mesma sugestão

### 2.3 Agentes especializados

#### `personaDetector`
- Input: company info + segmento + valueProp do BMC + SWOT
- Output: 2–3 personas sugeridas com todos os campos preenchidos
- Modelo: sonnet-4-6

#### `idealPersonaCoach`
- Input: persona atual (rascunho)
- Output: críticas + perguntas pra refinar (ex.: "Você mencionou 'PME', mas qual faturamento? Qual setor?")
- Modelo: haiku-4-5 (texto curto)

#### `swotStrengthsDetector`
- Input: company + canvas + (opcional) personas
- Output: 3–5 forças candidatas com `text/impact/confidence` sugeridos
- Modelo: sonnet-4-6
- *Análogos para weaknesses, opportunities, threats — mesma lógica*

#### `problemDetector`
- Input: state completo (resumido)
- Output: lista de problemas/riscos não capturados na SWOT/Ishikawa (visão de fora)
- Modelo: sonnet-4-6
- Usa raciocínio: olha o conjunto, aponta o que está faltando

#### `competitorResearcher`
- Input: segment + valueProp + region
- Output: 3–5 concorrentes prováveis com posicionamento estimado
- Modelo: sonnet-4-6 com web search (se disponível) — senão, lista do conhecimento do modelo + aviso "verifique"

#### `productIdeaGenerator`
- Input: ICP + SWOT (forças) + concorrência
- Output: 3 ideias de produto/oferta alinhadas com forças e gaps de mercado
- Modelo: sonnet-4-6

#### `pricingBenchmark`
- Input: produto + segmento + ICP
- Output: faixa de preço esperada do mercado (mín/mediana/máx) + justificativa
- Modelo: sonnet-4-6
- Aviso: "estimativa baseada em mercado típico — valide com pesquisa real"

#### `salesFunnelArchitect`
- Input: ICP + canal + ticket + ciclo + meta
- Output: funil completo sugerido (etapas, taxas típicas pro segmento, recomendação de gargalos a vigiar)
- Modelo: sonnet-4-6
- *O agente mais especializado — system prompt longo com playbooks de vendas B2B/B2C/SaaS/Serviços*

#### `insightsCoach` (revisor final)
- Input: state completo
- Output: 3 inconsistências + 3 riscos + 3 oportunidades não exploradas
- Modelo: sonnet-4-6 com extended thinking habilitado
- Botão único no dashboard: "🤖 Revisar plano completo"

### 2.4 Frontend — botão de IA
- [ ] Componente `AIHelper` reutilizável: botão "🤖 Assistente, me dê ideias" + modal de sugestões
- [ ] Adicionar nos passos: ICP, SWOT, Concorrência, Produto, Pricing, Funil, Ações
- [ ] Modal mostra: rascunho gerado + botão "Aceitar e editar" / "Descartar"
- [ ] Indicador de loading + erro (sem API key, sem conexão)
- [ ] Configuração de endpoint backend (default `http://localhost:3001`, editável em settings)

### 2.5 Segurança e custo
- [ ] API key **só no backend** (nunca no frontend)
- [ ] Rate limit por IP (5 chamadas/min, 50/dia) com `@fastify/rate-limit`
- [ ] Log de consumo de tokens por agente (console + arquivo opcional)
- [ ] Prompt caching ativo em system prompts — economiza ~80% nos hits

---

## Fase 3 — Polimento (opcional, depois das fases 1 e 2)

- [ ] Auth simples no backend (API key compartilhada via env, header `x-api-token`)
- [ ] Persistência opcional em arquivo (`server/data/plans.json`) — usuário escolhe se quer salvar
- [ ] Multi-idioma (en/es) — strings em `i18n.js`
- [ ] PWA: service worker pra rodar offline
- [ ] Tema escuro (CSS já tem variáveis, fácil de adicionar)
- [ ] Compartilhamento de plano via link (gera ID curto + recupera do backend)

---

## Ordem de implementação acordada (2026-05-13)

1. ✅ Salvar este roadmap em `todo.md`
2. ⏳ Fase 1 completa: ICP → Mercado → Concorrência → Produto-foco → Pricing → Funil → Forecast → Coerência → Score/Dashboard
3. ⏳ Fase 2: backend Fastify + 10 agentes + botão "Assistente"
4. ⏳ Fase 3: ajustes finos

> **Princípio:** cada etapa funciona sozinha. Você pode parar em qualquer ponto e ter ganho real de valor.

---

## Fase 4 — Captação de lead, score estratégico, perfil de empresa, deploy VPS (2026-05-14)

Mudança de direção decidida em 2026-05-14: produto vai para VPS, precisa coletar leads sem afastar usuários, gerar score com fundamentação científica e entregar capstone visual.

### 4.1 Infra — MySQL + Gemini
- [x] Swap `better-sqlite3` → `mysql2` (pool promise + schema `plans` + `leads`)
- [x] Swap `@anthropic-ai/sdk` → `@google/genai` (Gemini 2.5 Pro/Flash)
- [x] Modelos por agente: Pro nos 4 de raciocínio, Flash nos 6 de tarefa estruturada
- [x] `.env.example` e READMEs com o novo stack
- [x] `npm run db:init` idempotente + shutdown limpo do pool
- [ ] Deploy em VPS (Ubuntu + nginx + systemd + Let's Encrypt) — roteiro em `server/README.md`

### 4.2 Lead capture distribuído nos 5 primeiros passos
- [ ] Passo 1 (boas-vindas): pedir **nome da pessoa** + 1 pergunta-isca ("qual seu maior desafio hoje?")
- [ ] Passo 2 (empresa): **nome da empresa** + segmento (já existia, refatorar)
- [ ] Passo 3 (contexto): porte, faturamento, tempo, região — sem campo de lead
- [ ] Passo 4 ("receba o plano"): **e-mail** — justificativa: "para onde enviamos seu plano consolidado?"
- [ ] Passo 5 (identidade): **telefone (opcional)** — justificativa: "para personalizar o perfil final da sua empresa"
- [ ] `PUT /leads/:planId` chamado a cada passo concluído (já existe no backend)
- [ ] Validação client-side de e-mail; telefone com máscara opcional
- [ ] Captar UTM params da URL na 1ª pageview e enviar junto

### 4.3 Score de Saúde Estratégica (`Scoring.strategicHealthScore`)

Inspirado em Balanced Scorecard (Kaplan & Norton), EOS Company Checkup (Wickman) e Strategic Readiness Score:

- [ ] **Clareza Estratégica** (peso 20%) — Visão + Posicionamento + Produto-foco
- [ ] **Conhecimento de Mercado** (peso 25%) — ICP Fit + TAM/SAM/SOM realista + matriz competitiva
- [ ] **Capacidade de Execução** (peso 20%) — OKRs mensuráveis + Ações com prazo
- [ ] **Saúde Comercial** (peso 25%) — LTV/CAC + pricing alinhado + funil viável
- [ ] **Diferenciação Competitiva** (peso 10%) — diferencial vs concorrentes (já calculamos)
- [ ] Penalidades: −5 por seção obrigatória vazia, −3 por alerta de coerência cruzada, −2 por SOM > 5% SAM
- [ ] Classificação A+ (≥90) / A (80-89) / B (65-79) / C (50-64) / D (<50)
- [ ] Card no dashboard com selo + breakdown por dimensão + explicação textual

### 4.4 Perfil da empresa (capstone estilo LinkedIn)
- [ ] Header: nome + logo gerada (inicial + cor) + tagline (valueProp) + selo do score
- [ ] Coluna lateral: e-mail, telefone, região, porte, segmento, tempo de operação
- [ ] Seções: Sobre, Cliente ideal, Posição no mercado, Estratégia comercial, Pontos fortes/atenção, Próximas ações
- [ ] Link público read-only (slug curto) — endpoint `GET /public/profile/:slug`
- [ ] Print-ready (PDF via impressão do browser)
