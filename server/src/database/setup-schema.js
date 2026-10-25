/**
 * AgentShield — Oracle XE Schema Setup Script
 * Run: node src/database/setup-schema.js
 *
 * Executes schema.sql statements one by one against Oracle XE.
 * Skips statements that fail with ORA-00955 (object already exists).
 */
import 'dotenv/config';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import oracledb from 'oracledb';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Helpers ─────────────────────────────────────────────────
function splitStatements(sql) {
  // Remove single-line comments (-- ...)
  const noComments = sql.replace(/--[^\r\n]*/g, '');
  // Split on semicolons followed by optional whitespace / newline
  return noComments
    .split(/;/)
    .map(s => s.trim())
    .filter(s => s.length > 3); // filter empty or whitespace-only
}

function isIgnorableError(err) {
  const ignorable = [
    'ORA-00955', // name is already used by an existing object
    'ORA-01408', // such column list already indexed
    'ORA-01430', // column already exists
    'ORA-02261', // unique constraint already exists
    'ORA-02449', // unique/primary keys referenced by foreign keys
    'ORA-00001', // unique constraint violated (e.g. seed data already inserted)
  ];
  return ignorable.some(code => err.message.includes(code));
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  let connection;

  try {
    // Init Oracle client (thin mode on Windows if Instant Client not installed)
    try {
      oracledb.initOracleClient({
        libDir: process.env.ORACLE_LIB_DIR || 'C:\\oraclexe\\app\\oracle\\product\\11.2.0\\server\\bin',
      });
    } catch (e) {
      if (!e.message.includes('NJS-077') && !e.message.includes('already')) {
        console.warn('[WARN] Thick client unavailable, using Thin mode:', e.message);
      }
    }
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
    oracledb.autoCommit = false;

    console.log('\n🔌 Connecting to Oracle XE…');
    connection = await oracledb.getConnection({
      user:          process.env.DB_USER,
      password:      process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
    });
    console.log('✅ Connected as:', process.env.DB_USER);

    // Read schema file
    const schemaPath = join(__dirname, 'schema.sql');
    const schemaSql  = await readFile(schemaPath, 'utf8');
    const statements = splitStatements(schemaSql);

    console.log(`\n📋 Executing ${statements.length} SQL statements…\n`);

    let created = 0, skipped = 0, failed = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const preview = stmt.slice(0, 70).replace(/\s+/g, ' ');

      try {
        await connection.execute(stmt);
        console.log(`  [${i + 1}/${statements.length}] ✅ ${preview}…`);
        created++;
      } catch (err) {
        if (isIgnorableError(err)) {
          console.log(`  [${i + 1}/${statements.length}] ⚠  Already exists — skipped: ${preview}…`);
          skipped++;
        } else {
          console.error(`  [${i + 1}/${statements.length}] ❌ FAILED: ${preview}…`);
          console.error(`     Error: ${err.message}`);
          failed++;
          // Continue applying remaining statements
        }
      }
    }

    await connection.commit();

    console.log('\n──────────────────────────────────────────');
    console.log(`✅ Schema setup complete`);
    console.log(`   Created/executed : ${created}`);
    console.log(`   Skipped (exists) : ${skipped}`);
    console.log(`   Failed           : ${failed}`);
    console.log('──────────────────────────────────────────\n');

    if (failed > 0) {
      console.warn('⚠  Some statements failed. Review errors above.');
      process.exitCode = 1;
    }

  } catch (err) {
    console.error('\n❌ Fatal error:', err.message);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.close().catch(() => {});
    }
  }
}

main();
