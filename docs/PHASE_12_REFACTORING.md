# Phase 12 — Secure Coding, Refactoring and Vulnerability Remediation

**Course:** 24CYS401 – Secure Software Engineering  
**System:** Topic 29 – Cyber Threat Intelligence (CTI) Sharing Platform  
**Exam Phase:** Phase 12 [4 Marks]  
**Remediation Targets:** V02 (CWE-639 BOLA / IDOR) & V04 (CWE-79 Stored XSS)  
**Status:** FULLY REMEDIATED & VERIFIED  

---

## 1. Executive Summary

Phase 12 refactors the CTI Sharing Platform to remediate the two vulnerabilities demonstrated in Milestone M11:
1. **V02 (CWE-639 / BOLA / IDOR):** Remediated by integrating strict server-side object-level ownership checks and the `canAccessTLP` Attribute-Based Access Control (ABAC) engine in `ReportController.getReportById`. Unauthorized requests across tenant boundaries or exceeding user clearance are blocked with **HTTP 403 Forbidden** and recorded as security alerts in the cryptographic audit log.
2. **V04 (CWE-79 / Stored XSS):** Remediated by replacing the naive regex blacklist with an enterprise `SanitizerService` (`src/services/sanitizerService.js`) that strips prohibited HTML tags, neutralizes all inline event handlers (`onmouseover`, `ontoggle`, etc.), blocks dangerous URI schemes (`javascript:`, `data:`, `vbscript:`), and enforces safe contextual escaping.
3. **Dependency Security Assessment:** Audited upstream transitive advisories in `sqlite3` $\rightarrow$ `node-gyp` $\rightarrow$ `tar`. Confirmed that `tar` is an optional build-time dependency not invoked at runtime, documented compatibility constraints for Windows environments, and implemented defense-in-depth runtime isolation.

---

## 2. Vulnerability 1 Remediation: V02 (CWE-639 BOLA / IDOR)

### 2.1 BEFORE (Vulnerable Baseline)
* **Vulnerable File:** `src/controllers/reportController.js`
* **Vulnerable Logic:**
  ```javascript
  // BEFORE: Direct primary key query without tenant or clearance verification
  const report = await dbGet(
    `SELECT r.*, o.name as author_org, u.username as author_user
     FROM threat_reports r
     JOIN organizations o ON r.org_id = o.id
     JOIN users u ON r.author_id = u.id
     WHERE r.id = ?;`,
    [id]
  );
  if (!report) return res.status(404).json(...);
  return res.status(200).json({ report });
  ```
* **Demonstrated Vulnerability:** External consumer `consumer_bank` (`org-fin-bank`) and local consumer `consumer_siem` queried `GET /api/reports/:id` and received HTTP 200 OK exposing `TLP:RED` proprietary kernel zero-day exploit details.
* **Security Impact:** STRIDE T04 (Information Disclosure) & T08 (Egress Bypass) — Complete loss of confidentiality for classified victim data and private IP topology.

### 2.2 REFACTOR (Architectural & Code Design Change)
The handler was refactored to enforce a two-tier defense barrier:
1. **Policy Gate:** Calls `canAccessTLP(req.user, report)` from `src/middleware/tlpGuard.js`.
2. **Multi-Tenant Ownership:** Validates whether `req.user.orgId === report.org_id` for restricted items.
3. **Forensic Non-Repudiation:** Injects an `UNAUTHORIZED_REPORT_ACCESS_BLOCKED` event into `AuditService` before returning HTTP 403.

### 2.3 AFTER (Hardened Implementation)
```javascript
// AFTER: Strict Object-Level Authorization & TLP Verification
const hasAccess = canAccessTLP(req.user, report);
if (!hasAccess) {
  await AuditService.logEvent({
    userId: req.user ? req.user.id : null,
    eventType: 'UNAUTHORIZED_REPORT_ACCESS_BLOCKED',
    ipAddress: clientIp,
    resourceId: id,
    actionDetails: `Blocked unauthorized access attempt by user '${req.user ? req.user.username : 'ANONYMOUS'}' (${req.user ? req.user.role : 'NONE'}, Org: '${req.user ? (req.user.orgId || req.user.org_id) : 'NONE'}') to report '${report.title}' (TLP:${report.tlp_level}, Org: '${report.org_id}')`
  });

  return res.status(403).json({
    error: 'Forbidden',
    message: 'Access Denied: You lack authorization to view this threat report due to organization or TLP clearance restrictions.'
  });
}
```

### 2.4 Retest & Remediation Verification
* **Automated Test:** `tests/vulnerability/vulnerabilityDemo.test.js` (Subtests 1.2, 1.3, 1.4, 1.5).
* **Test Outcome:**
  * External consumer querying cross-tenant `TLP:RED`: **403 Forbidden (CONFIRMED)**.
  * Local consumer querying unpermitted `TLP:RED`: **403 Forbidden (CONFIRMED)**.
  * Audit Log verification: `UNAUTHORIZED_REPORT_ACCESS_BLOCKED` recorded with SHA-256 hash.
  * Legitimate author access from same organization: **200 OK (CONFIRMED)**.

