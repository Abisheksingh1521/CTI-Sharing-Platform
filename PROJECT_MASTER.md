# PROJECT MASTER BLUEPRINT
**Course:** 24CYS401 – Secure Software Engineering (End Semester Laboratory Examination)  
**System:** Topic 29 – Cyber Threat Intelligence (CTI) Sharing Platform  
**Architecture Style:** Layered Hexagonal / Clean Architecture (Node.js + Express + SQLite3)  
**Status:** ACTIVE & LOCKED (Authoritative Master Source of Truth)  

---

## 1. System Scope & Core Mission
The **Cyber Threat Intelligence (CTI) Sharing Platform** enables participating organizations to securely submit, validate, classify, sanitize, and disseminate real-time actionable Indicators of Compromise (IoCs) and structured Threat Reports. The platform guarantees data integrity, confidentiality via strict **Traffic Light Protocol (TLP)** enforcement, and accountability via a **Tamper-Evident SHA-256 Hash-Chained Audit Log**.

---

## 2. Actors & Personas
1. **Organization Contributor (`ROLE_CONTRIBUTOR`):** Submits raw indicators (IPs, Domains, Hashes) and markdown-based threat incident reports.
2. **Authorized Security Analyst (`ROLE_ANALYST`):** Vets incoming intelligence, adjusts confidence scores, tags MITRE ATT&CK techniques, assigns TLP ratings, and approves/rejects submissions.
3. **Platform Administrator (`ROLE_ADMIN`):** Manages user accounts, enforces organization trust levels, monitors system health, and inspects audit integrity chains.
4. **Threat Consumer / Automated SIEM Agent (`ROLE_CONSUMER`):** Automated clients or security analysts ingesting approved feeds in STIX 2.1 JSON format filtered strictly by their authorization clearance.

---

## 3. End-to-End System Workflow
```
[ Contributor ] ──( Submit Raw IoC / Report )──► [ Ingestion Gateway ]
                                                        │
                                                        ▼
                                             [ Validation & Defanging ]
                                                        │
                                                        ▼
                                             [ PENDING_REVIEW Queue ]
                                                        │
[ Security Analyst ] ──( Triage & canAccessTLP Policy )─┤
                     ──( Approve / Reject with Log )───►│
                                                        │
                                                        ▼
                                             [ APPROVED Intel Feed ]
                                                        │
[ Consumer / SIEM ] <──( Filtered STIX 2.1 Export )─────┘
                                                        │
                   [ Tamper-Evident SHA-256 Audit Chain records every step ]
```

---

## 4. Database Entities & Relational Schema (SQLite3)

The database runs in WAL mode with enforced foreign keys (`PRAGMA foreign_keys = ON`).

1. **`organizations`**
   * `id` (TEXT PK, UUIDv4)
   * `name` (TEXT NOT NULL UNIQUE)
   * `domain` (TEXT NOT NULL)
   * `trust_level` (TEXT NOT NULL DEFAULT 'STANDARD')
   * `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

2. **`users`**
   * `id` (TEXT PK, UUIDv4)
   * `org_id` (TEXT NOT NULL, FK $\rightarrow$ `organizations.id`)
   * `username` (TEXT NOT NULL UNIQUE)
   * `email` (TEXT NOT NULL UNIQUE)
   * `password_hash` (TEXT NOT NULL, bcrypt)
   * `role` (TEXT NOT NULL: `ROLE_CONTRIBUTOR`, `ROLE_ANALYST`, `ROLE_ADMIN`, `ROLE_CONSUMER`)
   * `mfa_secret` (TEXT NOT NULL)
   * `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

3. **`threat_reports`**
   * `id` (TEXT PK, UUIDv4)
   * `org_id` (TEXT NOT NULL, FK $\rightarrow$ `organizations.id`)
   * `author_id` (TEXT NOT NULL, FK $\rightarrow$ `users.id`)
   * `title` (TEXT NOT NULL)
   * `summary` (TEXT NOT NULL)
   * `content_markdown` (TEXT NOT NULL)
   * `tlp_level` (TEXT NOT NULL: `CLEAR`, `GREEN`, `AMBER`, `RED`)
   * `status` (TEXT NOT NULL DEFAULT 'PENDING')
   * `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

4. **`threat_indicators`**
   * `id` (TEXT PK, UUIDv4)
   * `report_id` (TEXT, FK $\rightarrow$ `threat_reports.id` NULLABLE)
   * `org_id` (TEXT NOT NULL, FK $\rightarrow$ `organizations.id`)
   * `submitter_id` (TEXT NOT NULL, FK $\rightarrow$ `users.id`)
   * `type` (TEXT NOT NULL: `IPV4`, `IPV6`, `DOMAIN`, `MD5`, `SHA1`, `SHA256`)
   * `value` (TEXT NOT NULL)
   * `value_defanged` (TEXT NOT NULL)
   * `description` (TEXT)
   * `tlp_level` (TEXT NOT NULL DEFAULT 'AMBER')
   * `status` (TEXT NOT NULL DEFAULT 'PENDING')
   * `confidence_score` (INTEGER DEFAULT 50)
   * `mitre_attack_id` (TEXT)
   * `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

