import 'dotenv/config';
import crypto from 'crypto';
import { initializePool, query, transaction, closePool } from '../config/db.js';

async function repairChain() {
  await initializePool();
  try {
    const result = await query(
      `SELECT id, event_id, trace_id, actor_id, agent_id, event_type,
              resource_type, resource_id, decision, previous_hash, record_hash
       FROM audit_logs ORDER BY created_at ASC`
    );

    const rows = result.rows;
    console.log(`Found ${rows.length} audit records. Re-linking chain...`);

    let prevHash = '0'.repeat(64);
    let updatedCount = 0;

    await transaction(async (conn) => {
      for (const row of rows) {
        const canonical = JSON.stringify({
          eventId:      row.EVENT_ID,
          traceId:      row.TRACE_ID,
          actorId:      row.ACTOR_ID,
          agentId:      row.AGENT_ID,
          eventType:    row.EVENT_TYPE,
          resourceType: row.RESOURCE_TYPE,
          resourceId:   row.RESOURCE_ID,
          decision:     row.DECISION,
          previousHash: prevHash,
        });

        const newHash = crypto.createHash('sha256').update(canonical).digest('hex');

        if (row.PREVIOUS_HASH !== prevHash || row.RECORD_HASH !== newHash) {
          await conn.execute(
            `UPDATE audit_logs SET previous_hash = :pHash, record_hash = :rHash WHERE id = :id`,
            { pHash: prevHash, rHash: newHash, id: row.ID }
          );
          updatedCount++;
        }
        prevHash = newHash;
      }
    });

    console.log(`✅ Repaired ${updatedCount} records. Chain is now mathematically contiguous.`);
  } catch (err) {
    console.error('Error repairing chain:', err);
  } finally {
    await closePool();
  }
}

repairChain();
