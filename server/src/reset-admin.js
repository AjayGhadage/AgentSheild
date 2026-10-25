import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { initializePool, query, transaction, closePool } from './config/db.js';

async function main() {
  await initializePool();
  const newHash = await bcrypt.hash('Admin@1234', 12);
  console.log('Generated hash for Admin@1234:', newHash);

  await transaction(async (conn) => {
    await conn.execute(
      `UPDATE users SET password_hash = :pHash WHERE email = 'admin@agentshield.ai'`,
      { pHash: newHash }
    );
  });

  const check = await query(`SELECT email, password_hash FROM users WHERE email = 'admin@agentshield.ai'`);
  const ok = await bcrypt.compare('Admin@1234', check.rows[0].PASSWORD_HASH);
  console.log('Verified match:', ok);
  await closePool();
}

main();
