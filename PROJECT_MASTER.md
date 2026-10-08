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

### Assets (9 Identified Assets with CIA Classification - Authoritative Baseline):
1. **A01 (User Credentials):** Confidentiality: High, Integrity: High, Availability: Medium.
2. **A02 (TOTP MFA Secrets):** Confidentiality: High, Integrity: High, Availability: Medium.
3. **A03 (JWT Access Tokens):** Confidentiality: High, Integrity: High, Availability: Medium.
4. **A04 (Threat Indicators / IoCs):** Confidentiality: Medium, Integrity: High, Availability: High.
5. **A05 (Threat Reports):** Confidentiality: High, Integrity: High, Availability: High.
6. **A06 (TLP Classification Metadata):** Confidentiality: High, Integrity: High, Availability: High.
7. **A07 (Audit Logs):** Confidentiality: High, Integrity: High, Availability: Medium.
8. **A08 (STIX 2.1 Threat Feed):** Confidentiality: High, Integrity: High, Availability: High.
9. **A09 (Organization & User Data):** Confidentiality: High, Integrity: High, Availability: Medium.

### Primary Attack Tree: Exfiltrate Confidential TLP:RED Threat Intelligence
```
ROOT: Exfiltrate Confidential TLP:RED Threat Intelligence
│
├── [OR] Branch A: Compromise Analyst Account
│   │
│   └── [AND] Credential Hijack & MFA/Session Bypass
│       ├── [Leaf A1] Credential Compromise (Brute-Force / Credential Stuffing)
│       └── [Leaf A2] Session / MFA Weakness (TOTP Bypass / Session Hijacking)
│
└── [OR] Branch B: Exploit CTI API Access
    │
    ├── [Leaf B1] Broken Object-Level Authorization / IDOR (Direct report UUID query)
    ├── [Leaf B2] Broken TLP Authorization (Bypassing TLP rating check on indicators)
    └── [Leaf B3] Unauthorized STIX Feed Access (Egress scraping of classified feeds)
```

### Attack Path Mapping: Attack $\rightarrow$ Target Asset $\rightarrow$ STRIDE Threat $\rightarrow$ Vulnerability $\rightarrow$ Control
* **Branch A $\rightarrow$ Leaf A1 (Credential Compromise):** Target: **A01** $\rightarrow$ `T01 (Spoofing)` $\rightarrow$ `V01` (Credential compromise / CWE-798) $\rightarrow$ Salted bcrypt hashing (10 rounds) + 5 req/min rate limiter (`authLimiter`).
* **Branch A $\rightarrow$ Leaf A2 (Session / MFA Weakness):** Target: **A02, A03** $\rightarrow$ `T01 (Spoofing)` $\rightarrow$ `V01` (Credential compromise / CWE-798) $\rightarrow$ RFC 6238 TOTP single-use code verification + 5-minute temporary MFA token.
* **Branch B $\rightarrow$ Leaf B1 (Broken Object-Level Auth / IDOR):** Target: **A05** $\rightarrow$ `T04 (Information Disclosure)` $\rightarrow$ `V02` (Broken access control / CWE-639) $\rightarrow$ Organization ownership validation in `reportController.js` (`user.org_id === report.org_id`).
* **Branch B $\rightarrow$ Leaf B2 (Broken TLP Authorization):** Target: **A06** $\rightarrow$ `T04 (Information Disclosure)` $\rightarrow$ `V02` (Broken access control / CWE-639) $\rightarrow$ Explicit server-side ABAC policy function `canAccessTLP` in `tlpGuard.js`.
* **Branch B $\rightarrow$ Leaf B3 (Unauthorized STIX Feed Access):** Target: **A08** $\rightarrow$ `T08 (Information Disclosure)` $\rightarrow$ `V02` (TLP filtering failure / CWE-639) $\rightarrow$ Server-side TLP egress filtering before STIX 2.1 serialization.

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
3. **Asset:** `A06` (TLP Classification Metadata) / `A05` (Threat Reports)
4. **DFD Flow:** `IF-03` / `Process 3.0` (Threat Feed Egress Flow)
5. **STRIDE Threat:** `T04` / `T08` (Information Disclosure: Unauthorized Egress of TLP:RED Intelligence)
6. **Vulnerability:** `V02` (Broken access control / IDOR / TLP failure)
7. **Attack Tree:** Root Goal $\rightarrow$ Branch B $\rightarrow$ Leaf B2 (Broken TLP Authorization)
8. **Jira Story:** `CTI-107` / Actual Jira Key `CTI-9` (TLP Classification & Access Control)
9. **Implementation:** `src/middleware/tlpGuard.js` (`canAccessTLP` policy function)
10. **Test:** `tests/integration/tlpAccess.test.js` (Asserting 403 and feed egress filtering)
11. **Deployment Control:** `k8s/deployment.yaml` (`readOnlyRootFilesystem: true`, non-root user UID 10001, drop ALL capabilities)


