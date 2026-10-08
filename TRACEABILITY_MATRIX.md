# END-TO-END TRACEABILITY MATRIX
**Course:** 24CYS401 – Secure Software Engineering  
**System:** Topic 29 – Cyber Threat Intelligence (CTI) Sharing Platform  
**Status:** ACTIVE & VERIFIED  

---

## 1. Unified 11-Stage Traceability Thread

The following matrix documents the unbroken chain of continuity connecting requirements, design, threat models, planning, source code, automated testing, and container deployment controls for our critical security capability: **Confidentiality & TLP Intelligence Access Control**.

| Stage | Artifact Level | Traceable Element ID | Concrete Description & Specification in CTI Platform |
| :---: | :--- | :--- | :--- |
| **1** | **Requirement** | `REQ-SEC-04` | **Traffic Light Protocol (TLP) Enforcement:** The platform must restrict access to threat indicators and incident reports based on TLP rating (CLEAR, GREEN, AMBER, RED) and user organization provenance. |
| **2** | **Use Case** | `UC-03` | **Classify & Share Threat Intelligence:** Authorized Analyst reviews raw indicators and applies appropriate TLP rating, while the system enforces information barriers during feed distribution. |
| **3** | **DFD Model** | `Process 3.0` | **TLP Access Control & Egress Barrier:** Data flow interceptor between `D2: Threat Store` and `E4: Threat Consumer` evaluating user clearance before transmitting intelligence records. |
| **4** | **STRIDE Threat** | `T04 (Information Disclosure)` | **Unauthorized Egress of TLP:RED Intelligence:** An unvetted consumer or external adversary queries the feed API to exfiltrate sensitive organizational attribution and incident data. |
| **5** | **Vulnerability** | `VULN-03` | **Broken Object-Level & TLP Authorization (IDOR):** Endpoints querying indicators or reports lack explicit validation of user clearance against resource TLP level. |
| **6** | **Attack Tree** | `Path 2.2` | **Exfiltrate TLP:RED $\rightarrow$ Exploit API Access $\rightarrow$ Missing/Broken TLP Authorization:** Direct API query targeting `TLP:RED` records without passing through clearance verification. |
| **7** | **User Story** | `CTI-107` | **TLP Classification & Access Control:** *As an analyst and consumer*, I want the platform to enforce explicit TLP clearance rules *so that* `TLP:RED` intelligence is never leaked to unauthorized external parties. |
| **8** | **Sprint Task** | `TASK-107-A` | **Implement `canAccessTLP` Policy & Middleware:** Create an explicit authorization rule in `src/middleware/tlpGuard.js` evaluating `user.role`, `user.org_id`, and `indicator.tlp_level`. |
| **9** | **Source Code** | `src/middleware/tlpGuard.js` | Implementation of explicit policy function: `canAccessTLP(user, tlpLevel, resourceOrgId)`. Rejects non-members and standard consumers for `TLP:RED` with HTTP 403. |
| **10** | **Automated Test** | `tests/integration/tlpAccess.test.js` | Integration test suite sending requests as `ROLE_CONSUMER` and asserting `HTTP 403 Forbidden` and omission of `TLP:RED` records from feed payloads. |
| **11** | **Deployment Control**| `k8s/deployment.yaml` | Hardened runtime: Pod runs with `readOnlyRootFilesystem: true`, `runAsNonRoot: true` (UID 10001), `allowPrivilegeEscalation: false`, and dropped Linux capabilities. |

---

## 2. Multi-Requirement Traceability Summary Table

| Requirement ID | Domain | Use Case | DFD Process | STRIDE ID | Vulnerability ID | User Story ID | Code Module | Test Suite |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `REQ-SEC-01` | Auth & MFA | `UC-01` | `Process 1.0` | `T01 (Spoofing)` | `VULN-06` | `CTI-101` | `src/controllers/authController.js` | `tests/unit/auth.test.js` |
| `REQ-SEC-02` | RBAC Access | `UC-02` | `Process 1.1` | `T10 (Elevation)`| `VULN-02` | `CTI-102` | `src/middleware/rbacGuard.js` | `tests/integration/rbac.test.js` |
| `REQ-SEC-03` | Input Defanging| `UC-04` | `Process 2.0` | `T08 (Tampering)`| `VULN-01` | `CTI-104` | `src/services/iocValidator.js` | `tests/unit/validator.test.js` |
| `REQ-SEC-04` | TLP Barrier | `UC-03` | `Process 3.0` | `T04 (Disclosure)`| `VULN-03` | `CTI-107` | `src/middleware/tlpGuard.js` | `tests/integration/tlpAccess.test.js` |
| `REQ-SEC-05` | Audit Integrity| `UC-05` | `Process 4.0` | `T03 (Repudiation)`| `VULN-04`| `CTI-109` | `src/services/auditService.js` | `tests/unit/auditChain.test.js` |
| `REQ-SEC-06` | DoS Resistance | `UC-04` | `Process 2.1` | `T09 (DoS)` | `VULN-01` | `CTI-104` | `src/middleware/rateLimiter.js` | `tests/fuzz/iocFuzzer.js` |
