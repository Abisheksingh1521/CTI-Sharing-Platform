# ERASER AI DIAGRAM GENERATION PROMPTS
**Course:** 24CYS401 – Secure Software Engineering  
**System:** Topic 29 – Cyber Threat Intelligence (CTI) Sharing Platform  
**Purpose:** Precise, copy-pasteable prompts to generate professional academic diagrams in Eraser AI for document inclusion.

---

## 1. Phase 3: UML Use Case Diagram

### Eraser AI Prompt:
```
Create a professional UML Use Case Diagram for a Cyber Threat Intelligence (CTI) Sharing Platform.
Actors:
- Organization Contributor (Left)
- Security Analyst (Left)
- Platform Administrator (Right)
- Threat Consumer / Automated SIEM (Right)

System Boundary: "CTI Sharing Platform"
Use Cases inside boundary:
- UC-01: Ingest & Defang Threat Observable (IoC) [Used by Contributor, Analyst]
- UC-02: Submit Markdown Incident Threat Report [Used by Contributor, Analyst]
- UC-03: Triage, Assess & Classify Intelligence with TLP [Used by Analyst, Admin]
- UC-04: Export Filtered STIX 2.1 Threat Feed [Used by Threat Consumer, Analyst]
- UC-05: Authenticate with Salted Bcrypt & RFC 6238 TOTP MFA [Used by All Actors]
- UC-06: Query Tamper-Evident SHA-256 Audit Trail & Verify Hash Chain [Used by Admin]
- UC-07: Monitor Real-Time Prometheus Security Metrics [Used by Admin, Analyst]

Relationships:
- UC-01 <<include>> UC-05 (Authentication)
- UC-03 <<include>> UC-05 (Authentication)
- UC-04 <<include>> UC-05 (Authentication)
- UC-03 <<extend>> "Log Triage Justification to Review Log"
Style: Modern dark/light tech aesthetic, clear grouping, standardized UML notation.
```

---

## 2. Phase 4: Relational Entity-Relationship (ER) Diagram

### Eraser AI Prompt:
```
Create a relational Entity-Relationship (ER) Diagram for an SQLite-backed Cyber Threat Intelligence (CTI) Sharing Platform with WAL mode and foreign key enforcement.

Entities and Attributes:
1. ORGANIZATIONS
   - id: TEXT [PK, UUID]
   - name: TEXT [UNIQUE]
   - domain: TEXT
   - trust_level: TEXT ('STANDARD', 'VERIFIED', 'PROBATIONARY')
   - created_at: DATETIME

2. USERS
   - id: TEXT [PK, UUID]
   - org_id: TEXT [FK -> ORGANIZATIONS.id]
   - username: TEXT [UNIQUE]
   - email: TEXT [UNIQUE]
   - password_hash: TEXT (Bcrypt)
   - role: TEXT ('ROLE_CONTRIBUTOR', 'ROLE_ANALYST', 'ROLE_ADMIN', 'ROLE_CONSUMER')
   - mfa_secret: TEXT (Base32)
   - created_at: DATETIME

3. THREAT_REPORTS
   - id: TEXT [PK, UUID]
   - org_id: TEXT [FK -> ORGANIZATIONS.id]
   - author_id: TEXT [FK -> USERS.id]
   - title: TEXT
   - summary: TEXT
   - content_markdown: TEXT (Sanitized)
   - tlp_level: TEXT ('CLEAR', 'GREEN', 'AMBER', 'RED')
   - status: TEXT ('PENDING', 'APPROVED', 'REJECTED')
   - created_at: DATETIME

4. THREAT_INDICATORS
   - id: TEXT [PK, UUID]
   - report_id: TEXT [FK -> THREAT_REPORTS.id, NULLABLE]
   - org_id: TEXT [FK -> ORGANIZATIONS.id]
   - submitter_id: TEXT [FK -> USERS.id]
   - type: TEXT ('IPV4', 'IPV6', 'DOMAIN', 'SHA256', 'SHA1', 'MD5')
   - value: TEXT
   - value_defanged: TEXT
   - description: TEXT
   - tlp_level: TEXT ('CLEAR', 'GREEN', 'AMBER', 'RED')
   - status: TEXT ('PENDING', 'APPROVED', 'REJECTED')
   - confidence_score: INTEGER (0-100)
   - mitre_attack_id: TEXT
   - created_at: DATETIME

5. REVIEW_LOGS
   - id: TEXT [PK, UUID]
   - indicator_id: TEXT [FK -> THREAT_INDICATORS.id]
   - analyst_id: TEXT [FK -> USERS.id]
   - decision: TEXT ('APPROVED', 'REJECTED')
   - assigned_tlp: TEXT ('CLEAR', 'GREEN', 'AMBER', 'RED')
   - justification: TEXT
   - timestamp: DATETIME

6. AUDIT_LOGS
   - id: TEXT [PK, UUID]
   - user_id: TEXT [FK -> USERS.id, NULLABLE]
   - event_type: TEXT
   - ip_address: TEXT
   - resource_id: TEXT
   - action_details: TEXT
   - prev_record_hash: TEXT (SHA-256)
   - current_record_hash: TEXT (SHA-256)
   - timestamp: DATETIME

Relationships:
- ORGANIZATIONS (1) -- (N) USERS
- ORGANIZATIONS (1) -- (N) THREAT_REPORTS
- ORGANIZATIONS (1) -- (N) THREAT_INDICATORS
- USERS (1) -- (N) THREAT_REPORTS
- USERS (1) -- (N) THREAT_INDICATORS
- THREAT_REPORTS (1) -- (0..N) THREAT_INDICATORS
- THREAT_INDICATORS (1) -- (N) REVIEW_LOGS
- USERS (1) -- (N) REVIEW_LOGS
- USERS (0..1) -- (N) AUDIT_LOGS
Style: Clean crow's foot notation, primary keys and foreign keys clearly highlighted.
```

