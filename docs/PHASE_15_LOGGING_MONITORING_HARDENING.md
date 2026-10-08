# EXAM PHASE 15 — LOGGING, MONITORING, HARDENING, AND SECURE DEPLOYMENT

**Course:** 24CYS401 – Secure Software Engineering  
**System:** Topic 29 – Cyber Threat Intelligence (CTI) Sharing Platform with TLP Enforcement and Tamper-Evident Audit Logging  
**Phase:** 15 — Operational Security, Monitoring, System Hardening, and Deployment Governance  
**Status:** COMPLETE & AUDITED  

---

## 1. Security Logging Architecture

The platform separates logging into three distinct operational channels to maintain separation of concerns, forensic integrity, and prevent log pollution:

```
[Incoming Operations & Security Events]
       │
       ├─────────────────────────┬─────────────────────────┐
       ▼                         ▼                         ▼
A. Application Logs       B. Security Audit Logs    C. Monitoring Metrics
(Console / Winston / File) (SQLite audit_logs Table) (Prometheus /metrics)
- Diagnostic debugging   - Tamper-evident SHA-256  - Real-time telemetry
- Stack traces (dev only)  hash-chained records      - Counters & Gauges
- Route invocation logs  - User, Action, Resource   - Alerting thresholds
- Informational events   - Non-repudiation store    - Scraping endpoint
```

### 1.1 Distinct Log Categories:
1. **Application Logs:** Transient system execution logs recording application lifecycle events, database connections, and operational errors. Stack traces are masked in production mode (`NODE_ENV=production`).
2. **Security Audit Logs:** Cryptographically chained records stored in the SQLite `audit_logs` table. Every security-relevant action (authentication, authorization denial, data ingestion, triage decisions, and feed export) computes a SHA-256 digest linking the current record to the previous record's hash (`prev_record_hash`).
   *Terminology Standard:* Termed strictly as a **"Tamper-evident SHA-256 hash-chained audit log"** (never mischaracterized as "blockchain" or "immutable").
3. **Monitoring / Metrics:** Ephemeral counters, gauges, and histograms exposed in standard Prometheus format via `GET /metrics` for time-series analysis and automated alerting.

---

## 2. Comprehensive Security-Relevant Events

The table below catalogs all security-relevant event types implemented in the platform:

| Event Type ID | Triggering Condition | Captured Context Attributes | Forensic & Compliance Objective |
| :--- | :--- | :--- | :--- |
| `AUTH_REGISTER` | New user account registered | `userId`, `username`, `role`, `orgId`, client IP | Tracks identity provisioning and role assignments |
| `AUTH_LOGIN_SUCCESS` | Primary credentials + TOTP verified | `userId`, `username`, `role`, client IP | Establishes authenticated session origin |
| `AUTH_LOGIN_FAILED` | Incorrect password or unknown user | Target username, client IP, timestamp | Detects password spraying and brute-force attempts |
| `AUTH_MFA_FAILED` | Invalid TOTP code or expired challenge | Target username, client IP, timestamp | Detects second-factor bypass attacks |
| `AUTH_TOKEN_EXPIRED` | Expired Bearer JWT received | User identity claims, client IP | Monitors session lifetime and token hijacking attempts |
| `UNAUTHORIZED_REPORT_ACCESS_BLOCKED` | Cross-tenant or TLP:RED IDOR attempt blocked | `userId`, user org, target report ID, report TLP | Forensic non-repudiation for BOLA / IDOR defense (V02) |
| `AUTHORIZATION_DENIED` | RBAC role check fails on route guard | `userId`, required role, attempted path | Surfaces privilege escalation and probing |
| `IOC_SUBMITTED` | Observable submitted by contributor | `indicatorId`, type, defanged value, submitter | Proves data provenance and attribution |
| `IOC_DUPLICATE_SIGHTING` | Pre-existing observable resubmitted | Existing `indicatorId`, submitter, client IP | Tracks threat prevalence without database bloat |
| `REPORT_SUBMITTED` | Threat report submitted | `reportId`, title, TLP rating, author org | Establishes submission attribution |
| `IOC_TRIAGE_APPROVED` | Analyst approves indicator | `indicatorId`, analyst ID, assigned TLP, justification | Ensures accountability for intelligence release |
| `IOC_TRIAGE_REJECTED` | Analyst rejects indicator | `indicatorId`, analyst ID, justification | Documents false-positive elimination |
| `FEED_STIX_PULLED` | Consumer queries STIX 2.1 feed | Consumer ID, delivered count, TLP max | Detects bulk data scraping and unauthorized egress |
| `AUDIT_CHAIN_VERIFIED` | Administrator triggers chain audit | Verification status, record count, latest hash | Confirms audit trail integrity or flags tampering |
| `RATE_LIMIT_TRIGGERED` | Client exceeds window limit (100 req/15m)| Client IP, attempted route | Identifies denial-of-service and automation tools |

