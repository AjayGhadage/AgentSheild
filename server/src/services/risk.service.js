/**
 * AgentShield AI — 5-Signal Risk Scoring Engine
 * Based on: "AgentShield AI: A Unified Risk-Aware Security Layer for Autonomous AI Agents"
 * by Ghadage, Gaikwad, Gawade, Gunjal, and Prof. Khairnar (2026)
 *
 * Implements:
 *   1. Five Signals:
 *      - rP: Prompt signal (NVIDIA Nemotron + Injection Patterns)
 *      - rB: Behaviour signal (Anomaly / Task Deviation / Rapid burst)
 *      - rT: Tool signal (Action class sensitivity & permission lookup)
 *      - rM: Memory signal (Agent long-term memory poisoning)
 *      - rG: RAG signal (Retrieved knowledge base content poisoning)
 *
 *   2. Weighted Risk:
 *      R = wP*rP + wB*rB + wT*rT + wM*rM + wG*rG
 *      Initial weights: (0.25, 0.20, 0.20, 0.15, 0.20)
 *
 *   3. Dominant-Signal Safeguard (rho = 0.8):
 *      R* = max(R, rho * max(ri))
 *
 *   4. Four Graded Decisions (tau1=30, tau2=60, tau3=80):
 *      - Allow:   R* <= 30
 *      - Confirm: 30 < R* <= 60  (Requires human-in-the-loop review)
 *      - Block:   60 < R* <= 80  (Pre-execution tool prevention)
 *      - Isolate: R* > 80        (Session quarantine & access revocation)
 */

export const SIGNAL_WEIGHTS = {
  wP: 0.25, // Prompt
  wB: 0.20, // Behaviour
  wT: 0.20, // Tool
  wM: 0.15, // Memory
  wG: 0.20, // RAG / Retrieval
};

export const THRESHOLDS = {
  tau1: 30, // Allow -> Confirm
  tau2: 60, // Confirm -> Block
  tau3: 80, // Block -> Isolate
  rho:  0.8, // Dominant safeguard factor
};

const TOOL_RISK = {
  read_public_document:        10,
  read_protected_file:         60,
  query_demo_database:         30,
  send_simulated_http_request: 95,
  write_demo_file:             50,
};

const THREAT_WEIGHTS = {
  prompt_injection:            40,
  instruction_override:        45,
  unauthorized_tool_access:    50,
  privilege_escalation:        50,
  sensitive_data_exposure:     45,
  suspicious_external_transmission: 50,
  unsafe_action_sequence:      35,
  policy_violation:            30,
  malformed_tool_arguments:    20,
};

/**
 * Calculates 5 individual risk signals and evaluates the paper's multi-signal model.
 */
