# PHASE 8 – ATTACK TREE AND SECURITY ARCHITECTURE REFINEMENT [6 MARKS]
**Course:** 24CYS401 – Secure Software Engineering  
**System:** Topic 29 – Cyber Threat Intelligence (CTI) Sharing Platform  
**Status:** DERIVED DIRECTLY FROM AUTHORITATIVE PHASE 7 THREAT MODEL  

---

## 8.1 Critical Attacker Goal

**Primary Critical Goal:**  
*Exfiltrate Confidential TLP:RED Threat Intelligence*

**Objective & Context:**  
The primary security objective of the platform is to prevent an adversary from obtaining sensitive, unredacted `TLP:RED` threat intelligence, victim attribution data, and zero-day vulnerability disclosures. An attacker seeking this intelligence may attempt to compromise a privileged analyst account or exploit weaknesses in API authorization and TLP egress enforcement.

---

## 8.2 Attack Tree Decomposition (AND / OR Logic)

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

---

## 8.3 Attack Path, STRIDE Threat, Vulnerability, and Control Mapping

Every attack path maps directly to the authoritative Phase 7 assets (`A01`–`A09`), STRIDE threats (`T01`–`T10`), and concrete vulnerabilities (`V01`–`V06`):

| Attack Path | Target Asset | STRIDE Threat | Targeted Vulnerability | Preventive Control | Detective Control |
| :--- | :---: | :---: | :--- | :--- | :--- |
| **Branch A $\rightarrow$ Leaf A1:**<br>Credential Compromise | **A01** | `T01 (Spoofing)` | `V01` (Credential compromise / CWE-798) | 1. Salted Bcrypt password hashing (10 rounds).<br>2. IP-based rate limiting (5 req/min via `authLimiter`). | Centralized audit logging of `AUTH_LOGIN_FAILED`; Prometheus counter `cti_failed_logins_total`. |
| **Branch A $\rightarrow$ Leaf A2:**<br>Session / MFA Weakness | **A02, A03** | `T01 (Spoofing)` | `V01` (Credential compromise / CWE-798) | 1. RFC 6238 TOTP computation with single-use window.<br>2. Short-lived 5-minute MFA challenge token. | Logging of `AUTH_MFA_FAILED` in audit trail; account lockout after consecutive failures. |
| **Branch B $\rightarrow$ Leaf B1:**<br>Broken Object Authorization (IDOR) | **A05** | `T04 (Information Disclosure)` | `V02` (Broken access control / CWE-639) | Strict object ownership verification in `reportController.js`: Verifies `user.org_id === report.org_id` before returning `TLP:RED` records. | Audit event logging on access denials (HTTP 403 Forbidden); SIEM security alert. |
| **Branch B $\rightarrow$ Leaf B2:**<br>Broken TLP Authorization | **A06** | `T04 (Information Disclosure)` | `V02` (Broken access control / CWE-639) | Centralized explicit Attribute-Based Access Control (`canAccessTLP` in `tlpGuard.js`): Evaluates role, trust level, and org provenance. | HTTP 403 logging with requesting user UUID and target indicator ID. |
| **Branch B $\rightarrow$ Leaf B3:**<br>Unauthorized STIX Feed Access | **A08** | `T08 (Information Disclosure)` | `V02` (TLP filtering failure / CWE-639) | Server-side TLP egress filtering in `feedController.js`: Completely excludes `TLP:RED` objects before OASIS STIX 2.1 serialization. | Prometheus metric tracking indicators delivered per request; audit log records filtered count. |

---

## 8.4 Security Architecture Refinement

Based on the Attack Tree analysis, the platform architecture was refined with nine concrete defense-in-depth security controls:

1. **Mandatory RFC 6238 TOTP Multi-Factor Authentication:**  
   Primary credentials only issue a temporary, non-reusable 5-minute challenge token. Full API access tokens are issued only upon valid HMAC-SHA1 TOTP verification with $\pm 30\text{s}$ drift tolerance.
2. **Work-Factor 10 Bcrypt Password Hashing:**  
   All master credentials are salted with 10 rounds of bcrypt, mitigating offline dictionary attacks in the event of database file exposure.
3. **Cryptographically Signed JWT Validation with Strict Expiration:**  
   Session tokens use HMAC-SHA256 signatures with 1-hour expiration. Tokens are validated via `authGuard.js` to prevent token tampering or algorithm confusion (`alg: 'none'`).
4. **Role-Based Access Control (RBAC):**  
   Centralized `rbacGuard.js` enforces strict role segregation (`ROLE_CONTRIBUTOR`, `ROLE_ANALYST`, `ROLE_ADMIN`, `ROLE_CONSUMER`), returning HTTP 403 Forbidden on unauthorized operations.
5. **Object-Level Authorization Enforcement:**  
   Individual threat report access verifies tenant ownership (`user.org_id === report.org_id`), eliminating Insecure Direct Object Reference (IDOR) vulnerabilities.
6. **Centralized Explicit `canAccessTLP` Policy:**  
   Evaluates user role, organization ID, and organization trust score in memory, strictly denying `ROLE_CONSUMER` and external contributors from reading `TLP:RED` records.
7. **Server-Side TLP Egress Filtering:**  
   Applied prior to serialization in `feedController.js`, ensuring `TLP:RED` records never traverse network boundaries to consumer clients.
8. **Tiered Rate Limiting & Body Limits:**  
   `authLimiter` limits login attempts to 5 req/min; `apiLimiter` caps general requests to 100 req/min; JSON body limit capped at 100kb to mitigate Denial of Service.
9. **Tamper-Evident SHA-256 Hash-Chained Audit Log:**  
   Cryptographic SHA-256 hash chaining provides tamper-evident integrity verification of audit records and allows unauthorized modification of the chain to be detected during verification.

---

## 8.5 Diagram Generation Reference

*Diagram Reference:* Attack Tree diagram generated in Eraser AI.  
*Generation Prompt:* See `evidence/DIAGRAM_GENERATION_PROMPTS.md` (Section 7).  
*Diagram Placeholder:* `[INSERT DIAGRAM: Phase 8 Attack Tree – Exfiltrate Confidential TLP:RED Threat Intelligence]`
