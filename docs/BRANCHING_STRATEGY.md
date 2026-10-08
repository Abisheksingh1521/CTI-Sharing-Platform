# Secure Repository & Branching Strategy

**System:** Cyber Threat Intelligence (CTI) Sharing Platform  
**Exam Phase:** Phase 11 – Secure Development and Build Environment  
**Governance Framework:** NIST SP 800-218 (Secure Software Development Framework - SSDF) & SLSA Level 2  

---

## 1. Branch Architecture & Workflow Model

The CTI Sharing Platform enforces **Trunk-Based Development with Protected Feature Branches**:

```
[feature/xxx] ────( Dev + Local Pre-Commit Hook )────► [PR / Code Review]
                                                             │
                                                    [Automated CI Check]
                                                    (Secrets, SAST, Tests)
                                                             │
                                                             ▼
[main / trunk] ◄────────( Signed Squash & Merge )────────────┘
      │
      ▼
[Immutable Release Tag] ──► [Build Artifact Manifest (SHA-256)]
```

### Core Branch Roles:
1. **`main` (Protected Production Trunk):**
   * Represents production-ready, release-candidate state.
   * Direct commits and forced pushes (`git push --force`) are strictly blocked.
   * Merges require passing status checks and verified peer review.
2. **`feature/<Jira-Key>-<description>` (Short-Lived Feature Branches):**
   * Created from latest `main`.
   * Lifetime restricted to $\le 3$ days to minimize divergence.
   * Example: `feature/CTI-101-totp-mfa`, `feature/CTI-109-audit-chain`.
3. **`hotfix/<cve-id>-<description>` (Emergency Security Patch Branches):**
   * Created directly from release tag for expedited vulnerability remediation.

---

## 2. Branch Protection Rules (`main`)

| Security Control | GitHub / Git Configuration | Purpose |
| :--- | :--- | :--- |
| **Require Pull Request Reviews** | `required_approving_review_count: 1` | Enforces mandatory dual-custody code review before code ingestion. |
| **Require Status Checks to Pass** | `strict: true`, contexts: `[ci/secrets, ci/sast, ci/unit-tests, ci/audit-integrity]` | Guarantees code builds, passes SAST, zero secrets, and zero regressions. |
| **Require Linear History** | `required_linear_history: true` | Eliminates merge commits; simplifies security forensics and git bisect. |
| **Require Signed Commits** | `required_signatures: true` | Cryptographically authenticates author identity via GPG/SSH commit signatures. |
| **Prevent Force Pushes** | `allow_force_pushes: false` | Prevents history rewrites or tampering with the commit audit trail. |
| **Prevent Branch Deletions** | `allow_deletions: false` | Protects trunk persistence. |
| **Enforce for Administrators** | `enforce_admins: true` | Blocks administrative bypasses of peer-review and CI gates. |

---

## 3. Pre-Commit Hooks & Secret Prevention

Developers must configure the local repository hooks to run `scripts/detect-secrets.js` prior to any commit:

```bash
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
```

The hook blocks any commit containing high-entropy tokens, private keys, AWS identifiers, or tracked `.env` files.

---

## 4. Repository Access & Least Privilege

* **Contributors (`ROLE_CONTRIBUTOR` developers):** Read-only clone access to `main`, push access restricted strictly to their assigned feature branches.
* **Maintainers (`ROLE_ANALYST` / Tech Leads):** PR review and approval authority; merge authority upon green CI.
* **Security Officers (`ROLE_ADMIN`):** Management of secrets in GitHub Actions Secrets vault; cryptographic release signing.
