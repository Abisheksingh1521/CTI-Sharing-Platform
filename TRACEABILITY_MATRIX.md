# END-TO-END TRACEABILITY MATRIX
**Course:** 24CYS401 – Secure Software Engineering  
**System:** Topic 29 – Cyber Threat Intelligence (CTI) Sharing Platform  
**Status:** ACTIVE & VERIFIED  

---

## 1. Unified 11-Stage Traceability Thread

The following matrix documents the unbroken chain of continuity connecting requirements, use case, asset, data flow, threat model, vulnerability, attack tree, planning, implementation, automated testing, and container deployment controls for our critical security capability: **Confidentiality & TLP Intelligence Access Control**.

| Stage | Artifact Level | Traceable Element ID | Concrete Description & Specification in CTI Platform |
| :---: | :--- | :--- | :--- |
| **1** | **Requirement** | `REQ-SEC-04` | **Traffic Light Protocol (TLP) Enforcement:** The platform must restrict access to threat indicators and incident reports based on TLP rating (CLEAR, GREEN, AMBER, RED) and user organization provenance. |
| **2** | **Use Case** | `UC-02` | **Review & Classify Threat Intelligence with TLP:** Authorized Analyst reviews raw indicators and applies appropriate TLP rating, while the system enforces information barriers during feed distribution. |
| **3** | **Asset** | `A06` / `A05` | **TLP Classification Metadata & Threat Reports:** Contains sensitive victim attribution, compromised internal architecture, and zero-day threat details requiring absolute confidentiality. |
| **4** | **DFD Flow** | `IF-03` / `Process 3.0` | **Threat Feed Egress Flow:** Classified Threat Feed Egress Flow intercepting between data store and threat consumers to evaluate user clearance before serialization. |
| **5** | **STRIDE Threat** | `T04` / `T08` | **Unauthorized Egress of TLP:RED Intelligence:** An unvetted consumer or external adversary queries the feed API to exfiltrate sensitive organizational attribution and incident data. |
| **6** | **Vulnerability** | `V02` | **Broken Access Control / TLP Failure (CWE-639):** Endpoints querying indicators or reports lack explicit validation of user clearance against resource TLP level. |
| **7** | **Attack Tree** | `Root $\rightarrow$ Branch B $\rightarrow$ Leaf B2` | **Exfiltrate TLP:RED $\rightarrow$ Exploit API Access $\rightarrow$ Broken TLP Authorization:** Direct API query targeting `TLP:RED` records without passing through clearance verification. |
| **8** | **Jira Story** | `CTI-107` (`CTI-9`) | **TLP Classification & Access Control:** *As an analyst and consumer*, I want the platform to enforce explicit TLP clearance rules *so that* `TLP:RED` intelligence is never leaked to unauthorized external parties. |
| **9** | **Implementation** | `src/middleware/tlpGuard.js` | Implementation of explicit policy function: `canAccessTLP(user, tlpLevel, resourceOrgId)`. Rejects non-members and standard consumers for `TLP:RED` with HTTP 403. |
| **10** | **Automated Test** | `tests/integration/tlpAccess.test.js` | Integration test suite sending requests as `ROLE_CONSUMER` and asserting `HTTP 403 Forbidden` and omission of `TLP:RED` records from feed payloads. |
| **11** | **Deployment Control**| `k8s/deployment.yaml` | Hardened runtime: Pod runs with `readOnlyRootFilesystem: true`, `runAsNonRoot: true` (UID 10001), `allowPrivilegeEscalation: false`, and dropped Linux capabilities. |

---

## 2. Multi-Requirement Traceability Summary Table (Connecting All 9 Authoritative Assets)

