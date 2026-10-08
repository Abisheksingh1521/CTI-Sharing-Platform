# PHASE 1 – AGILE PROCESS AND DEVELOPMENT APPROACH [6 MARKS]
**Course:** 24CYS401 – Secure Software Engineering  
**System:** Topic 29 – Cyber Threat Intelligence (CTI) Sharing Platform  

---

## 1. Selected Agile Approach & Justification
For this mission-critical Cyber Threat Intelligence Sharing Platform, we adopt a hybrid **Scrum with Extreme Programming (XP) practices** methodology.

### Justification:
* **Scrum Framework:** Provides predictable, time-boxed sprint iterations (Sprint 1: Ingestion & Validation; Sprint 2: Analyst Triage & Distribution), clear ceremonies (Daily Standups, Sprint Review, Retrospective), and well-defined roles (Product Owner, Scrum Master, Cross-functional Dev Team).
* **XP Engineering Practices:** Incorporates technical rigor essential for security software:
  1. *Test-Driven Development (TDD):* Writing boundary validation and TLP security test cases before code modules are built.
  2. *Continuous Refactoring:* Continuously improving architectural structure without altering external behavior.
  3. *Continuous Integration (CI):* Automated linting, SAST scanning, and fuzz testing executed on every commit.
  4. *Collective Code Ownership:* Peer code reviews ensuring that no backdoors or unvetted bypasses enter production.

---

## 2. Mapping Agile Manifesto Principles to the CTI Platform

| # | Agile Manifesto Principle | Concrete Application to CTI Platform | Security Impact & Relevance |
| :-: | :--- | :--- | :--- |
| **1** | *"Our highest priority is to satisfy the customer through early and continuous delivery of valuable software."* | Delivering early threat ingestion and validation capabilities to partner organizations in Sprint 1, followed by automated STIX 2.1 feed distribution in Sprint 2. | Organizations receive immediate protection from emerging malware/ransomware indicators rather than waiting for a multi-year waterfall release. |
| **2** | *"Welcome changing requirements, even late in development. Agile processes harness change for the customer's competitive advantage."* | Adapting the ingestion parser to support new cyber threat observable formats (e.g., transition from legacy MD5 to SHA-256 and STIX 2.1 JSON schemas). | Threat landscapes evolve dynamically; the platform readily accommodates new adversary Tactics, Techniques, and Procedures (TTPs). |
| **3** | *"Deliver working software frequently, from a couple of weeks to a couple of months, with a preference to the shorter timescale."* | Deploying automated container builds via a hardened CI/CD pipeline at the end of each sprint cycle. | Fast feedback loops ensure security patches, dependency updates, and parser enhancements reach staging rapidly. |
| **4** | *"Build projects around motivated individuals. Give them the environment and support they need, and trust them to get the job done."* | Empowering security analysts with specialized triage tools, automated defanging, and confidence scoring capabilities. | Reduces analyst burnout and fatigue, preventing triage errors and accidental exposure of sensitive intelligence. |
| **5** | *"Continuous attention to technical excellence and good design enhances agility."* | Implementing clean layered architecture with the Strategy Pattern for IoC validation, paired with a Tamper-Evident SHA-256 Audit Log. | Decoupled architecture allows independent security audits, prevents technical debt, and ensures tamper-evident audit integrity. |

---

## 3. Refactoring Opportunities (Architectural & Maintainability)
*(Note: Security vulnerability remediation is preserved separately in Phase 12).*

### Opportunity 1: Extracting Monolithic Procedural Validation into the Strategy Pattern
* **Before Refactoring (Smell: Long Method, High Cyclomatic Complexity):**  
  A single monolithic function `validateInput(data)` contained nested `if-else` blocks checking IP addresses, domains, and hashes mixed with database insert statements. Adding a new observable type required modifying existing tested code, violating the Open/Closed Principle.
* **After Refactoring (Clean Design: Strategy Pattern):**  
  Extracted into an extensible `IoCValidator` interface with dedicated strategies: `IPv4Strategy`, `IPv6Strategy`, `DomainStrategy`, and `HashStrategy`. Each strategy encapsulates its own RFC-compliant regex, normalization, and defanging logic.

```javascript
// BEFORE (Monolithic & Fragile)
function validateIoC(type, val) {
  if (type === 'IP') { /* 15 lines of nested regex & checks */ }
  else if (type === 'DOMAIN') { /* 20 lines of domain checks */ }
  else if (type === 'HASH') { /* 12 lines of hash checks */ }
}

// AFTER (Extensible Strategy Pattern - src/services/iocValidator.js)
const strategies = {
  IPV4: new IPv4ValidationStrategy(),
  DOMAIN: new DomainValidationStrategy(),
  SHA256: new HashValidationStrategy(64)
};
class IoCValidatorService {
  validateAndDefang(type, value) {
    const strategy = strategies[type];
    if (!strategy) throw new Error("Unsupported observable type");
    return strategy.process(value);
  }
}
```

### Opportunity 2: Extracting Audit Cross-Cutting Concern via Decorator/Middleware
* **Before Refactoring (Smell: Code Duplication):**  
  Every controller method manually assembled audit JSON payloads, queried previous record hashes, and ran SQL inserts, scattering audit logic across 6 controllers.
* **After Refactoring:**  
  Centralized into an immutable `auditService.js` and Express middleware decorator that automatically intercepts requests, computes the continuous SHA-256 hash chain, and appends the log record transparently.

---

## 4. Agile Limitations in Security-Critical Systems & Mitigations

| Risk / Limitation | Description of Risk in CTI Context | Practical Mitigation Implemented |
| :--- | :--- | :--- |
| **Risk 1: Inadequate Early Architectural Security (Neglect of Threat Modeling)** | Agile's focus on rapid feature velocity can lead teams to postpone threat modeling and cryptography until later sprints, resulting in costly structural redesigns. | **Mitigation:** Conduct explicit Security Architecture Reviews and STRIDE threat modeling in Sprint 0 / Phase 1 before building ingestion pipelines. Security user stories are given equal priority to functional stories. |
| **Risk 2: Insufficient Documentation & Audit Traceability** | Agile value *"Working software over comprehensive documentation"* can lead to unverified security controls and missing compliance artifacts. | **Mitigation:** Implement Automated Security-as-Code: The `TRACEABILITY_MATRIX.md` is updated synchronously with code commits, and the Tamper-Evident SHA-256 Audit Log automatically records all system actions. |
