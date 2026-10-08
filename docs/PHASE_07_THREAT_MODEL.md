# PHASE 7 – THREAT MODELING AND SECURITY ANALYSIS [10 MARKS]
**Course:** 24CYS401 – Secure Software Engineering  
**System:** Topic 29 – Cyber Threat Intelligence (CTI) Sharing Platform  

---

## 1. Asset Identification and CIA Classification

| Asset ID | Asset Name & Scope | Confidentiality (C) | Integrity (I) | Availability (A) | CIA Justification |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **AST-01** | **User Credentials & MFA Secrets** | **CRITICAL** | **HIGH** | **MEDIUM** | Compromise enables impersonation of analysts or administrators. |
| **AST-02** | **Organization Provenance & Trust Levels** | **HIGH** | **CRITICAL** | **MEDIUM** | Tampering with trust levels allows rogue organizations to access restricted intelligence. |
| **AST-03** | **Raw Ingested Threat Observables (IoCs)** | **LOW** | **CRITICAL** | **HIGH** | Tampering injects false indicators (poisoning), blinding downstream defense systems. |
| **AST-04** | **Confidential TLP:RED Incident Reports** | **CRITICAL** | **HIGH** | **HIGH** | Contains sensitive victim attribution and zero-day exploitation details. |
| **AST-05** | **Published STIX 2.1 Threat Feeds** | **MEDIUM** | **CRITICAL** | **CRITICAL** | Consumed directly by automated firewalls, SOAR, and SIEMs for active blocking. |
| **AST-06** | **JWT Signing Secret Key** | **CRITICAL** | **CRITICAL** | **MEDIUM** | Compromise permits universal token forgery and total platform takeover. |
| **AST-07** | **Tamper-Evident SHA-256 Audit Trail** | **MEDIUM** | **CRITICAL** | **HIGH** | Required for post-incident forensics and regulatory compliance; must detect alterations. |
| **AST-08** | **Container Environment & Local SQLite File** | **HIGH** | **CRITICAL** | **CRITICAL** | Underlying OS execution context and database storage files. |

---

## 2. STRIDE Threat Analysis Matrix (10 Implemented Threats)

| Threat ID | STRIDE Category | Affected Element | Threat Description & Attack Scenario | Impact | Existing Control | Proposed Mitigation |
| :---: | :---: | :--- | :--- | :--- | :--- | :--- |
| **T01** | **S**poofing | `/api/auth/login` | Attacker performs automated credential stuffing or brute-forces passwords to hijack an analyst account. | High: Unauthorized access to classified intelligence. | Bcrypt password hashing, timing-safe compare. | Enforce mandatory RFC 6238 TOTP MFA + 5 req/min rate limiter. |
| **T02** | **T**ampering | `/api/iocs` | Malicious contributor submits poisoned IoCs (e.g., Google DNS `8.8.8.8`) to cause denial of legitimate traffic on subscriber firewalls. | Critical: Disruption of critical enterprise networking. | IoC Deduplication and schema format checks. | Mandatory analyst triage review workflow before feed publishing. |
| **T03** | **R**epudiation | Ingestion & Triage | Contributor submits toxic data or analyst approves malicious IoC, then later denies their action. | Medium: Inability to establish incident accountability. | Ephemeral server console logs. | Tamper-Evident SHA-256 Hash-Chained Audit Log recording user UUID and IP. |
| **T04** | **I**nformation Disclosure | `/api/feeds/stix` | Unvetted consumer or adversary queries STIX feed to harvest sensitive `TLP:RED` incident reports and victim attribution. | Critical: Breach of victim confidentiality and regulatory penalties. | Client-side UI role hiding. | Server-side explicit `canAccessTLP` egress filter stripping TLP:RED. |
| **T05** | **D**enial of Service | API Gateway | Attacker floods indicator submission endpoint with multi-megabyte payloads to exhaust memory. | High: Platform outage preventing real-time threat sharing. | Default Express parser. | Strict body size ceiling (`limit: '100kb'`) and IP-based rate limiting. |
| **T06** | **E**levation of Privilege | `/api/iocs/:id/triage` | Contributor uses API client to send direct `PUT` request to approve and publish their own submissions. | High: Bypass of validation barrier. | Contributor UI button disablement. | Express middleware `rbacGuard(['ROLE_ANALYST', 'ROLE_ADMIN'])` returning 403. |
| **T07** | **T**ampering | SQLite Database | Rogue insider or compromised host process modifies historical audit log records to conceal unauthorized data viewing. | High: Corrupted compliance audit trail. | Standard database file permissions. | Continuous SHA-256 hash chaining; automated verification flags row edits. |
| **T08** | **T**ampering | `/api/reports` | Adversary injects malicious JavaScript into Markdown incident reports (Stored XSS). | High: Session hijacking of reviewing security analysts. | Basic string storage. | Server-side HTML sanitization stripping raw `<script>` tags and event handlers. |
| **T09** | **D**enial of Service | Regex Parser | Adversary crafts pathological strings causing catastrophic backtracking (ReDoS) on domain validation. | High: Event loop freeze resulting in denial of service. | Unanchored procedural regex. | Anchored, bounded regular expressions with input length bounds ($<253$ chars). |
| **T10** | **S**poofing | JWT Tokens | Attacker tampers with JWT header or payload (e.g., algorithm confusion attack: `alg: 'none'`). | Critical: Universal authentication bypass. | Client token storage. | Strict HMAC-SHA256 signature verification in `authGuard.js` with expiration checks. |

