# PHASE 4 – DATA AND INFORMATION FLOW MODELING [7 MARKS]
**Course:** 24CYS401 – Secure Software Engineering  
**System:** Topic 29 – Cyber Threat Intelligence (CTI) Sharing Platform  

---

## 1. Entity-Relationship (ER) Model

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ USERS : employs
    USERS ||--o{ THREAT_INDICATORS : submits
    USERS ||--o{ THREAT_REPORTS : authors
    USERS ||--o{ REVIEW_LOGS : performs
    THREAT_REPORTS ||--o{ THREAT_INDICATORS : contains
    THREAT_INDICATORS ||--o{ REVIEW_LOGS : evaluated_by
    USERS ||--o{ AUDIT_LOGS : triggers

    ORGANIZATIONS {
        TEXT id PK "UUIDv4"
        TEXT name "UNIQUE NOT NULL"
        TEXT domain "NOT NULL"
        TEXT trust_level "CHECK: VERIFIED, STANDARD, PROBATIONARY"
        DATETIME created_at
    }

    USERS {
        TEXT id PK "UUIDv4"
        TEXT org_id FK "REFERENCES organizations(id)"
        TEXT username "UNIQUE NOT NULL"
        TEXT email "UNIQUE NOT NULL"
        TEXT password_hash "Bcrypt salted hash"
        TEXT role "CHECK: ROLE_ADMIN, ROLE_ANALYST, ROLE_CONTRIBUTOR, ROLE_CONSUMER"
        TEXT mfa_secret "Base32 RFC 6238 Secret"
        INTEGER mfa_enabled "Default 1"
        DATETIME created_at
    }

    THREAT_REPORTS {
        TEXT id PK "UUIDv4"
        TEXT org_id FK "REFERENCES organizations(id)"
        TEXT author_id FK "REFERENCES users(id)"
        TEXT title "NOT NULL"
        TEXT summary "NOT NULL"
        TEXT content_markdown "Sanitized Markdown"
        TEXT tlp_level "CHECK: CLEAR, GREEN, AMBER, RED"
        TEXT status "CHECK: PENDING, APPROVED, REJECTED"
        DATETIME created_at
    }

    THREAT_INDICATORS {
        TEXT id PK "UUIDv4"
        TEXT report_id FK "REFERENCES threat_reports(id) NULLABLE"
        TEXT org_id FK "REFERENCES organizations(id)"
        TEXT submitter_id FK "REFERENCES users(id)"
        TEXT type "CHECK: IPV4, IPV6, DOMAIN, MD5, SHA1, SHA256"
        TEXT value "Raw indicator observable"
        TEXT value_defanged "Canonicalized and defanged"
        TEXT description "Contextual threat narrative"
        TEXT tlp_level "CHECK: CLEAR, GREEN, AMBER, RED"
        TEXT status "CHECK: PENDING, APPROVED, REJECTED"
        INTEGER confidence_score "CHECK: BETWEEN 0 AND 100"
        TEXT mitre_attack_id "e.g., T1566.001"
        DATETIME created_at
    }

    REVIEW_LOGS {
        TEXT id PK "UUIDv4"
        TEXT indicator_id FK "REFERENCES threat_indicators(id)"
        TEXT analyst_id FK "REFERENCES users(id)"
        TEXT decision "CHECK: APPROVED, REJECTED"
        TEXT assigned_tlp "CHECK: CLEAR, GREEN, AMBER, RED"
        TEXT justification "Mandatory triage explanation"
        DATETIME timestamp
    }

    AUDIT_LOGS {
        TEXT id PK "UUIDv4"
        TEXT user_id FK "REFERENCES users(id) NULLABLE"
        TEXT event_type "e.g., AUTH_LOGIN, IOC_SUBMIT, TLP_UPDATE"
        TEXT ip_address "Origin IPv4/IPv6"
        TEXT resource_id "Affected Entity UUID"
        TEXT action_details "Contextual details"
        TEXT prev_record_hash "SHA-256 of preceding log row"
        TEXT current_record_hash "Continuous SHA-256 hash"
        DATETIME timestamp
    }
```

---

## 2. Level-0 Context Data Flow Diagram (DFD)

```
                       ┌──────────────────────────────────────────────┐
                       │               UNTRUSTED ZONE                 │
                       │                                              │
[ Org Contributor ] ──►│ 1. Raw IoCs & Incident Reports (HTTPS)       │──┐
                       │                                              │  │
[ Security Analyst ] ◄─│ 2. Triage Queue & Alerts                     │  │
[ Security Analyst ] ──►│ 3. Classification & Approval Decisions       │  │
                       │                                              │  │
[ Threat Consumer ]  ◄─│ 4. Filtered STIX 2.1 Threat Feeds            │  │
                       └──────────────────────────────────────────────┘  │
                                              │                          │
                         ====================│==========================│===
                         TRUST BOUNDARY 1: PERIMETER / API GATEWAY       │
                         ================================================│===
                                              │                          │
                                              ▼                          ▼
                               ┌──────────────────────────────────────────────┐
                               │                 PROCESS 0.0                  │
                               │      CYBER THREAT INTELLIGENCE PLATFORM      │
                               └──────────────────────┬───────────────────────┘
                                                      │
                         =============================│======================
                         TRUST BOUNDARY 2: SECURE INTERNAL PERSISTENCE VAULT
                         =============================│======================
                                                      ▼
                                       ┌─────────────────────────────┐
                                       │   D1: Encrypted Database    │
                                       │   D2: Hash-Chained Audit    │
                                       └─────────────────────────────┘
```

---

## 3. Level-1 Detailed Data Flow Diagram with Trust Boundaries

```mermaid
flowchart TD
    subgraph Untrusted_External_Zone [Untrusted External Zone]
        C[Org Contributor]
        A[Security Analyst]
        CO[Threat Consumer / SIEM]
    end

    TB1[====== TRUST BOUNDARY 1: Perimeter TLS / API Gateway ======]

    subgraph Demilitarized_Zone [DMZ / Ingestion & Auth Layer]
        P1[Process 1.0: Authenticate & Verify MFA]
        P2[Process 2.0: Ingestion, Validation & Defanging]
    end

    TB2[====== TRUST BOUNDARY 2: Service Layer Authorization Barrier ======]

    subgraph Internal_Secure_Zone [Internal Application Core]
        P3[Process 3.0: Analyst Triage & MITRE Classification]
        P4[Process 4.0: canAccessTLP Egress Filtering]
        P5[Process 5.0: SHA-256 Tamper-Evident Audit Chaining]
    end

    subgraph Data_Stores [Persistence Tier - SQLite Vault]
        DS1[(D1: User & Org Store)]
        DS2[(D2: Threat Indicators & Reports)]
        DS3[(D3: Review Decisions)]
        DS4[(D4: Hash-Chained Audit Log)]
    end

    C -->|Credentials + TOTP| P1
    P1 -->|Query Credentials| DS1
    P1 -->|Emit Auth Audit Event| P5

    C -->|Submit Raw IoC/Report| P2
    P2 -->|Normalize & Defang| P2
    P2 -->|Store PENDING Status| DS2
    P2 -->|Emit Ingest Audit Event| P5

    A -->|Fetch Triage Queue| P3
    P3 -->|Read PENDING IoCs| DS2
    A -->|Submit Decision & TLP| P3
    P3 -->|Update Status & Score| DS2
    P3 -->|Record Triage Log| DS3
    P3 -->|Emit Triage Audit Event| P5

    CO -->|Request STIX 2.1 Feed| P4
    P4 -->|Fetch Approved IoCs| DS2
    P4 -->|Execute canAccessTLP Policy| P4
    P4 -->|Return Sanitized STIX Bundle| CO

    P5 -->|Compute Continuous Hash| P5
    P5 -->|Append Log Record| DS4
```

### Trust Boundaries Defined:
1. **Trust Boundary 1 (Perimeter / API Gateway):** Separates untrusted public internet clients from internal endpoints. Enforces TLS 1.3 encryption, rate limiting (5 req/min on auth, 100 req/min on APIs), and Helmet security headers.
2. **Trust Boundary 2 (Service Layer / Information Barrier):** Separates unauthenticated/unvetted application components from sensitive operational intelligence. Enforces JWT signature verification, RBAC role validation, and the mandatory `canAccessTLP` egress filter.
