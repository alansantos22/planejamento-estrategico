/**
 * Criptografia simétrica para PII em repouso.
 *
 *  - AES-256-GCM (autenticada) para dados que precisam ser lidos depois
 *    (nome do cliente, empresa, telefone, dados numéricos).
 *  - HMAC-SHA256 determinístico para emails / IPs — permite buscar/dedup
 *    sem expor o valor original.
 *
 * Rotação: o formato armazenado é `v<N>:<iv>:<authTag>:<ciphertext>` em base64url.
 * Pra trocar a chave: incremente ENCRYPTION_KEY_VERSION, mantenha a chave antiga
 * em ENCRYPTION_KEY_V<old> e o sistema lê o que estava criptografado com ela e
 * regrava com a nova na próxima escrita.
 */
import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12; // GCM recomenda 96 bits
const TAG_LEN = 16;

function decodeKey(hex, name) {
  if (!hex) return null;
  const buf = Buffer.from(hex, 'hex');
  if (buf.length !== 32) {
    throw new Error(`${name} deve ser 32 bytes em hex (64 caracteres).`);
  }
  return buf;
}

// Versão ativa + mapa de versões para descriptografar conteúdo antigo após rotação.
const ACTIVE_VERSION = Number(process.env.ENCRYPTION_KEY_VERSION || 1);

const keyRing = (() => {
  const ring = {};
  // ENCRYPTION_KEY = chave da versão ativa (formato compatível com versão única).
  const active = decodeKey(process.env.ENCRYPTION_KEY, 'ENCRYPTION_KEY');
  if (active) ring[ACTIVE_VERSION] = active;
  // ENCRYPTION_KEY_V1, ENCRYPTION_KEY_V2... permite manter chaves antigas.
  for (const [k, v] of Object.entries(process.env)) {
    const m = k.match(/^ENCRYPTION_KEY_V(\d+)$/);
    if (m) {
      const ver = Number(m[1]);
      ring[ver] = decodeKey(v, k);
    }
  }
  return ring;
})();

const HMAC_KEY = decodeKey(process.env.HMAC_KEY, 'HMAC_KEY');

if (!keyRing[ACTIVE_VERSION] && process.env.NODE_ENV === 'production') {
  // Em produção, sem chave é falha crítica: dados PII iriam em texto claro.
  throw new Error(
    'ENCRYPTION_KEY ausente em produção. Gere com: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
}
if (!HMAC_KEY && process.env.NODE_ENV === 'production') {
  throw new Error('HMAC_KEY ausente em produção.');
}

if (!keyRing[ACTIVE_VERSION]) {
  console.warn('⚠ ENCRYPTION_KEY ausente — leads serão gravados em TEXTO PURO (dev only).');
}
if (!HMAC_KEY) {
  console.warn('⚠ HMAC_KEY ausente — hashes determinísticos desabilitados (dev only).');
}

/** true se a criptografia está habilitada (chaves presentes). */
export const encryptionEnabled = !!keyRing[ACTIVE_VERSION];

/**
 * Cifra uma string. Retorna `v<N>:<ivB64>:<tagB64>:<ctB64>`.
 * Devolve null/undefined sem alteração para facilitar o uso em pipelines.
 */
export function encrypt(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === '') return plaintext;
  if (!encryptionEnabled) return String(plaintext);
  const key = keyRing[ACTIVE_VERSION];
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v${ACTIVE_VERSION}:${iv.toString('base64url')}:${tag.toString('base64url')}:${ct.toString('base64url')}`;
}

/**
 * Decifra um valor previamente cifrado por `encrypt`. Aceita texto puro (legado
 * pré-criptografia) e o devolve como está, pra migração transparente.
 */
export function decrypt(value) {
  if (value === null || value === undefined || value === '') return value;
  const s = String(value);
  // Heurística: valor cifrado começa com "v<N>:" e tem 4 partes separadas por ':'.
  if (!/^v\d+:/.test(s)) return s;
  const parts = s.split(':');
  if (parts.length !== 4) return s;
  const version = Number(parts[0].slice(1));
  const key = keyRing[version];
  if (!key) {
    // Não conseguimos decifrar — em produção, melhor sinalizar do que devolver lixo.
    throw new Error(`Chave de criptografia v${version} indisponível.`);
  }
  try {
    const iv = Buffer.from(parts[1], 'base64url');
    const tag = Buffer.from(parts[2], 'base64url');
    const ct = Buffer.from(parts[3], 'base64url');
    if (tag.length !== TAG_LEN) throw new Error('Tag GCM inválida.');
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return pt.toString('utf8');
  } catch (err) {
    throw new Error(`Falha ao decifrar (v${version}): ${err.message}`);
  }
}

/**
 * HMAC-SHA256 determinístico (mesma entrada → mesmo hash). Útil pra indexar
 * email/IP sem armazenar o valor original. Não é reversível.
 */
export function hmac(value) {
  if (!HMAC_KEY) return null;
  if (value === null || value === undefined || value === '') return null;
  return crypto.createHmac('sha256', HMAC_KEY).update(String(value).toLowerCase().trim()).digest('base64url');
}

/** Hash do IP — `127.0.0.1` e `::ffff:127.0.0.1` viram o mesmo. */
export function hashIp(ip) {
  if (!ip) return null;
  let v = String(ip).trim().toLowerCase();
  if (v.startsWith('::ffff:')) v = v.slice(7);
  return hmac(v);
}

/** Token aleatório base64url (default 32 bytes = 256 bits). */
export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}
