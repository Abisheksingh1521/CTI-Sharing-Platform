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
| **3** | **Asset** | `A06` / `A05` | **TLP Classification Metadata & Threat Reports:** Contains sensitive victim attribution, compromised internal architecture, and zero-day threat details requiring absolute confidentiality. |
| **4** | **DFD Flow** | `IF-03` / `Process 3.0` | **Threat Feed Egress Flow:** Classified Threat Feed Egress Flow intercepting between data store and threat consumers to evaluate user clearance before serialization. |
| **5** | **STRIDE Threat** | `T04` / `T08` | **Unauthorized Egress of TLP:RED Intelligence:** An unvetted consumer or external adversary queries the feed API to exfiltrate sensitive organizational attribution and incident data. |
| **6** | **Vulnerability** | `V02` | **Broken Access Control / TLP Failure (CWE-639):** Endpoints querying indicators or reports lack explicit validation of user clearance against resource TLP level. |
| **7** | **Attack Tree** | `Root $\rightarrow$ Branch B $\rightarrow$ Leaf B2` | **Exfiltrate TLP:RED $\rightarrow$ Exploit API Access $\rightarrow$ Broken TLP Authorization:** Direct API query targeting `TLP:RED` records without passing through clearance verification. |
| **8** | **Jira Story** | `CTI-107` (`CTI-9`) | **TLP Classification & Access Control:** *As an analyst and consumer*, I want the platform to enforce explicit TLP clearance rules *so that* `TLP:RED` intelligence is never leaked to unauthorized external parties. |
| **9** | **Implementation** | `src/middleware/tlpGuard.js` | Implementation of explicit policy function: `canAccessTLP(user, tlpLevel, resourceOrgId)`. Rejects non-members and standard consumers for `TLP:RED` with HTTP 403. |
| **10** | **Automated Test** | `tests/integration/tlpAccess.test.js` | Integration test suite sending requests as `ROLE_CONSUMER` and asserting `HTTP 403 Forbidden` and omission of `TLP:RED` records from feed payloads. |
| **11** | **Deployment Control**| `k8s/deployment.yaml` | Hardened runtime: Pod runs with `readOnlyRootFilesystem: true`, `runAsNonRoot: true` (UID 10001), `allowPrivilegeEscalation: false`, and dropped Linux capabilities. |

---

## 2. Multi-Requirement Traceability Summary Table (Connecting All 9 Authoritative Assets)

| Requirement ID | Domain | Use Case | Asset ID | DFD Flow | STRIDE ID | Vulnerability ID | Jira Story ID | Code Module | Test Suite |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `REQ-SEC-01` | Auth & MFA | `UC-05` | `A01, A02` | `IF-01` | `T01 (Spoofing)` | `V01` (CWE-798) | `CTI-101` (`CTI-1`) | `src/controllers/authController.js` | `tests/unit/auth.test.js` |
| `REQ-SEC-02` | RBAC Access | `UC-02` | `A09` | `IF-02` | `T06 (Elevation)`| `V03` (CWE-862) | `CTI-102` (`CTI-2`) | `src/middleware/rbacGuard.js` | `tests/integration/rbac.test.js` |
| `REQ-SEC-03` | Input Defanging| `UC-01` | `A04` | `IF-01` | `T02 (Tampering)`| `V05` (CWE-1333)| `CTI-104` (`CTI-6`) | `src/services/iocValidator.js` | `tests/unit/validator.test.js` |
| `REQ-SEC-04` | TLP Barrier | `UC-02` | `A06` | `IF-03` | `T04 (Disclosure)`| `V02` (CWE-639) | `CTI-107` (`CTI-9`) | `src/middleware/tlpGuard.js` | `tests/integration/tlpAccess.test.js` |
| `REQ-SEC-05` | STIX Egress | `UC-03` | `A08` | `IF-03` | `T08 (Disclosure)`| `V02` (CWE-639) | `CTI-108` (`CTI-10`)| `src/services/stixFactory.js` | `tests/integration/feed.test.js` |
| `REQ-SEC-06` | Token Integrity| `UC-05` | `A03` | `IF-01` | `T01 (Spoofing)` | `V01` (CWE-798) | `CTI-101` (`CTI-1`) | `src/middleware/authGuard.js` | `tests/unit/auth.test.js` |
| `REQ-SEC-07` | Audit Integrity| `UC-04` | `A07` | `IF-01,02`| `T03 (Repudiation)`| `V06` (CWE-778)| `CTI-109` (`CTI-11`)| `src/services/auditService.js` | `tests/unit/auditChain.test.js` |
| `REQ-SEC-08` | Incident XSS | `UC-02` | `A05` | `IF-01` | `T07 (Tampering)`| `V04` (CWE-79)  | `CTI-105` (`CTI-7`) | `src/controllers/reportController.js`| `tests/integration/iocReportApi.test.js`|
| `REQ-SEC-09` | Analyst Triage | `UC-02` | `A06` | `IF-02` | `T10 (Tampering)`| `V06` (CWE-778) | `CTI-106` (`CTI-8`) | `src/controllers/triageController.js` | `tests/integration/triageFeedApi.test.js` |


