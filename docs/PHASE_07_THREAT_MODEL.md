# PHASE 7 – THREAT MODELING AND SECURITY ANALYSIS [10 MARKS]
**Course:** 24CYS401 – Secure Software Engineering  
**System:** Topic 29 – Cyber Threat Intelligence (CTI) Sharing Platform  

## 1. Asset Identification and CIA Classification (9 Primary Assets)

| Asset ID | Asset Name & Scope | Confidentiality (C) | Integrity (I) | Availability (A) | CIA Justification |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **AST-01** | **User Credentials & MFA Secrets** | **CRITICAL** | **HIGH** | **MEDIUM** | Compromise enables impersonation of analysts or administrators. |
| **AST-02** | **Organization Provenance & Trust Levels** | **HIGH** | **CRITICAL** | **MEDIUM** | Tampering with trust levels allows rogue organizations to access restricted intelligence. |
| **AST-03** | **Raw Ingested Threat Observables (IoCs)** | **LOW** | **CRITICAL** | **HIGH** | Tampering injects false indicators (poisoning), blinding downstream defense systems. |
| **AST-04** | **Confidential TLP:RED Incident Reports** | **CRITICAL** | **HIGH** | **HIGH** | Contains sensitive victim attribution and zero-day exploitation details. |
| **AST-05** | **Published STIX 2.1 Threat Feeds** | **MEDIUM** | **CRITICAL** | **CRITICAL** | Consumed directly by automated firewalls, SOAR, and SIEMs for active blocking. |
| **AST-06** | **JWT Signing Secret Key** | **CRITICAL** | **CRITICAL** | **MEDIUM** | Compromise permits universal token forgery and total platform takeover. |
| **AST-07** | **Tamper-Evident SHA-256 Audit Trail** | **MEDIUM** | **CRITICAL** | **HIGH** | Required for post-incident forensics and regulatory compliance; must detect alterations. Cryptographic SHA-256 hash chaining provides tamper-evident integrity verification of audit records and allows unauthorized modification of the chain to be detected during verification. |
| **AST-08** | **Container Environment & Local SQLite File** | **HIGH** | **CRITICAL** | **CRITICAL** | Underlying OS execution context and database storage files. |
| **AST-09** | **Analyst Triage & Review Decision Logs (`review_logs`)** | **HIGH** | **CRITICAL** | **HIGH** | Contains analyst vetting rationales, false-positive assessments, and MITRE ATT&CK mappings; tampering conceals rogue approvals. |

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

To maintain scientific integrity and adhere to exam standards, all analyzed vulnerabilities are strictly classified into one of three operational states:

### Category A: Vulnerability Demonstrated in a Controlled Test
1. **`VULN-01` (Regular Expression Denial of Service - ReDoS):**
   * *Status:* **Vulnerability demonstrated in a controlled test** (implemented in isolated test harness `src/vulnerable/vulnerableValidator.js` and benchmarked under Phase 12).
   * *Description:* Unanchored regular expression in initial URL/domain parser vulnerable to catastrophic backtracking when fed long strings of repetitive dots.
   * *Impact:* 100% CPU lockup on single-threaded Node.js event loop during test demonstration.
   * *Remediation Status:* Completely mitigated in production `src/services/iocValidator.js` using anchored, bounded regex ($<253$ characters).

### Category B: Vulnerability Mitigated by an Implemented Security Control
2. **`VULN-02` (Broken Object-Level Authorization / Missing RBAC on Triage):**
   * *Status:* **Vulnerability mitigated by an implemented security control** (`src/middleware/rbacGuard.js`).
   * *Description:* Direct API `PUT` query to analyst triage endpoints without verifying user role claims.
   * *Impact:* Unauthorized self-approval of threat intelligence by contributors.
   * *Remediation Control:* Centralized `rbacGuard(['ROLE_ANALYST', 'ROLE_ADMIN'])` returning HTTP 403 Forbidden with automated regression testing.
3. **`VULN-03` (Broken TLP Authorization / Insecure Direct Object Reference):**
   * *Status:* **Vulnerability mitigated by an implemented security control** (`src/middleware/tlpGuard.js`).
   * *Description:* Feed distribution endpoint omitting server-side TLP checks, exposing classified victim telemetry to general subscribers.
   * *Impact:* Unauthorized information disclosure of proprietary victim infrastructure.
   * *Remediation Control:* Explicit `canAccessTLP(user, indicator)` policy filtering all records before STIX serialization and returning 403 on direct report queries.
4. **`VULN-04` (Stored Cross-Site Scripting in Incident Reports):**
   * *Status:* **Vulnerability mitigated by an implemented security control** (`src/controllers/reportController.js`).
   * *Description:* Rendering user-submitted Markdown reports containing embedded raw `<script>` tags or malicious event handlers.
   * *Impact:* Session token theft from reviewing security analysts in the browser.
   * *Remediation Control:* Server-side HTML sanitization regex stripping `<script>` tags and dangerous attributes prior to database persistence.
5. **`VULN-05` (Audit Trail Retroactive Modification / Tampering):**
   * *Status:* **Vulnerability mitigated by an implemented security control** (`src/services/auditService.js`).
   * *Description:* Malicious insider or compromised account directly executing SQL `UPDATE` or `DELETE` on log tables to erase forensic evidence.
   * *Impact:* Inability to conduct post-incident forensics.
   * *Remediation Control:* Cryptographic SHA-256 hash chaining provides tamper-evident integrity verification of audit records and allows unauthorized modification of the chain to be detected during verification.
6. **`VULN-06` (Credential Stuffing & Authentication Brute-Force):**
   * *Status:* **Vulnerability mitigated by an implemented security control** (`src/middleware/rateLimiter.js` & `src/services/totpService.js`).
   * *Description:* Rapid automated password guessing on authentication endpoints.
   * *Impact:* Analyst or administrator account takeover.
   * *Remediation Control:* Mandatory RFC 6238 TOTP MFA combined with strict IP rate limiting (5 req/min) and salted bcrypt hashing (work factor 10).

### Category C: Identified Potential Vulnerabilities
7. **`VULN-07` (Third-Party Dependency Supply Chain Risk):**
   * *Status:* **Identified potential vulnerability** (tracked for continuous dependency scanning).
   * *Description:* Transitive dependencies in `node_modules` potentially introducing known CVEs over time.
   * *Proposed Control:* Automated `npm audit` scanning in CI/CD pipeline and package-lock hash pinning.
8. **`VULN-08` (Insecure TLS / Cleartext Egress at Ingress Boundary):**
   * *Status:* **Identified potential vulnerability** (managed at perimeter infrastructure layer).
   * *Description:* Reverse proxy or load balancer misconfiguration failing to enforce TLS 1.3 or HSTS headers.
   * *Proposed Control:* Kubernetes Ingress controller enforcing TLS termination, HSTS `max-age=31536000`, and modern cipher suites./min).
