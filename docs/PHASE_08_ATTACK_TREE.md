# PHASE 8 – ATTACK TREE AND SECURITY ARCHITECTURE REFINEMENT [6 MARKS]
**Course:** 24CYS401 – Secure Software Engineering  
**System:** Topic 29 – Cyber Threat Intelligence (CTI) Sharing Platform  

---

## 1. Primary Attacker Goal
**Root Goal:** *Exfiltrate Confidential TLP:RED Threat Intelligence & Victim Attribution Details*

---

## 2. Attack Tree Decomposition (AND / OR Logic)

```
ROOT: Exfiltrate Confidential TLP:RED Threat Intelligence
│
├── [OR] Path 1: Compromise Analyst Account
│   │
│   └── [AND] Credential Hijack & MFA Bypass
│       ├── [Step 1.1] Credential Compromise (Brute-force / Credential Stuffing)
│       └── [Step 1.2] MFA / Session Weakness (TOTP Token Theft / Session Hijacking)
│
└── [OR] Path 2: Exploit API Access
    │
    ├── [Step 2.1] Insecure Direct Object Reference (IDOR) on Threat Reports
    └── [Step 2.2] Broken / Missing TLP Authorization on STIX Threat Feeds
```

---

## 3. Attack Path, Vulnerability, and Control Mapping

| Path ID | Attack Scenario | Targeted Vulnerability | Preventive Control | Detective Control |
| :---: | :--- | :--- | :--- | :--- |
| **Path 1.1** | Adversary attempts dictionary attacks or credential stuffing against `/api/auth/login`. | `VULN-06` (Missing rate limiting / weak auth). | 1. Salted bcrypt password hashing (10 rounds).<br>2. IP-based Rate Limiter (5 req/min). | Centralized logging of `AUTH_LOGIN_FAILED` in Audit Log; Prometheus `cti_failed_logins_total` counter alert. |
| **Path 1.2** | Adversary attempts to bypass the second-factor authentication prompt. | `VULN-06` (Improper MFA enforcement). | 1. RFC 6238 TOTP computation with single-use window.<br>2. Short-lived temporary token (5m) restricted to MFA verification. | Logging of `AUTH_MFA_FAILED` in Audit Log; account lockout after consecutive failures. |
| **Path 2.1** | Adversary directly requests classified reports by UUID (`GET /api/reports/:id`) without having originating org membership. | `VULN-03` (IDOR / Broken Object-Level Auth). | Object ownership validation in `reportController.js`: Verifies `user.org_id === report.org_id` before returning `TLP:RED` records. | Audit event logging on access denials (HTTP 403); SIEM security alert. |
| **Path 2.2** | Adversary queries automated STIX feed (`GET /api/feeds/stix`) expecting classified `TLP:RED` observables. | `VULN-03` (Broken TLP Authorization). | Server-side explicit Attribute-Based Access Control (`canAccessTLP` in `tlpGuard.js`): `TLP:RED` is strictly excluded from consumer feeds before serialization. | Prometheus metric tracking indicators delivered per request; audit log records filtered count. |

---

## 4. Security Architecture Refinement

Based on the Attack Tree analysis, the platform architecture was refined with two concrete defensive enhancements:

1. **Explicit Server-Side ABAC Filter (`canAccessTLP`):**  
   Replaced generic SQL `WHERE` clauses with an immutable in-memory policy filter that evaluates user role, organization identifier, and organization trust score before threat observables are passed to the STIX serialization factory.
2. **Tamper-Evident SHA-256 Hash Chaining:**  
   Every login failure, privilege escalation attempt, and feed pull is cryptographically chained into the append-only `audit_logs` table, ensuring that even if an attacker compromises a database credential, they cannot silently erase their forensic footprint.
