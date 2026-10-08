# END-TO-END TRACEABILITY MATRIX
**Course:** 24CYS401 – Secure Software Engineering  
**System:** Topic 29 – Cyber Threat Intelligence (CTI) Sharing Platform  
**Status:** ACTIVE & VERIFIED  

---

## 1. Unified 11-Stage Traceability Thread

The following matrix documents the unbroken chain of continuity connecting requirements, use case, asset, data flow, threat model, vulnerability, attack tree, planning, implementation, automated testing, and container deployment controls for our critical security capability: **Confidentiality & TLP Intelligence Access Control**.

| Stage | Artifact Level | Traceable Element ID | Concrete Description & Specification in CTI Platform |
| :---: | :--- | :--- | :--- |
| **1** | **Requirement** | `REQ-SEC-04` | **Traffic Light Protocol (TLP) Enforcement:** The platform must restrict access to threat indicators and incident reports based on TLP rating (CLEAR, GREEN, AMBER, RED) and user organization provenance. |
| **2** | **Use Case** | `UC-02` | **Review & Classify Threat Intelligence with TLP:** Authorized Analyst reviews raw indicators and applies appropriate TLP rating, while the system enforces information barriers during feed distribution. |
| **3** | **Asset** | `AST-04` | **Confidential TLP:RED Incident Reports:** Contains sensitive victim attribution, compromised internal architecture, and zero-day threat details requiring absolute confidentiality. |
| **4** | **DFD Flow** | `Process 3.0` / `Flow 3` | **TLP Access Control & Egress Barrier:** Classified Threat Feed Egress Flow intercepting between data store and threat consumers to evaluate user clearance before serialization. |
| **5** | **STRIDE Threat** | `T04 (Information Disclosure)` | **Unauthorized Egress of TLP:RED Intelligence:** An unvetted consumer or external adversary queries the feed API to exfiltrate sensitive organizational attribution and incident data. |
| **6** | **Vulnerability** | `VULN-03` | **Broken Object-Level & TLP Authorization (IDOR):** Endpoints querying indicators or reports lack explicit validation of user clearance against resource TLP level. |
| **7** | **Attack Tree** | `Root $\rightarrow$ Exploit API Access $\rightarrow$ Broken TLP authorization` | **Exfiltrate TLP:RED Threat Intelligence:** Adversary sends direct API query targeting `TLP:RED` records without passing through clearance verification. |
| **8** | **Jira Story** | `CTI-107` (`CTI-9`) | **TLP Classification & Access Control:** *As an analyst and consumer*, I want the platform to enforce explicit TLP clearance rules *so that* `TLP:RED` intelligence is never leaked to unauthorized external parties. |
| **9** | **Implementation** | `src/middleware/tlpGuard.js` | Implementation of explicit policy function: `canAccessTLP(user, tlpLevel, resourceOrgId)`. Rejects non-members and standard consumers for `TLP:RED` with HTTP 403. |
| **10** | **Automated Test** | `tests/integration/tlpAccess.test.js` | Integration test suite sending requests as `ROLE_CONSUMER` and asserting `HTTP 403 Forbidden` and omission of `TLP:RED` records from feed payloads. |
| **11** | **Deployment Control**| `k8s/deployment.yaml` | Hardened runtime: Pod runs with `readOnlyRootFilesystem: true`, `runAsNonRoot: true` (UID 10001), `allowPrivilegeEscalation: false`, and dropped Linux capabilities. |

---

## 2. Multi-Requirement Traceability Summary Table (Connecting All 9 Assets)

| Requirement ID | Domain | Use Case | Asset ID | DFD Process | STRIDE ID | Vulnerability ID | Jira Story ID | Code Module | Test Suite |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `REQ-SEC-01` | Auth & MFA | `UC-05` | `AST-01` | `Process 1.0` | `T01 (Spoofing)` | `VULN-06` | `CTI-101` (`CTI-1`) | `src/controllers/authController.js` | `tests/unit/auth.test.js` |
| `REQ-SEC-02` | RBAC Access | `UC-02` | `AST-02` | `Process 1.1` | `T06 (Elevation)`| `VULN-02` | `CTI-102` (`CTI-2`) | `src/middleware/rbacGuard.js` | `tests/integration/rbac.test.js` |
| `REQ-SEC-03` | Input Defanging| `UC-01` | `AST-03` | `Process 2.0` | `T02 (Tampering)`| `VULN-01` | `CTI-104` (`CTI-6`) | `src/services/iocValidator.js` | `tests/unit/validator.test.js` |
| `REQ-SEC-04` | TLP Barrier | `UC-02` | `AST-04` | `Process 3.0` | `T04 (Disclosure)`| `VULN-03` | `CTI-107` (`CTI-9`) | `src/middleware/tlpGuard.js` | `tests/integration/tlpAccess.test.js` |
| `REQ-SEC-05` | STIX Egress | `UC-03` | `AST-05` | `Process 3.1` | `T04 (Disclosure)`| `VULN-03` | `CTI-108` (`CTI-10`)| `src/services/stixFactory.js` | `tests/integration/feed.test.js` |
| `REQ-SEC-06` | Token Integrity| `UC-05` | `AST-06` | `Process 1.0` | `T10 (Spoofing)` | `VULN-06` | `CTI-101` (`CTI-1`) | `src/middleware/authGuard.js` | `tests/unit/auth.test.js` |
| `REQ-SEC-07` | Audit Integrity| `UC-04` | `AST-07` | `Process 4.0` | `T03 (Repudiation)`| `VULN-05`| `CTI-109` (`CTI-11`)| `src/services/auditService.js` | `tests/unit/auditChain.test.js` |
| `REQ-SEC-08` | Host Hardening | `UC-04` | `AST-08` | `Process 4.1` | `T07 (Tampering)`| `VULN-05` | `CTI-110` (`CTI-12`)| `src/controllers/auditController.js`| `tests/unit/auditVerification.test.js`|
| `REQ-SEC-09` | Analyst Triage | `UC-02` | `AST-09` | `Process 3.0` | `T06 (Elevation)`| `VULN-02` | `CTI-106` (`CTI-8`) | `src/controllers/triageController.js` | `tests/integration/triage.test.js` |