5. **`review_logs`**
   * `id` (TEXT PK, UUIDv4)
   * `indicator_id` (TEXT NOT NULL, FK $\rightarrow$ `threat_indicators.id`)
   * `analyst_id` (TEXT NOT NULL, FK $\rightarrow$ `users.id`)
   * `decision` (TEXT NOT NULL: `APPROVED`, `REJECTED`)
   * `assigned_tlp` (TEXT NOT NULL)
   * `justification` (TEXT NOT NULL)
   * `timestamp` (DATETIME DEFAULT CURRENT_TIMESTAMP)

6. **`audit_logs`**
   * `id` (TEXT PK, UUIDv4)
   * `user_id` (TEXT, FK $\rightarrow$ `users.id` NULLABLE)
   * `event_type` (TEXT NOT NULL)
   * `ip_address` (TEXT NOT NULL)
   * `resource_id` (TEXT)
   * `action_details` (TEXT NOT NULL)
   * `prev_record_hash` (TEXT NOT NULL)
   * `current_record_hash` (TEXT NOT NULL)
   * `timestamp` (DATETIME DEFAULT CURRENT_TIMESTAMP)

---

## 5. API Endpoints Specification

* `POST /api/auth/register` — Register account with assigned org and role.
* `POST /api/auth/login` — Authenticate credentials; issues temporary MFA challenge token.
* `POST /api/auth/verify-mfa` — Validate TOTP code; issues signed JWT access token.
* `POST /api/iocs` — Ingest raw IoC (Contributor/Analyst); performs schema validation and defanging.
* `GET /api/iocs` — Query IoCs filtered by TLP authorization policy (`canAccessTLP`).
* `GET /api/iocs/:id` — Retrieve specific IoC by ID with TLP policy check.
* `POST /api/reports` — Ingest structured Markdown Threat Report with HTML sanitization.
* `GET /api/reports/:id` — Retrieve threat report with TLP policy check and author/org redaction.
* `PUT /api/iocs/:id/triage` — Analyst-only endpoint to approve/reject and classify IoCs.
* `GET /api/feeds/stix` — Export approved threat feed in standard STIX 2.1 JSON bundle.
* `GET /api/audit` — Admin-only endpoint returning audit trail and verifying hash-chain integrity.
* `GET /api/health` — Liveness & Readiness probe endpoint for Kubernetes / Docker.
* `GET /metrics` — Prometheus metrics endpoint (HTTP latency, IoC counts, failed logins).

---

## 6. Traffic Light Protocol (TLP) Authorization Rules

Access is governed strictly by the explicit policy function:
`canAccessTLP(user, indicator)` in `src/middleware/tlpGuard.js`.

* **`TLP:CLEAR` (formerly WHITE):**  
  * *Rule:* Open to all authenticated users (`ROLE_CONSUMER`, `ROLE_CONTRIBUTOR`, `ROLE_ANALYST`, `ROLE_ADMIN`). May be shared publicly.
* **`TLP:GREEN`:**  
  * *Rule:* Accessible to all verified member organizations within the sharing community (`user.trust_level !== 'PROBATIONARY'`). Accessible by all authenticated roles.
* **`TLP:AMBER`:**  
  * *Rule:* Restricted to users belonging to the originating submitting organization (`user.org_id === indicator.org_id`), vetted security analysts (`ROLE_ANALYST`), and platform administrators (`ROLE_ADMIN`). Standard external consumers (`ROLE_CONSUMER`) are strictly denied.
* **`TLP:RED`:**  
  * *Rule:* Strictly confidential. Accessible ONLY to originating organization contributors (`ROLE_CONTRIBUTOR` with `user.org_id === indicator.org_id`) and authorized Senior Analysts (`ROLE_ANALYST`) or Administrators (`ROLE_ADMIN`). General consumers (`ROLE_CONSUMER`) are strictly prohibited and NEVER receive TLP:RED in feeds.

