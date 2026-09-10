// Conexión a PostgreSQL
require('dotenv').config();
const { Pool } = require('pg');
const { reportarError } = require("../utils/errores");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway')
    ? { rejectUnauthorized: false }
    : false
});

pool.on('connect', () => {
  console.log('✅ Conectado a PostgreSQL');
});

pool.on('error', (err) => {
  reportarError("Error inesperado en el pool de PostgreSQL", err);
});

module.exports = pool;