| Requirement ID | Domain | Use Case | Asset ID | DFD Flow | STRIDE ID | Vulnerability ID | Jira Story ID | Code Module | Test Suite |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `REQ-SEC-01` | Auth & MFA | `UC-05` | `A01, A02` | `IF-01` | `T01 (Spoofing)` | `V01` (CWE-798) | `CTI-101` (`CTI-1`) | `src/controllers/authController.js` | `tests/unit/auth.test.js` |
| `REQ-SEC-02` | RBAC Access | `UC-02` | `A09` | `IF-02` | `T06 (Elevation)`| `V03` (CWE-862) | `CTI-102` (`CTI-2`) | `src/middleware/rbacGuard.js` | `tests/integration/rbac.test.js` |
| `REQ-SEC-03` | Input Defanging| `UC-01` | `A04` | `IF-01` | `T02 (Tampering)`| `V05` (CWE-1333)| `CTI-104` (`CTI-6`) | `src/services/iocValidator.js` | `tests/unit/validator.test.js` |
| `REQ-SEC-04` | TLP Barrier | `UC-02` | `A06` | `IF-03` | `T04 (Disclosure)`| `V02` (CWE-639) | `CTI-107` (`CTI-9`) | `src/middleware/tlpGuard.js` | `tests/integration/tlpAccess.test.js` |
| `REQ-SEC-05` | STIX Egress | `UC-03` | `A08` | `IF-03` | `T08 (Disclosure)`| `V02` (CWE-639) | `CTI-108` (`CTI-10`)| `src/services/stixFactory.js` | `tests/integration/feed.test.js` |
| `REQ-SEC-06` | Token Integrity| `UC-05` | `A03` | `IF-01` | `T01 (Spoofing)` | `V01` (CWE-798) | `CTI-101` (`CTI-1`) | `src/middleware/authGuard.js` | `tests/unit/auth.test.js` |
| `REQ-SEC-07` | Audit Integrity| `UC-04` | `A07` | `IF-01,02`| `T03 (Repudiation)`| `V06` (CWE-778)| `CTI-109` (`CTI-11`)| `src/services/auditService.js` | `tests/unit/auditChain.test.js` |
| `REQ-SEC-08` | Incident XSS | `UC-02` | `A05` | `IF-01` | `T07 (Tampering)`| `V04` (CWE-79)  | `CTI-105` (`CTI-7`) | `src/controllers/reportController.js`| `tests/integration/iocReportApi.test.js`|
| `REQ-SEC-09` | Analyst Triage | `UC-02` | `A06` | `IF-02` | `T10 (Tampering)`| `V06` (CWE-778) | `CTI-106` (`CTI-8`) | `src/controllers/triageController.js` | `tests/integration/triageFeedApi.test.js` |

---

## 3. Milestone M11/M12: Vulnerability Demonstration & Remediation Traceability

The table below connects demonstrated weaknesses, their initial baseline reproduction tests, and their verified Phase 12 (M12) remediations:

| Vuln ID | Vulnerability Classification | CWE | Affected Component | M11 Baseline Insecure Behavior | M12 Remediation Implementation | Remediation Test Verification | Status |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **`V02`** | Broken Object-Level Authorization (IDOR) | CWE-639 | `GET /api/reports/:id` in `reportController.js` | HTTP 200 OK leaked `TLP:RED` report & exploit details across tenant boundaries | Integrated `canAccessTLP`, enforced tenant isolation, and logged `UNAUTHORIZED_REPORT_ACCESS_BLOCKED` to audit log | `tests/vulnerability/vulnerabilityDemo.test.js` (Subtest 1.2–1.5 assert 403 Forbidden & audit entry) | **REMEDIATED (VERIFIED)** |
| **`V04`** | Stored Cross-Site Scripting (XSS) | CWE-79 | `POST /api/reports` in `reportController.js` | Naive regex blacklist permitted `onmouseover` and `ontoggle` event handlers to persist | Replaced regex with `SanitizerService` neutralizing all `on*` event handlers and dangerous URI schemes | `tests/vulnerability/vulnerabilityDemo.test.js` (Subtest 2.1–2.3 assert event handlers stripped) | **REMEDIATED (VERIFIED)** |

