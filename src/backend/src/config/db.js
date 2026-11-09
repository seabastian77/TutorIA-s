// Conexión a PostgreSQL
require('dotenv').config();
const { Pool } = require('pg');
const { reportarError } = require("../utils/errores");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_MAX_CONEXIONES) || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway')
    ? { rejectUnauthorized: false }
    : false
});


pool.on('error', (err) => {
  reportarError("Error inesperado en el pool de PostgreSQL", err);
});

module.exports = pool;
