# PHASE 15 – LOGGING, MONITORING, HARDENING AND SECURE DEPLOYMENT [5 MARKS]
**Course:** 24CYS401 – Secure Software Engineering  
**System:** Topic 29 – Cyber Threat Intelligence (CTI) Sharing Platform  

---

## 1. Security-Relevant Events Logged

The platform records security events into the **Tamper-Evident SHA-256 Hash-Chained Audit Log**:

| Event Type | Trigger Condition | Logged Attributes | Forensic & Compliance Value |
| :--- | :--- | :--- | :--- |
| `AUTH_REGISTER` | User account registered | User UUID, Username, Assigned Role, Org ID | Validates authorization of new platform actors. |
| `AUTH_LOGIN_FAILED` | Incorrect password or unknown user | Target username, Source IP, Timestamp | Detects brute-force and credential stuffing attacks. |
| `AUTH_CREDENTIALS_VERIFIED` | Password verified; MFA token issued | User UUID, Username, Source IP | Tracks successful first factor completion. |
| `AUTH_MFA_FAILED` | Invalid or expired TOTP code submitted | User UUID, Source IP, Timestamp | Identifies potential second-factor bypass attempts. |
| `AUTH_LOGIN_SUCCESS` | Full MFA authentication completed | User UUID, Role, Org ID, Source IP | Establishes authenticated session origin. |
| `IOC_SUBMITTED` | Contributor ingests new observable | Indicator UUID, Type, Defanged Value, TLP | Ensures non-repudiation of submitted threat data. |
| `IOC_DUPLICATE_SIGHTING` | Identical observable submitted | Indicator UUID, Submitter User, Source IP | Correlates community sightings without DB bloat. |
| `IOC_TRIAGE_APPROVED` | Analyst approves indicator | Indicator UUID, Analyst UUID, Assigned TLP, Score, Justification | Establishes accountability for published intelligence. |
| `IOC_TRIAGE_REJECTED` | Analyst rejects indicator | Indicator UUID, Analyst UUID, Justification | Documents false-positive elimination. |
| `FEED_STIX_PULLED` | Consumer queries STIX feed | Consumer UUID, Delivered count, TLP max | Monitors bulk data egress and detects scraping. |

---

## 2. Five Operational & Security Metrics with Alert Rules

Exposed in standard Prometheus exposition format at `/metrics`:

| Metric Name | Type | Description | Prometheus Alert Rule & Threshold | Severity |
| :--- | :---: | :--- | :--- | :---: |
| **`cti_failed_logins_total`** | Counter | Cumulative failed login attempts | `rate(cti_failed_logins_total[5m]) > 5`<br>*Trigger: More than 5 failed logins in 5 minutes.* | **CRITICAL** (Brute-Force Attack) |
| **`cti_http_requests_total`** | Counter | Total incoming HTTP API requests | `rate(cti_http_requests_total[1m]) > 100`<br>*Trigger: Request surge exceeding standard traffic.* | **HIGH** (Potential Denial of Service) |
| **`cti_indicators_total{status="PENDING"}`** | Gauge | Number of indicators in triage queue | `cti_indicators_total{status="PENDING"} > 50`<br>*Trigger: Unreviewed indicators backlog.* | **MEDIUM** (Analyst Fatigue / Backlog) |
| **`cti_indicators_total{tlp="RED"}`** | Gauge | Total confidential TLP:RED indicators | `increase(cti_indicators_total{tlp="RED"}[1h]) > 10`<br>*Trigger: Surge in high-criticality threats.* | **HIGH** (Critical Cyber Incident Sighting) |
| **`cti_process_uptime_seconds`** | Gauge | Platform process uptime in seconds | `cti_process_uptime_seconds < 60`<br>*Trigger: Application process restarted.* | **WARNING** (Process Crash / OOM Restart) |

---

## 3. Target Environment Hardening Checklist

| Domain | Hardening Control | Verification / Implementation Command | Status |
| :--- | :--- | :--- | :---: |
| **Operating System** | Disable unnecessary network ports | Only port 3000 (app) exposed; all debug ports closed. | **PASS** |
| **Node.js Runtime** | Suppress error stack traces in production | Centralized Express error handler masks stack traces when `NODE_ENV=production`. | **PASS** |
| **HTTP Transport** | Enforce OWASP Secure Headers via Helmet | Content-Security-Policy, X-Frame-Options: DENY, X-Content-Type-Options: nosniff. | **PASS** |
| **Container Image** | Multi-stage minimal Alpine base ($<100\text{MB}$) | `Dockerfile` uses `node:22-alpine` with unnecessary package managers stripped. | **PASS** |
| **Container User** | Execute as unprivileged non-root user | `USER appuser` (UID 10001, GID 10001). | **PASS** |
| **Filesystem** | Enforce Read-Only Container Root Filesystem | `securityContext.readOnlyRootFilesystem: true`. | **PASS** |
| **Storage Isolation** | Dedicated isolated volume mount for SQLite | Writable `emptyDir` mounted strictly at `/app/data`. | **PASS** |
| **Kubernetes Privileges** | Drop all Linux kernel capabilities | `capabilities.drop: ["ALL"]`, `allowPrivilegeEscalation: false`. | **PASS** |
| **Resource Quotas** | Strict CPU and Memory limits | K8s `resources.limits`: CPU 500m, Memory 256Mi. | **PASS** |
| **Secret Management** | Zero hard-coded credentials in version control | `.env` excluded via `.gitignore`; credentials injected via K8s Secret. | **PASS** |

---

## 4. Physical and Operational Security Controls

* **Operational Separation of Duties:**
  * Contributors can only submit indicators and reports; they are strictly prevented from approving or classifying their own submissions (`ROLE_CONTRIBUTOR` denied on `/api/iocs/:id/triage`).
  * Only vetted Analysts (`ROLE_ANALYST`) or Administrators (`ROLE_ADMIN`) hold classification authority.
  * Audit verification is restricted exclusively to `ROLE_ADMIN`.
* **Physical & Environmental Controls:**
  * Single-tenant container execution preventing cross-pod memory snooping.
  * Data persistence secured on encrypted volume storage with local filesystem ACLs restricting write access to UID 10001.