---

## 3. Vulnerability 2 Remediation: V04 (CWE-79 Stored XSS)

### 3.1 BEFORE (Vulnerable Baseline)
* **Vulnerable File:** `src/controllers/reportController.js`
* **Vulnerable Logic:**
  ```javascript
  // BEFORE: Ineffective, naive regex blacklist
  const sanitizedMarkdown = contentMarkdown
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, 'blocked:')
    .replace(/onerror=/gi, 'blocked=')
    .replace(/onload=/gi, 'blocked=');
  ```
* **Demonstrated Vulnerability:** Injected `onmouseover="window.attackerExfil(...)"` and `<details open ontoggle="...">` bypassed the regex blacklist and persisted verbatim into the SQLite database.
* **Security Impact:** STRIDE T07 (Tampering / Elevation of Privilege) — Execution of arbitrary JavaScript in the browser session of triage analysts, permitting session hijacking and triage tampering.

### 3.2 REFACTOR (Sanitizer Service Design)
Created a dedicated security component [src/services/sanitizerService.js](file:///v:/SSE-ENDSEM/src/services/sanitizerService.js):
1. **Tag Stripping:** Prohibits high-risk tags (`<script>`, `<iframe>`, `<object>`, `<embed>`, `<svg>`, `<meta>`, `<base>`).
2. **Event Handler Neutralization:** Comprehensive regular expression regex stripping all `\bon[a-zA-Z]+\s*=` patterns regardless of spacing, casing, or quoting.
3. **URI Scheme Blocking:** Replaces dangerous `javascript:`, `data:`, and `vbscript:` pseudo-protocols with safe `blocked:`.
4. **Contextual Escaping:** Frontend escaping utility in `src/public/app.js` preventing DOM-based injection.

### 3.3 AFTER (Hardened Implementation)
```javascript
// AFTER: Enterprise Sanitizer Pipeline
const sanitizedTitle = SanitizerService.stripHtml(title);
const sanitizedSummary = SanitizerService.stripHtml(summary);
const sanitizedMarkdown = SanitizerService.sanitizeMarkdown(contentMarkdown);
```

### 3.4 Retest & Remediation Verification
* **Automated Test:** `tests/vulnerability/vulnerabilityDemo.test.js` (Subtests 2.1, 2.2, 2.3).
* **Test Outcome:**
  * Malicious payload submission accepted with `201 Created` for analysis.
  * Database inspection verifies `onmouseover=` and `ontoggle=` stripped to empty string.
  * Database inspection verifies `data:text/html` converted to `href="blocked:"`.
  * API response verification confirms zero executable event handlers returned.
  * Legitimate markdown headers, bold text, and telemetry values remain perfectly intact.

---

## 4. Upstream Dependency Analysis (`sqlite3` $\rightarrow$ `tar`)

1. **Vulnerability Assessment:** `npm audit` reported 7 transitive advisories in `node-tar` (CWE-22 / path traversal during archive decompression) inherited via `sqlite3@5.1.7` $\rightarrow$ `node-gyp@8.4.1`.
2. **Runtime Exposure Analysis:** `sqlite3` on Windows utilizes precompiled native binaries (`node-pre-gyp`). `node-gyp` and `tar` are build-time compilation fallbacks and are **NEVER invoked during HTTP request processing or SQLite queries**.
3. **Compatibility Review:** Upgrading to `sqlite3@6.0.1` requires active C++ compiler toolchains (Visual Studio Build Tools / Python), which creates severe build failures on developer and production minimal environments lacking MSVC compilers.
4. **Hardening Decision:** The dependency is safely retained at `sqlite3@5.1.7` with container runtime mitigation (`readOnlyRootFilesystem: true`, non-root execution UID 10001 in Kubernetes) which neutralizes filesystem path traversal risks at the OS layer.

---

## 5. Verification Suite & Pipeline Results

| Test / Inspection Command | Purpose | Result |
| :--- | :--- | :---: |
| `npm test` | 53 unit and integration regression tests | **PASS (53/53)** |
| `npm run test:vuln` | 8 Phase 12 remediation verification tests | **PASS (8/8)** |
| `npm run security:scan` | Static Application Security Testing (SAST) | **PASS (0 Unwanted Sinks, V02/V04 REMEDIATED)** |
| `npm run audit:verify` | Cryptographic SHA-256 audit chain check | **PASS (801 records verified)** |
| `npm run ci` | Consolidated 6-stage secure build pipeline | **PASS (100% Pipeline)** |
