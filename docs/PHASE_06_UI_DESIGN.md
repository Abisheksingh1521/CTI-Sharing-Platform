# PHASE 6 – USER INTERFACE DESIGN [5 MARKS]
**Course:** 24CYS401 – Secure Software Engineering  
**System:** Topic 29 – Cyber Threat Intelligence (CTI) Sharing Platform  
**Implementation:** Single-Page Application (`src/public/index.html`, `src/public/styles.css`, `src/public/app.js`)  

---

## 1. Overview and Design Philosophy

The Cyber Threat Intelligence (CTI) Sharing Platform user interface is designed to meet strict security engineering standards while providing a responsive, high-contrast, glassmorphic cybersecurity operations console. The interface enforces defense-in-depth principles directly at the presentation layer: sensitive indicators are canonically defanged before rendering to prevent accidental browser navigation, role-based workflows are segregated into distinct operational views, and cryptographic security events are visibly surfaced.

---

## 2. Four Core CTI Application Screens

### Screen 1: Secure Authentication & TOTP MFA Screen

* **Target User (Actor):** All platform actors (`ROLE_CONTRIBUTOR`, `ROLE_ANALYST`, `ROLE_ADMIN`, `ROLE_CONSUMER`).
* **User Goal:** Authenticate using primary master credentials and prove possession of a secondary authenticator device via RFC 6238 Time-Based One-Time Password (TOTP) to obtain a signed JWT session token.
* **Navigation:** Accessible at the initial landing view (`tab-auth`) or automatically routed upon token expiration or logout.
* **Inputs:**
  * Username / Service Principal identifier (text)
  * Master Password (masked password input)
  * 6-Digit TOTP Code (numeric string, pattern `[0-9]{6}`)
  * Pre-seeded Evaluator Persona selection buttons (one-click credential testing for exam validation)
* **Feedback:**
  * Informational status card upon completing Step 1 indicating valid first-factor credentials.
  * Active countdown timer badge displaying remaining validity window ($30\text{s}$) for the current TOTP epoch.
  * Successful authentication updates the top header with a personalized user chip displaying username, assigned role badge, and organization identifier.
  * Live JSON preview of the decoded JWT claims payload.
* **Error Handling:**
  * Rate-limit feedback when exceeding 5 attempts/min: displays HTTP 429 message with cooldown instruction.
  * Invalid password or unrecognized username displays generic timing-safe error: `"Invalid credentials"`.
  * Expired or out-of-sync TOTP code displays `"Invalid or expired TOTP code"`.
* **Security Considerations:**
  * Two-step authentication dialog prevents password and MFA token from being submitted in a single request.
  * Master passwords are never echoed in console logs, URL parameters, or localStorage.
  * JWT access tokens are stored in scoped memory/localStorage and appended as `Authorization: Bearer <token>` HTTP headers.
  * Cross-Site Scripting (XSS) mitigated through strict Content Security Policy (`script-src 'self'`).

```
+-------------------------------------------------------------------------------+
|  [🛡️ CTI GUARD]   Screen 1: Authentication & TOTP MFA    [USER: Unauthenticated] |
+-------------------------------------------------------------------------------+
|  ┌─────────────────────────────────┐   ┌───────────────────────────────────┐  |
|  │ User Authentication Gate        │   │ Pre-Seeded Evaluator Personas     │  |
|  │ STEP 1 OF 2                     │   │ [ONE-CLICK TEST]                  │  |
|  │                                 │   │                                   │  |
|  │ Username: [ analyst_riya      ] │   │ [🔍] Riya Sharma (ROLE_ANALYST)   │  |
|  │ Password: [ ••••••••••••••••  ] │   │ [📥] Alex Rivera (ROLE_CONTRIB)   │  |
|  │                                 │   │ [📡] SIEM Agent  (ROLE_CONSUMER)  │  |
|  │ [ Verify Credentials -> MFA ]   │   │ [⚡] Admin Sec   (ROLE_ADMIN)     │  |
|  │                                 │   │                                   │  |
|  │ ── STEP 2 (TOTP Verification) ─ │   │ Active JWT Token Preview:         │  |
|  │ TOTP: [ 4 8 2 9 1 0 ] (24s left)│   │ { "sub": "u-02", "role": ... }    │  |
|  │ [ Cancel ]  [ Complete Sign In] │   │                                   │  |
|  └─────────────────────────────────┘   └───────────────────────────────────┘  |
+-------------------------------------------------------------------------------+
```

