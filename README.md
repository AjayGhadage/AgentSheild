# AgentShield AI — Autonomous AI Agent Security Assessment & Defense Platform

> **Tagline:** Secure Every Action. Explain Every Decision. Prove Every Defense.  
> **Platform:** Enterprise AI Security Gateway & Pre-Execution Defense Layer  
> **Core Architecture:** 5-Signal Mathematical Risk Model with Dominant Safeguard  
> **Database Foundation:** Oracle Database Express Edition (XE) with `oracledb` node driver  
> **AI Foundation:** NVIDIA Nemotron (`nvidia/llama-3.1-nemotron-70b-instruct` & `nvidia/nemotron-mini-4b-instruct`) via Nebius Token Factory  
> **Compliance:** DPDP Act 2023 & NIST AI 600-1 Guidelines

---

## 🛡️ Overview

**AgentShield AI** is an AI security gateway positioned between autonomous AI agents and the sensitive tools, APIs, files, and databases they interact with.

Autonomous agents possess tool-use and reasoning capabilities, but they are vulnerable to:
1. **Prompt Injection & Jailbreaks** (overriding system safety constraints).
2. **Unauthorized Tool Execution & Tool Abuse** (accessing database tables or executing state changes outside permitted scopes).
3. **Sensitive-Data Exfiltration** (transmitting API keys, tokens, or PII to untrusted destinations).
4. **RAG & Knowledge Base Poisoning** (*PoisonedRAG* attacks embedding malicious instructions in retrieved text).
5. **Agent Memory Corruption** (*AgentPoison* attacks altering long-term memory state).
6. **Multi-Step Attack Chains** (subtle combinations of actions, such as reading private keys followed by outbound HTTP calls).

AgentShield intercepts every proposed action **before execution**, evaluating a **5-signal risk model** ($r_P, r_B, r_T, r_M, r_G$) with a **dominant safeguard** ($\rho = 0.8$), enforcing **Allow, Confirm, Block, or Isolate** decisions, and writing cryptographic, tamper-evident SHA-256 audit records.

---

## 🏛️ High-Level Architecture

```text
                             USER / AGENT
                                  │
                                  ▼
                     REACT + VITE DASHBOARD (PORT 5173)
                                  │
                                  ▼ (REST API)
                     EXPRESS SECURITY GATEWAY (PORT 5000)
                                  │
                   Authentication + Request Validation
                                  │
                                  ▼
                        AGENTSHIELD CORE ENGINE
            ┌─────────────────────┼─────────────────────┐
            ▼                     ▼                     ▼
     NVIDIA NEMOTRON      DETERMINISTIC POLICY   SENSITIVE DATA GUARDS
     (Nebius Factory)      (Tool Allowlists)     (Regex + Entropy)
            │                     │                     │
            └─────────────────────┼─────────────────────┘
                                  │
                                  ▼
                           DECISION ENGINE
            ┌─────────────────────┼─────────────────────┐
            ▼                     ▼                     ▼
          ALLOW           REQUIRE_APPROVAL            BLOCK
            │                     │                     │
            ▼                     ▼                     ▼
    SANDBOXED TOOL         PENDING HUMAN         PREVENTED (PROVEN
       EXECUTION              REVIEW               NON-EXECUTED)
            │                     │                     │
            └─────────────────────┼─────────────────────┘
                                  │
                                  ▼
                        TAMPER-EVIDENT AUDIT
                        (SHA-256 Hash Chain)
                                  │
                                  ▼
                        ORACLE XE DATABASE
```

---

## 🚀 Key Features

1. **Security Overview Dashboard:** Real-time visibility into checks performed, threats detected, actions blocked, and pending approvals.
2. **Threat Scanner:** Evaluates raw prompts or retrieved documents with NVIDIA Nemotron and local deterministic detectors.
3. **Live Agent Security Sandbox:** Sandboxed tools (`read_public_document`, `read_protected_file`, `query_demo_database`, `send_simulated_http_request`, `write_demo_file`) intercepted in real time. For blocked actions, AgentShield proves the tool was never invoked.
4. **Agent Action Monitor:** Detailed inspection of every tool invocation, risk assessment, policy outcomes, and execution artifacts.
5. **Policy Manager:** Granular tool permissions, risk thresholds, and human review requirements with immutable versioning.
6. **Multi-Step Attack-Chain Detection:** Correlates operations within sliding time windows to intercept escalating threats.
7. **Human Approval Workflow:** Review and approve or reject high-risk actions before tool execution with strict action-hash binding.
8. **Sensitive Data Protection:** Detects and redacts API keys, AWS credentials, Bearer tokens, passwords, emails, and synthetic secrets.
9. **Tamper-Evident Audit Explorer:** SHA-256 cryptographic hash chain linking each audit record to the previous one, with a mathematical verification endpoint.
10. **Evaluation Lab & Benchmarking:** Built-in test suite calculating Precision, Recall, F1 score, Detection Rate, and False-Positive Rate on curated datasets.

