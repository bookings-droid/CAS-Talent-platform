const { Pool, types } = require('pg');
require('dotenv').config();

// OID 1082 = tipo `date` de Postgres. Por defecto node-postgres lo convierte a un
// objeto Date de JS usando el huso horario local del servidor, lo cual desplaza el
// día calendario al serializar con toISOString() (UTC). Como estas columnas nunca
// llevan hora, se devuelven como el string plano 'YYYY-MM-DD' que ya entrega Postgres.
types.setTypeParser(1082, val => val);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

module.exports = { pool };
