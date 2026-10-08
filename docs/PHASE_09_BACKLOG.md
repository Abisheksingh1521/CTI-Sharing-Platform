# PHASE 9 – PRODUCT BACKLOG AND JIRA/SCRUM [7 MARKS]
**Course:** 24CYS401 – Secure Software Engineering  
**System:** Topic 29 – Cyber Threat Intelligence (CTI) Sharing Platform  

---

## 1. Product Backlog Structure & User Stories

**Project:** Cyber Threat Intelligence Sharing Platform  
**Total User Stories:** 10 Stories  
**Total Velocity / Story Points:** 44 SP (Sprint 1: 23 SP, Sprint 2: 21 SP)

| Logical Story ID | Actual Jira Key | Epic | User Story (`As a... I want... so that...`) | Priority | Story Points | Sprint | Acceptance Criteria |
| :---: | :---: | :--- | :--- | :---: | :---: | :---: | :--- |
| **CTI-101** | `CTI-1` | `EP01: Identity` | *As an authenticated user*, I want to log in using email, salted password, and TOTP MFA *so that* my account is protected against credential stuffing and session theft. | Highest | 5 SP | Sprint 1 | 1. Passwords hashed using bcrypt (10 rounds).<br>2. Login requires valid 6-digit RFC 6238 TOTP.<br>3. Successful auth issues signed 1h JWT access token. |
| **CTI-102** | `CTI-2` | `EP01: Identity` | *As a platform administrator*, I want to enforce Role-Based Access Control (RBAC) across endpoints *so that* unauthorized roles are denied access to privileged workflows. | Highest | 3 SP | Sprint 1 | 1. Role hierarchy enforced: `ADMIN`, `ANALYST`, `CONTRIBUTOR`, `CONSUMER`.<br>2. Access without required role returns HTTP 403 Forbidden. |
| **CTI-103** | `CTI-5` | `EP02: Ingestion` | *As an organization contributor*, I want to ingest raw threat observables (IPs, Domains, Hashes) *so that* new threats are cataloged for community analysis. | Highest | 5 SP | Sprint 1 | 1. Accepts IPv4, IPv6, FQDN, MD5, SHA-1, SHA-256.<br>2. Executes IoC Deduplication for previously seen observables.<br>3. Ingested items stored in `PENDING` status. |
| **CTI-104** | `CTI-6` | `EP02: Ingestion` | *As a security system*, I want to automatically validate and defang submitted indicators *so that* accidental execution and malicious injection are prevented. | Highest | 5 SP | Sprint 1 | 1. Implemented via Strategy Pattern (`IoCValidatorService`).<br>2. ReDoS-resistant anchored regular expressions.<br>3. Automatically defangs dots (`[.]`) and protocols (`hxxp://`). |
| **CTI-105** | `CTI-7` | `EP02: Ingestion` | *As an organization contributor*, I want to submit structured Markdown Threat Reports *so that* qualitative incident narratives accompany raw indicators. | High | 5 SP | Sprint 1 | 1. Accepts Markdown title, summary, and content.<br>2. Mitigates Stored XSS by stripping raw script tags.<br>3. Supports relational linking of IoCs to report ID. |
| **CTI-106** | `CTI-8` | `EP03: Triage` | *As an authorized security analyst*, I want a dedicated triage workbench to review unclassified indicators *so that* false positives are eliminated before community sharing. | Highest | 5 SP | Sprint 2 | 1. Triage queue lists only `PENDING` indicators.<br>2. Mandatory analyst justification text on decisions.<br>3. Immutable decision logged to `review_logs` table. |
| **CTI-107** | `CTI-9` | `EP03: Triage` | *As an analyst and consumer*, I want explicit TLP authorization rules (`canAccessTLP`) enforced *so that* classified `TLP:RED` intelligence is never leaked to external parties. | Highest | 5 SP | Sprint 2 | 1. Explicit `canAccessTLP(user, indicator)` policy.<br>2. `TLP:RED` restricted to submitting org and vetted analysts.<br>3. Unauthorized queries return HTTP 403 Forbidden. |
| **CTI-108** | `CTI-10` | `EP04: Feeds` | *As a threat consumer / SIEM*, I want to export approved intelligence in OASIS STIX 2.1 JSON bundle format *so that* threat feeds automate firewall and EDR updates. | High | 3 SP | Sprint 2 | 1. Generates valid STIX 2.1 JSON Bundle (`spec_version: "2.1"`).<br>2. Server-side TLP egress filtering excludes `TLP:RED`.<br>3. Includes MITRE ATT&CK technique mappings. |
| **CTI-109** | `CTI-11` | `EP05: Audit` | *As a security auditor*, I want an append-only audit log where every record is linked via SHA-256 hash chaining *so that* the hash chain provides tamper-evident integrity verification. | High | 5 SP | Sprint 2 | 1. Continuous SHA-256 hash chain anchored to Genesis hash.<br>2. Out-of-band database edits break hash continuity.<br>3. Integrity verification endpoint flags tampered records. |
| **CTI-110** | `CTI-12` | `EP05: Audit` | *As an administrator*, I want a Prometheus `/metrics` endpoint *so that* system latencies, failed login spikes, and IoC ingestion metrics are monitored in real time. | Medium | 3 SP | Sprint 2 | 1. Exposes Prometheus formatted `/metrics`.<br>2. Emits HTTP request durations, IoC counts, failed logins.<br>3. Provides health status at `/api/health`. |

---

## 2. Sprint Planning

### Sprint 1: Ingestion, Validation & Identity Foundation
* **Sprint Goal:** Establish core secure architecture, database persistence, multi-factor authentication, and resilient IoC/Report ingestion with automated defanging.
* **Committed Stories:** CTI-101 (`CTI-1`), CTI-102 (`CTI-2`), CTI-103 (`CTI-5`), CTI-104 (`CTI-6`), CTI-105 (`CTI-7`).
* **Total Points:** 23 Story Points.
* **Outcome:** Delivered and 100% verified with automated test suites.

### Sprint 2: Analyst Triage, TLP Enforcement & Threat Dissemination
* **Sprint Goal:** Implement analyst triage workflows, explicit `canAccessTLP` information barriers, OASIS STIX 2.1 feed distribution, and tamper-evident audit logging.
* **Committed Stories:** CTI-106 (`CTI-8`), CTI-107 (`CTI-9`), CTI-108 (`CTI-10`), CTI-109 (`CTI-11`), CTI-110 (`CTI-12`).
* **Total Points:** 21 Story Points.
* **Outcome:** Core triage, TLP policy, and STIX feed distribution completed and verified.
