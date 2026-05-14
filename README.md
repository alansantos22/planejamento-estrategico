# Wizard de Planejamento Estratégico

Aplicação para construção guiada de planejamento estratégico empresarial — do ICP ao plano de ação, com cálculos automáticos, score de saúde estratégica e assistente de IA opcional. Pensado para rodar em VPS, com MySQL e captação distribuída de lead.

## ✨ Características

- **Frontend HTML/CSS/JS puro**, sem build, sem npm no diretório raiz. O estado do plano vive no backend (MySQL) — sem `localStorage`/`sessionStorage`.
- **Wizard de 16 etapas** cobrindo: Empresa → ICP → Mercado → Concorrência → SWOT → TOWS → Produto-foco → Pricing → Funil → Forecast → OKRs → Ações (+ Visão, BMC, Ishikawa, Métricas no modo Completo).
- **Algoritmos sistêmicos** (determinísticos, sem IA): ICE Score, ICP Fit, TAM/SAM/SOM com sanity-check, matriz competitiva, 80/20, cálculo reverso de funil, projeção de 12 meses, coerência cruzada.
- **Lead capture distribuído** nos primeiros passos: nome da pessoa, nome da empresa, e-mail e telefone são pedidos em contextos justificados (não como formulário corrido). Tabela `leads` separada do plano, mesmo planos abandonados viram leads recuperáveis.
- **Backend opcional para IA (Node + Fastify + Gemini)** com **10 agentes especializados** acessados via botão "🤖 Assistente, me dê ideias".
- **Mobile-first**, exportação JSON e impressão PDF.

## 🚀 Como usar

### Backend (obrigatório — persiste o plano em MySQL)

Pré-requisito: MySQL 8 rodando (local ou na VPS).

```bash
cd server
cp .env.example .env       # preencha credenciais do MySQL e (opcional) GEMINI_API_KEY
npm install
npm run db:init            # cria as tabelas plans + leads (idempotente)
npm start
```

O servidor sobe em `http://localhost:3001`.

### Frontend

Sirva os arquivos estáticos com qualquer servidor leve (evita CORS contra o backend):
```bash
npx serve     # ou Live Server do VSCode
```

Por padrão o frontend aponta para `http://localhost:3001`. Para apontar para outro host, defina antes do `<script>`:
```html
<meta name="backend-url" content="https://meu-backend.exemplo.com">
```

### Habilitando os agentes de IA (opcional)

A persistência do plano não depende da chave do Gemini — ela só é necessária para os agentes "Assistente, me dê ideias". No wizard, clique em **⚙ Config** e cole a URL do backend para ativar o botão de IA.

Veja [`server/README.md`](server/README.md) para detalhes dos agentes e do deploy em VPS.

## 📁 Estrutura

```
planejamento-estrategico/
├── index.html
├── css/style.css
├── js/
│   ├── storage.js     → cliente REST que persiste o plano em MySQL (server/plans) + import/export JSON
│   ├── scoring.js     → algoritmos (SWOT, ICE, ICP, TAM/SAM/SOM, funil reverso, Score de Saúde Estratégica…)
│   ├── ai-helper.js   → botão "Assistente" + modal + cache local
│   ├── frameworks.js  → renderers de cada etapa
│   └── app.js         → controlador / navegação / dashboard
├── server/            → backend (Node + Fastify + MySQL + Gemini)
│   ├── src/
│   │   ├── server.js
│   │   ├── lib/gemini.js       → cliente Gemini (callAgent / MODELS / extractJSON)
│   │   ├── lib/db.js           → MySQL pool + schema plans + leads
│   │   ├── routes/plans.js     → CRUD do plano
│   │   ├── routes/leads.js     → CRUD do lead (captura distribuída)
│   │   ├── routes/agents.js    → 10 agentes de IA
│   │   ├── scripts/init-db.js  → cria/atualiza schema (`npm run db:init`)
│   │   └── agents/             → implementação dos 10 agentes
│   ├── package.json
│   ├── .env.example
│   └── README.md
├── memory/            → contexto persistente (uso interno do dev)
├── todo.md            → roadmap de evolução
└── README.md
```

## 🧮 Algoritmos sistêmicos

| Algoritmo | Descrição |
|---|---|
| **SWOT Score** | `(impacto × confiança) ÷ 10` por item; média por quadrante |
| **Perfil estratégico** | Ofensiva / Defensiva / Reorientação / Sobrevivência |
| **TOWS** | Cruzamento automático top-3 de cada quadrante |
| **ICP Fit** | Completude ponderada + bônus para campos críticos (dor, orçamento, autoridade) |
| **TAM/SAM/SOM** | Pirâmide + sanity check (SOM ≤ 5% SAM em 12 meses) |
| **Matriz competitiva** | Diferenciação média vs. concorrentes + espaço em branco |
| **Produto-foco (80/20)** | Eficiência = receita/esforço; flag de "sangrias" |
| **Pricing positioning** | Penetração / Competitivo / Premium / Skim (vs. mediana de mercado) |
| **Funil reverso** | A partir da meta + ticket, calcula leads necessários e gargalo |
| **Forecast 12 meses** | Projeção pessimista/realista/otimista com retenção e crescimento |
| **OKR validator** | Regex detecta se KR é mensurável |
| **ICE Score** | Média de Impacto + Confiança + Facilidade |
| **LTV/CAC** | Faixas crítico / aceitável / ideal / subinvestindo |
| **Coerência cruzada** | Alertas automáticos quando seções se contradizem |
| **Score de Saúde Estratégica** | 0–100 ponderando Clareza, Mercado, Execução, Comercial, Diferenciação (próxima fase) |

## 🤖 Agentes de IA (Gemini)

Acessados via botão "🤖 Assistente, me dê ideias" em cada etapa do wizard:

| Agente | Modelo | O que faz |
|---|---|---|
| `personaDetector`      | Flash | Sugere 2-3 personas/ICP a partir do contexto |
| `idealPersonaCoach`    | Flash | Critica personas em rascunho |
| `marketSizer`          | Flash | Estima TAM/SAM/SOM |
| `competitorResearcher` | Flash | Lista concorrentes prováveis |
| `swotDetector`         | Flash | Sugere itens da SWOT |
| `problemDetector`      | Pro   | Aponta riscos não capturados |
| `productIdeaGenerator` | Pro   | Sugere ideias de produto |
| `pricingBenchmark`     | Flash | Estima faixa de preço do mercado |
| `salesFunnelArchitect` | Pro   | Desenha funil adequado ao segmento |
| `insightsCoach`        | Pro   | Revisão crítica do plano completo (no dashboard) |

Tarefas estruturadas usam `responseMimeType: 'application/json'` para garantir JSON válido.

## 📤 Export / Import

- **Exportar**: botão na topbar gera JSON completo do plano.
- **Importar**: carrega JSON anterior. Migração automática v1 → v2.

## 🖨️ Impressão / PDF

No dashboard, clique em "Imprimir / PDF" — CSS oculta automaticamente UI auxiliar, deixando apenas o relatório.

## 🎨 Design

Reaproveita a paleta da plataforma MeChame (laranja `#d35400` Pumpkin como primária).

## 🚢 Deploy em VPS

Roteiro detalhado em [`server/README.md`](server/README.md). Em resumo: Ubuntu + nginx (reverse proxy + SSL) + MySQL 8 + Node 20 + systemd para process management.
