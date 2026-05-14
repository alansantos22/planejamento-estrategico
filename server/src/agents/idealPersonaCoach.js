import { callAgent, MODELS } from '../lib/gemini.js';

const SYSTEM = `Você é um coach especialista em refinamento de ICP. Recebe uma ou mais personas em rascunho e devolve críticas construtivas em formato de perguntas específicas para o usuário.

Foque nos 3 campos críticos: dor, orçamento e autoridade. Se algum estiver vago ou genérico, faça perguntas pontuais.

Retorne texto corrido em PT-BR, formato:
- Para cada persona, liste 2-4 perguntas que forçariam o usuário a especificar melhor.
- Termine com 1 sugestão geral.

Não seja prolixo. Seja útil.`;

export async function idealPersonaCoach(payload) {
  const personas = payload.personas || [];
  if (!personas.length) {
    return { text: 'Adicione ao menos uma persona antes de pedir coaching.' };
  }
  const user = `Avalie as personas abaixo e devolva perguntas que ajudariam a refinar cada uma:

${personas.map((p, i) => `Persona #${i + 1}${p.primary ? ' (primária)' : ''}:
- Nome: ${p.name || '(vazio)'}
- Cargo: ${p.role || '(vazio)'}
- Porte: ${p.companySize || '(vazio)'}
- Dor: ${p.pain || '(vazio)'}
- Gatilho: ${p.trigger || '(vazio)'}
- Orçamento: ${p.budget || '(vazio)'}
- Autoridade: ${p.authority || '(vazio)'}
- Canal: ${p.channel || '(vazio)'}`).join('\n\n')}`;

  const { text } = await callAgent({ model: MODELS.FLASH, system: SYSTEM, user, maxTokens: 1500 });
  return { text, applicable: false };
}