---

### Screen 2: Threat Intelligence & IoC Ingestion Screen

* **Target User (Actor):** Organization Contributor (`ROLE_CONTRIBUTOR`) and Security Analyst (`ROLE_ANALYST`).
* **User Goal:** Safely submit newly discovered Indicators of Compromise (IoCs) and structured incident reports for automated validation and canonical defanging.
* **Navigation:** Second navigation tab (`tab-ingest`), visible to all authenticated contributors.
* **Inputs:**
  * Observable Type dropdown (`IPV4`, `IPV6`, `DOMAIN`, `SHA256`, `SHA1`, `MD5`)
  * Raw Observable Value (text, e.g., `198.51.100.24`, `c2.malware-drop.org`)
  * Initial Traffic Light Protocol classification (`CLEAR`, `GREEN`, `AMBER`, `RED`)
  * Threat Context / Description (textarea)
  * Markdown Incident Report form: Title, Executive Summary, Markdown Body
* **Feedback:**
  * Real-time client-side Canonical Defanging Preview box updating on every keystroke (e.g., `1.1.1.1` dynamically renders as `1[.]1[.]1[.]1`).
  * Instant feedback banner displaying assigned Indicator UUID and triage queue confirmation.
  * In the event of duplicate submission, displays an informative deduplication notification: `"IoC Deduplicated: Observable previously ingested (ID: ...). Sighting recorded in audit trail without DB bloat."`
* **Error Handling:**
  * ReDoS-resistant regex validation flags malformed inputs prior to submission with type-specific hints.
  * Submissions without an active JWT session trigger an immediate authentication alert redirecting to Screen 1.
* **Security Considerations:**
  * Automated canonical defanging renders observables completely inert (disarming live clickable URLs and neutralizing malicious IP links).
  * Threat report Markdown is sanitized on the server before storage to neutralize Stored XSS vectors (stripping `<script>`, `onload`, and `onerror` event attributes).
  * Payload size limits (100kb ceiling) prevent memory exhaustion DoS.

```
+-------------------------------------------------------------------------------+
|  Screen 2: Threat Intelligence & IoC Ingestion           [Alex Rivera | FinCERT] |
+-------------------------------------------------------------------------------+
|  ┌──────────────────────────────────┐   ┌───────────────────────────────────┐  |
|  │ Submit Indicator of Compromise   │   │ Structured Incident Report        │  |
|  │ Observable: [ IPV4             ] │   │ Title:   [ APT29 Intrusion      ] │  |
|  │ Raw Value:  [ 198.51.100.24    ] │   │ Summary: [ SolarWinds DLL Backd ] │  |
|  │                                  │   │ TLP:     [ TLP:AMBER            ] │  |
|  │ ┌─ LIVE DEFANGING PREVIEW ─────┐ │   │                                   │  |
|  │ │ 198[.]51[.]100[.]24          │ │   │ Incident Markdown Body:           │  |
|  │ └──────────────────────────────┘ │   │ [## Threat Vector               ] │  |
|  │ TLP:        [ TLP:GREEN        ] │   │ [Attackers deployed modified... ] │  |
|  │ Context:    [ C2 Beacon IP     ] │   │                                   │  |
|  │                                  │   │                                   │  |
|  │ [ Validate, Defang & Ingest ]    │   │ [ Submit Sanitized Report ]       │  |
|  └──────────────────────────────────┘   └───────────────────────────────────┘  |
+-------------------------------------------------------------------------------+
```

---

### Screen 3: Analyst Triage & TLP Classification Station

