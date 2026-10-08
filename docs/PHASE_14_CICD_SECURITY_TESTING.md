# EXAM PHASE 14 — CI/CD, SECURITY TESTING, AND FUZZING SPECIFICATION

**Course:** 24CYS401 – Secure Software Engineering  
**System:** Topic 29 – Cyber Threat Intelligence (CTI) Sharing Platform with TLP Enforcement and Tamper-Evident Audit Logging  
**Phase:** 14 — Continuous Integration, Automated Security Testing, and Application Fuzzing  
**Status:** COMPLETE & VERIFIED  

---

## 1. Executive Summary & Phase 14 Objectives

Phase 14 demonstrates an unbroken, automated security assurance pipeline that integrates continuous integration/continuous delivery (CI/CD), multi-tier automated testing, specialized vulnerability regression suites, application-level fuzz testing, container hardening verification, and cryptographic audit chain enforcement. 

Building directly upon the hardened Phase 12 vulnerability remediation baseline (V02 Broken Object-Level Authorization and V04 Stored Cross-Site Scripting) and the Phase 13 containerization deployment baseline, Phase 14 operationalizes the security posture under NIST SP 800-218 (Secure Software Development Framework - SSDF), SLSA Level 2 build provenance, and OWASP ASVS Level 2 verification requirements.

### Key Phase 14 Objectives:
1. **Multi-Stage Secure CI/CD Pipeline:** Formalize an automated 11-stage pipeline spanning secret scanning, SAST, dependency auditing, unit tests, integration tests, E2E CTI lifecycle tests, vulnerability regression, application fuzzing, cryptographic audit validation, container audit, and reproducible build manifests.
2. **Three-Tier Automated Test Infrastructure:**
   - **Unit Testing (31 tests across 5 suites):** Isolated verification of cryptographic algorithms (bcrypt, TOTP RFC 6238, SHA-256 HMAC), input validation strategies (IPv4, IPv6, Domain, Hashes), ReDoS resilience, and HTML/Markdown sanitization.
   - **Integration Testing (30 tests across 5 suites):** API endpoint authentication, JWT issuance, RBAC enforcement, server-side TLP clearance guards, STIX 2.1 serialization, and frontend asset delivery.
   - **End-to-End Workflow Testing (9 sequential steps in 1 suite):** A realistic 9-step threat intelligence lifecycle from contributor registration to STIX distribution and tamper-evident audit logging.
3. **Application-Level Security Fuzzer:** Implement a deterministic, reproducible, non-destructive fuzzer testing 94 distinct test cases across 10 functional categories against platform API endpoints.
4. **Defect Discovery & Retest Governance:** Document real defects surfaced by fuzzing (DEF-01 Type Coercion crashes on non-string inputs; DEF-02 Recursive nested tag collapse evasion under CWE-182), implement permanent code refactoring, add unit regression tests, and retest the complete suite with 100% pass rate.
5. **Traceability & Governance:** Update the project Traceability Matrix to map Phase 14 controls across Requirements, Use Cases, DFDs, STRIDE Threats, CWEs, Attack Trees, Jira Stories, and CI/CD stages.

---

## 2. CI/CD Architecture & Pipeline Flow

The platform's continuous integration architecture implements the principle of progressive gate enforcement: earlier, faster, and cheaper security checks run first to fail fast on fundamental defects before triggering heavier integration and fuzzing routines.

```
Source Checkout (Git HEAD anchor)
    ↓
Dependency Clean Install (npm ci)
    ↓
[Stage 1] Secret Detection & Anti-Hardcoding Audit (scripts/detect-secrets.js)
    ↓
[Stage 2] Static Application Security Testing (SAST) (scripts/security-scan.js)
    ↓
[Stage 3] Dependency Security Vulnerability Audit (npm audit)
    ↓
[Stage 4] Automated Unit Testing (npm run test:unit)
    ↓
[Stage 5] Automated Integration Testing (npm run test:integration)
    ↓
[Stage 6] End-to-End Realistic CTI Workflow Testing (npm run test:e2e)
    ↓
[Stage 7] Security Vulnerability Regression Suite (npm run test:vuln)
    ↓
[Stage 8] Application-Level Security Fuzz Testing (npm run fuzz)
    ↓
[Stage 9] Cryptographic Audit Hash-Chain Verification (npm run audit:verify)
    ↓
[Stage 10] Container Hardening & K8s Deployment Validation (scripts/validate-deployment.js)
    ↓
[Stage 11] Build Artifact Integrity & Reproducibility Seal (scripts/generate-build-manifest.js)
```