---

## 3. Phase 4: Level 0 Context Data Flow Diagram (DFD)

### Eraser AI Prompt:
```
Create a Level 0 Context Data Flow Diagram (DFD) for the Cyber Threat Intelligence (CTI) Sharing Platform.

Central Process:
- [0.0] Cyber Threat Intelligence Sharing Platform

External Entities:
- External Entity 1: Threat Contributor (Left)
  Flows to 0.0: Raw IoCs, Markdown Incident Reports, Auth Credentials + TOTP
  Flows from 0.0: Submission Receipt, Canonical Defanged Previews

- External Entity 2: Security Analyst (Top)
  Flows to 0.0: Triage Decisions, Confidence Scores, MITRE ATT&CK Mappings, Mandatory Justifications
  Flows from 0.0: Pending Vetting Queue, Unredacted TLP:RED Intelligence

- External Entity 3: Threat Consumer / Automated SIEM (Right)
  Flows to 0.0: Feed Pull Requests with JWT Bearer Token
  Flows from 0.0: Filtered OASIS STIX 2.1 JSON Threat Feed (TLP:RED strictly excluded)

- External Entity 4: Platform Administrator (Bottom)
  Flows to 0.0: Account Registrations, Trust Level Updates, Audit Verification Queries
  Flows from 0.0: Audit Trail Verification Status, Prometheus System Metrics

Style: Standard Gane & Sarson DFD notation, labelled directed data arrows.
```

---

## 4. Phase 4: Level 1 Data Flow Diagram (DFD) with Trust Boundaries

### Eraser AI Prompt:
```
Create a Level 1 Data Flow Diagram (DFD) with Trust Boundaries for the CTI Sharing Platform.

Processes:
- [P1.0] Authentication & MFA Gateway (Rate Limiter, Bcrypt, TOTP RFC 6238, JWT Issuer)
- [P2.0] IoC Validation & Canonical Defanging Engine (Strategy Pattern, ReDoS-resistant regex)
- [P3.0] Threat Report Ingestion & XSS Sanitizer
- [P4.0] Analyst Triage & Review Decision Station (RBAC Guard, Justification Enforcer)
- [P5.0] STIX 2.1 Feed Egress Barrier (canAccessTLP Policy Filter, STIX Factory)
- [P6.0] Tamper-Evident SHA-256 Audit Log Chaining Service

Data Stores:
- [D1] Users & Organizations Store
- [D2] Threat Reports Store
- [D3] Threat Indicators Store
- [D4] Review Decisions Store
- [D5] Hash-Chained Audit Logs Store

Trust Boundaries (draw dashed colored lines):
- [TB-1] External / Untrusted Network Boundary: Separates External Clients (Internet) from Express API Gateway.
- [TB-2] Role & Authorization Boundary: Separates General Consumers from Analyst/Admin Vetting Services (enforces canAccessTLP).
- [TB-3] Storage & Persistence Boundary: Isolates application runtime from SQLite storage volume and SHA-256 hash-chaining engine.

Style: Clean technical diagram with clear trust boundaries, distinct data flows, and store interactions.
```

---

## 5. Phase 5: Software & Security Architecture Diagram (Clean/Hexagonal)

### Eraser AI Prompt:
```
Create a Clean / Layered Hexagonal Software & Security Architecture Diagram for the Cyber Threat Intelligence (CTI) Sharing Platform.

Layers (from top to bottom / outside to inside):
1. Presentation & Ingress Layer:
   - HTTPS / TLS 1.3 Termination
   - Helmet (OWASP Secure Headers: CSP, X-Frame-Options: DENY)
   - Express Rate Limiters (authLimiter: 5 req/min, apiLimiter: 100 req/min)
   - Single-Page Application Client (HTML5 / Vanilla CSS / ES2022 / WebCrypto TOTP)

2. API Routing & Middleware Guard Layer:
   - authGuard (JWT signature & expiration validation)
   - rbacGuard (Role-based access: ROLE_ANALYST, ROLE_ADMIN, ROLE_CONTRIBUTOR, ROLE_CONSUMER)
   - tlpGuard (Explicit canAccessTLP Attribute-Based Access Control)
   - Prometheus Metrics Middleware (cti_http_requests_total)

3. Application Service & Domain Layer:
   - Strategy Pattern IoC Validation Engine (IPv4Strategy, IPv6Strategy, DomainStrategy, HashStrategy)
   - Canonical Defanging Service
   - Markdown Stored-XSS Sanitizer
   - STIX 2.1 JSON Bundle Factory
   - Tamper-Evident SHA-256 Hash-Chained Audit Service (Continuous SHA-256 Chaining)

4. Persistence & Infrastructure Layer:
   - SQLite3 Relational Engine (WAL Mode, Foreign Keys Enforced)
   - Isolated EmptyDir Writable Mount (/app/data)
   - Kubernetes Hardened Pod (readOnlyRootFilesystem, runAsNonRoot UID 10001, drop ALL capabilities)

Style: Professional system architecture diagram with modern tech container styling, clear directional arrows.
```