---

## 7. IoC Deduplication Policy
* When a submitted observable `(type, value)` matches an existing active record in the database, the system executes **IoC Deduplication**:
  * Prevents duplicate database row creation.
  * Preserves existing triage status and original contributor attribution.
  * Records an `IOC_DUPLICATE_SIGHTING` event in the audit log for historical correlation.
  * Returns HTTP 200 with `{ isDuplicate: true, indicatorId: existing.id }`.

---

## 8. Audit Integrity: Tamper-Evident SHA-256 Hash-Chained Audit Log

* Every audit entry computes:
  $$\text{current\_record\_hash} = \text{SHA256}(\text{prev\_record\_hash} \parallel \text{user\_id} \parallel \text{event\_type} \parallel \text{action\_details} \parallel \text{timestamp})$$
* The first record anchors to a known Genesis Hash (`0000000000000000000000000000000000000000000000000000000000000000`).
* **Security Purpose:** Cryptographic SHA-256 hash chaining provides tamper-evident integrity verification of audit records and allows unauthorized modification of the chain to be detected during verification. Any out-of-band database update (row insertion, deletion, or modification) invalidates the continuous hash chain and is immediately flagged by the integrity verification routine.

---

## 9. Standardized Jira Scrum Backlog & Actual Issue Key Mapping

**Project:** Cyber Threat Intelligence Sharing Platform  
**Total Story Points:** 44 SP (Sprint 1: 23 SP, Sprint 2: 21 SP)

| Logical Story ID | Actual Jira Key | Summary | Epic | Priority | Story Points | Sprint | Status |
| :---: | :---: | :--- | :--- | :---: | :---: | :---: | :---: |
| **CTI-101** | `CTI-1` | User Authentication & TOTP MFA | EP01: Identity & Access | Highest | 5 SP | Sprint 1 | DONE |
| **CTI-102** | `CTI-2` | RBAC Authorization | EP01: Identity & Access | Highest | 3 SP | Sprint 1 | DONE |
| **CTI-103** | `CTI-5` | IoC Ingestion API | EP02: Ingestion & Parsing | Highest | 5 SP | Sprint 1 | DONE |
| **CTI-104** | `CTI-6` | IoC Validation & Defanging | EP02: Ingestion & Parsing | Highest | 5 SP | Sprint 1 | DONE |
| **CTI-105** | `CTI-7` | Threat Report Submission | EP02: Ingestion & Parsing | High | 5 SP | Sprint 1 | DONE |
| **CTI-106** | `CTI-8` | Analyst Triage | EP03: Triage & Classification | Highest | 5 SP | Sprint 2 | DONE |
| **CTI-107** | `CTI-9` | TLP Classification & Access Control | EP03: Triage & Classification | Highest | 5 SP | Sprint 2 | DONE |
| **CTI-108** | `CTI-10` | STIX 2.1 Feed | EP04: Threat Dissemination | High | 3 SP | Sprint 2 | DONE |
| **CTI-109** | `CTI-11` | Tamper-Evident Audit Trail | EP05: Security Governance | High | 5 SP | Sprint 2 | DONE |
| **CTI-110** | `CTI-12` | Security Metrics & Monitoring | EP05: Security Governance | Medium | 3 SP | Sprint 2 | DONE |

---

## 10. STRIDE Threat Model & Attack Tree (Exfiltration Goal)

### Assets (9 Identified Assets with CIA Classification):
1. **AST-01 (User Credentials & MFA Secrets):** Confidentiality: CRITICAL, Integrity: HIGH, Availability: MEDIUM.
2. **AST-02 (Organization Provenance & Trust Levels):** Confidentiality: HIGH, Integrity: CRITICAL, Availability: MEDIUM.
3. **AST-03 (Raw Ingested Threat Observables - IoCs):** Confidentiality: LOW, Integrity: CRITICAL, Availability: HIGH.
4. **AST-04 (Confidential TLP:RED Incident Reports):** Confidentiality: CRITICAL, Integrity: HIGH, Availability: HIGH.
5. **AST-05 (Published STIX 2.1 Threat Feeds):** Confidentiality: MEDIUM, Integrity: CRITICAL, Availability: CRITICAL.
6. **AST-06 (JWT Signing Secret Key):** Confidentiality: CRITICAL, Integrity: CRITICAL, Availability: MEDIUM.
7. **AST-07 (Tamper-Evident SHA-256 Audit Trail):** Confidentiality: MEDIUM, Integrity: CRITICAL, Availability: HIGH.
8. **AST-08 (Container Environment & Local SQLite File):** Confidentiality: HIGH, Integrity: CRITICAL, Availability: CRITICAL.
9. **AST-09 (Analyst Triage & Review Decision Logs - `review_logs`):** Confidentiality: HIGH, Integrity: CRITICAL, Availability: HIGH.