### CI/CD Runner Implementations:
- **Local Runner:** `scripts/ci-runner.js` executes the full pipeline locally with structured terminal telemetry and error traps.
- **GitHub Actions Workflow:** `.github/workflows/secure-build.yml` executes identical verification steps on Ubuntu LTS runners upon pull request or push to `main`, saving `build-manifest.json` and `fuzz_execution_results.json` as immutable build artifacts.

---

## 3. Automated Testing Architecture & Separation

Testing is strictly compartmentalized into three distinct test tiers to guarantee isolation and clarity:

### Tier A: Unit Tests (`tests/unit/*.test.js`)
- **Scope:** Isolated service classes and utility algorithms with no network or external dependency requirements.
- **Suites Executed:**
  1. `tests/unit/validator.test.js`: Strategy pattern validation for IPv4, IPv6, Domain, MD5, SHA-1, SHA-256; canonical defanging (`[.]`, `[:]`); ReDoS resilience testing with 1,000-char payloads completing in under 10ms.
  2. `tests/unit/sanitizer.test.js`: `SanitizerService` entity escaping, HTML tag stripping, dangerous scheme neutralization (`javascript:`, `data:`, `vbscript:`), and iterative nested tag collapse prevention (`<<SCRIPT>script>`).
  3. `tests/unit/auth.test.js`: Salted bcrypt password hashing (`$2b$`), RFC 6238 TOTP generation, clock drift verification (±30s window), and token signature consistency.
  4. `tests/unit/auditChain.test.js`: Genesis block hashing, contiguous SHA-256 block linking (`prev_record_hash`), and out-of-band tampering detection.
  5. `tests/unit/tlpAccess.test.js`: Pure logic evaluation of the `canAccessTLP` decision matrix across CLEAR, GREEN, AMBER, and RED rating boundaries.
- **Total Unit Test Count:** 31 tests (100% pass).

### Tier B: Integration Tests (`tests/integration/*.test.js`)
- **Scope:** HTTP API layer interacting with Express middleware, SQLite database transactions, JWT authentication, and RBAC authorization guards.
- **Suites Executed:**
  1. `tests/integration/authApi.test.js`: User registration, credential login, temporary MFA token issuance, TOTP verification, rate limiter triggers (HTTP 429), and forged JWT rejection (HTTP 401).
  2. `tests/integration/rbac.test.js`: Role-based access control gates on `/api/triage`, `/api/audit`, and administrative routes across CONTRIBUTOR, ANALYST, CONSUMER, and ADMIN personas.
  3. `tests/integration/iocReportApi.test.js`: Indicator ingestion, deduplication detection, report submission, and input schema rejection.
  4. `tests/integration/triageFeedApi.test.js`: Analyst triage queue inspection, review log insertion, STIX 2.1 JSON bundle serialization, and TLP filtering on feed endpoints.
  5. `tests/integration/frontendUi.test.js`: Static serving of glassmorphic interface (`index.html`, `styles.css`, `app.js`) and CSP header enforcement.
- **Total Integration Test Count:** 30 tests (100% pass).

### Tier C: End-to-End Workflow Testing (`tests/e2e/ctiWorkflow.test.js`)
- **Scope:** A complete, contiguous, multi-step threat intelligence lifecycle simulating real-world operations from initial user onboarding to external STIX ingestion:
  - **Step 1:** Contributor registration with salted bcrypt hashing and TOTP setup (`POST /api/auth/register`).
  - **Step 2:** Primary credential authentication and temporary challenge token issuance (`POST /api/auth/login`).
  - **Step 3:** RFC 6238 TOTP validation and cryptographically signed JWT issuance (`POST /api/auth/verify-mfa`).
  - **Step 4:** Identity verification and organization tenancy confirmation (`GET /api/auth/me`).
  - **Step 5:** Threat indicator ingestion with canonical defanging (`POST /api/iocs`).
  - **Step 6:** Structured threat report submission with context-aware Markdown sanitization (`POST /api/reports`).
  - **Step 7:** Analyst triage queue inspection and approval to TLP:GREEN with mandatory justification (`PUT /api/iocs/:id/triage`).
  - **Step 8:** Consumer STIX 2.1 threat feed export with server-side TLP filtering and IDOR prevention (`GET /api/feeds/stix` and `GET /api/reports/:id`).
  - **Step 9:** Cryptographic SHA-256 audit hash-chain integrity verification across all generated audit logs (`GET /api/audit/verify`).
- **Total E2E Test Count:** 9 sequential steps (100% pass).

---

## 4. Security Regression Testing (V01–V06 Focus)

Dedicated regression verification is maintained in `tests/vulnerability/vulnerabilityDemo.test.js` to ensure zero regression of remediated vulnerabilities:

