# PHASE 8 – ATTACK TREE AND SECURITY ARCHITECTURE REFINEMENT [6 MARKS]
**Course:** 24CYS401 – Secure Software Engineering  
**System:** Topic 29 – Cyber Threat Intelligence (CTI) Sharing Platform  

---

## 1. Primary Attacker Goal
**Root Goal:** *Exfiltrate Confidential TLP:RED Threat Intelligence*

---

## 2. Attack Tree Decomposition (AND / OR Logic)

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

---

## 3. Attack Path, STRIDE Threat, Vulnerability, and Control Mapping

| Attack Path | STRIDE Threat | Targeted Vulnerability | Preventive Control | Detective Control |
| :--- | :---: | :--- | :--- | :--- |
| **Compromise Analyst Account $\rightarrow$ Credential compromise** | `T01 (Spoofing)` | `VULN-06` (Credential Stuffing & Brute-Force) | 1. Salted bcrypt password hashing (10 rounds).<br>2. IP-based Rate Limiter (5 req/min). | Centralized logging of `AUTH_LOGIN_FAILED` in Audit Log; Prometheus `cti_failed_logins_total` counter alert. |
| **Compromise Analyst Account $\rightarrow$ MFA/session weakness** | `T01 (Spoofing)` | `VULN-06` (Weak MFA / Session Enforcement) | 1. RFC 6238 TOTP computation with single-use window.<br>2. Short-lived temporary token (5m) restricted to MFA verification. | Logging of `AUTH_MFA_FAILED` in Audit Log; account lockout after consecutive failures. |
| **Exploit API Access $\rightarrow$ IDOR / broken object authorization** | `T04 (Information Disclosure)` | `VULN-03` (Broken Object-Level Auth / IDOR) | Object ownership validation in `reportController.js`: Verifies `user.org_id === report.org_id` before returning `TLP:RED` records. | Audit event logging on access denials (HTTP 403); SIEM security alert. |
| **Exploit API Access $\rightarrow$ Broken TLP authorization** | `T04 (Information Disclosure)` | `VULN-03` (Broken TLP Authorization) | Server-side explicit Attribute-Based Access Control (`canAccessTLP` in `tlpGuard.js`): `TLP:RED` is strictly excluded from consumer feeds before serialization. | Prometheus metric tracking indicators delivered per request; audit log records filtered count. |

---

## 4. Security Architecture Refinement

Based on the Attack Tree analysis, the platform architecture was refined with two concrete defensive enhancements:

1. **Explicit Server-Side ABAC Filter (`canAccessTLP`):**  
   Replaced generic SQL `WHERE` clauses with an immutable in-memory policy filter that evaluates user role, organization identifier, and organization trust score before threat observables are passed to the STIX serialization factory.
2. **Tamper-Evident SHA-256 Hash Chaining:**  
   Cryptographic SHA-256 hash chaining provides tamper-evident integrity verification of audit records and allows unauthorized modification of the chain to be detected during verification. Every login failure, privilege escalation attempt, and feed pull is cryptographically chained into the append-only `audit_logs` table, ensuring that even if an attacker compromises a database credential, they cannot silently erase their forensic footprint.

