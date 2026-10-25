import 'dotenv/config';
import oracledb from 'oracledb';

let pool;
let clientInitialized = false;

export async function initializeOracleClient() {
  if (clientInitialized) return;
  try {
    oracledb.initOracleClient({
      libDir: process.env.ORACLE_LIB_DIR || 'C:\\oraclexe\\app\\oracle\\product\\11.2.0\\server\\bin',
    });
  } catch (err) {
    // If Thick mode fails (already initialized or not needed), try Thin mode
    if (!err.message.includes('NJS-077') && !err.message.includes('already')) {
      console.warn('[DB] Oracle Thick client unavailable, attempting Thin mode:', err.message);
    }
  }
  oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
  oracledb.autoCommit = false;
  oracledb.fetchAsString = [oracledb.CLOB];
  clientInitialized = true;
}

export async function initializePool() {
  if (pool) return pool;

  await initializeOracleClient();

  const {
    DB_USER,
    DB_PASSWORD,
    DB_CONNECT_STRING,
    DB_POOL_MIN = '1',
    DB_POOL_MAX = '5',
  } = process.env;

  if (!DB_USER || !DB_PASSWORD || !DB_CONNECT_STRING) {
    throw new Error('Missing required Oracle database environment variables: DB_USER, DB_PASSWORD, DB_CONNECT_STRING');
  }

  pool = await oracledb.createPool({
    user: DB_USER,
    password: DB_PASSWORD,
    connectString: DB_CONNECT_STRING,
    poolMin: Number(DB_POOL_MIN),
    poolMax: Number(DB_POOL_MAX),
    poolIncrement: 1,
    poolTimeout: 60,
  });

  console.log('[DB] Oracle connection pool initialized');
  return pool;
}

export async function getConnection() {
  if (!pool) {
    throw new Error('Oracle connection pool is not initialized. Call initializePool() first.');
  }
  return pool.getConnection();
}

/**
 * Execute a query and auto-release the connection.
 * @param {string} sql - SQL statement with :name bind parameters
 * @param {object|Array} binds - Bind variables
 * @param {object} opts - Additional oracledb options
 */
export async function query(sql, binds = {}, opts = {}) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(sql, binds, { ...opts });
    return result;
  } finally {
    await conn.close();
  }
}

/**
 * Execute multiple statements in a single transaction.
 * Rolls back on any error.
 */
export async function transaction(fn) {
  const conn = await getConnection();
  try {
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    await conn.close();
  }
}

export async function testDatabaseConnection() {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT USER AS "username", SYSTIMESTAMP AS "serverTime" FROM dual`
    );
    return result.rows[0];
  } finally {
    if (connection) await connection.close();
  }
}

export async function closePool() {
  if (pool) {
    await pool.close(10);
    pool = undefined;
    console.log('[DB] Oracle connection pool closed');
  }
}
