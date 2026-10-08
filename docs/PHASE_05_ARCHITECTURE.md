# PHASE 5 – SOFTWARE ARCHITECTURE AND DESIGN ENGINEERING [7 MARKS]
**Course:** 24CYS401 – Secure Software Engineering  
**System:** Topic 29 – Cyber Threat Intelligence (CTI) Sharing Platform  

---

## 1. Architectural Style & Justification
The platform is designed using a **Layered Hexagonal / Clean Architecture** pattern.

### Justification:
* **Separation of Concerns:** Distinct separation between Presentation (Frontend), Security Gateway (Guards), Application Business Logic (Services), and Persistence (Repositories).
* **Defense-in-Depth:** Security controls (Rate Limiting $\rightarrow$ Helmet Headers $\rightarrow$ JWT Verification $\rightarrow$ RBAC $\rightarrow$ TLP Policy) form concentric protective rings around core intelligence services.
* **Testability & Portability:** Persistence operations are decoupled behind a clean database abstraction, enabling isolated unit testing with in-memory SQLite and production containerization.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER (UI)                         │
│  [ Secure Login & MFA ]  [ Contributor Submission ]  [ Analyst Desk ]  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS (TLS 1.3)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    API GATEWAY & SECURITY INTERCEPTORS                 │
│  Helmet Headers ──► Rate Limiter ──► AuthGuard ──► RBAC ──► TLP Guard  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        APPLICATION SERVICE TIER                        │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────┐  │
│  │ Ingestion & Defanger │  │ Analyst Triage & TLP │  │ Feed Engine  │  │
│  │ (Strategy & Factory) │  │ (ABAC Policy Engine) │  │ (STIX 2.1)   │  │
│  └──────────┬───────────┘  └──────────┬───────────┘  └──────┬───────┘  │
│             │                         │                     │          │
│  ┌──────────▼─────────────────────────▼─────────────────────▼───────┐  │
│  │        Tamper-Evident SHA-256 Hash-Chained Audit Service         │  │
│  └────────────────────────────────────┬─────────────────────────────┘  │
└───────────────────────────────────────┼────────────────────────────────┘
                                        ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           PERSISTENCE LAYER                            │
│         SQLite3 (WAL Mode, Parameterized Prepared Statements)          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Four Applicable Design Patterns

### 1. Strategy Pattern (`IoCValidationStrategy`)
* **Problem:** Different cyber threat observables (IPv4, IPv6, FQDNs, MD5, SHA-256) require distinct schema validation rules, character sets, and canonicalization routines. Monolithic conditional checks lead to code bloat and high cyclomatic complexity.
* **Solution:** Encapsulate each algorithm inside a uniform strategy class (`IPv4Strategy`, `DomainStrategy`, `HashStrategy`) conforming to `validate()` and `defang()` methods.
* **Location:** `src/services/iocValidator.js`.

### 2. Observer / Pub-Sub Pattern (`ThreatFeedEventPublisher`)
* **Problem:** When an analyst approves a critical `TLP:CLEAR` or `TLP:GREEN` indicator, consumer systems, internal caches, and SIEM subscribers need real-time notification without tight coupling.
* **Solution:** The triage controller acts as a Subject, emitting `IOC_APPROVED` events. Registered Observers (e.g., AuditLogger, FeedBroadcaster) react asynchronously to disseminate updates.
* **Location:** `src/services/feedPublisher.js`.

### 3. Factory Pattern (`STIXObservableFactory`)
* **Problem:** Ingested observables must be converted into standardized OASIS STIX 2.1 JSON format (`ipv4-addr`, `domain-name`, `file`).
* **Solution:** A centralized factory instantiates standardized STIX 2.1 objects with deterministic identifiers (`indicator--<uuid>`), timestamps, and extension markings based on input types.
* **Location:** `src/services/stixFactory.js`.

### 4. Decorator / Middleware Interceptor Pattern
* **Problem:** Cross-cutting concerns (authentication, authorization, request tracing, rate limiting, and audit logging) must wrap handlers without cluttering core business functions.
* **Solution:** Express middleware functions (`authGuard`, `rbacGuard`, `tlpGuard`, `rateLimiter`) dynamically intercept and decorate request contexts.
* **Location:** `src/middleware/authGuard.js`, `src/middleware/rbacGuard.js`.

---

## 3. Mapping Core Modules to Components

| Core CTI Capability | Software Architecture Component | Implementation File | Key Interfaces & Responsibilities |
| :--- | :--- | :--- | :--- |
| **Authentication & Identity** | `AuthController` + `totpService` | `src/controllers/authController.js`<br>`src/services/totpService.js` | User onboarding, salted bcrypt hashing (cost factor 10), RFC 6238 TOTP issuance and drift-tolerant verification, JWT signing. |
| **Intelligence Ingestion & Validation** | `IoCController` + `ReportController` | `src/controllers/iocController.js`<br>`src/controllers/reportController.js` | Ingests raw observables and markdown incident reports; invokes validation strategies; computes defanged values. |
| **Triage & Classification** | `TriageController` + `TLPPolicy` | `src/controllers/triageController.js`<br>`src/middleware/tlpGuard.js` | Evaluates pending indicators, records analyst justifications, assigns MITRE ATT&CK techniques, enforces `canAccessTLP`. |
| **Feed Distribution** | `FeedController` + `stixFactory` | `src/controllers/feedController.js`<br>`src/services/stixFactory.js` | Generates standardized STIX 2.1 JSON observable bundles with TLP egress filtering. |
| **Audit & Monitoring** | `AuditService` | `src/services/auditService.js` | Manages the Tamper-Evident SHA-256 Hash-Chained Audit Log, calculates continuous hashes, and detects retroactive database tampering. |