---

## 6. Phase 7: Security Data Flow & STRIDE Threat Model Diagram

### Eraser AI Prompt:
```
Create a Security Data Flow Diagram illustrating the STRIDE Threat Model for the CTI Sharing Platform.

Diagram Components and Overlayed Threats:
- Component 1: Login Endpoint (/api/auth/login)
  -> STRIDE Threat: T01 (Spoofing) - Credential Stuffing & Impersonation
  -> Implemented Control: Bcrypt + RFC 6238 TOTP MFA + 5 req/min rate limit

- Component 2: IoC Ingestion (/api/iocs)
  -> STRIDE Threat: T02 (Tampering) - Malicious observable modification & false data injection
  -> Implemented Control: Strategy Pattern schema validation + canonical defanging + audit logging
  -> STRIDE Threat: T09 (Denial of Service) - ReDoS via catastrophic regex backtracking
  -> Implemented Control: Anchored bounded regular expressions (<253 chars)

- Component 3: Threat Reports (/api/reports)
  -> STRIDE Threat: T07 (Tampering) - Stored XSS via raw script injection in markdown
  -> Implemented Control: Server-side HTML regex sanitization stripping raw scripts

- Component 4: Triage Station (/api/iocs/:id/triage)
  -> STRIDE Threat: T06 (Elevation of Privilege) - Contributor attempts unauthorized approval
  -> Implemented Control: rbacGuard(['ROLE_ANALYST', 'ROLE_ADMIN']) returning 403 Forbidden
  -> STRIDE Threat: T10 (Tampering) - Unjustified classification change
  -> Implemented Control: Mandatory justification string (>=5 chars) written to immutable review_logs

- Component 5: STIX Feed Distribution (/api/feeds/stix)
  -> STRIDE Threat: T04 / T08 (Information Disclosure) - Unauthorized egress of TLP:RED intelligence
  -> Implemented Control: Server-side canAccessTLP() filter stripping TLP:RED before STIX serialization

- Component 6: Audit Storage
  -> STRIDE Threat: T03 (Repudiation) - User denies performing sensitive action
  -> Implemented Control: Tamper-Evident SHA-256 Hash-Chained Audit Log

Style: Threat model diagram with clear red threat callout bubbles mapped to green shield security controls.
```

---

## 7. Phase 8: Attack Tree Diagram (Exfiltrate Confidential TLP:RED Threat Intelligence)

### Eraser AI Prompt:
```
Create a hierarchical Attack Tree Diagram for a Cyber Threat Intelligence Platform.

Root Attacker Goal (Top Node, High-Priority Red):
"Exfiltrate Confidential TLP:RED Threat Intelligence"

Decomposition Logic:
Root Node connects via [OR] to Two Main Attack Vectors:

Branch A: [OR] Compromise Analyst Account
├── Connects via [AND] to:
│   ├── Leaf A1: Credential Compromise (Dictionary attack / Credential stuffing)
│   │   [STRIDE: T01 | Vuln: V01 | Control: Bcrypt (10 rounds) + 5 req/min Rate Limiter]
│   └── Leaf A2: Session / MFA Weakness (TOTP Bypass / Session token hijacking)
│       [STRIDE: T01 | Vuln: V01 | Control: RFC 6238 TOTP single-use code + 5m short-lived token]

Branch B: [OR] Exploit CTI API Access
├── Connects via [OR] to:
│   ├── Leaf B1: Broken Object-Level Authorization / IDOR (Direct report UUID query)
│   │   [STRIDE: T04 | Vuln: V02 | Control: Object ownership check user.org_id === report.org_id]
│   ├── Leaf B2: Broken TLP Authorization (Bypassing TLP rating check)
│   │   [STRIDE: T04 | Vuln: V02 | Control: Explicit centralized canAccessTLP() policy function]
│   └── Leaf B3: Unauthorized STIX Feed Access (Consumer harvesting red indicators from feed)
│       [STRIDE: T08 | Vuln: V02 | Control: Server-side TLP egress filtering before STIX 2.1 serialization]

Style: Formal tree diagram, clear AND/OR logical gates, nodes color-coded by feasibility, security controls attached as green leaf annotations.
```
