import 'dotenv/config';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { initializePool, query, transaction, closePool } from '../config/db.js';

async function seedUsers() {
  await initializePool();
  try {
    const users = [
      {
        email: 'reviewer@agentshield.ai',
        name: 'Sarah Chen (Security Analyst)',
        role: 'reviewer',
        password: 'Reviewer@1234',
      },
      {
        email: 'developer@agentshield.ai',
        name: 'Alex Rivera (Agent Engineer)',
        role: 'user',
        password: 'Developer@1234',
      },
    ];

    for (const u of users) {
      const check = await query(`SELECT id FROM users WHERE email = :email`, { email: u.email });
      if (check.rows.length === 0) {
        const hash = await bcrypt.hash(u.password, 12);
        const newId = crypto.randomUUID();
        await transaction(async (conn) => {
          await conn.execute(
            `INSERT INTO users (id, email, password_hash, name, role, status)
             VALUES (:id, :email, :hash, :name, :role, 'active')`,
            { id: newId, email: u.email, hash, name: u.name, role: u.role }
          );
        });
        console.log(`✅ Seeded user: ${u.email} (${u.role})`);
      } else {
        console.log(`ℹ️ User already exists: ${u.email}`);
      }
    }
  } catch (err) {
    console.error('Error seeding users:', err);
  } finally {
    await closePool();
  }
}

seedUsers();