### Primary Attack Tree: Exfiltrate Confidential TLP:RED Threat Intelligence
```
ROOT
└── Exfiltrate Confidential TLP:RED Threat Intelligence
    ├── OR: Compromise Analyst Account
    │   └── AND: Credential Hijack & MFA Bypass
    │       ├── Credential compromise
    │       └── MFA/session weakness
    │
    └── OR: Exploit API Access
        ├── IDOR / broken object authorization
        └── Broken TLP authorization
```

### Attack Path Mapping: Attack $\rightarrow$ STRIDE Threat $\rightarrow$ Vulnerability $\rightarrow$ Control
* **Compromise Analyst Account $\rightarrow$ Credential compromise:** `T01 (Spoofing)` $\rightarrow$ `VULN-06` (Credential Stuffing & Brute Force) $\rightarrow$ Salted bcrypt hashing (10 rounds) + 5 req/min rate limiter (`authLimiter`).
* **Compromise Analyst Account $\rightarrow$ MFA/session weakness:** `T01 (Spoofing)` $\rightarrow$ `VULN-06` (MFA Enforcement) $\rightarrow$ RFC 6238 TOTP single-use code verification + 5-minute temporary MFA token.
* **Exploit API Access $\rightarrow$ IDOR / broken object authorization:** `T04 (Information Disclosure)` $\rightarrow$ `VULN-03` (IDOR on Report API) $\rightarrow$ Organization ownership validation in `reportController.js` (`user.org_id === report.org_id`).
* **Exploit API Access $\rightarrow$ Broken TLP authorization:** `T04 (Information Disclosure)` $\rightarrow$ `VULN-03` (Broken TLP Authorization) $\rightarrow$ Explicit server-side ABAC policy function `canAccessTLP` in `tlpGuard.js`.

---

## 11. Kubernetes & Container Hardening Principles
* **Replicas:** Exactly `1` (guarantees SQLite write consistency without network lock corruption).
* **Root Filesystem:** Read-only (`readOnlyRootFilesystem: true`).
* **Volume Mount:** Dedicated writable volume (`emptyDir`) mounted strictly at `/app/data` for the SQLite database. Documented as suitable for lab demonstration, with persistent storage class (PVC) specified for production.
* **Privilege:** `runAsNonRoot: true`, `runAsUser: 10001`, `allowPrivilegeEscalation: false`, `capabilities: drop: ["ALL"]`.

---

## 12. Complete 11-Stage Traceability Thread

Requirement $\rightarrow$ Use Case $\rightarrow$ Asset $\rightarrow$ DFD Flow $\rightarrow$ STRIDE Threat $\rightarrow$ Vulnerability $\rightarrow$ Attack Tree $\rightarrow$ Jira Story $\rightarrow$ Implementation $\rightarrow$ Test $\rightarrow$ Deployment Control

1. **Requirement:** `REQ-SEC-04` (Traffic Light Protocol Enforcement)
2. **Use Case:** `UC-02` (Review & Classify Threat Intelligence with TLP)
3. **Asset:** `AST-04` (Confidential TLP:RED Incident Reports)
4. **DFD Flow:** `Process 3.0` / `Flow 3` (Classified Threat Feed Egress Flow)
5. **STRIDE Threat:** `T04` (Information Disclosure: Unauthorized Egress of TLP:RED Intelligence)
6. **Vulnerability:** `VULN-03` (Broken TLP Authorization / IDOR)
7. **Attack Tree:** Root Goal $\rightarrow$ Exploit API Access $\rightarrow$ Broken TLP authorization
8. **Jira Story:** `CTI-107` / Actual Jira Key `CTI-9` (TLP Classification & Access Control)
9. **Implementation:** `src/middleware/tlpGuard.js` (`canAccessTLP` policy function)
10. **Test:** `tests/integration/tlpAccess.test.js` (Asserting 403 and feed egress filtering)
11. **Deployment Control:** `k8s/deployment.yaml` (`readOnlyRootFilesystem: true`, non-root user UID 10001, drop ALL capabilities)

