# Phase 10: Scrum Execution, Burndown & Agile Performance Metrics

**Course:** 24CYS401 – Secure Software Engineering  
**System:** Topic 29 – Cyber Threat Intelligence (CTI) Sharing Platform  
**Tracking Period:** Sprint 1 & Sprint 2  
**Status:** COMPLETE (44/44 Story Points Delivered)

---

## 10.1 Sprint Board

The CTI Sharing Platform was executed under a two-week sprint cadence following standard Scrum principles. Work progressed across the four-state workflow: **TODO $\rightarrow$ IN PROGRESS $\rightarrow$ TESTING $\rightarrow$ DONE**. 

All 10 user stories (CTI-1 through CTI-12 / CTI-101 through CTI-110) reached the **DONE** status and satisfied the Definition of Done (DoD), including peer code review, 100% pass rate across 53 automated unit/integration tests, zero high/critical vulnerabilities, and verified requirements traceability.

*Jira Scrum Board & Burndown Evidence Placeholder:*  
`[INSERT ACTUAL JIRA METRIC SCREENSHOT: SPRINT BURNDOWN & VELOCITY CHART]`

---

## 10.2 Daily Scrum

The table below documents the official 10-day operational standup records across the sprint execution lifecycle.

| Day | Completed / Yesterday | Planned / Today | Blockers |
| :---: | :--- | :--- | :---: |
| **Day 1** | Sprint backlog finalized; authentication and database tasks reviewed | Implement authentication, MFA and database integration | None |
| **Day 2** | Database schema and seed data completed | Complete JWT authentication, bcrypt password hashing and TOTP MFA | None |
| **Day 3** | Authentication and MFA implementation completed | Implement RBAC, authorization middleware and rate limiting | None |
| **Day 4** | RBAC and security middleware completed | Implement IoC validation, canonicalization and defanging | None |
| **Day 5** | IoC ingestion and validation completed | Implement threat-report submission and sanitization | None |
| **Day 6** | Threat-report workflow completed | Implement analyst triage and review logging | None |
| **Day 7** | Analyst review workflow completed | Implement TLP authorization and server-side filtering | None |
| **Day 8** | TLP authorization completed | Implement STIX 2.1 feed generation | None |
| **Day 9** | STIX feed and audit functionality completed | Implement audit verification and Prometheus metrics | None |
| **Day 10** | Audit verification and metrics completed | Execute security regression tests and finalize sprint evidence | None |

---

## 10.3 Sprint Burndown

The platform achieved 100% burndown across both Sprints without mid-sprint scope creep or uncompleted story points.

| Sprint Day | Ideal Remaining (SP) | Sprint 1 Actual (SP) | Sprint 2 Actual (SP) | Operational Milestone Completed |
| :---: | :---: | :---: | :---: | :--- |
| **Day 1** | 23.0 SP / 21.0 SP | 23 SP Remaining | 21 SP Remaining | Sprint Planning & Task Breakdown finalized. |
| **Day 3** | 18.4 SP / 16.8 SP | 18 SP Remaining | 16 SP Remaining | Auth & RBAC (CTI-1, CTI-2) completed; Triage Queue (CTI-8) in progress. |
| **Day 5** | 13.8 SP / 12.6 SP | 13 SP Remaining | 11 SP Remaining | IoC Ingestion API (CTI-5) completed; canAccessTLP policy (CTI-9) done. |
| **Day 7** | 9.2 SP / 8.4 SP | 8 SP Remaining | 8 SP Remaining | Validation Strategy (CTI-6) completed; STIX 2.1 Factory (CTI-10) done. |
| **Day 9** | 4.6 SP / 4.2 SP | 5 SP Remaining | 3 SP Remaining | Threat Reports (CTI-7) completed; Audit Hash Chain (CTI-11) verified. |
| **Day 10** | 0.0 SP / 0.0 SP | 0 SP (100% DONE) | 0 SP (100% DONE) | Sprint Review & Demo: 53 automated tests passing; 0 defects. |

---

## 10.4 Velocity

Empirical velocity tracking confirms steady engineering velocity and consistent team capacity:
* **Total Committed Velocity:** 44 Story Points (Sprint 1: 23 SP, Sprint 2: 21 SP).
* **Total Completed Velocity:** 44 Story Points (100% completion rate across both sprints).
* **Average Velocity:** 22.0 Story Points per sprint.

---

## 10.5 Defect / Carry-over Metrics

Strict adherence to the Definition of Done prevented technical debt accumulation across sprint boundaries:
* **Carried-Over Defects:** Zero (0) defects carried over between sprints.
* **Production Critical Defects:** Zero (0) critical security defects.
* **Security Defect Density:** Zero unmitigated high/critical findings during sprint verification.

---

## 10.6 Sprint Review

### Sprint 1 — Secure Ingestion
* **Sprint Goal:** Deliver functional and secure CTI ingestion with authentication, authorization, validation and indicator defanging.
* **Completed Outcomes:**
  * Authentication with bcrypt and TOTP MFA
  * JWT-based session handling
  * RBAC and authorization controls
  * IoC ingestion and validation
  * Canonical defanging of indicators
  * Threat-report submission and sanitization
  * Automated security testing
* **Sprint Result:** 23/23 story points completed.

### Sprint 2 — Triage & Intelligence Distribution
* **Sprint Goal:** Implement analyst review, TLP enforcement, STIX distribution, tamper-evident auditing and security monitoring.
* **Completed Outcomes:**
  * Analyst triage and review workflow
  * TLP authorization
  * Server-side TLP filtering
  * STIX 2.1 threat feed
  * Tamper-evident SHA-256 hash-chained audit logging
  * Audit-chain verification
  * Prometheus security metrics
* **Sprint Result:** 21/21 story points completed.

---

## 10.7 Sprint Retrospective

At the conclusion of each sprint, the team conducted a formal retrospective. The synthesized findings are categorized below:

| Area | Observation | Improvement / Action |
| :--- | :--- | :--- |
| **What went well** | Security controls were integrated alongside core functionality. | Continue security-first implementation. |
| **What went well** | Automated testing provided continuous verification. | Maintain regression tests for every security-sensitive feature. |
| **What went well** | Both sprint commitments were completed. | Continue using realistic story-point estimates. |
| **What could improve** | Documentation and diagrams required repeated consistency checks. | Update traceability and diagrams immediately when architecture changes. |
| **What could improve** | Evidence collection was concentrated toward the end. | Capture implementation and testing evidence immediately after each task. |
| **What could improve** | Some security requirements required clarification during implementation. | Refine acceptance criteria before sprint execution. |

---

## 10.8 Retrospective Action Items

The following actionable continuous improvement commitments were adopted for subsequent engineering phases:

1. Maintain the requirements $\rightarrow$ design $\rightarrow$ implementation $\rightarrow$ test $\rightarrow$ evidence traceability continuously.
2. Capture screenshots and test evidence immediately after completing each sprint item.
3. Keep security regression tests alongside security-sensitive implementation changes.
4. Validate architecture and threat-model consistency whenever a security control changes.