---

## 💻 Tech Stack

- **Backend:** Node.js (ES modules), Express.js, `oracledb` 6.x, Zod, Helmet, CORS, Express Rate Limit, bcryptjs, jsonwebtoken.
- **Database:** Oracle Database Express Edition (XE) with custom schema, constraints, sequences, and CLOB auto-fetching.
- **Frontend:** React 19, Vite, Tailwind CSS, Lucide React, Recharts, React Router v7.
- **AI Integration:** NVIDIA Nemotron via Nebius Token Factory OpenAI-compatible API (`/chat/completions`).

---

## ⚙️ Quickstart & Setup

### 1. Prerequisites
- **Node.js** v18+ or v20+ / v22+
- **Oracle XE** (11g, 19c, 21c, or 23ai) running locally on port 1521 (service `XE` or pluggable DB)

### 2. Configure Environment Variables
In `server/.env`:
```env
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173

# Oracle XE Configuration
DB_USER=agentshield_app
DB_PASSWORD=AgentShield_2026
DB_CONNECT_STRING=localhost:1521/XE
DB_POOL_MIN=1
DB_POOL_MAX=5

# JWT Secret
JWT_SECRET=agentshield_jwt_secret_dev_2026_super_secure_key_32chars

# Nebius Token Factory / NVIDIA Nemotron
NEBIUS_API_KEY=replace_with_your_nebius_api_key
NEBIUS_BASE_URL=https://api.studio.nebius.ai/v1
NEBIUS_MODEL=nvidia/llama-3.1-nemotron-70b-instruct
```

### 3. Initialize & Seed Oracle Database
From the `server` directory:
```bash
# Test Oracle connectivity
npm run test:db

# Set up schema (tables, constraints, indexes)
npm run setup:db

# Seed default benchmark suite, policies, and demo agent
npm run seed:db
```

### 4. Run Automated Test Suite
Verify all 55 integration and security tests pass:
```bash
npm test
```

### 5. Start Backend Server
```bash
npm run dev
# Server running at http://localhost:5000/api/v1
```

### 6. Start Frontend Dashboard
From the `client` directory:
```bash
npm run dev
# Dashboard running at http://localhost:5173
```

---

## 🔑 Default Credentials

- **Email:** `admin@agentshield.ai`
- **Password:** `Admin@1234`
- **Role:** `admin`

---

## 🧪 Test Verification & Results

```text
======================================================
🚀 AgentShield AI Integration & Security Test Suite
======================================================
🔹 Test 1: System & Database Health Check (Oracle XE)      ✅ PASS
🔹 Test 2: Authentication & JWT Issuance                   ✅ PASS
🔹 Test 3: Authenticated Session Profile (/auth/me)        ✅ PASS
🔹 Test 4: Dashboard Overview & Real Metrics               ✅ PASS
🔹 Test 5: Security Policies Registry                      ✅ PASS
🔹 Test 6: Agent Management & Scoped Permissions           ✅ PASS
🔹 Test 7: Threat Scanner — Benign Instruction (ALLOW)     ✅ PASS
🔹 Test 8: Threat Scanner — Prompt Injection (BLOCK)       ✅ PASS
🔹 Test 9: Threat Scanner — Sensitive Data Detection       ✅ PASS
🔹 Test 10: Sandbox Gateway — Legitimate Tool Call (ALLOW)  ✅ PASS
🔹 Test 11: Sandbox Gateway — Exfiltration Blocked (BLOCK)  ✅ PASS
🔹 Test 12: Sandbox Gateway — Approval Flow (REQ_APPROVAL)  ✅ PASS
🔹 Test 13: Reviewer Action Approval & Safe Execution       ✅ PASS
🔹 Test 14: Tamper-Evident SHA-256 Audit Verification      ✅ PASS
🔹 Test 15: Security Evaluation Benchmark Suite (F1=0.75)   ✅ PASS

======================================================
📊 TEST SUITE SUMMARY: 55 PASSED, 0 FAILED
======================================================
```

---

## 📄 License
MIT License.
