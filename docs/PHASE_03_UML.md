# PHASE 3 – REQUIREMENTS ANALYSIS AND UML [7 MARKS]
**Course:** 24CYS401 – Secure Software Engineering  
**System:** Topic 29 – Cyber Threat Intelligence (CTI) Sharing Platform  

---

## 1. UML Use Case Diagram

```mermaid
flowchart LR
    subgraph Actors
        C[fa:fa-user Org Contributor]
        A[fa:fa-user-shield Security Analyst]
        CO[fa:fa-server Threat Consumer / SIEM]
        AD[fa:fa-user-cog Platform Administrator]
    end

    subgraph CTI_System [Cyber Threat Intelligence Platform]
        UC1((UC-01: Authenticate with MFA))
        UC2((UC-02: Submit Raw Threat Indicators))
        UC3((UC-03: Submit Incident Threat Report))
        UC4((UC-04: Canonicalize & Defang IoCs))
        UC5((UC-05: Triage & Classify Threat Intel))
        UC6((UC-06: Assign MITRE & TLP Rating))
        UC7((UC-07: Ingest Filtered STIX 2.1 Feed))
        UC8((UC-08: Query Tamper-Evident Audit Trail))
        UC9((UC-09: Enforce TLP Clearance Barrier))
    end

    C --> UC1
    C --> UC2
    C --> UC3

    A --> UC1
    A --> UC5

    CO --> UC7

    AD --> UC1
    AD --> UC8

    UC2 -.->|<<include>>| UC4
    UC2 -.->|<<include>>| UC1
    UC3 -.->|<<include>>| UC1

    UC5 -.->|<<include>>| UC6
    UC5 -.->|<<include>>| UC1

    UC7 -.->|<<include>>| UC9
```

---

## 2. Critical Use Case Specifications

### Use Case Specification 1: Submit & Validate Threat Indicator (UC-02)

| Field | Detail |
| :--- | :--- |
| **Use Case ID** | `UC-02` |
| **Use Case Name** | Submit & Validate Threat Indicator |
| **Primary Actor** | Organization Contributor (`ROLE_CONTRIBUTOR`) |
| **Preconditions** | 1. Contributor has authenticated via MFA and holds a valid JWT access token.<br>2. Contributor's organization has a verified trust status. |
| **Main Success Scenario (Flow of Events)** | 1. Contributor submits indicator payload: Observable Type (e.g., `IPV4`, `DOMAIN`, `SHA256`), Raw Value, Description, and initial TLP tag.<br>2. System validates that the user holds `ROLE_CONTRIBUTOR` or `ROLE_ANALYST`.<br>3. System executes schema validation strategy matching the specific indicator type.<br>4. System computes defanged canonical representation (e.g., `1.1.1.1` $\rightarrow$ `1[.]1[.]1[.]1`, `evil.com` $\rightarrow$ `evil[.]com`).<br>5. System checks for duplicate active indicators in the database.<br>6. System stores indicator in `threat_indicators` table with `status = 'PENDING'`.<br>7. System logs `IOC_SUBMIT` event into the Tamper-Evident SHA-256 Audit Trail.<br>8. System returns HTTP 201 Created with indicator UUID and defanged value. |
| **Alternative Flows** | **3a. Format Validation Failure:** If observable value fails RFC/hex syntax (e.g. malformed IP octet > 255): System rejects with HTTP 400 Bad Request; logs validation error.<br>**5a. Duplicate Indicator Detected:** System appends sighting occurrence counter and increments contributor correlation score without creating a duplicate record. |
| **Exception Flows** | **2a. Expired Token:** System returns HTTP 401 Unauthorized; contributor is prompted to re-authenticate.<br>**4a. Malformed Payload Injection:** If body contains script tags or oversized payload (>100KB), API gateway rejects with HTTP 413 or 400. |
| **Postconditions** | Indicator is safely stored in pending triage queue; defanged value is previewable; tamper-evident audit record is appended. |

---

### Use Case Specification 2: Review & Classify Threat Intelligence with TLP (UC-05)

| Field | Detail |
| :--- | :--- |
| **Use Case ID** | `UC-05` |
| **Use Case Name** | Review & Classify Threat Intelligence with TLP |
| **Primary Actor** | Authorized Security Analyst (`ROLE_ANALYST`) |
| **Preconditions** | 1. Analyst is authenticated with active `ROLE_ANALYST` session.<br>2. One or more indicators exist in `PENDING` status. |
| **Main Success Scenario (Flow of Events)** | 1. Analyst queries the triage queue (`GET /api/iocs?status=PENDING`).<br>2. Analyst selects an indicator and reviews submitted provenance, defanged observable, and historical sightings.<br>3. Analyst verifies indicator validity, assesses false-positive risk, and assigns confidence score (0–100).<br>4. Analyst tags MITRE ATT&CK technique ID (e.g., `T1566.001` - Spearphishing Attachment).<br>5. Analyst assigns final Traffic Light Protocol rating (`CLEAR`, `GREEN`, `AMBER`, or `RED`).<br>6. Analyst records triage decision (`APPROVED` or `REJECTED`) with mandatory justification text.<br>7. System records immutable review decision in `review_logs` table.<br>8. System updates indicator status to `APPROVED`.<br>9. System records `IOC_TRIAGE_APPROVED` in the Tamper-Evident SHA-256 Audit Trail.<br>10. System returns HTTP 200 OK with updated indicator object. |
| **Alternative Flows** | **6a. Rejection:** Analyst selects `REJECTED` and inputs justification (e.g., "Legitimate DNS resolver - false positive"). Indicator status becomes `REJECTED` and is excluded from feeds. |
| **Exception Flows** | **1a. Unauthorized Role:** Contributor or Consumer attempts to triage indicator $\rightarrow$ System rejects with HTTP 403 Forbidden.<br>**6a. Missing Justification:** Analyst submits decision without explanation $\rightarrow$ System rejects with HTTP 400 Bad Request. |
| **Postconditions** | Indicator is classified and published to feed according to TLP clearance; immutable review log and audit log are recorded. |

---

## 3. Scenario-Based Analysis Model
**Scenario:** *Submit and Validate Threat Indicators with Automated Defanging*

```mermaid
flowchart TD
    Start([User Initiates Submission]) --> Step1[Enter Indicator Type, Value & Description]
    Step1 --> Step2{Client-side Pre-Validation}
    Step2 -- Failed --> Err1[Display Inline Regex Error Badge]
    Err1 --> Step1
    Step2 -- Passed --> Step3[Send HTTPS POST /api/iocs with JWT]

    Step3 --> Step4{API Gateway: Token & RBAC Check}
    Step4 -- Invalid/Expired Token --> Err2[HTTP 401: Re-authenticate via MFA]
    Step4 -- Insufficient Role --> Err3[HTTP 403: Forbidden]
    Step4 -- Authorized --> Step5[Invoke IoC Validation Strategy Engine]

    Step5 --> Step6{Server-side Strict Schema & Bounds Check}
    Step6 -- ReDoS/Syntax Error --> Err4[HTTP 400: Reject Malformed Indicator]
    Step6 -- Valid Observable --> Step7[Execute Automated Canonical Defanging]

    Step7 --> Step8[Check Duplicate Signatures in Threat Store]
    Step8 --> Step9[Insert into threat_indicators: status=PENDING]
    Step9 --> Step10[AuditService: Compute SHA-256 Hash Chain]
    Step10 --> Step11[Append Record to audit_logs Table]
    Step11 --> EndSuccess([HTTP 201 Created: Return Indicator UUID & Defanged Observable])
```
