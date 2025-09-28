const mysql = require('mysql2');
require('dotenv').config();

// Optional SSL for managed MySQL providers (e.g., Clever Cloud). Set DB_SSL=true in env to enable.
// You can also provide a CA cert via DB_SSL_CA if your provider requires it.
const sslOptions = (() => {
  if (String(process.env.DB_SSL).toLowerCase() === 'true') {
    const opts = { rejectUnauthorized: false };
    if (process.env.DB_SSL_CA) {
      opts.ca = process.env.DB_SSL_CA;
    }
    return opts;
  }
  return undefined;
})();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: sslOptions,
  // Harden connection behavior
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000, // 10s before first keepalive probe
  connectTimeout: 20000,        // 20s connect timeout
});

const promisePool = pool.promise();

module.exports = promisePool;
