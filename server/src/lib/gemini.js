/**
 * Cliente Gemini compartilhado entre agentes.
 * Mantém a mesma superfície de API que tínhamos com a Anthropic (callAgent / MODELS / extractJSON)
 * pra evitar mudanças invasivas nos agentes.
 */
import { GoogleGenAI } from '@google/genai';

if (!process.env.GEMINI_API_KEY) {
  console.warn('⚠ GEMINI_API_KEY não definida — chamadas à IA vão falhar.');
}

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const MODELS = {
  PRO:   'gemini-2.5-pro',
  FLASH: 'gemini-2.5-flash'
};

/**
 * Chama o modelo Gemini.
 *
 * @param {object} opts
 * @param {string} opts.model      - id do modelo (use MODELS.PRO / MODELS.FLASH)
 * @param {string} opts.system     - system instruction (estática — bom candidato a cache no futuro)
 * @param {string} opts.user       - mensagem do usuário
 * @param {number} [opts.maxTokens=2048]
 * @param {boolean} [opts.json=false] - se true, força responseMimeType=application/json
 * @param {number}  [opts.temperature]
 * @returns {Promise<{text:string, usage:object, raw:object}>}
 */
export async function callAgent({ model, system, user, maxTokens = 2048, json = false, temperature }) {
  const config = {
    systemInstruction: system,
    maxOutputTokens: maxTokens
  };
  if (json) config.responseMimeType = 'application/json';
  if (temperature !== undefined) config.temperature = temperature;

  const response = await ai.models.generateContent({
    model,
    contents: user,
    config
  });

  const text = response.text ?? '';
  return {
    text,
    usage: response.usageMetadata || {},
    raw: response
  };
}

/**
 * Tenta extrair JSON do retorno do modelo. Aceita cercado por ```json ou puro.
 */
export function extractJSON(text) {
  if (!text) return null;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1] : text;
  try {
    return JSON.parse(raw.trim());
  } catch {
    const m = raw.match(/[\{\[][\s\S]*[\}\]]/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { return null; }
    }
    return null;
  }
}