### V02 — Broken Object-Level Authorization / IDOR (CWE-639)
- **Vulnerability Baseline:** Unauthenticated or cross-tenant consumers could access sensitive `TLP:RED` incident reports by guessing report IDs.
- **Remediation Control:** Injected `canAccessTLP(req.user, report)` policy guard into `ReportController.getReportById` enforcing organization ownership and analyst clearance. Denied attempts trigger immediate audit logging (`UNAUTHORIZED_REPORT_ACCESS_BLOCKED`).
- **Automated Verification:** Cross-tenant access attempt strictly asserts `HTTP 403 Forbidden` and confirms audit log entry generation.

### V04 — Stored Cross-Site Scripting (CWE-79)
- **Vulnerability Baseline:** Naive regex filter (`<script>`) allowed inline event handlers (`onmouseover`, `ontoggle`, `onerror`) to persist into the database.
- **Remediation Control:** `SanitizerService.sanitizeMarkdown` strips dangerous tags, neutralizes all `on*` event handlers, and replaces unsafe URI schemes (`javascript:`, `data:`, `vbscript:`) with `blocked:`.
- **Automated Verification:** Malicious payloads submitted via `POST /api/reports` are stored without executable event handlers and served safely with `HTTP 201`.

---

## 5. Application-Level Security Fuzzing Methodology

A controlled, deterministic application-level security fuzzer was constructed in `scripts/fuzz-security.js` (bridged via `tests/fuzz/iocFuzzer.js` and `npm run fuzz`).