* **Target User (Actor):** Authorized Security Analyst (`ROLE_ANALYST`) and Platform Administrator (`ROLE_ADMIN`).
* **User Goal:** Inspect pending community submissions, evaluate false-positive risks, adjust confidence ratings, map MITRE ATT&CK techniques, assign definitive TLP classifications, and record immutable triage rationales.
* **Navigation:** Third navigation tab (`tab-triage`).
* **Inputs:**
  * Refresh Queue action button
  * "Triage & Classify" row action opening the decision drawer
  * Confidence Score slider (0 to 100 with dynamic visual readout)
  * MITRE ATT&CK Technique ID input (e.g., `T1566.001`)
  * Final Assigned TLP rating (`CLEAR`, `GREEN`, `AMBER`, `RED`)
  * Mandatory Analyst Justification textarea (enforces minimum 5 characters)
  * Decision buttons: `[ Approve & Publish to Feed ]` or `[ Reject as False Positive ]`
* **Feedback:**
  * Dynamic counter badge showing total items awaiting review (`X Pending`).
  * Color-coded TLP badges (`TLP:CLEAR` white, `TLP:GREEN` green, `TLP:AMBER` amber, `TLP:RED` red).
  * Confirmation notification upon decision recording, followed by automatic queue re-fetch.
  * Empty queue indicator: `"✓ Vetting Queue Clear. No pending observables require review."`
* **Error Handling:**
  * Unauthorized actors (`ROLE_CONTRIBUTOR`, `ROLE_CONSUMER`) attempting to access the queue receive an explicit RBAC denial banner: `"RBAC Access Denied: User role lacks permission to triage intelligence"`.
  * Modal validation blocks approval or rejection if justification text is missing or fewer than 5 characters.
* **Security Considerations:**
  * Centralized server-side enforcement via `rbacGuard(['ROLE_ANALYST', 'ROLE_ADMIN'])`.
  * Separation of duties: Contributors cannot approve or alter the triage state of their own submitted indicators.
  * Mandatory justification creates an immutable record in `review_logs` linked to the analyst's UUID for compliance auditing.

```
+-------------------------------------------------------------------------------+
|  Screen 3: Analyst Triage & TLP Station                  [Riya Sharma | CERT-In]|
+-------------------------------------------------------------------------------+
|  Pending Vetting Queue [2 Pending]                        [ ↻ Refresh Queue ] |
|  +--------+-----------------------+-------------+-----------+--------+------+ |
|  | TYPE   | DEFANGED OBSERVABLE   | SUBMITTER   | INIT TLP  | STATUS | ACT  | |
|  +--------+-----------------------+-------------+-----------+--------+------+ |
|  | IPV4   | 198[.]51[.]100[.]24   | FinCERT     | TLP:GREEN | PEND   | [TRI]| |
|  | DOMAIN | c2[.]malwaredrop[.]org| CERT-In     | TLP:AMBER | PEND   | [TRI]| |
|  +--------+-----------------------+-------------+-----------+--------+------+ |
|                                                                               |
|  ┌─ TRIAGE DECISION DRAWER ────────────────────────────────────────────────┐  |
|  │ Reviewing: 198[.]51[.]100[.]24 (IPV4)                                   │  |
|  │ Confidence Score: [====85====] 85/100                                   │  |
|  │ MITRE Technique:  [ T1566.001 - Spearphishing Attachment              ] │  |
|  │ Final TLP:        [ TLP:GREEN                                         ] │  |
|  │ Justification:    [ Confirmed C2 beacon matching FIN7 campaign telemetry]│  |
|  │                                                                         │  |
|  │ [ Reject as False Positive ]            [ Approve & Publish to Feed ]   │  |
|  └─────────────────────────────────────────────────────────────────────────┘  |
+-------------------------------------------------------------------------------+
```

---

### Screen 4: STIX 2.1 Threat Feed & Security Metrics Dashboard