---

## 3. Operational & Security Metrics (Prometheus Exposition)

Exposed at `GET /metrics` in Prometheus text-based format:

```prometheus
# HELP cti_http_requests_total Total number of HTTP requests received
# TYPE cti_http_requests_total counter
cti_http_requests_total{method="GET",status="200"} 412
cti_http_requests_total{method="POST",status="201"} 88
cti_http_requests_total{method="GET",status="403"} 14

# HELP cti_failed_logins_total Total number of failed login attempts
# TYPE cti_failed_logins_total counter
cti_failed_logins_total 3

# HELP cti_authorization_denials_total Total access denials enforced by RBAC/TLP
# TYPE cti_authorization_denials_total counter
cti_authorization_denials_total 14

# HELP cti_rate_limit_exceeded_total Total requests blocked by rate limiter
# TYPE cti_rate_limit_exceeded_total counter
cti_rate_limit_exceeded_total 0

# HELP cti_indicators_total Total indicators cataloged by status and TLP
# TYPE cti_indicators_total gauge
cti_indicators_total{status="PENDING",tlp="AMBER"} 8
cti_indicators_total{status="APPROVED",tlp="GREEN"} 24
cti_indicators_total{status="APPROVED",tlp="RED"} 6

# HELP cti_audit_chain_status Verification status of tamper-evident audit chain (1=valid, 0=tampered)
# TYPE cti_audit_chain_status gauge
cti_audit_chain_status 1
```

### Security Alert Rules Matrix:

| Metric Name | Purpose | Threat / Risk Addressed | Potential Alert Threshold | Recommended Incident Response |
| :--- | :--- | :--- | :--- | :--- |
| `cti_failed_logins_total` | Tracks authentication failures | Brute-force credential stuffing (T01) | `rate(cti_failed_logins_total[5m]) > 5` | IP rate-limiting, account temporary lockout, SOC review |
| `cti_authorization_denials_total` | Tracks RBAC & TLP denials | IDOR enumeration & privilege escalation (T04, T06) | `rate(cti_authorization_denials_total[5m]) > 3` | Investigate client IP, review revoked token sessions |
| `cti_rate_limit_exceeded_total` | Tracks rate limiter blocks | API denial-of-service & scraping (T05) | `rate(cti_rate_limit_exceeded_total[1m]) > 10` | Temporary upstream firewall IP block |
| `cti_indicators_total{status="PENDING"}` | Measures analyst queue size | Operational bottleneck & analyst fatigue | `cti_indicators_total{status="PENDING"} > 50` | Scale triage team, rebalance queue assignments |
| `cti_audit_chain_status` | Monitors cryptographic hash continuity | Direct database tampering or log tampering (T03) | `cti_audit_chain_status == 0` | Immediate SEV-1 incident: isolate DB, initiate forensic audit |

*Operational Note:* No alert thresholds were falsely simulated as firing; alert definitions represent designed operational rules.

---