export function evaluateFiveSignals({
  rP = null,
  rB = null,
  rT = null,
  rM = null,
  rG = null,
  threatTypes = [],
  hasSensitiveData = false,
  toolName = null,
  modelScore = null,
  sessionAnomalous = false,
  memoryPoisoned = false,
  ragPoisoned = false,
  isDenied = false,
  componentUnavailable = false,
  highRiskTool = false,
}) {
  // 1. Calculate rP (Prompt Signal) if not provided explicitly
  let promptScore = rP !== null ? Number(rP) : 0;
  if (rP === null) {
    for (const t of threatTypes) promptScore += THREAT_WEIGHTS[t] || 15;
    if (hasSensitiveData) promptScore += 25;
    if (modelScore !== null) promptScore = Math.round(promptScore * 0.4 + modelScore * 0.6);
    promptScore = Math.min(100, Math.max(0, promptScore));
  }

  // 2. Calculate rB (Behaviour Signal)
  let behaviourScore = rB !== null ? Number(rB) : 0;
  if (rB === null) {
    if (sessionAnomalous) behaviourScore += 50;
    if (toolName === 'send_simulated_http_request') behaviourScore += 40;
    behaviourScore = Math.min(100, Math.max(0, behaviourScore));
  }

  // 3. Calculate rT (Tool Signal)
  let toolScore = rT !== null ? Number(rT) : 0;
  if (rT === null) {
    toolScore = isDenied ? 100 : (TOOL_RISK[toolName] || 20);
  }

  // 4. Calculate rM (Memory Signal)
  let memoryScore = rM !== null ? Number(rM) : 0;
  if (rM === null) {
    memoryScore = memoryPoisoned ? 70 : 0;
  }

  // 5. Calculate rG (RAG Signal)
  let ragScore = rG !== null ? Number(rG) : 0;
  if (rG === null) {
    ragScore = ragPoisoned ? 90 : 0;
  }

  // Equation (1): Weighted Risk
  const R =
    SIGNAL_WEIGHTS.wP * promptScore +
    SIGNAL_WEIGHTS.wB * behaviourScore +
    SIGNAL_WEIGHTS.wT * toolScore +
    SIGNAL_WEIGHTS.wM * memoryScore +
    SIGNAL_WEIGHTS.wG * ragScore;

  // Equation (2): Dominant-Signal Safeguard (rho = 0.8)
  const maxSignal = Math.max(promptScore, behaviourScore, toolScore, memoryScore, ragScore);
  const dominantSafeguard = Math.round(THRESHOLDS.rho * maxSignal * 100) / 100;
  const effectiveRisk = Math.max(Math.round(R * 100) / 100, dominantSafeguard);

  // Equation (3): Graded Decision Selection
  let decision = 'ALLOW';
  if (effectiveRisk <= THRESHOLDS.tau1) {
    decision = 'ALLOW';
  } else if (effectiveRisk <= THRESHOLDS.tau2) {
    decision = 'CONFIRM';
  } else if (effectiveRisk <= THRESHOLDS.tau3) {
    decision = 'BLOCK';
  } else {
    decision = 'ISOLATE';
  }

  // Outside-the-score Hard Constraints (Algorithm 1)
  // Hard constraint: If permission denied, decision must be at least BLOCK
  if (isDenied && decision !== 'ISOLATE') {
    decision = 'BLOCK';
  }

  // Fail-safe rule: If a component is unavailable, min is CONFIRM (or BLOCK for high-risk tools)
  if (componentUnavailable) {
    if (highRiskTool) decision = 'BLOCK';
    else if (decision === 'ALLOW') decision = 'CONFIRM';
  }

  const signals = {
    rP: promptScore,
    rB: behaviourScore,
    rT: toolScore,
    rM: memoryScore,
    rG: ragScore,
  };

  // Identify top contributing signals for plain-English explanation
  const contributing = Object.entries(signals)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, score]) => score > 20)
    .map(([key, score]) => {
      const labels = {
        rP: 'Prompt / Instruction Injection',
        rB: 'Behavioural Anomaly',
        rT: 'Tool Permission & Sensitivity',
        rM: 'Memory Context Integrity',
        rG: 'RAG Knowledge-Base Poisoning',
      };
      return `${labels[key]} (${score}/100)`;
    });

  return {
    weightedRisk: Math.round(R * 100) / 100,
    dominantSafeguard,
    effectiveRisk: Math.min(100, Math.max(0, effectiveRisk)),
    decision,
    severity: scoreToSeverity(effectiveRisk),
    signals,
    contributing,
    dominantTriggered: dominantSafeguard > R,
  };
}

/**
 * Backward-compatible wrapper for existing single-step scan checks
 */
export function calculateRiskScore(params) {
  const result = evaluateFiveSignals(params);
  return Math.round(result.effectiveRisk);
}

export function scoreToSeverity(score) {
  if (score >= THRESHOLDS.tau3) return 'critical';
  if (score >= THRESHOLDS.tau2) return 'high';
  if (score >= THRESHOLDS.tau1) return 'medium';
  return 'low';
}

export function scoreToDecision(score, policyOverride = null) {
  if (policyOverride === 'BLOCK') return 'BLOCK';
  if (policyOverride === 'REQUIRE_APPROVAL' || policyOverride === 'CONFIRM') return 'CONFIRM';
  if (policyOverride === 'ISOLATE') return 'ISOLATE';

  if (score > THRESHOLDS.tau3) return 'ISOLATE';
  if (score > THRESHOLDS.tau2) return 'BLOCK';
  if (score > THRESHOLDS.tau1) return 'CONFIRM';
  return 'ALLOW';
}

