/**
 * Attack Chain Detection Service
 *
 * Correlates recent agent actions within a time window to detect
 * suspicious multi-step patterns.
 *
 * Rules are documented and testable — does not claim to detect all
 * attack chains.
 */

import { query } from '../config/db.js';

const CORRELATION_WINDOW_MINUTES = 30;

// ── Suspicious patterns ─────────────────────────────────────────────────
const CHAIN_RULES = [
  {
    id:          'read_then_exfil',
    name:        'Read Protected → External Transmission',
    description: 'Agent read a protected resource and then attempted an external request.',
    severity:    'critical',
    match: (actions) => {
      const reads = actions.filter(a =>
        ['read_protected_file', 'query_demo_database'].includes(a.tool_name || a.TOOL_NAME)
      );
      const exfil = actions.filter(a =>
        ['send_simulated_http_request'].includes(a.tool_name || a.TOOL_NAME)
      );
      return reads.length > 0 && exfil.length > 0;
    },
  },
  {
    id:          'repeated_denied',
    name:        'Repeated Permission Denials',
    description: 'Agent has been denied 3 or more times in the correlation window.',
    severity:    'high',
    match: (actions) => {
      const denied = actions.filter(a =>
        (a.status || a.STATUS) === 'blocked'
      );
      return denied.length >= 3;
    },
  },
  {
    id:          'escalation_attempt',
    name:        'Escalating Tool Sensitivity',
    description: 'Agent escalated from low-sensitivity to high-sensitivity tools in sequence.',
    severity:    'high',
    match: (actions) => {
      const toolRisk = {
        read_public_document:        1,
        read_protected_file:         3,
        query_demo_database:         3,
        write_demo_file:             4,
        send_simulated_http_request: 5,
      };
      const sortedRisks = actions
        .map(a => toolRisk[a.tool_name || a.TOOL_NAME] || 0)
        .filter(r => r > 0);
      // Check for strictly increasing sequence
      let maxSoFar = 0;
      let escalations = 0;
      for (const r of sortedRisks) {
        if (r > maxSoFar) { maxSoFar = r; escalations++; }
      }
      return escalations >= 3;
    },
  },
];

/**
 * Analyze recent actions for a given agent and detect chain attacks.
 * @param {string} agentId
 * @returns {Array<{ruleId, name, severity, matchedActions}>}
 */
export async function detectAttackChains(agentId) {
  const windowStart = new Date(Date.now() - CORRELATION_WINDOW_MINUTES * 60 * 1000);

  const result = await query(
    `SELECT id, tool_name, status, risk_score, created_at
     FROM agent_actions
     WHERE agent_id = :agentId
       AND created_at >= :windowStart
     ORDER BY created_at ASC`,
    { agentId, windowStart }
  );

  const actions = result.rows;
  const detections = [];

  for (const rule of CHAIN_RULES) {
    if (rule.match(actions)) {
      detections.push({
        ruleId:  rule.id,
        name:    rule.name,
        description: rule.description,
        severity: rule.severity,
        actionCount: actions.length,
        windowMinutes: CORRELATION_WINDOW_MINUTES,
      });
    }
  }

  return detections;
}
