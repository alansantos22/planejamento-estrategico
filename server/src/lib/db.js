/**
 * Camada de persistência em MySQL.
 *
 * Duas tabelas:
 *  - plans : estado completo do planejamento (1 linha por planId, JSON nativo)
 *  - leads : metadados do lead (1 linha por planId, atualizada nos passos do wizard)
 *
 * Conexão: pool do mysql2/promise. Auto-inicializa o schema na primeira chamada.
 */
import crypto from 'crypto';
import mysql from 'mysql2/promise';
import { encrypt, decrypt, hmac, hashIp, randomToken } from './crypto.js';

const {
  DB_HOST = '127.0.0.1',
  DB_PORT = '3306',
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = 'planejamento_estrategico',
  DB_CONNECTION_LIMIT = '10'
} = process.env;

export const pool = mysql.createPool({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: Number(DB_CONNECTION_LIMIT),
  multipleStatements: false,
  charset: 'utf8mb4_unicode_ci',
  timezone: 'Z'
});

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS plans (
    id          VARCHAR(64)  NOT NULL PRIMARY KEY,
    data        JSON         NOT NULL,
    public_slug VARCHAR(20)  NULL UNIQUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // PII (person_name, company_name, email, phone) é gravado CIFRADO em AES-256-GCM.
  // VARCHAR maior pra acomodar o overhead (~80 chars de IV+tag+versão em base64url).
  // email_hash = HMAC-SHA256(email) — permite dedup/lookup sem decifrar.
  `CREATE TABLE IF NOT EXISTS leads (
    id              BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    plan_id         VARCHAR(64)  NOT NULL UNIQUE,
    person_name     VARCHAR(512) NULL,
    company_name    VARCHAR(512) NULL,
    email           VARCHAR(512) NULL,
    email_hash      VARCHAR(64)  NULL,
    phone           VARCHAR(512) NULL,
    status          ENUM('in_progress','completed','abandoned') NOT NULL DEFAULT 'in_progress',
    last_step       VARCHAR(40)  NULL,
    utm_source      VARCHAR(80)  NULL,
    utm_medium      VARCHAR(80)  NULL,
    utm_campaign    VARCHAR(80)  NULL,
    referrer        VARCHAR(500) NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_email_hash (email_hash),
    KEY idx_status     (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Sessões — cookie httpOnly. Guardamos só o HMAC do token (token raw nunca toca o disco).
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash  VARCHAR(64)  NOT NULL PRIMARY KEY,
    plan_id     VARCHAR(64)  NOT NULL,
    ip_hash     VARCHAR(64)  NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_plan (plan_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Uso por IP — bloqueia >1 geração do relatório final por IP. IP em HMAC (LGPD).
  `CREATE TABLE IF NOT EXISTS ip_usage (
    ip_hash    VARCHAR(64)  NOT NULL PRIMARY KEY,
    plan_id    VARCHAR(64)  NULL,
    agent      VARCHAR(40)  NOT NULL,
    used_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
];

// Migrations idempotentes: aplicam só se a coluna ainda não existe.
// MySQL 8 não tem ADD COLUMN IF NOT EXISTS — fazemos via information_schema.
const MIGRATIONS = [
  {
    name: 'plans.public_slug',
    check: `SELECT COUNT(*) AS c FROM information_schema.columns
            WHERE table_schema = DATABASE() AND table_name = 'plans'
              AND column_name = 'public_slug'`,
    apply: `ALTER TABLE plans
            ADD COLUMN public_slug VARCHAR(20) NULL UNIQUE`
  },
  {
    name: 'leads.email_hash',
    check: `SELECT COUNT(*) AS c FROM information_schema.columns
            WHERE table_schema = DATABASE() AND table_name = 'leads'
              AND column_name = 'email_hash'`,
    apply: `ALTER TABLE leads
            ADD COLUMN email_hash VARCHAR(64) NULL,
            ADD KEY idx_email_hash (email_hash)`
  },
  // Expande colunas PII para caber o ciphertext (~+80 chars de overhead).
  {
    name: 'leads.pii.expand',
    check: `SELECT IF(CHARACTER_MAXIMUM_LENGTH >= 512, 1, 0) AS c
            FROM information_schema.columns
            WHERE table_schema = DATABASE() AND table_name = 'leads'
              AND column_name = 'email'`,
    apply: `ALTER TABLE leads
            MODIFY person_name  VARCHAR(512) NULL,
            MODIFY company_name VARCHAR(512) NULL,
            MODIFY email        VARCHAR(512) NULL,
            MODIFY phone        VARCHAR(512) NULL`
  }
];

let initPromise = null;

export function init() {
  if (!initPromise) {
    initPromise = (async () => {
      const conn = await pool.getConnection();
      try {
        for (const sql of SCHEMA_STATEMENTS) {
          await conn.query(sql);
        }
        for (const mig of MIGRATIONS) {
          const [rows] = await conn.query(mig.check);
          if (!rows[0]?.c) await conn.query(mig.apply);
        }
      } finally {
        conn.release();
      }
    })();
  }
  return initPromise;
}

// ============ PLANS ============

export async function getPlan(id) {
  await init();
  const [rows] = await pool.query(
    'SELECT id, data, created_at, updated_at FROM plans WHERE id = ? LIMIT 1',
    [id]
  );
  if (!rows.length) return null;
  const row = rows[0];
  // MySQL JSON column is auto-parsed pelo driver
  const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
  return {
    id: row.id,
    data,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function savePlan(id, data) {
  await init();
  await pool.query(
    `INSERT INTO plans (id, data) VALUES (?, CAST(? AS JSON))
     ON DUPLICATE KEY UPDATE data = VALUES(data)`,
    [id, JSON.stringify(data)]
  );
  return getPlan(id);
}

export async function deletePlan(id) {
  await init();
  const [result] = await pool.query('DELETE FROM plans WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

// ===== Perfil público (Fase D) =====

const SLUG_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'; // sem 0/o/1/l pra reduzir confusão
const SLUG_LEN = 10;

function generateSlug() {
  let s = '';
  for (let i = 0; i < SLUG_LEN; i++) {
    s += SLUG_ALPHABET[Math.floor(Math.random() * SLUG_ALPHABET.length)];
  }
  return s;
}

export async function getPublicSlug(planId) {
  await init();
  const [rows] = await pool.query(
    'SELECT public_slug FROM plans WHERE id = ? LIMIT 1',
    [planId]
  );
  return rows[0]?.public_slug || null;
}

/** Garante que o plano tem um slug. Idempotente: devolve o existente se já houver. */
export async function ensurePublicSlug(planId) {
  await init();
  const existing = await getPublicSlug(planId);
  if (existing) return existing;

  // até 5 tentativas em caso de colisão (extremamente improvável com 32^10)
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = generateSlug();
    try {
      const [result] = await pool.query(
        'UPDATE plans SET public_slug = ? WHERE id = ? AND public_slug IS NULL',
        [slug, planId]
      );
      if (result.affectedRows > 0) return slug;
      // outra requisição já gerou o slug antes — usa o dela
      const now = await getPublicSlug(planId);
      if (now) return now;
    } catch (err) {
      if (err.code !== 'ER_DUP_ENTRY') throw err;
    }
  }
  throw new Error('Não foi possível gerar um slug único após 5 tentativas.');
}

export async function getPlanBySlug(slug) {
  await init();
  const [rows] = await pool.query(
    'SELECT id, data, public_slug, created_at, updated_at FROM plans WHERE public_slug = ? LIMIT 1',
    [slug]
  );
  if (!rows.length) return null;
  const row = rows[0];
  const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
  return {
    id: row.id,
    data,
    publicSlug: row.public_slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// ============ LEADS ============

const LEAD_FIELDS = [
  'person_name',
  'company_name',
  'email',
  'phone',
  'status',
  'last_step',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'referrer'
];

// PII gravada CIFRADA. UTM/status/last_step ficam em claro pra agregação.
const LEAD_ENCRYPTED = new Set(['person_name', 'company_name', 'email', 'phone']);

function encryptLeadFields(fields) {
  const out = { ...fields };
  for (const k of Object.keys(out)) {
    if (LEAD_ENCRYPTED.has(k)) out[k] = encrypt(out[k]);
  }
  // Hash determinístico do email pra dedup/lookup
  if (fields.email) out.email_hash = hmac(fields.email);
  return out;
}

function decryptLeadRow(row) {
  if (!row) return row;
  const out = { ...row };
  for (const k of LEAD_ENCRYPTED) {
    if (out[k] !== undefined && out[k] !== null) {
      try { out[k] = decrypt(out[k]); } catch (_) { out[k] = null; }
    }
  }
  // email_hash é detalhe de implementação — não retorna pro chamador
  delete out.email_hash;
  return out;
}

export async function upsertLead(planId, fields = {}) {
  await init();

  // Filtra só campos conhecidos e não-undefined, depois cifra PII
  const filtered = {};
  for (const k of LEAD_FIELDS) {
    if (fields[k] !== undefined && fields[k] !== null) filtered[k] = fields[k];
  }
  const encrypted = encryptLeadFields(filtered);
  const provided = Object.keys(encrypted);

  if (!provided.length) {
    await pool.query(`INSERT IGNORE INTO leads (plan_id) VALUES (?)`, [planId]);
    return getLead(planId);
  }

  const cols = ['plan_id', ...provided];
  const placeholders = cols.map(() => '?').join(', ');
  const values = [planId, ...provided.map(k => encrypted[k])];
  const updates = provided.map(k => `${k} = VALUES(${k})`).join(', ');

  const sql = `INSERT INTO leads (${cols.join(', ')})
               VALUES (${placeholders})
               ON DUPLICATE KEY UPDATE ${updates}`;

  await pool.query(sql, values);
  return getLead(planId);
}

export async function getLead(planId) {
  await init();
  const [rows] = await pool.query(
    'SELECT * FROM leads WHERE plan_id = ? LIMIT 1',
    [planId]
  );
  return decryptLeadRow(rows[0] || null);
}

export async function listLeads({ status, limit = 100, offset = 0 } = {}) {
  await init();
  const where = [];
  const params = [];
  if (status) { where.push('status = ?'); params.push(status); }
  const sql = `SELECT id, plan_id, person_name, company_name, email, phone, status, last_step,
                      utm_source, utm_medium, utm_campaign, created_at, updated_at
               FROM leads
               ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               ORDER BY updated_at DESC
               LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));
  const [rows] = await pool.query(sql, params);
  return rows.map(decryptLeadRow);
}

// ============ SESSIONS ============
// Cookie httpOnly carrega um token aleatório. No banco guardamos apenas o HMAC
// do token (mesmo padrão de "senha hashed"). O planId é gerado server-side.

function tokenHash(token) {
  return hmac(token);
}

function newPlanId() {
  // Compatível com VALID_ID das rotas (^[a-zA-Z0-9_-]{1,64}$)
  return crypto.randomBytes(18).toString('base64url'); // 24 chars
}

/** Cria uma nova sessão e devolve { token, planId }. */
export async function createSession(ip) {
  await init();
  const token = randomToken(32);
  const planId = newPlanId();
  await pool.query(
    `INSERT INTO sessions (token_hash, plan_id, ip_hash) VALUES (?, ?, ?)`,
    [tokenHash(token), planId, hashIp(ip)]
  );
  return { token, planId };
}

/** Busca a sessão pelo token do cookie. Retorna { planId, ipHash } ou null. */
export async function findSession(token) {
  if (!token) return null;
  await init();
  const [rows] = await pool.query(
    'SELECT plan_id, ip_hash FROM sessions WHERE token_hash = ? LIMIT 1',
    [tokenHash(token)]
  );
  if (!rows.length) return null;
  return { planId: rows[0].plan_id, ipHash: rows[0].ip_hash };
}

/** Atualiza o IP da sessão (caso de troca de rede). */
export async function touchSession(token, ip) {
  if (!token) return;
  await init();
  await pool.query(
    `UPDATE sessions SET ip_hash = ? WHERE token_hash = ?`,
    [hashIp(ip), tokenHash(token)]
  );
}

// ============ IP USAGE (limite 1 relatório final por IP) ============

/** Retorna a linha de uso do IP para um agente específico, se existir. */
export async function getIpUsage(ip, agent) {
  await init();
  const h = hashIp(ip);
  if (!h) return null;
  const [rows] = await pool.query(
    `SELECT plan_id, agent, used_at FROM ip_usage WHERE ip_hash = ? AND agent = ? LIMIT 1`,
    [h, agent]
  );
  return rows[0] || null;
}

/** Marca o IP como tendo usado o agente. Idempotente — não sobrescreve uso anterior. */
export async function markIpUsage(ip, planId, agent) {
  await init();
  const h = hashIp(ip);
  if (!h) return false;
  const [r] = await pool.query(
    `INSERT IGNORE INTO ip_usage (ip_hash, plan_id, agent) VALUES (?, ?, ?)`,
    [h, planId, agent]
  );
  return r.affectedRows > 0;
}

export async function deleteLead(planId) {
  await init();
  const [result] = await pool.query('DELETE FROM leads WHERE plan_id = ?', [planId]);
  return result.affectedRows > 0;
}

export async function closePool() {
  await pool.end();
}