* **Target User (Actor):** Threat Consumers / Automated SIEM Agents (`ROLE_CONSUMER`), Platform Administrators (`ROLE_ADMIN`), and Security Analysts (`ROLE_ANALYST`).
* **User Goal:** Query real-time OASIS STIX 2.1 JSON threat intelligence bundles, observe server-side TLP information barriers in action, monitor live Prometheus security metrics, and execute cryptographic verification of the SHA-256 audit log hash chain.
* **Navigation:** Fourth navigation tab (`tab-feeds`).
* **Inputs:**
  * "Fetch Feed Bundle" button querying `GET /api/feeds/stix`
  * "Verify Audit Chain" button querying `GET /api/audit/verify`
* **Feedback:**
  * **Server-Side TLP Egress Barrier Banner:**
    * When authenticated as `ROLE_CONSUMER`: `"Server-Side Barrier Active: Logged in as ROLE_CONSUMER. Server policy canAccessTLP() strictly stripped all TLP:RED intelligence from this bundle."`
    * When authenticated as `ROLE_ANALYST`: `"Privileged Analyst Feed: Logged in as ROLE_ANALYST. Complete classified feed including verified TLP:RED incident data."`
  * Live pretty-printed STIX 2.1 JSON bundle display (`type: "bundle"`, `objects: [...]`).
  * Four live Prometheus metric cards: Total HTTP Requests, Failed Logins counter (`cti_failed_logins_total`), Pending Triage Queue gauge, and Audit Chain Status.
  * Audit verification card displaying: `"✓ AUDIT CHAIN INTACT (X Records Verified)"` with the latest record's SHA-256 hash snippet and genesis anchor.
  * Table of recent hash-chained audit log entries showing timestamp, event type, action details, and truncated SHA-256 block hash.
* **Error Handling:**
  * Out-of-band audit row tampering triggers an alert banner: `"⚠ TAMPERING DETECTED: Hash mismatch at Record #N"`.
  * Network fetch failures display clear inline error messages without crashing the dashboard.
* **Security Considerations:**
  * Server-side filtering via `canAccessTLP`: Information barriers are enforced before serialization; TLP:RED objects are never transmitted over the wire to consumer sessions.
  * Cryptographic SHA-256 hash chaining provides tamper-evident integrity verification of audit records and allows unauthorized modification of the chain to be detected during verification.

```
+-------------------------------------------------------------------------------+
|  Screen 4: STIX 2.1 Feed & Security Metrics              [SIEM Agent | GovCERT] |
+-------------------------------------------------------------------------------+
|  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌────────────────────┐  |
|  │ HTTP Requests │ │ Failed Logins │ │ Pending Queue │ │ Audit Chain Status │  |
|  │     142       │ │       2       │ │       1       │ │     VERIFIED       │  |
|  └───────────────┘ └───────────────┘ └───────────────┘ └────────────────────┘  |
|                                                                               |
|  ┌─ STIX 2.1 Threat Feed Egress ───────┐ ┌─ Audit Chain Cryptographic Verif ─┐|
|  │ [!] Server-Side Barrier Active:     │ │ [🔒] ✓ AUDIT CHAIN INTACT (6 Recs) │|
|  │     TLP:RED strictly excluded.      │ │ Continuous SHA-256 chain verified. │|
|  │                                     │ │                                    │|
|  │ {                                   │ │ RECENT AUDIT RECORDS (HASH-CHAINED)│|
|  │   "type": "bundle",                 │ │ 10:42:01 | IOC_SUBMIT | 7f9a2b...  │|
|  │   "id": "bundle--9d4f...",          │ │ 10:42:15 | TRIAGE_APP | a14e8c...  │|
|  │   "objects": [ ... ]                │ │ 10:42:30 | FEED_PULL  | d3b901...  │|
|  │ }                                   │ │                                    │|
|  │ [ Fetch Feed Bundle ]               │ │ [ Verify Audit Chain ]             │|
|  └─────────────────────────────────────┘ └────────────────────────────────────┘|
+-------------------------------------------------------------------------------+
```

---