---

## 3. Information Flow Analysis (3 Sensitive Flows)

### Flow 1: Authentication & Credential Ingestion Flow
* **Path:** Client Browser $\rightarrow$ Perimeter TLS 1.3 $\rightarrow$ Rate Limiter (`authLimiter`) $\rightarrow$ `authController.login` $\rightarrow$ Database Read (`users`) $\rightarrow$ Bcrypt Hash Compare $\rightarrow$ Memory Volatile Discard $\rightarrow$ Temporary MFA Challenge Token Issued.
* **Security Controls:** Rate limiting (5 req/min), timing-safe comparison, bcrypt work factor 10, short-lived temporary token (5m).

### Flow 2: Threat Intelligence Ingestion & Defanging Flow
* **Path:** Organization Contributor $\rightarrow$ HTTPS POST `/api/iocs` $\rightarrow$ JWT `authGuard` $\rightarrow$ RBAC Check (`ROLE_CONTRIBUTOR`) $\rightarrow$ Strategy Pattern Validator $\rightarrow$ Canonical Defanging $\rightarrow$ Database Write (`threat_indicators`, `status = 'PENDING'`) $\rightarrow$ Audit Event Append (`IOC_SUBMITTED`).
* **Security Controls:** Token verification, strict regex schema checks, non-execution defanging (`.` $\rightarrow$ `[.]`), audit logging.

### Flow 3: Classified Threat Feed Egress Flow
* **Path:** Threat Consumer $\rightarrow$ HTTPS GET `/api/feeds/stix` $\rightarrow$ JWT `authGuard` $\rightarrow$ Database Read (`status = 'APPROVED'`) $\rightarrow$ Server-Side `canAccessTLP(user, indicator)` Egress Barrier $\rightarrow$ `STIXFactory.createBundle` $\rightarrow$ Client Response.
* **Security Controls:** Parameterized database queries, explicit Attribute-Based Access Control, complete exclusion of `TLP:RED` from consumer bundles.

---

## 4. Concrete Vulnerabilities Analysis

To maintain scientific integrity, vulnerabilities are categorized by their real operational status:

1. **`VULN-01` (Demonstrated in Phase 12 - ReDoS Vulnerability):**
   * *Status:* Implemented in `src/vulnerable/` and remediated in `src/services/iocValidator.js`.
   * *Description:* Unanchored regular expression in initial URL/domain parser vulnerable to catastrophic backtracking when fed long strings of repetitive dots.
   * *Impact:* 100% CPU lockup on single-threaded Node.js event loop.
   * *Remediation:* Replaced with anchored non-backtracking RFC-compliant regex with bounded length check.
2. **`VULN-02` (Mitigated - Broken Object-Level Authorization / Missing RBAC):**
   * *Status:* Mitigated by `rbacGuard.js`.
   * *Description:* Direct API query to analyst triage endpoints without verifying the `ROLE_ANALYST` claim.
   * *Impact:* Unauthorized self-approval of threat intelligence by contributors.
   * *Remediation:* Centralized `rbacGuard(['ROLE_ANALYST', 'ROLE_ADMIN'])` returning HTTP 403 Forbidden.
3. **`VULN-03` (Mitigated - Insecure Direct Object Reference on TLP:RED Intelligence):**
   * *Status:* Mitigated by `canAccessTLP` in `tlpGuard.js`.
   * *Description:* Feed distribution endpoint omitting server-side TLP checks, exposing classified victim telemetry to general subscribers.
   * *Impact:* Unauthorized information disclosure of proprietary victim infrastructure.
   * *Remediation:* Explicit `canAccessTLP(user, indicator)` policy filtering all records before STIX serialization.
4. **`VULN-04` (Mitigated - Stored Cross-Site Scripting in Threat Reports):**
   * *Status:* Mitigated by `reportController.js`.
   * *Description:* Rendering user-submitted Markdown reports containing embedded raw `<script>` tags.
   * *Impact:* Session token theft from reviewing security analysts.
   * *Remediation:* Server-side regex sanitization stripping script tags and dangerous HTML attributes.
5. **`VULN-05` (Mitigated - Audit Trail Retroactive Modification):**
   * *Status:* Mitigated by `AuditService.js`.
   * *Description:* Malicious insider directly executing SQL `UPDATE` or `DELETE` on log tables to erase forensic evidence.
   * *Impact:* Compromised incident investigation and loss of audit integrity.
   * *Remediation:* Continuous SHA-256 hash chaining; `verifyAuditChain()` flags any altered row.
6. **`VULN-06` (Mitigated - Credential Stuffing & Brute Force):**
   * *Status:* Mitigated by `rateLimiter.js` and `totpService.js`.
   * *Description:* Rapid automated password guessing on authentication endpoints.
   * *Impact:* Account takeover.
   * *Remediation:* Mandatory RFC 6238 TOTP MFA combined with strict IP rate limiting (5 req/min).
