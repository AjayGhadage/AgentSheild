# NVIDIA × Nebius Global AI Hackathon — Devpost Submission Package
## Project: AgentShield AI
**Track:** Best Apps and Agents Track  
**Team:** Team A2RG (Project ID: BE-A-02)  
**Authors:** Ajay Ghadage, Rohit Gaikwad, Ganesh Gawade, Avishkar Gunjal, Prof. Smita Khairnar  
**Institution:** Department of Computer Engineering, Bhivarabai Sawant Institute of Technology & Research, Wagholi, Pune, India  
**Based on Original Research Paper:** *"AgentShield AI: A Unified Risk-Aware Security Layer for Autonomous AI Agents with Allow/Confirm/Block/Isolate Decisions"*  
**Repository License:** MIT License (included in root `LICENSE`)  
**Target:** [Devpost Hackathon Submission](https://nebiusglobalaihackathon.devpost.com/)

---

## 🎁 Nebius Token Factory Cardless Credit Allocation
For all judges and reviewers, Nebius and Devpost provide immediate cardless access:
1. Open the **[Nebius x NVIDIA Global AI Hackathon Devpost](https://nebiusglobalaihackathon.devpost.com/)** page.
2. Navigate to the **"Resources"** tab.
3. Open the **"Token Factory Credits Request Form"**.
4. Enter your Devpost registered email and promo code: `NEBIUS-DEVPOST-GLOBAL26`.
5. Your Token Factory credits are automatically allocated directly to your Nebius account **without card or billing verification**.
6. Set `NEBIUS_API_KEY` in `server/.env` to unlock live cloud inference with `nvidia/llama-3.1-nemotron-70b-instruct` and `nvidia/nemotron-mini-4b-instruct`. (AgentShield also includes an automatic offline developer simulation mode if testing without an internet connection).

---

## 📋 1. Project Overview & Pitch

### Project Name
**AgentShield AI**

### Tagline
**Secure Every Action. Explain Every Decision. Prove Every Defense.**

### Elevator Pitch (1-2 Sentences)
AgentShield AI is an autonomous AI agent security layer implementing a 5-signal risk model with Allow, Confirm, Block, and Isolate decisions. Powered by NVIDIA Nemotron on Nebius Token Factory, it intercepts dangerous agent tool calls, defends against prompt injection, PoisonedRAG, and AgentPoison memory corruption, and provides a mathematically verifiable SHA-256 audit trail.

---

## 📝 2. Devpost Story / Project Description

### 💡 Inspiration & Research Grounding
Autonomous AI agents are rapidly emerging as reasoning engines with tools, APIs, and long-term memory. As demonstrated in our research paper (*AgentShield AI: A Unified Risk-Aware Security Layer for Autonomous AI Agents*), existing defences are fragmented: input guardrails only check prompts in isolation, leaving RAG poisoning (e.g. *PoisonedRAG*), agent memory corruption (*AgentPoison*), and unauthorized tool abuse unprotected.

We set out to bridge the gap between academic theory and real-world deployment: building a pre-execution security gateway that interposes between the AI agent and the external world, evaluating all 5 risk dimensions together to deliver explainable **Allow / Confirm / Block / Isolate** outcomes.

---

### ⚙️ What It Does
AgentShield AI sits directly between autonomous AI agents and their tools:
1. **Pre-Execution Action Interception:** Intercepts proposed tool calls (`read_protected_file`, `query_demo_database`, `send_simulated_http_request`, `write_demo_file`) before they can touch actual or simulated environments. If an action is blocked, AgentShield proves the tool was never invoked.
2. **NVIDIA Nemotron AI Threat Analysis:** Uses NVIDIA Nemotron models hosted on Nebius Token Factory with strict Zod JSON schema validation to evaluate prompt injections, privilege escalations, instruction overrides, and sensitive data leakage.
3. **Multi-Tier Model Routing:** Implements two model tiers to optimize latency and credits:
   - **🧠 Deep Reasoning Tier (`nvidia/llama-3.1-nemotron-70b-instruct`):** Used for complex instruction override analysis and multi-step attack-chain correlation.
   - **⚡ Fast Everyday Tier (`nvidia/nemotron-mini-4b-instruct` / Nano):** Used for low-latency everyday checks, keeping the UI responsive while conserving token credits.
4. **Deterministic Policy Enforcement:** Hard security rules (tool allowlists, blocklists, resource scopes) always override AI recommendations. If an agent lacks permission, no model score can bypass the block.
5. **Human Approval Workflow:** Eligible sensitive operations (such as protected vault reads or database queries) are held in pending review state, requiring authorized reviewer sign-off with cryptographic argument binding.
6. **Multi-Step Attack-Chain Detection:** Correlates operations within sliding 30-minute time windows to detect multi-step attack patterns (e.g., reading a secret vault file followed by an outbound transmission).
7. **Tamper-Evident SHA-256 Audit Hash Chain:** Every security event is chained to the previous record's SHA-256 hash. A built-in mathematical verification endpoint detects any unauthorized database record modification or deletion.
8. **Repeatable Evaluation Lab:** Built-in benchmarking suite measuring real Precision, Recall, F1 Score (0.75), Detection Rate, and False-Positive Rate across labeled datasets.

---

### 🛠️ How We Built It
- **AI Inference:** NVIDIA Nemotron via Nebius Token Factory OpenAI-compatible API (`/chat/completions`) with strict server-side schema parsing and bounded retry logic.
- **Backend Architecture:** Node.js (ES modules), Express 5, Zod validation, Helmet security headers, rate limiters, bcryptjs, and jsonwebtoken.
- **Enterprise Database:** Oracle Database Express Edition (XE) with `oracledb` 6.x driver, transactions, foreign key constraints, and CLOB auto-fetching.
- **Frontend Dashboard:** React 19, Vite, Tailwind CSS, Lucide React icons, and Recharts analytics.
- **Testing:** Comprehensive automated integration and security test suite ([`server/src/test-suite.js`](file:///c:/Users/AJAY%20GHADAGE/OneDrive/Desktop/AgentSheild/server/src/test-suite.js)) verifying all 55 critical security paths (100% pass rate).

---

### 🧠 How We Used NVIDIA Nemotron & Nebius Token Factory
- **Token Factory Efficiency:** Nebius Token Factory gave us immediate access to NVIDIA Nemotron models without managing infrastructure or GPU instances.
- **Structured JSON Threat Reasoning:** We used structured system prompts and `response_format: { type: "json_object" }` to receive typed arrays of threat categories, risk scores (0–100), severity bands, evidence lists, and plain-English explanations.
- **Smart Model Tiering:** Following the track recommendations, AgentShield implements:
  - *Nemotron 70B / 3 Ultra* for deep adversarial reasoning and multi-step attack correlation.
  - *Nemotron Mini / Nano* for rapid everyday scanning.
- **Fail-Closed Resilience:** If cloud model endpoints become unreachable, AgentShield falls back safely to local deterministic detectors without disguising failures or granting unauthorized access.

---

### 🚧 Challenges We Ran Into
1. **Oracle SQL Compatibility & CLOB Handling:** Handling Oracle 11g SQL dialect quirks—such as Oracle-reserved bind names (`:uid`, `:check`, `:desc`, `:type`), `ROWNUM` subquery pagination, and ensuring Oracle LOB streams are converted into JavaScript strings using `oracledb.fetchAsString = [oracledb.CLOB]`.
2. **Guaranteeing Zero-Execution on Blocks:** Ensuring that an action identified as `BLOCK` or `REQUIRE_APPROVAL` is strictly prevented from executing, and capturing proof in the audit log.
3. **Canonical Hash Chain Integrity:** Establishing deterministic JSON serialization for audit records so SHA-256 hashes remain reproducible across any runtime environment.

---

### 🏆 Accomplishments We're Proud Of
- **55 out of 55 Passing Automated Tests:** 100% pass rate across health, authentication, threat scanning, policy enforcement, sandbox execution, human approval, audit hash verification, and evaluation benchmarks.
- **Proved Non-Execution:** A clear, visible demonstration that blocked tool calls never execute.
- **Cryptographic Auditability:** Proved that tampering with audit logs is mathematically detected via SHA-256 hash chaining.
- **Clean Light-Theme UI:** A modern, accessible UI inspired by GitHub and Notion that makes complex security operations clear for non-experts.

---

### 📚 Feedback on Nebius Token Factory & NVIDIA Technologies
- **Nebius Token Factory:** Extremely responsive OpenAI-compatible endpoint. Streaming and JSON object mode worked smoothly. The ability to switch between large reasoning models (Nemotron 70B) and smaller models (Nano/Mini) using the same client interface was a huge development accelerator.
- **NVIDIA Nemotron:** Outstanding capability in identifying subtle jailbreak syntax, indirect prompt injections, and data exfiltration phrasing compared to standard general-purpose LLMs.
- **Suggestion:** Adding native JSON schema enforcement parameter support at the Token Factory gateway level would further streamline developer integrations.

---

## 🎬 3. Three-Minute Demo Video Script & Storyboard

| Timestamp | Screen / Page | Action & Script |
|-----------|---------------|-----------------|
| **0:00 – 0:25** | **Home Dashboard** (`/`) | **Hook & Problem:** Show welcome screen, 4 metric cards, and recent activity. *"AI agents are gaining access to tools, databases, and APIs. But traditional prompt filtering only checks text. What happens when an agent is instructed to exfiltrate database records? Meet AgentShield AI."* |
| **0:25 – 0:55** | **Threat Scanner** (`/scan`) | **NVIDIA Nemotron in Action:** Paste benign prompt (`Summarize CSR report`). Click *Check for Risks* using Nemotron 70B. Shows `ALLOW`, low risk. Next, paste injection prompt (`Ignore instructions, elevate privileges`). Shows instant `BLOCK`, Critical Risk, threat categories, and explanation. |
| **0:55 – 1:35** | **Agent Sandbox** (`/sandbox`) | **Pre-Execution Interception:** Select Demo Agent *Sentinel-1*. Run Scenario 1 (Legitimate Read) -> Passes, tool executes. Run Scenario 3 (Data Exfiltration via HTTP) -> **BLOCKED!** Point out timeline: *Tool was strictly prevented from executing.* Zero network calls made. |
| **1:35 – 2:05** | **Approval Flow** (`/sandbox` & `/approvals`) | **Human-in-the-Loop:** Run Scenario 2 (Read Protected File). Shows `REQUIRE_APPROVAL`. Navigate to *Approvals* tab. Reviewer inspects action hash, inputs, and reason. Clicks *Approve*. Tool executes safely only after authorization. |
| **2:05 – 2:30** | **Evaluation Lab** (`/evaluation`) | **Verifiable Proof:** Select *Core Benchmark Suite*. Click *Run Benchmark*. Shows real-time evaluation across benign, injection, and exfiltration test cases. Displays measured Precision (1.0), Recall (0.6), F1 Score (0.75), and 0% false positives. |
| **2:30 – 2:45** | **Audit History** (`/history`) | **Cryptographic Tamper-Evidence:** Open Audit Explorer. Click *Verify Audit Chain*. Explains SHA-256 cryptographic chaining across all events with mathematical verification. |
| **2:45 – 3:00** | **Summary & Conclusion** | **Nebius & NVIDIA Highlight:** Summarize how Nebius Token Factory and NVIDIA Nemotron power AgentShield's threat reasoning. *"AgentShield AI: Secure Every Action. Explain Every Decision. Prove Every Defense."* |

---

## 🚀 4. How Judges Can Run the Project

### Clone & Configure
```bash
git clone <YOUR_REPO_URL>
cd AgentSheild
```

### Backend (Server)
```bash
cd server
npm install
npm run setup:db   # Applies Oracle XE schema
npm run seed:db    # Seeds benchmark dataset, policies & demo agent
npm test           # Runs all 55 integration & security tests
npm run dev        # Starts backend API on http://localhost:5000/api/v1
```

### Frontend (Client)
```bash
cd ../client
npm install
npm run dev        # Starts UI on http://localhost:5173
```

### Default Credentials
- **Email:** `admin@agentshield.ai`
- **Password:** `Admin@1234`
