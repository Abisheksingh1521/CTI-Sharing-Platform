# PHASE 2 – REQUIREMENTS ENGINEERING [7 MARKS]
**Course:** 24CYS401 – Secure Software Engineering  
**System:** Topic 29 – Cyber Threat Intelligence (CTI) Sharing Platform  

---

## 1. Stakeholders & User Roles

1. **Organization Contributor (`ROLE_CONTRIBUTOR`):** Security engineers from verified participating organizations who ingest raw indicators (IPs, Domains, Hashes) and draft incident threat reports.
2. **Authorized Security Analyst (`ROLE_ANALYST`):** Vetted security intelligence analysts responsible for triaging incoming submissions, rating confidence (0–100), assigning MITRE ATT&CK techniques, setting TLP clearance, and approving/rejecting items.
3. **Platform Administrator (`ROLE_ADMIN`):** Platform managers who onboard partner organizations, manage user roles, review system health, and inspect cryptographic audit chains.
4. **Threat Consumer / Automated SIEM Agent (`ROLE_CONSUMER`):** Automated API agents (firewalls, SOAR, SIEM) querying sanitized, approved threat feeds according to their organization's clearance level.

---

## 2. Requirements Categorization

### Functional Requirements (FR)
* **FR-01 (Indicator Ingestion):** The system shall allow authorized contributors to submit individual or batch IoCs (IPv4, IPv6, FQDN Domains, Hashes: MD5, SHA-1, SHA-256).
* **FR-02 (Automated Defanging):** The system shall automatically defang submitted indicators (e.g., converting `evil.com` to `evil[.]com` and `http://` to `hxxp://`) to prevent accidental execution.
* **FR-03 (Threat Report Management):** The system shall allow contributors to submit qualitative Markdown-based threat incident reports linked to relational indicators.
* **FR-04 (Analyst Triage Station):** The system shall provide an analyst workbench displaying pending indicators with contributor trust ratings, duplicate counts, and validation status.
* **FR-05 (Classification & Scoring):** The system shall permit authorized analysts to assign Traffic Light Protocol (CLEAR, GREEN, AMBER, RED) ratings, confidence scores, and MITRE ATT&CK IDs.
* **FR-06 (Threat Feed Dissemination):** The system shall publish approved threat intelligence via a standard STIX 2.1 JSON bundle endpoint (`/api/feeds/stix`).

### Non-Functional Requirements (NFR)
* **NFR-01 (Performance & Latency):** Ingestion and feed query APIs shall return responses within 200ms under standard operational loads.
* **NFR-02 (Availability & Resilience):** The platform shall support containerized deployment with health and readiness probes (`/api/health`) maintaining 99.9% uptime.
* **NFR-03 (Maintainability & Clean Architecture):** The backend shall follow a modular layered architecture with separated concerns (controllers, services, repositories).
* **NFR-04 (Interoperability):** Threat intelligence exports shall strictly conform to the OASIS STIX 2.1 JSON specification.

### Security Requirements (SR)
* **SR-01 (Authentication & MFA):** All user accounts must authenticate using salted password hashes (`bcrypt` cost factor 10) and Time-based One-Time Passwords (TOTP RFC 6238).
* **SR-02 (Role-Based Access Control - RBAC):** Endpoints must enforce role permissions; contributors cannot approve their own submissions; consumers cannot view triage queues.
* **SR-03 (Traffic Light Protocol - TLP Barrier):** The system must enforce an explicit policy (`canAccessTLP`) ensuring that `TLP:RED` indicators are never disseminated to external consumers.
* **SR-04 (Input Sanitization & Injection Defense):** All inputs must be strictly validated against whitelist schemas, and all database interactions must use parameterized prepared statements.
* **SR-05 (Audit Integrity & Tamper Detection):** The system must maintain an append-only audit trail where every record is cryptographically linked to the previous record using SHA-256 hashing. The hash chain provides tamper-evident integrity verification of audit records.
* **SR-06 (Denial of Service & Rate Limiting):** Authentication endpoints shall be limited to 5 requests per minute per IP; general API endpoints shall be limited to 100 requests per minute.

---

## 3. CIA Triad Mapping

| Asset / Functionality | Confidentiality (C) | Integrity (I) | Availability (A) |
| :--- | :---: | :---: | :---: |
| **User Credentials & MFA Secrets** | **HIGH:** Bcrypt salted hashes and encrypted secrets; never exposed in logs or APIs. | **HIGH:** Strictly protected against unauthorized tampering. | **MEDIUM:** Required for session authentication. |
| **TLP:RED Threat Reports** | **CRITICAL:** Restricted strictly to originating org and senior analysts; prohibited from feed egress. | **HIGH:** Tamper-evident author attribution. | **HIGH:** Available to incident response teams. |
| **Approved Threat Feeds (STIX)** | **LOW/MEDIUM:** Publicly consumable based on TLP tag. | **CRITICAL:** High integrity; poisoned or false IoCs must be rejected during triage. | **CRITICAL:** High availability required for real-time firewall blocklist synchronization. |
| **Audit Log Trail** | **MEDIUM:** Internal admin access only. | **CRITICAL:** Tamper-evident SHA-256 hash chaining detects any out-of-band record tampering. | **HIGH:** Continuous append-only logging. |

---

## 4. Software Requirements Specification (SRS) Table

| Req ID | Description | Priority | MoSCoW | Actor | Verification Method |
| :---: | :--- | :---: | :---: | :--- | :--- |
| `REQ-F-01` | Ingest IPv4, IPv6, Domain, and Hash indicators | High | MUST | Contributor | Automated Unit & Integration Tests |
| `REQ-F-02` | Canonicalize and defang malicious URLs and IPs | High | MUST | System | Unit Test with boundary strings |
| `REQ-F-03` | Submit structured incident threat reports | Medium | SHOULD | Contributor | Integration Test via API |
| `REQ-F-04` | Analyst triage workbench (Approve / Reject) | High | MUST | Analyst | UI Testing & Integration Tests |
| `REQ-F-05` | TLP tagging (CLEAR, GREEN, AMBER, RED) | High | MUST | Analyst | Unit & Security Testing |
| `REQ-F-06` | Export STIX 2.1 JSON compliant threat bundles | High | MUST | Consumer | Schema Validation Test |
| `REQ-S-01` | Multi-Factor Authentication with TOTP | High | MUST | All Users | Integration Test with valid/invalid tokens |
| `REQ-S-02` | RBAC middleware on all protected routes | High | MUST | System | Automated 403 Forbidden assertion tests |
| `REQ-S-03` | `canAccessTLP` policy enforcement on feeds | High | MUST | System | Security Regression & Egress Test |
| `REQ-S-04` | Tamper-Evident SHA-256 Hash-Chained Audit Trail | High | MUST | System | Tamper-detection verification script |
| `REQ-S-05` | IP-based rate limiting (5 req/min on login) | Medium | SHOULD | System | Automated 429 Too Many Requests test |
