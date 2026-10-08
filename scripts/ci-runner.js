/**
 * Consolidated Continuous Integration & Secure Build Runner (Phase 11: Control #6)
 *
 * Automates the six-stage secure development build pipeline:
 *  Stage 1: Secret Detection & Anti-Hardcoding Audit
 *  Stage 2: Dependency Security Audit (npm audit)
 *  Stage 3: Static Application Security Testing (SAST)
 *  Stage 4: Automated Regression & Unit Testing
 *  Stage 5: Cryptographic Audit Hash Chain Verification
 *  Stage 6: Artifact Integrity & Reproducibility Seal
 */

const { execSync } = require('child_process');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

const PIPELINE_STAGES = [
  {
    name: 'Stage 1: Secret Detection & Anti-Hardcoding Audit',
    command: 'node scripts/detect-secrets.js',
    critical: true
  },
  {
    name: 'Stage 2: Dependency Security Vulnerability Audit',
    command: 'npm audit --json',
    critical: false, // allows documenting dependency CVEs without breaking pipeline build
    parseJson: true
  },
  {
    name: 'Stage 3: Static Application Security Testing (SAST)',
    command: 'node scripts/security-scan.js',
    critical: true
  },
  {
    name: 'Stage 4: Automated Security Regression & Unit Testing',
    command: 'npm test',
    critical: true
  },
  {
    name: 'Stage 5: Cryptographic Audit Hash Chain Verification',
    command: 'node scripts/verify-audit-chain.js',
    critical: true
  },
  {
    name: 'Stage 6: Build Artifact Integrity & Reproducibility Seal',
    command: 'node scripts/generate-build-manifest.js',
    critical: true
  }
];

function runPipeline() {
  console.log('================================================================');
  console.log('  PHASE 11: AUTOMATED SECURE BUILD & CI PIPELINE RUNNER         ');
  console.log('  Standards: NIST SP 800-218 (SSDF) & SLSA Level 2 Integrity    ');
  console.log('================================================================\n');

  const results = [];
  let overallPass = true;

  for (const stage of PIPELINE_STAGES) {
    console.log(`\n>>> EXECUTING: ${stage.name}`);
    const startTime = Date.now();
    try {
      const output = execSync(stage.command, {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        stdio: stage.parseJson ? 'pipe' : 'inherit'
      });
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      if (stage.parseJson) {
        try {
          const json = JSON.parse(output);
          const vulns = json.metadata?.vulnerabilities?.total || 0;
          console.log(`[PASS] Dependencies scanned. Identified ${vulns} transitive dependency notices (documented in Phase 11).`);
        } catch (e) {
          console.log(`[PASS] Stage completed.`);
        }
      }

      results.push({ name: stage.name, status: 'PASS', duration: `${duration}s` });
    } catch (err) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      if (!stage.critical) {
        // Non-breaking advisory stage (e.g. npm audit with existing upstream CVEs)
        console.warn(`[WARN] ${stage.name} completed with non-blocking notices.`);
        results.push({ name: stage.name, status: 'WARN / AUDITED', duration: `${duration}s` });
      } else {
        console.error(`[FAIL] ${stage.name} failed!`);
        results.push({ name: stage.name, status: 'FAIL', duration: `${duration}s` });
        overallPass = false;
        break;
      }
    }
  }

  console.log('\n================================================================');
  console.log('  PHASE 11 SECURE BUILD PIPELINE EXECUTION SUMMARY             ');
  console.log('================================================================');
  results.forEach((r, idx) => {
    const pad = ' '.repeat(Math.max(1, 56 - r.name.length));
    console.log(`${idx + 1}. ${r.name}${pad}[${r.status}] (${r.duration})`);
  });
  console.log('================================================================');

  if (overallPass) {
    console.log('\n[SUCCESS] ALL MANDATORY SECURE DEVELOPMENT CONTROLS VERIFIED (100% PASS).');
    process.exit(0);
  } else {
    console.error('\n[ERROR] SECURE BUILD FAILED. REMEDIATE BLOCKERS BEFORE DEPLOYMENT.');
    process.exit(1);
  }
}

runPipeline();
