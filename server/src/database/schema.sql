-- ============================================================
-- AgentShield AI — Oracle XE Schema
-- Run as the agentshield_app user (or SYSTEM with schema prefix)
-- ============================================================

-- ─── USERS ────────────────────────────────────────────────
CREATE TABLE users (
  id            VARCHAR2(36) DEFAULT SYS_GUID() PRIMARY KEY,
  name          VARCHAR2(120) NOT NULL,
  email         VARCHAR2(255) NOT NULL,
  password_hash VARCHAR2(255) NOT NULL,
  role          VARCHAR2(30)  DEFAULT 'user' NOT NULL,  -- user | admin | reviewer
  status        VARCHAR2(20)  DEFAULT 'active' NOT NULL,
  created_at    TIMESTAMP DEFAULT SYSTIMESTAMP,
  updated_at    TIMESTAMP DEFAULT SYSTIMESTAMP,
  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT ck_users_role   CHECK (role IN ('user','admin','reviewer')),
  CONSTRAINT ck_users_status CHECK (status IN ('active','suspended','deleted'))
);
CREATE INDEX idx_users_email ON users (email);

-- ─── AGENTS ───────────────────────────────────────────────
CREATE TABLE agents (
  id            VARCHAR2(36) DEFAULT SYS_GUID() PRIMARY KEY,
  owner_id      VARCHAR2(36) NOT NULL,
  name          VARCHAR2(120) NOT NULL,
  description   VARCHAR2(1000),
  status        VARCHAR2(20) DEFAULT 'active' NOT NULL,
  configuration CLOB,                         -- JSON
  created_at    TIMESTAMP DEFAULT SYSTIMESTAMP,
  updated_at    TIMESTAMP DEFAULT SYSTIMESTAMP,
  CONSTRAINT fk_agents_owner FOREIGN KEY (owner_id) REFERENCES users(id),
  CONSTRAINT ck_agents_status CHECK (status IN ('active','inactive','suspended'))
);
CREATE INDEX idx_agents_owner ON agents (owner_id);

-- ─── AGENT PERMISSIONS ────────────────────────────────────
CREATE TABLE agent_permissions (
  id               VARCHAR2(36) DEFAULT SYS_GUID() PRIMARY KEY,
  agent_id         VARCHAR2(36) NOT NULL,
  tool_name        VARCHAR2(120) NOT NULL,
  permission_scope VARCHAR2(255),
  allowed          NUMBER(1) DEFAULT 1,
  created_at       TIMESTAMP DEFAULT SYSTIMESTAMP,
  updated_at       TIMESTAMP DEFAULT SYSTIMESTAMP,
  CONSTRAINT fk_ap_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  CONSTRAINT uq_ap_agent_tool UNIQUE (agent_id, tool_name)
);
CREATE INDEX idx_ap_agent ON agent_permissions (agent_id);

