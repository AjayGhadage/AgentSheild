import 'dotenv/config';
import oracledb from 'oracledb';

async function main() {
  let connection;
  try {
    try {
      oracledb.initOracleClient({
        libDir: process.env.ORACLE_LIB_DIR || 'C:\\oraclexe\\app\\oracle\\product\\11.2.0\\server\\bin',
      });
    } catch {}
    
    connection = await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
    });
    console.log('Connected to Oracle XE');

    const statements = [
      `ALTER TABLE security_scans DROP CONSTRAINT ck_ss_decision`,
      `ALTER TABLE security_scans ADD CONSTRAINT ck_ss_decision CHECK (final_decision IN ('ALLOW','BLOCK','REQUIRE_APPROVAL','CONFIRM','ISOLATE','ERROR','PENDING'))`,
      `ALTER TABLE agent_actions DROP CONSTRAINT ck_aa_status`,
      `ALTER TABLE agent_actions ADD CONSTRAINT ck_aa_status CHECK (status IN ('pending','allowed','blocked','require_approval','confirm','isolated','executing','completed','failed'))`,
    ];

    for (const sql of statements) {
      try {
        await connection.execute(sql);
        console.log('Executed:', sql);
      } catch (err) {
        console.warn('Notice:', err.message);
      }
    }
    console.log('Constraint updates complete.');
  } catch (err) {
    console.error('Fatal:', err);
  } finally {
    if (connection) await connection.close();
  }
}

main();