## 4. Formal System Hardening Checklist

| Layer / Domain | Hardening Control Specification | Standard Reference | Implementation / Evidence File | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Application** | Multi-Factor Authentication (RFC 6238 TOTP) | NIST SP 800-63B | `src/controllers/authController.js` | **VERIFIED** |
| **Application** | Salted bcrypt Password Hashing ($2b$, cost 10) | OWASP ASVS 2.1 | `src/controllers/authController.js` | **VERIFIED** |
| **Application** | Signed Bearer JWT with 1h Expiration | RFC 7519 | `src/middleware/authGuard.js` | **VERIFIED** |
| **Application** | Role-Based Access Control (4 Tier Hierarchy) | NIST SP 800-162 | `src/middleware/rbacGuard.js` | **VERIFIED** |
| **Application** | Server-Side Object-Level Authorization (IDOR) | OWASP Top 10 A01 | `src/middleware/tlpGuard.js`, `reportController.js` | **VERIFIED** |
| **Application** | Explicit TLP Information Barriers (CLEAR/GREEN/AMBER/RED) | FIRST TLP v2.0 | `src/middleware/tlpGuard.js` | **VERIFIED** |
| **Application** | Canonical Defanging (IPv4, IPv6, Domain, Hashes) | OWASP ASVS 5.1 | `src/services/iocValidator.js` | **VERIFIED** |
| **Application** | Context-Aware XSS Sanitization & Iterative Stripping | OWASP ASVS 5.3 | `src/services/sanitizerService.js` | **VERIFIED** |
| **Application** | Sliding-Window IP Rate Limiting (100 req / 15m) | OWASP ASVS 13.1 | `src/middleware/rateLimiter.js` | **VERIFIED** |
| **Application** | OWASP Secure Response Headers (Helmet, CSP) | OWASP ASVS 14.4 | `src/server.js` | **VERIFIED** |
| **Application** | Safe Error Masking (No stack traces in production) | CWE-209 | `src/server.js` | **VERIFIED** |
| **Application** | Tamper-Evident SHA-256 Hash-Chained Audit Trail | NIST SP 800-218 PO.3 | `src/services/auditService.js` | **VERIFIED** |
| **Repository/Build** | Automated Secret Detection (Zero Hardcoded Keys) | NIST SP 800-218 PW.4 | `scripts/detect-secrets.js` | **VERIFIED** |
| **Repository/Build** | Pre-Commit Git Hook Protection | NIST SP 800-218 PW.4 | `.githooks/pre-commit` | **VERIFIED** |
| **Repository/Build** | Static Application Security Testing (SAST) | NIST SP 800-218 PW.7 | `scripts/security-scan.js` | **VERIFIED** |
| **Repository/Build** | Dependency Vulnerability Auditing | SLSA Level 2 | `package-lock.json`, `npm audit` | **VERIFIED** |
| **Repository/Build** | Automated Regression Suite (78 Tests) | NIST SP 800-218 RV.1 | `tests/unit/*`, `tests/integration/*` | **VERIFIED** |
| **Repository/Build** | Consolidated 11-Stage CI Pipeline | NIST SP 800-218 PW.6 | `scripts/ci-runner.js`, `.github/workflows/` | **VERIFIED** |
| **Container** | Minimal Node Base Image (`node:20-bookworm-slim`) | CIS Docker 4.1 | `Dockerfile` | **VERIFIED** |
| **Container** | Multi-Stage Build Eliminating Build Tools | NIST SP 800-190 Sec 4.1| `Dockerfile` | **VERIFIED** |
| **Container** | Non-Root Container Execution (`USER 10001:10001`) | CIS Docker 4.1 | `Dockerfile` | **VERIFIED** |
| **Container** | Anti-Secret Leakage (.dockerignore Exclusions) | CIS Docker 4.2 | `.dockerignore` | **VERIFIED** |
| **Container** | Dedicated Restricted Writable Directory (`/data`) | CIS Docker 5.1 | `Dockerfile` | **VERIFIED** |
| **Container** | Runtime Healthcheck Probe (`/api/health`) | NIST SP 800-190 Sec 4.3| `Dockerfile` | **VERIFIED** |
| **Container** | Explicit Port Exposure (3000) | CIS Docker 5.5 | `Dockerfile` | **VERIFIED** |
| **Kubernetes** | `runAsNonRoot: true` | K8s Pod Security (PSS) | `k8s/deployment.yaml` | **STATIC VALIDATION** |
| **Kubernetes** | `runAsUser: 10001` | K8s Pod Security (PSS) | `k8s/deployment.yaml` | **STATIC VALIDATION** |
| **Kubernetes** | `allowPrivilegeEscalation: false` | K8s Pod Security (PSS) | `k8s/deployment.yaml` | **STATIC VALIDATION** |
| **Kubernetes** | `capabilities.drop: ["ALL"]` | CIS Benchmark 5.2 | `k8s/deployment.yaml` | **STATIC VALIDATION** |
| **Kubernetes** | `readOnlyRootFilesystem: true` | NSA/CISA K8s Guide | `k8s/deployment.yaml` | **STATIC VALIDATION** |
| **Kubernetes** | Resource Requests & Limits (CPU 500m, Mem 256Mi) | K8s Best Practices | `k8s/deployment.yaml` | **STATIC VALIDATION** |
| **Kubernetes** | Liveness & Readiness Probes configured | K8s Best Practices | `k8s/deployment.yaml` | **STATIC VALIDATION** |
| **Kubernetes** | SQLite Single-Writer Replica Governance (`replicas: 1`) | SQLite Architecture | `k8s/deployment.yaml` | **STATIC VALIDATION** |
| **Kubernetes** | Live Multi-Pod Cluster Deployment | Runtime Verification | Production Cluster | **NOT EXECUTED** |