### Fuzzing Invariants & Acceptance Criteria:
1. **Zero Unhandled Server Crashes:** No input payload may trigger an uncaught exception resulting in HTTP 500.
2. **Zero Authorization Bypasses:** Malformed authentication tokens, stripped headers, and algorithm-none attacks must return HTTP 401 or HTTP 403.
3. **Zero Executable XSS Payloads:** Malicious scripts and event handlers must be sanitized before persistence.
4. **Controlled HTTP Responses:** Endpoints must return controlled status codes (`400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, or sanitized `200/201`).
5. **Zero Database Corruption:** The cryptographic SHA-256 audit chain must remain intact post-fuzzing with zero record tampering detected.

### Fuzzing Input Categories (94 Deterministic Cases):
1. **IPv4 Indicators (10 cases):** Octet overflow (`999.999.999.999`), CIDR masks (`192.168.1.1/24`), 5 octets (`1.2.3.4.5`), leading zeros, double dots, embedded whitespace, null bytes (`\0`), negative octets, 256 boundaries, and command injection strings (`1.1.1.1;cat /etc/passwd`).
2. **IPv6 Indicators (8 cases):** Multiple double-colons (`::1::1`), triple-colons (`2001:db8:::1`), non-hex characters (`2001:xyz::1`), 9 hex groups, trailing interface zones (`fe80::1%eth0`), brackets, null bytes, and invalid hex groups.
3. **Domain Indicators (10 cases):** Leading hyphens (`-evil.com`), double dots (`evil..com`), trailing hyphens, protocol prefixes (`http://`), URL path separators (`evil.com/path`), special characters (`evil$corp.com`), leading dots, null bytes, 260-char label overflows, and SQL injection strings (`evil.com'; DROP TABLE threat_indicators;--`).
4. **File Hashes (12 cases):** MD5 (31 chars, 33 chars, non-hex, null bytes), SHA-1 (39 chars, 41 chars, non-hex, internal whitespace), SHA-256 (63 chars, 65 chars, SQL injection strings, unicode emoji symbols).
5. **Report Titles (8 cases):** Script injections, embedded null bytes, 2,000-character strings, SQL injection strings, Unicode RTL override (`\u202E`), pure HTML tags, multi-byte emoji floods, and XML CDATA wrappers.
6. **Report Markdown & Content (10 cases):** Onmouseover, SVG onload, details ontoggle, body onload, iframe remote injection, dangerous javascript: URIs, data: URIs, autofocus exploits, nested tag collapse evasion (`<<SCRIPT>script>`), and 32KB oversized markdown.
7. **Confidence Values (8 cases):** Negative values (-1, -999999), boundary exceeds (101, 999999), string numbers ("75"), non-numeric strings ("hundred"), floating point values (85.7), and null values.
8. **TLP Values (8 cases):** Invalid enums ("PURPLE", "SUPER_RED"), prefixed values ("TLP:AMBER"), numeric types (1), empty strings, null bytes, SQL injection payloads, and lowercase strings ("green").
9. **Malformed Payloads & ID Traversal (12 cases):** Directory traversal (`../../etc/passwd`), null bytes, SQL injection IDs, 1,000-char IDs, Unicode IDs, negative triage IDs, boolean IDs, invalid triage decisions ("BYPASS"), empty justifications, and missing payloads.
10. **Authorization Integrity (8 cases):** Missing Authorization headers, empty Bearer tokens, malformed JWT structures, algorithm-none attacks, temporary MFA token abuse, expired token timestamps, Basic auth substitution, and cross-tenant IDOR access.

---

## 6. Defect Discovery, Remediation, and Retesting Process

During execution of the deterministic fuzzer, two authentic security defects were surfaced and immediately remediated under the Phase 14 Defect Governance process:

### Defect 1: DEF-01 — Unhandled Type Coercion / Null/Non-String Exception (CWE-20 / CWE-754)
- **Discovery:** Category 8 Fuzzing passed a numeric value `1` as `tlp` to `POST /api/iocs`. The server crashed with `TypeError: (tlp || "AMBER").toUpperCase is not a function`.
- **Root Cause:** Controllers assumed `tlp`, `decision`, and `justification` were strings and called `.toUpperCase()` without prior type inspection.
- **Fix Implemented:** In `src/controllers/iocController.js`, `reportController.js`, and `triageController.js`, explicit type guards (`if (tlp !== undefined && typeof tlp !== 'string') return res.status(400)`) were added.
- **Verification:** Fuzzer rerun verified controlled HTTP 400 Bad Request responses with zero server crashes.

### Defect 2: DEF-02 — Recursive Nested Tag Collapse Evasion in Sanitizer (CWE-79 / CWE-182)
- **Discovery:** Category 6 Fuzzing passed nested script tags `<<SCRIPT>script>alert(1)<</SCRIPT>/script>`. The fuzzer reported: `XSS Bypass Detected! script=true`.
- **Root Cause:** A single-pass regex replacement removed the inner `<SCRIPT>` tag, causing the surrounding characters `<` and `script>` to collapse into `<script>alert(1)</script>`.
- **Fix Implemented:** Updated `SanitizerService.sanitizeMarkdown` to execute an iterative `do...while` loop that replaces dangerous tags until the string stabilizes.
- **Regression Test:** Added `sanitizeMarkdown: Neutralizes nested tag collapse evasion (CWE-182)` in `tests/unit/sanitizer.test.js`.
- **Verification:** Unit test passed; Category 6 fuzzer confirmed complete neutralization of nested tag payloads.

---

## 7. Container Hardening & Deployment Validation

To prevent simulated or falsified container claims, `scripts/validate-deployment.js` was introduced to conduct concrete, verifiable checks:
1. **Dockerfile Specification:** Minimal `node:20-bookworm-slim` base image, explicit unprivileged `USER appuser` (UID 10001), runtime `HEALTHCHECK` probe, explicit `EXPOSE 3000`.
2. **Anti-Leakage Controls:** `.dockerignore` blocks `.env`, `node_modules`, and local SQLite database files from being baked into images.
3. **Kubernetes Pod Security Standards:** `k8s/deployment.yaml` audited for `runAsNonRoot: true`, `allowPrivilegeEscalation: false`, `readOnlyRootFilesystem: true`, capabilities drop `ALL`, and CPU/Memory limits.
4. **Honest Host Runtime Check:** Inspects local Docker CLI version (`Docker version 29.5.2`) and queries daemon connectivity (`docker info`) directly without mock data.

---

## 8. Summary of Verification Commands & Results

| Command | Purpose | Verification Scope | Result | Status |
| :--- | :--- | :--- | :---: | :---: |
| `npm test` | Core Unit & Integration Suite | 61 tests across 11 suites | 61 / 61 Passed | **PASS** |
| `npm run test:e2e` | End-to-End Threat Lifecycle | 9 sequential workflow steps | 9 / 9 Passed | **PASS** |
| `npm run test:vuln` | Vulnerability Remediation (V02/V04) | 8 regression test assertions | 8 / 8 Passed | **PASS** |
| `npm run security:scan` | Static Application Security Testing | 19 source files scanned | 0 High/Critical Vulns | **PASS** |
| `npm run audit:verify` | Cryptographic SHA-256 Audit Chain | 1,127 audit records verified | 0 Tampering Detected | **PASS** |
| `npm run fuzz` | Application-Level Security Fuzzer | 94 test cases across 10 categories | 0 Crashes, 0 Bypasses | **PASS** |
| `npm run ci` | Complete Automated CI/CD Pipeline | 11 sequential pipeline stages | 11 / 11 Stages Passed | **PASS** |

**Total Automated Verification Count:** 78 Unit/Integration/E2E/Vuln tests + 94 Fuzzing cases = **172 Automated Security Verifications**. Zero failures, zero regressions, 100% compliance.