## 3. Application of Shneiderman's Eight Golden Rules

The CTI Platform user interface systematically applies **Ben Shneiderman's 8 Golden Rules of Interface Design**:

| Rule # | Shneiderman's Golden Rule | Concrete Implementation in CTI Platform UI |
| :---: | :--- | :--- |
| **1** | **Strive for Consistency** | Uniform color semantics across all screens: Cyan for primary actions and active tabs, Emerald for approved/verified statuses (`TLP:GREEN`), Amber for warnings/pending states (`TLP:AMBER`), and Ruby for critical security events and confidential classifications (`TLP:RED`). Typography consistently couples Plus Jakarta Sans for UI labels with JetBrains Mono for cryptographic hashes, observable values, and JSON payloads. |
| **2** | **Enable Frequent Users to Use Shortcuts** | The Authentication screen provides one-click Pre-Seeded Evaluator Personas (`analyst_riya`, `contributor_alex`, `consumer_siem`, `admin_sec`) with pre-populated credentials and automated in-browser RFC 6238 TOTP computation, allowing evaluators and security analysts to rapidly navigate between distinct privilege tiers without manual retyping. |
| **3** | **Offer Informative Feedback** | Real-time canonical defanging preview updates synchronously as observables are typed. Submission actions provide immediate affirmative feedback containing created UUIDs, sanitized strings, or deduplication alerts. The STIX viewer displays a contextual banner explaining exactly which TLP clearance filters were applied to the generated bundle. |
| **4** | **Design Dialog to Yield Closure** | The authentication workflow separates credential entry into a clear two-step dialog (Step 1: Credentials $\rightarrow$ Step 2: TOTP) with an active remaining-time countdown before culminating in a signed JWT session. The analyst triage station uses a focused modal drawer where the workflow terminates cleanly in either an "Approve & Publish" or "Reject" decision that auto-refreshes the queue. |
| **5** | **Offer Simple Error Handling** | Form inputs enforce client-side constraints (pattern matching on 6-digit TOTP, minimum 5 characters on triage justification, bounded confidence slider 0–100) before network transmission. When server errors occur (e.g., HTTP 403 RBAC denial or 429 rate limit), the UI displays clear human-readable alerts rather than raw stack traces. |
| **6** | **Permit Easy Reversal of Actions** | Users can cancel the TOTP challenge step via the "Back" button to return to primary credentials. In the triage drawer, the analyst can close the modal without altering state, or explicitly reject an erroneously submitted indicator with an explanatory note. |
| **7** | **Support Internal Locus of Control** | Security analysts maintain complete control over the triage workflow: they decide the confidence rating via an interactive slider, select the appropriate TLP rating, supply custom vetting rationale, and trigger manual queue refreshes at will. |
| **8** | **Reduce Short-Term Memory Load** | Triage modals echo the target observable's defanged value, type, and identifier at the top of the dialog so analysts do not need to memorize or copy-paste details. Pre-seeded personas eliminate credential recall, and the STIX preview renders syntax-highlighted JSON directly in the interface. |

---

## 4. UI Architecture & Responsive Implementation Details

1. **Vanilla Modern Web Standards:** Built using pure HTML5, modern CSS3 variables and Flexbox/Grid, and vanilla ECMAScript 2022 JavaScript without heavy third-party framework overhead, ensuring zero client-side supply-chain attack surface.
2. **Web Crypto API Integration:** Implements RFC 6238 HMAC-SHA1 TOTP generation entirely inside the browser using standard `window.crypto.subtle`, enabling zero-dependency client-side calculation during evaluator demonstrations.
3. **Automated Prometheus Integration:** Screen 4 polls `/metrics` periodically every 5 seconds, parsing the Prometheus text exposition format via regular expressions to update live operational gauges in real time.
4. **Hardware-Accelerated Dark Glassmorphism:** CSS backdrop filters (`backdrop-filter: blur(12px)`), subtle radial glow gradients, and high-contrast typography reduce analyst eye strain during extended Security Operations Center (SOC) shifts.