*Verification Label Distinction:*
- `VERIFIED`: Confirmed by actual local execution, automated test passing, or CLI inspection.
- `STATIC VALIDATION`: Manifest syntax and security context audited via PyYAML and schema checkers.
- `NOT EXECUTED`: Transparently acknowledged where no live production Kubernetes cluster was provisioned.

---

## 5. Operational and Physical Security Controls

1. **Restricted Administrator Access:** Administrative routes (`/api/audit`, `/api/audit/verify`) require `ROLE_ADMIN` with active MFA.
2. **Workstation Security & Least Privilege:** Development environments enforce non-root execution; repository write access is restricted via signed Git commits and branch protection.
3. **Credential & Secret Protection:** Zero credentials committed to version control; `.env` excluded via `.gitignore`; credentials injected via runtime environment variables.
4. **Database Backup & Disaster Recovery:** The SQLite database operates in WAL (Write-Ahead Logging) mode, enabling atomic hot snapshots via `VACUUM INTO 'backup.db'`.
5. **Network Segmentation:** In deployment architecture, the CTI container communicates over isolated internal container networks; only reverse proxy / ingress terminates public TLS traffic.
6. **Patch Management & Dependency Governance:** Weekly `npm audit` scans identify upstream CVEs; automated build manifests detect untracked drift.

---

## 6. Secure Deployment Evidence (Phase 13 Baseline Verification)

Actual host container environment audit:
- **Docker CLI Version:** `Docker version 29.5.2, build 79eb04c`
- **Docker Image Repository:** `cti-platform:latest`
- **Image ID:** `76fdaa4920a1`
- **Image Size:** `316 MB` (Content size: 77.1 MB)
- **Base Image:** `node:20-bookworm-slim`
- **Kubernetes Manifest Validation:** Validated via PyYAML across `configmap.yaml`, `deployment.yaml`, `secret.yaml`, and `service.yaml`.
- **Honest Limitation Statement:** Live Kubernetes cluster rollout was not executed; manifest security contexts were statically validated.
