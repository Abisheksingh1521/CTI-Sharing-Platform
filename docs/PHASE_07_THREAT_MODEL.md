# PHASE 7 – THREAT MODELING, STRIDE & VULNERABILITY ANALYSIS [10 MARKS]
**Course:** 24CYS401 – Secure Software Engineering  
**System:** Topic 29 – Cyber Threat Intelligence (CTI) Sharing Platform  
**Status:** AUTHORITATIVE BASELINE  

---

## 7.1 Asset Inventory and CIA Classification (9 Primary Assets)

| ID | Asset | Confidentiality | Integrity | Availability | CIA Justification |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **A01** | **User Credentials** | High | High | Medium | Passwords and hashed secrets; compromise enables unauthorized account takeover. |
| **A02** | **TOTP MFA Secrets** | High | High | Medium | RFC 6238 Base32 seeds; compromise allows secondary authentication bypass. |
| **A03** | **JWT Access Tokens** | High | High | Medium | Signed session tokens; compromise permits session hijacking without credentials. |
| **A04** | **Threat Indicators / IoCs** | Medium | High | High | Network observables; tampering injects false indicators, blinding downstream defenses. |
| **A05** | **Threat Reports** | High | High | High | Incident markdown dossiers; tampering injects malicious scripts or misleads investigators. |
| **A06** | **TLP Classification Metadata** | High | High | High | Information barrier ratings; tampering leaks confidential TLP:RED intelligence. |
| **A07** | **Audit Logs** | High | High | Medium | Cryptographic forensic log; tampering conceals malicious operations or destroys evidence. |
| **A08** | **STIX 2.1 Threat Feed** | High | High | High | Automated firewall/SIEM feed; corruption disrupts automated perimeter defense. |
| **A09** | **Organization & User Data** | High | High | Medium | Tenant profile and trust level; tampering permits rogue organizations to access restricted pools. |

---

## 7.2 STRIDE Threat Analysis Matrix (10 Implemented Threats)

| ID | STRIDE | Threat Description | Target Asset | Impact | Control / Mitigation | Vulnerability |
| :---: | :---: | :--- | :---: | :---: | :--- | :--- |
| **T01** | **Spoofing** | Attacker uses stolen credentials to impersonate a contributor/analyst | **A01** | High | Salted Bcrypt + RFC 6238 TOTP MFA + 5 req/min rate limiting | Credential compromise |
| **T02** | **Tampering** | Attacker modifies an IoC during submission | **A04** | High | Strategy-pattern input validation, canonicalization/defanging, audit logging | Insufficient input integrity validation |
| **T03** | **Repudiation** | User denies performing a sensitive action | **A07** | Medium | Tamper-Evident SHA-256 Hash-Chained Audit Log | Insufficient audit evidence |
| **T04** | **Information Disclosure** | Unauthorized user accesses TLP:RED intelligence | **A06/A04** | Critical | Centralized `canAccessTLP()` policy + server-side feed filtering | Broken access control / TLP authorization failure |
| **T05** | **Denial of Service** | Excessive authentication/API requests exhaust resources | **A08** | High | Tiered IP rate limiting + 100kb request body limits | Resource exhaustion |
| **T06** | **Elevation of Privilege** | Contributor attempts analyst/admin-only triage operations | **A09** | Critical | Express RBAC middleware (`rbacGuard`) + HTTP 403 enforcement | Broken role authorization |
| **T07** | **Tampering** | Malicious Markdown/script content is submitted in a threat report | **A05** | High | Server-side regex sanitization stripping raw scripts and event attributes | Stored XSS / insufficient output sanitization |
| **T08** | **Information Disclosure** | STIX feed exposes intelligence beyond user's TLP clearance | **A08/A06** | Critical | Server-side TLP filtering before OASIS STIX 2.1 serialization | TLP filtering failure |
| **T09** | **Denial of Service** | Adversarial validation input causes excessive regex processing | **A04** | High | Anchored, bounded non-backtracking validation regex ($<253$ chars) | ReDoS |
| **T10** | **Tampering** | Analyst changes classification without justification | **A06** | High | Mandatory justification ($\ge 5$ chars) + review log + audit log | Insufficient authorization/audit validation |

---

## 7.3 Critical Information Flows and Trust Boundaries

### IF-01 — IoC Submission Flow
```
Organization Contributor
        │
        │ HTTPS (TLS 1.3)
        ▼
[TB1: External / API Boundary]
        │
        ▼
Authentication + RBAC (ROLE_CONTRIBUTOR)
        │
        ▼
IoC Validation / Canonical Defanging (Strategy Pattern)
        │
        ▼
SQLite Database (threat_indicators, status = 'PENDING')
        │
        ▼
Tamper-Evident SHA-256 Audit Hash Chain
```

### IF-02 — Analyst Triage Flow
```
Security Analyst
        │
        │ HTTPS + Signed JWT Token
        ▼
[TB1: API Boundary]
        │
        ▼
RBAC (ROLE_ANALYST / ROLE_ADMIN)
        │
        ▼
Triage Service
        ├───► Review Log (review_logs: decision, justification, analyst_id)
        ├───► TLP Classification (assigned_tlp, confidence_score, mitre_attack_id)
        └───► Tamper-Evident SHA-256 Audit Log
```

### IF-03 — Threat Feed Egress Flow
```
Threat Consumer / SIEM Agent
        │
        │ HTTPS + JWT Bearer Token
        ▼
[TB1: API Boundary]
        │
        ▼
TLP Authorization (canAccessTLP evaluation)
        │
        ▼
Approved Intelligence (status = 'APPROVED')
        │
        ▼
Server-Side TLP Filtering (Excludes TLP:RED for ROLE_CONSUMER)
        │
        ▼
OASIS STIX 2.1 Serialization Factory
        │
        ▼
Delivered STIX 2.1 JSON Bundle
```

---

## 7.4 Concrete Vulnerability Analysis

| ID | Vulnerability | CWE | Related Threat | Implemented Mitigation Control |
| :---: | :--- | :---: | :---: | :--- |
| **V01** | **Credential compromise** | CWE-798 | `T01` | Salted Bcrypt password hashing (10 rounds) + RFC 6238 TOTP MFA + 5 req/min rate limiter. |
| **V02** | **Broken access control / IDOR** | CWE-639 | `T04`, `T08` | Object-level authorization (`user.org_id === report.org_id`) and centralized explicit `canAccessTLP()`. |
| **V03** | **Broken role authorization** | CWE-862 | `T06` | Centralized `rbacGuard(['ROLE_ANALYST', 'ROLE_ADMIN'])` returning HTTP 403 Forbidden. |
| **V04** | **Stored Cross-Site Scripting (XSS)** | CWE-79 | `T07` | Server-side regex sanitization stripping raw `<script>` tags and dangerous HTML event handlers. |
| **V05** | **Resource exhaustion / ReDoS** | CWE-1333 | `T05`, `T09` | Anchored, length-bounded regular expressions ($<253$ chars) + 100kb payload ceiling. |
| **V06** | **Insufficient audit protection** | CWE-778 | `T03`, `T10` | Cryptographic SHA-256 continuous hash-chained audit logging with offline verification routine. |

---

## 7.5 Threat Model and Security Data-Flow Diagram

*Diagram Reference:* The architecture and STRIDE threat overlay diagram is generated via Eraser AI.  
*Generation Prompt:* See `evidence/DIAGRAM_GENERATION_PROMPTS.md` (Section 6).  
*Diagram Location:* `[INSERT DIAGRAM: Phase 7 STRIDE Threat Model & Security Data-Flow Diagram]`
