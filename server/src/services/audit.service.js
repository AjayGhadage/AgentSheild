import crypto from 'crypto';
import { query, transaction } from '../config/db.js';

/**
 * Write an append-only audit record with tamper-evident SHA-256 hash chain.
 */
export async function auditLog({
  traceId      = null,
  actorId      = null,
  agentId      = null,
  eventType,
  resourceType = null,
  resourceId   = null,
  decision     = null,
  evidence     = null,
}) {
  try {
    const eventId = crypto.randomUUID();

    // Query true latest record_hash from database for cross-process integrity
    const prev = await query(
      `SELECT record_hash FROM (
         SELECT record_hash FROM audit_logs ORDER BY created_at DESC
       ) WHERE ROWNUM <= 1`
    );
    const previousHash = prev.rows.length > 0 ? prev.rows[0].RECORD_HASH : '0'.repeat(64);

    // Canonical serialization for the hash
    const canonical = JSON.stringify({
      eventId,
      traceId,
      actorId,
      agentId,
      eventType,
      resourceType,
      resourceId,
      decision,
      previousHash,
    });

    const recordHash = crypto.createHash('sha256').update(canonical).digest('hex');

    await transaction(async (conn) => {
      await conn.execute(
        `INSERT INTO audit_logs
           (id, event_id, trace_id, actor_id, agent_id, event_type,
            resource_type, resource_id, decision, evidence_redacted,
            previous_hash, record_hash)
         VALUES
           (:id, :eventId, :traceId, :actorId, :agentId, :eventType,
            :resourceType, :resourceId, :decision, :evidence,
            :previousHash, :recordHash)`,
        {
          id:           crypto.randomUUID(),
          eventId,
          traceId,
          actorId,
          agentId,
          eventType,
          resourceType,
          resourceId,
          decision,
          evidence:     evidence ? JSON.stringify(evidence) : null,
          previousHash,
          recordHash,
        }
      );
    });

    return { eventId, recordHash };
  } catch (err) {
    // Audit failure is logged but never crashes the main request
    console.error('[AUDIT] Failed to write audit log:', err.message);
    return null;
  }
}

/**
 * Verify integrity of the audit chain from oldest to newest.
 * Returns: { valid: bool, checkedCount, firstBrokenAt }
 */
export async function verifyChain() {
  const result = await query(
    `SELECT event_id, trace_id, actor_id, agent_id, event_type,
            resource_type, resource_id, decision, previous_hash, record_hash
     FROM audit_logs ORDER BY created_at ASC`
  );

  const rows = result.rows;
  let previousHash = '0'.repeat(64);
  let checkedCount = 0;
  let firstBrokenAt = null;

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
      previousHash: row.PREVIOUS_HASH,
    });

    const expected = crypto.createHash('sha256').update(canonical).digest('hex');
    checkedCount++;

    if (
      expected !== row.RECORD_HASH ||
      row.PREVIOUS_HASH !== previousHash
    ) {
      firstBrokenAt = row.EVENT_ID;
      break;
    }
    previousHash = row.RECORD_HASH;
  }

  return {
    valid:          !firstBrokenAt,
    checkedCount,
    firstBrokenAt:  firstBrokenAt || null,
    note:           'Hash chain integrity check. Does not prevent full-chain replacement by a privileged DB user.',
  };
}