-- ─── SECURITY POLICIES ────────────────────────────────────
CREATE TABLE security_policies (
  id            VARCHAR2(36) DEFAULT SYS_GUID() PRIMARY KEY,
  name          VARCHAR2(120) NOT NULL,
  description   VARCHAR2(1000),
  policy_type   VARCHAR2(60) NOT NULL,  -- tool_access | data_protection | approval | rate_limit
  configuration CLOB NOT NULL,          -- JSON
  enabled       NUMBER(1) DEFAULT 1,
  created_by    VARCHAR2(36),
  version_num   NUMBER DEFAULT 1,
  created_at    TIMESTAMP DEFAULT SYSTIMESTAMP,
  updated_at    TIMESTAMP DEFAULT SYSTIMESTAMP,
  CONSTRAINT fk_sp_creator FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ─── POLICY VERSIONS ──────────────────────────────────────
CREATE TABLE policy_versions (
  id                     VARCHAR2(36) DEFAULT SYS_GUID() PRIMARY KEY,
  policy_id              VARCHAR2(36) NOT NULL,
  version_number         NUMBER NOT NULL,
  configuration_snapshot CLOB NOT NULL,   -- JSON snapshot
  created_by             VARCHAR2(36),
  created_at             TIMESTAMP DEFAULT SYSTIMESTAMP,
  CONSTRAINT fk_pv_policy  FOREIGN KEY (policy_id)  REFERENCES security_policies(id) ON DELETE CASCADE,
  CONSTRAINT fk_pv_creator FOREIGN KEY (created_by) REFERENCES users(id)
);
CREATE INDEX idx_pv_policy ON policy_versions (policy_id);

-- ─── SECURITY SCANS ───────────────────────────────────────
CREATE TABLE security_scans (
  id                   VARCHAR2(36) DEFAULT SYS_GUID() PRIMARY KEY,
  user_id              VARCHAR2(36),
  agent_id             VARCHAR2(36),
  trace_id             VARCHAR2(36) NOT NULL,
  input_hash           VARCHAR2(64),
  risk_score           NUMBER(5,2),
  severity             VARCHAR2(20),   -- low | medium | high | critical
  model_recommendation VARCHAR2(20),   -- ALLOW | BLOCK | REQUIRE_APPROVAL
  final_decision       VARCHAR2(20),   -- ALLOW | BLOCK | REQUIRE_APPROVAL | ERROR
  analysis_status      VARCHAR2(30) DEFAULT 'pending',
  model_identifier     VARCHAR2(255),
  latency_ms           NUMBER,
  threat_categories    CLOB,           -- JSON array
  evidence             CLOB,           -- JSON array
  explanation          CLOB,
  created_at           TIMESTAMP DEFAULT SYSTIMESTAMP,
  CONSTRAINT fk_ss_user  FOREIGN KEY (user_id)  REFERENCES users(id),
  CONSTRAINT fk_ss_agent FOREIGN KEY (agent_id) REFERENCES agents(id),
  CONSTRAINT ck_ss_severity CHECK (severity IN ('low','medium','high','critical')),
  CONSTRAINT ck_ss_decision CHECK (final_decision IN ('ALLOW','BLOCK','REQUIRE_APPROVAL','ERROR','PENDING'))
);
CREATE INDEX idx_ss_user      ON security_scans (user_id);
CREATE INDEX idx_ss_agent     ON security_scans (agent_id);
CREATE INDEX idx_ss_trace     ON security_scans (trace_id);
CREATE INDEX idx_ss_created   ON security_scans (created_at);
CREATE INDEX idx_ss_severity  ON security_scans (severity);

-- ─── AGENT ACTIONS ────────────────────────────────────────
CREATE TABLE agent_actions (
  id                     VARCHAR2(36) DEFAULT SYS_GUID() PRIMARY KEY,
  agent_id               VARCHAR2(36) NOT NULL,
  scan_id                VARCHAR2(36),
  trace_id               VARCHAR2(36) NOT NULL,
  parent_action_id       VARCHAR2(36),
  tool_name              VARCHAR2(120) NOT NULL,
  arguments_redacted     CLOB,         -- JSON — sensitive fields masked
  arguments_hash         VARCHAR2(64),
  risk_score             NUMBER(5,2),
  status                 VARCHAR2(30) DEFAULT 'pending',
  policy_version_id      VARCHAR2(36),
  execution_started_at   TIMESTAMP,
  execution_completed_at TIMESTAMP,
  execution_result       CLOB,         -- JSON
  created_at             TIMESTAMP DEFAULT SYSTIMESTAMP,
  CONSTRAINT fk_aa_agent  FOREIGN KEY (agent_id) REFERENCES agents(id),
  CONSTRAINT fk_aa_scan   FOREIGN KEY (scan_id)  REFERENCES security_scans(id),
  CONSTRAINT fk_aa_parent FOREIGN KEY (parent_action_id) REFERENCES agent_actions(id),
  CONSTRAINT fk_aa_pv     FOREIGN KEY (policy_version_id) REFERENCES policy_versions(id),
  CONSTRAINT ck_aa_status CHECK (status IN ('pending','allowed','blocked','require_approval','executing','completed','failed'))
);
CREATE INDEX idx_aa_agent   ON agent_actions (agent_id);
CREATE INDEX idx_aa_trace   ON agent_actions (trace_id);
CREATE INDEX idx_aa_status  ON agent_actions (status);

-- ─── POLICY EVALUATIONS ───────────────────────────────────
CREATE TABLE policy_evaluations (
  id                VARCHAR2(36) DEFAULT SYS_GUID() PRIMARY KEY,
  action_id         VARCHAR2(36) NOT NULL,
  policy_version_id VARCHAR2(36),
  check_name        VARCHAR2(120) NOT NULL,
  outcome           VARCHAR2(20) NOT NULL,  -- pass | fail | skip
  evidence_redacted CLOB,
  created_at        TIMESTAMP DEFAULT SYSTIMESTAMP,
  CONSTRAINT fk_pe_action FOREIGN KEY (action_id) REFERENCES agent_actions(id) ON DELETE CASCADE
);
CREATE INDEX idx_pe_action ON policy_evaluations (action_id);

-- ─── APPROVAL REQUESTS ────────────────────────────────────
CREATE TABLE approval_requests (
  id           VARCHAR2(36) DEFAULT SYS_GUID() PRIMARY KEY,
  action_id    VARCHAR2(36) NOT NULL,
  requested_by VARCHAR2(36),
  reviewed_by  VARCHAR2(36),
  status       VARCHAR2(20) DEFAULT 'pending',
  reason       VARCHAR2(1000),
  action_hash  VARCHAR2(64) NOT NULL,
  expires_at   TIMESTAMP NOT NULL,
  reviewed_at  TIMESTAMP,
  created_at   TIMESTAMP DEFAULT SYSTIMESTAMP,
  CONSTRAINT fk_ar_action   FOREIGN KEY (action_id)    REFERENCES agent_actions(id),
  CONSTRAINT fk_ar_requester FOREIGN KEY (requested_by) REFERENCES users(id),
  CONSTRAINT fk_ar_reviewer  FOREIGN KEY (reviewed_by)  REFERENCES users(id),
  CONSTRAINT ck_ar_status    CHECK (status IN ('pending','approved','rejected','expired'))
);
CREATE INDEX idx_ar_action ON approval_requests (action_id);
CREATE INDEX idx_ar_status ON approval_requests (status);

-- ─── INCIDENTS ────────────────────────────────────────────
CREATE TABLE incidents (
  id          VARCHAR2(36) DEFAULT SYS_GUID() PRIMARY KEY,
  title       VARCHAR2(255) NOT NULL,
  description CLOB,
  severity    VARCHAR2(20) NOT NULL,
  status      VARCHAR2(30) DEFAULT 'open',
  agent_id    VARCHAR2(36),
  created_at  TIMESTAMP DEFAULT SYSTIMESTAMP,
  updated_at  TIMESTAMP DEFAULT SYSTIMESTAMP,
  resolved_at TIMESTAMP,
  CONSTRAINT fk_inc_agent FOREIGN KEY (agent_id) REFERENCES agents(id),
  CONSTRAINT ck_inc_severity CHECK (severity IN ('low','medium','high','critical')),
  CONSTRAINT ck_inc_status   CHECK (status IN ('open','investigating','resolved'))
);
CREATE INDEX idx_inc_agent    ON incidents (agent_id);
CREATE INDEX idx_inc_status   ON incidents (status);
CREATE INDEX idx_inc_severity ON incidents (severity);

-- ─── INCIDENT EVENTS ──────────────────────────────────────
CREATE TABLE incident_events (
  id                  VARCHAR2(36) DEFAULT SYS_GUID() PRIMARY KEY,
  incident_id         VARCHAR2(36) NOT NULL,
  action_id           VARCHAR2(36),
  scan_id             VARCHAR2(36),
  event_type          VARCHAR2(60) NOT NULL,
  event_data_redacted CLOB,
  created_at          TIMESTAMP DEFAULT SYSTIMESTAMP,
  CONSTRAINT fk_ie_incident FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
  CONSTRAINT fk_ie_action   FOREIGN KEY (action_id)   REFERENCES agent_actions(id),
  CONSTRAINT fk_ie_scan     FOREIGN KEY (scan_id)     REFERENCES security_scans(id)
);
CREATE INDEX idx_ie_incident ON incident_events (incident_id);

-- ─── AUDIT LOGS ───────────────────────────────────────────
CREATE TABLE audit_logs (
  id                VARCHAR2(36) DEFAULT SYS_GUID() PRIMARY KEY,
  event_id          VARCHAR2(36) NOT NULL,
  trace_id          VARCHAR2(36),
  actor_id          VARCHAR2(36),
  agent_id          VARCHAR2(36),
  event_type        VARCHAR2(60) NOT NULL,
  resource_type     VARCHAR2(60),
  resource_id       VARCHAR2(36),
  decision          VARCHAR2(30),
  evidence_redacted CLOB,
  previous_hash     VARCHAR2(64),
  record_hash       VARCHAR2(64) NOT NULL,
  created_at        TIMESTAMP DEFAULT SYSTIMESTAMP,
  CONSTRAINT uq_al_event_id UNIQUE (event_id)
);
CREATE INDEX idx_al_trace   ON audit_logs (trace_id);
CREATE INDEX idx_al_actor   ON audit_logs (actor_id);
CREATE INDEX idx_al_agent   ON audit_logs (agent_id);
CREATE INDEX idx_al_created ON audit_logs (created_at);

-- ─── BENCHMARK DATASETS ───────────────────────────────────
CREATE TABLE benchmark_datasets (
  id          VARCHAR2(36) DEFAULT SYS_GUID() PRIMARY KEY,
  name        VARCHAR2(120) NOT NULL,
  version     VARCHAR2(20)  NOT NULL,
  description CLOB,
  created_at  TIMESTAMP DEFAULT SYSTIMESTAMP
);

-- ─── BENCHMARK CASES ──────────────────────────────────────
CREATE TABLE benchmark_cases (
  id               VARCHAR2(36) DEFAULT SYS_GUID() PRIMARY KEY,
  dataset_id       VARCHAR2(36) NOT NULL,
  case_key         VARCHAR2(60) NOT NULL,
  category         VARCHAR2(60) NOT NULL,
  input_data       CLOB NOT NULL,      -- JSON
  expected_behavior VARCHAR2(500),
  expected_decision VARCHAR2(30),
  labels           CLOB,               -- JSON array
  created_at       TIMESTAMP DEFAULT SYSTIMESTAMP,
  CONSTRAINT fk_bc_dataset FOREIGN KEY (dataset_id) REFERENCES benchmark_datasets(id) ON DELETE CASCADE,
  CONSTRAINT uq_bc_key UNIQUE (dataset_id, case_key)
);
CREATE INDEX idx_bc_dataset ON benchmark_cases (dataset_id);

-- ─── BENCHMARK RUNS ───────────────────────────────────────
CREATE TABLE benchmark_runs (
  id                      VARCHAR2(36) DEFAULT SYS_GUID() PRIMARY KEY,
  dataset_id              VARCHAR2(36) NOT NULL,
  initiated_by            VARCHAR2(36),
  model_identifier        VARCHAR2(255),
  policy_version_reference VARCHAR2(36),
  status                  VARCHAR2(20) DEFAULT 'pending',
  metrics_json            CLOB,
  started_at              TIMESTAMP,
  completed_at            TIMESTAMP,
  CONSTRAINT fk_br_dataset FOREIGN KEY (dataset_id)   REFERENCES benchmark_datasets(id),
  CONSTRAINT fk_br_user    FOREIGN KEY (initiated_by) REFERENCES users(id),
  CONSTRAINT ck_br_status  CHECK (status IN ('pending','running','completed','failed'))
);

-- ─── BENCHMARK RESULTS ────────────────────────────────────
CREATE TABLE benchmark_results (
  id                     VARCHAR2(36) DEFAULT SYS_GUID() PRIMARY KEY,
  run_id                 VARCHAR2(36) NOT NULL,
  case_id                VARCHAR2(36) NOT NULL,
  actual_recommendation  VARCHAR2(30),
  actual_decision        VARCHAR2(30),
  execution_result       CLOB,          -- JSON
  latency_ms             NUMBER,
  pass_status            VARCHAR2(10),  -- pass | fail
  result_details         CLOB,          -- JSON
  created_at             TIMESTAMP DEFAULT SYSTIMESTAMP,
  CONSTRAINT fk_bres_run  FOREIGN KEY (run_id)  REFERENCES benchmark_runs(id)  ON DELETE CASCADE,
  CONSTRAINT fk_bres_case FOREIGN KEY (case_id) REFERENCES benchmark_cases(id)
);
CREATE INDEX idx_bres_run ON benchmark_results (run_id);

-- ─── SEED: Default Admin User ──────────────────────────────
-- password = 'Admin@1234' (bcrypt hash — change before production)
INSERT INTO users (id, name, email, password_hash, role, status)
VALUES (
  SYS_GUID(),
  'AgentShield Admin',
  'admin@agentshield.ai',
  '$2b$12$WU9Lt/KeZl6GgUr6h9VjV./Z9VhSH9r6ah9sjPJx6wPe9qv3B8jr6',
  'admin',
  'active'
);

COMMIT;
