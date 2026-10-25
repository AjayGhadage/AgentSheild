/**
 * Policy Engine Service
 *
 * Performs deterministic policy checks. Hard restrictions cannot be
 * overridden by the model's recommendation.
 */

// ── Default built-in policy rules ─────────────────────────
const PROTECTED_TOOLS = new Set(['read_protected_file', 'query_demo_database', 'write_demo_file']);
const EXTERNAL_TOOLS  = new Set(['send_simulated_http_request']);

const DEFAULT_POLICY = {
  allowedTools:          ['read_public_document'],
  requireApprovalTools:  ['query_demo_database', 'write_demo_file'],
  blockedTools:          ['send_simulated_http_request'],
  maxRiskScore:          59,
  allowExternalRequests: false,
  requireApprovalAbove:  30,
};

/**
 * Evaluate a proposed agent action against the applicable policy.
 *
 * @param {object} action - { toolName, toolArgs, agentId }
 * @param {object} agentPermissions - array of { tool_name, allowed } rows
 * @param {object} policy - the security_policy configuration (JSON)
 * @param {number} riskScore - calculated risk score (0-100)
 * @returns {Array<{check, outcome, reason}>}  evaluations
 */
export function evaluatePolicy({ action, agentPermissions = [], policy = null, riskScore = 0 }) {
  const cfg = policy || DEFAULT_POLICY;
  const { toolName, toolArgs = {} } = action;
  const evaluations = [];

  // ── 1. Tool in agency allowlist ────────────────────────────
  const permRecord = agentPermissions.find(p => p.tool_name === toolName || p.TOOL_NAME === toolName);
  const hasPermission = permRecord
    ? Number(permRecord.allowed ?? permRecord.ALLOWED) === 1
    : false;

  evaluations.push({
    check:   'agent_tool_permission',
    outcome: hasPermission ? 'pass' : 'fail',
    reason:  hasPermission
      ? `Agent has permission to use ${toolName}`
      : `Agent lacks permission to use ${toolName}`,
  });

  // ── 2. Tool in configured blocked list ─────────────────────
  const isBlocked = (cfg.blockedTools || []).includes(toolName);
  evaluations.push({
    check:   'tool_blocklist',
    outcome: isBlocked ? 'fail' : 'pass',
    reason:  isBlocked
      ? `"${toolName}" is blocked by policy`
      : `"${toolName}" not on blocked list`,
  });

  // ── 3. External request restriction ───────────────────────
  if (EXTERNAL_TOOLS.has(toolName) && !cfg.allowExternalRequests) {
    evaluations.push({
      check:   'external_request_restriction',
      outcome: 'fail',
      reason:  'External HTTP requests are not permitted under current policy',
    });
  }

  // ── 4. Risk score threshold ────────────────────────────────
  evaluations.push({
    check:   'risk_score_threshold',
    outcome: riskScore > (cfg.maxRiskScore || 59) ? 'fail' : 'pass',
    reason:  `Risk score ${riskScore} vs max allowed ${cfg.maxRiskScore || 59}`,
  });

  // ── 5. Approval required ───────────────────────────────────
  const needsApproval = (cfg.requireApprovalTools || []).includes(toolName) ||
                        riskScore > (cfg.requireApprovalAbove || 30);
  if (needsApproval && !isBlocked) {
    evaluations.push({
      check:   'approval_required',
      outcome: 'requires_approval',
      reason:  `"${toolName}" requires human approval`,
    });
  }

  return evaluations;
}

/**
 * Derive the final enforcement decision from policy evaluations.
 * Hard BLOCK from any failing check overrides everything.
 */
export function deriveDecision(evaluations) {
  const hasBlock    = evaluations.some(e =>
    e.outcome === 'fail' &&
    ['agent_tool_permission', 'tool_blocklist', 'external_request_restriction', 'risk_score_threshold'].includes(e.check)
  );
  const needApproval = evaluations.some(e => e.outcome === 'requires_approval');

  if (hasBlock)      return 'BLOCK';
  if (needApproval)  return 'REQUIRE_APPROVAL';
  return 'ALLOW';
}
