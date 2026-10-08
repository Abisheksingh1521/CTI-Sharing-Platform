# Cyber Threat Intelligence (CTI) Sharing Platform
**24CYS401 – Secure Software Engineering (End Semester Laboratory Examination)**  
**Topic:** 29 — Cyber Threat Intelligence Sharing Platform

---

## Overview
A resilient, production-ready threat intelligence exchange application built according to secure software engineering lifecycle principles. Member organizations can securely submit, validate, defang, classify, and distribute Indicators of Compromise (IoCs) and threat incident reports with fine-grained Traffic Light Protocol (TLP) access barriers and an immutable SHA-256 hash-chained audit log.

## Features
- **Multi-Factor Authentication (MFA):** TOTP (RFC 6238) paired with bcrypt-hashed credentials.
- **Defanging Engine:** Automated sanitization of IPv4, IPv6, Domains, and Hashes to prevent accidental malware clicks.
- **Analyst Triage Station:** Vetting, scoring (0–100), and MITRE ATT&CK mapping.
- **TLP Enforcement:** Strict `canAccessTLP` information barriers (CLEAR, GREEN, AMBER, RED).
- **STIX 2.1 JSON Export:** Machine-readable threat feeds for SIEM/SOAR/Firewall integration.
- **Tamper-Evident Audit Log:** SHA-256 continuous hash chain detecting retroactive database modifications.
- **Hardened Kubernetes & Docker:** Non-root (UID 10001), read-only root filesystem with isolated writable `/app/data` volume.

## Quick Start
```bash
# Install dependencies
npm install

# Run automated tests
npm test

# Run boundary fuzzer
npm run test:fuzz

# Start application server
npm start
```
Default application URL: `http://localhost:3000`
