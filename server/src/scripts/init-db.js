#!/usr/bin/env node
/**
 * Inicializa o schema do banco. Útil em deploy:
 *   npm run db:init
 *
 * Idempotente: usa CREATE TABLE IF NOT EXISTS.
 */
import 'dotenv/config';
import { init, closePool } from '../lib/db.js';

try {
  await init();
  console.log('✔ Schema garantido em', process.env.DB_NAME || 'planejamento_estrategico');
} catch (err) {
  console.error('✖ Falha ao inicializar o banco:', err.message);
  process.exitCode = 1;
} finally {
  await closePool();
}