*Phase 11 Baseline Evidence:* [`evidence/M11_VULNERABILITY_DEMONSTRATION.md`](file:///v:/SSE-ENDSEM/evidence/M11_VULNERABILITY_DEMONSTRATION.md)  
*Phase 12 Remediation Evidence:* [`evidence/PHASE_12_REMEDIATION_EVIDENCE.md`](file:///v:/SSE-ENDSEM/evidence/PHASE_12_REMEDIATION_EVIDENCE.md)

---

## 4. Phase 11: Secure Development and Build Controls Traceability

The table below connects the Phase 11 secure development controls to governance standards, implementation scripts, and verifiable test evidence:

| Control ID | Control Name | Governance Standard | Implementation Script / Configuration | Verification Command | Evidence Reference |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **`CTRL-11-01`** | **Secret Management & Anti-Hardcoding** | NIST SP 800-218 PW.4 / CWE-798 | `scripts/detect-secrets.js` & `.gitignore` | `node scripts/detect-secrets.js` | Section 2.1 in `PHASE_11_SECURE_BUILD_EVIDENCE.md` |
| **`CTRL-11-02`** | **Dependency Security Auditing** | NIST SP 800-218 PW.3 / SLSA v0.2 | `package-lock.json` & `npm audit` | `npm audit --json` | Section 4 in `PHASE_11_SECURE_BUILD_EVIDENCE.md` |
| **`CTRL-11-03`** | **Static Application Security Testing** | NIST SP 800-218 PW.7 / OWASP A03 | `scripts/security-scan.js` | `npm run security:scan` | Section 3 in `PHASE_11_SECURE_BUILD_EVIDENCE.md` |
| **`CTRL-11-04`** | **Security Regression Suite** | NIST SP 800-218 RV.1 | `tests/unit/*.js` & `tests/integration/*.js` | `npm test` (53 tests pass) | Section 5 in `PHASE_11_SECURE_BUILD_EVIDENCE.md` |
| **`CTRL-11-05`** | **Cryptographic Audit Integrity** | NIST SP 800-218 PO.3 / CWE-778 | `scripts/verify-audit-chain.js` | `npm run audit:verify` | Section 6 in `PHASE_11_SECURE_BUILD_EVIDENCE.md` |
| **`CTRL-11-06`** | **Reproducible Build Manifest** | SLSA Level 2 / NIST SP 800-218 PW.8 | `scripts/generate-build-manifest.js` | `node scripts/generate-build-manifest.js` | Section 7 in `PHASE_11_SECURE_BUILD_EVIDENCE.md` |
| **`CTRL-11-07`** | **Continuous Integration Pipeline** | NIST SP 800-218 PW.6 / GitHub CI | `scripts/ci-runner.js` & `.github/workflows/`| `npm run ci` | Section 8 in `PHASE_11_SECURE_BUILD_EVIDENCE.md` |

---

## 5. Phase 13: Containerization & Kubernetes Deployment Controls Traceability

The table below connects the Phase 13 containerization and orchestration controls to governance standards, specifications, and verifiable evidence:

| Control ID | Control Name | Governance Standard | Implementation Manifest / File | Verification Target | Evidence Reference |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **`CTRL-13-01`** | **Non-Root Container User** | CIS Docker Benchmark 4.1 | `Dockerfile` (`USER 10001:10001`) | Unprivileged UID/GID 10001 | Section 2 in `PHASE_13_CONTAINER_EVIDENCE.md` |
| **`CTRL-13-02`** | **Multi-Stage Build Minimization** | NIST SP 800-190 Section 4.1 | `Dockerfile` (builder vs runtime) | Excludes devDependencies & cache | Section 2 in `PHASE_13_CONTAINER_EVIDENCE.md` |
| **`CTRL-13-03`** | **Zero Baked Credentials** | CIS Docker Benchmark 4.2 | `.dockerignore` | Excludes `.env`, `*.db`, `*.key` | Section 2 in `PHASE_13_CONTAINER_EVIDENCE.md` |
| **`CTRL-13-04`** | **Read-Only Root Filesystem** | NSA/CISA Kubernetes Guide | `k8s/deployment.yaml` | `readOnlyRootFilesystem: true` | Section 4 in `PHASE_13_CONTAINER_EVIDENCE.md` |
| **`CTRL-13-05`** | **Dropped Linux Capabilities** | CIS Docker Benchmark 5.2 | `k8s/deployment.yaml` | `capabilities: drop: ["ALL"]` | Section 4 in `PHASE_13_CONTAINER_EVIDENCE.md` |
| **`CTRL-13-06`** | **SQLite Single-Replica Governance** | SQLite Architecture Standard | `k8s/deployment.yaml` | `replicas: 1`, `strategy: Recreate` | Section 4 in `PHASE_13_CONTAINER_EVIDENCE.md` |
---

## 6. Phase 14: CI/CD, Security Testing & Fuzzing Traceability Matrix

The table below establishes the complete 11-column trace connecting platform requirements, use cases, threats, vulnerabilities, Jira stories, implementations, automated security tests, deterministic fuzz vectors, and CI/CD gate controls:

| Req ID | Use Case | DFD Flow | Threat (STRIDE) | Vuln ID (CWE) | Attack Tree Node | Jira Story | Implementation Module | Automated Security Test | Deterministic Fuzz Test | CI/CD Pipeline Control |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `REQ-SEC-01` | `UC-05` | `IF-01` | `T01 (Spoofing)` | `V01` (CWE-798) | Node A1: Credential Stuffing | `CTI-101` | `src/controllers/authController.js` | `tests/unit/auth.test.js`, `tests/e2e/ctiWorkflow.test.js` (Steps 1–3) | Category 10: Auth Token & Algorithm None Fuzzing (8 cases) | Stage 1 (Detect Secrets), Stage 4 & 5 (Unit & Integration) |
| `REQ-SEC-02` | `UC-02` | `IF-02` | `T06 (Elevation)` | `V03` (CWE-862) | Node B3: Privilege Escalation | `CTI-102` | `src/middleware/rbacGuard.js` | `tests/integration/rbac.test.js`, `tests/e2e/ctiWorkflow.test.js` (Step 4) | Category 10: Missing/Forged Bearer Header Fuzzing (8 cases) | Stage 2 (SAST), Stage 5 (Integration Testing) |
| `REQ-SEC-03` | `UC-01` | `IF-01` | `T02 (Tampering)` | `V05` (CWE-1333)| Node C1: ReDoS & Malformed IoC | `CTI-104` | `src/services/iocValidator.js` | `tests/unit/validator.test.js`, `tests/e2e/ctiWorkflow.test.js` (Step 5) | Categories 1–4: IPv4, IPv6, Domain, Hash Fuzzing (40 cases) | Stage 4 (Unit Tests), Stage 8 (Application Fuzzing) |
| `REQ-SEC-04` | `UC-02` | `IF-03` | `T04 (Disclosure)`| `V02` (CWE-639) | Node B2: BOLA/IDOR Direct Object Access | `CTI-107` | `src/middleware/tlpGuard.js`, `reportController.js` | `tests/integration/tlpAccess.test.js`, `tests/vulnerability/vulnerabilityDemo.test.js` (V02) | Category 8: TLP Enum Fuzzing & Category 10 IDOR Fuzzing (16 cases) | Stage 7 (Vuln Suite), Stage 8 (Security Fuzzer) |
| `REQ-SEC-05` | `UC-03` | `IF-03` | `T08 (Disclosure)`| `V02` (CWE-639) | Node B1: Unvetted Feed Scraping | `CTI-108` | `src/services/stixFactory.js`, `feedController.js` | `tests/integration/feed.test.js`, `tests/e2e/ctiWorkflow.test.js` (Step 8) | Category 9: Malformed Feed Traversal & Bad Observable Query | Stage 5 (Integration), Stage 6 (E2E Workflow) |
| `REQ-SEC-07` | `UC-04` | `IF-01,02`| `T03 (Repudiation)`| `V06` (CWE-778) | Node D1: Log Deletion/Tampering | `CTI-109` | `src/services/auditService.js`, `auditController.js` | `tests/unit/auditChain.test.js`, `tests/e2e/ctiWorkflow.test.js` (Step 9) | Post-Fuzz SHA-256 Continuous Chain Verification | Stage 9 (Cryptographic Audit Verification) |
| `REQ-SEC-08` | `UC-02` | `IF-01` | `T07 (Tampering)` | `V04` (CWE-79)  | Node E1: Stored XSS via Event Handlers | `CTI-105` | `src/services/sanitizerService.js`, `reportController.js` | `tests/unit/sanitizer.test.js`, `tests/vulnerability/vulnerabilityDemo.test.js` (V04) | Categories 5 & 6: Title, Markdown & Nested Tag Evasion (18 cases) | Stage 4 (Unit), Stage 7 (Vuln Suite), Stage 8 (Fuzzer) |
| `REQ-SEC-09` | `UC-02` | `IF-02` | `T10 (Tampering)` | `V06` (CWE-778) | Node C2: False IoC Poisoning | `CTI-106` | `src/controllers/triageController.js` | `tests/integration/triageFeedApi.test.js`, `tests/e2e/ctiWorkflow.test.js` (Step 7) | Category 7: Confidence Boundary & Category 9 Triage Payload Fuzz | Stage 5 (Integration), Stage 8 (Fuzz Testing) |

---

## 7. Phase 15: Operational Logging, Monitoring & Hardening Controls Traceability

The table below connects operational monitoring, audit logging, and hardening controls to their implementation and verification evidence:

| Control ID | Operational Domain | Governance Standard | Implementation / File | Verification Command / Metric | Evidence Reference |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **`CTRL-15-01`** | **Security Audit Logging** | NIST SP 800-218 PO.3 | `src/services/auditService.js` | `npm run audit:verify` (1,127 records verified) | `evidence/PHASE_15_LOGGING_MONITORING_HARDENING_EVIDENCE.md` |
| **`CTRL-15-02`** | **Operational Metrics** | RFC 7230 / Prometheus | `src/server.js` (`GET /metrics`) | `cti_http_requests_total`, `cti_failed_logins_total` | `evidence/PHASE_15_LOGGING_MONITORING_HARDENING_EVIDENCE.md` |
| **`CTRL-15-03`** | **Brute-Force Alerting** | OWASP ASVS 2.2 | Prometheus Alert Rule | `rate(cti_failed_logins_total[5m]) > 5` | Section 3 in `PHASE_15_LOGGING_MONITORING_HARDENING.md` |
| **`CTRL-15-04`** | **Rate Limiting Guard** | OWASP ASVS 13.1 | `src/middleware/rateLimiter.js` | 100 req / 15m sliding window enforcement | `tests/integration/authApi.test.js` |
| **`CTRL-15-05`** | **Production Error Masking**| CWE-209 | `src/server.js` | Stack traces suppressed when `NODE_ENV=production` | Section 4 in `PHASE_15_LOGGING_MONITORING_HARDENING.md` |
| **`CTRL-15-06`** | **Container Hardening** | CIS Docker 4.1/5.1 | `Dockerfile` | UID 10001, minimal slim base, healthcheck | `scripts/validate-deployment.js` (14/14 passed) |
| **`CTRL-15-07`** | **K8s Security Context** | NSA/CISA K8s Guide | `k8s/deployment.yaml` | `runAsNonRoot: true`, `readOnlyRootFilesystem: true` | `scripts/validate-deployment.js` (Static validation) |

---

## 8. Phase 16: Master Critical End-to-End Traceability Thread

The exam mandates one critical unbroken continuity trace showing end-to-end alignment across all artifacts for the core capability: **Confidentiality & TLP Intelligence Access Control**:

```
[Requirement: REQ-SEC-04]
Traffic Light Protocol (TLP) Enforcement across CLEAR, GREEN, AMBER, RED
       │
       ▼
[Use Case: UC-02]
Review & Classify Threat Intelligence with TLP Clearance Barriers
       │
       ▼
[Data Flow Diagram: IF-03 / Process 3.0]
Threat Feed Egress Flow intercepting queries before serialization
       │
       ▼
[STRIDE Threat: T04 / T08]
Unauthorized Egress of TLP:RED Intelligence / Information Disclosure
       │
       ▼
[Vulnerability: V02 (CWE-639)]
Broken Object-Level Authorization / BOLA / IDOR on Report Retrieval
       │
       ▼
[Attack Tree: Root -> Branch B -> Leaf B2]
Exfiltrate TLP:RED -> Exploit API Access -> Broken TLP Authorization
       │
       ▼
[Jira Story: CTI-107]
TLP Classification & Access Control Enforcement
       │
       ▼
[Jira Task: CTI-107-T1]
Implement canAccessTLP Guard and Block Cross-Tenant Egress
       │
       ▼
[Implementation: src/middleware/tlpGuard.js & src/controllers/reportController.js]
Policy function evaluates role, tenancy, and TLP level; returns 403 Forbidden
       │
       ▼
[Security Test: tests/vulnerability/vulnerabilityDemo.test.js & tests/e2e/ctiWorkflow.test.js]
Automated test asserts HTTP 403 Forbidden on unauthorized access + Audit log created
       │
       ▼
[Deployment Control: k8s/deployment.yaml]
Pod security context: runAsNonRoot: true (UID 10001), readOnlyRootFilesystem: true
```






