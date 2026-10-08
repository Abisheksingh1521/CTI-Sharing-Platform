/**
 * Build Artifact Integrity & Reproducibility Manifest Generator (Phase 11: Control #5)
 *
 * Generates an immutable SHA-256 cryptographic digest manifest of all source,
 * configuration, and dependency files to guarantee build reproducibility and
 * tamper detection.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(REPO_ROOT, 'build-manifest.json');

const TARGET_PATHS = ['src', 'scripts', 'k8s', 'package.json', 'package-lock.json', '.env.example'];

function hashFile(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

function collectFiles(targetPath, fileList = []) {
  const full = path.join(REPO_ROOT, targetPath);
  if (!fs.existsSync(full)) return fileList;

  if (fs.statSync(full).isFile()) {
    fileList.push(full);
    return fileList;
  }

  const items = fs.readdirSync(full);
  for (const item of items) {
    const itemPath = path.join(full, item);
    if (fs.statSync(itemPath).isDirectory()) {
      if (item !== 'node_modules' && item !== '.git') {
        collectFiles(path.relative(REPO_ROOT, itemPath), fileList);
      }
    } else {
      fileList.push(itemPath);
    }
  }
  return fileList;
}

function generateManifest() {
  console.log('================================================================');
  console.log('  PHASE 11: REPRODUCIBLE BUILD & ARTIFACT INTEGRITY MANIFEST   ');
  console.log('  Algorithm: SHA-256 Cryptographic File Hashes                  ');
  console.log('================================================================\n');

  let gitCommit = 'UNKNOWN';
  try {
    gitCommit = execSync('git rev-parse HEAD', { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  } catch (e) {
    gitCommit = 'DETACHED_LOCAL';
  }

  let allFiles = [];
  TARGET_PATHS.forEach((p) => {
    collectFiles(p, allFiles);
  });

  const manifest = {
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    gitCommit,
    totalFiles: allFiles.length,
    overallRootHash: null,
    artifacts: {}
  };

  const combinedHashes = [];

  allFiles.sort().forEach((filePath) => {
    const rel = path.relative(REPO_ROOT, filePath).replace(/\\/g, '/');
    const hash = hashFile(filePath);
    manifest.artifacts[rel] = {
      sha256: hash,
      sizeBytes: fs.statSync(filePath).size
    };
    combinedHashes.push(`${hash}  ${rel}`);
  });

  // Calculate composite root digest across all artifacts
  const rootDigest = crypto.createHash('sha256').update(combinedHashes.join('\n')).digest('hex');
  manifest.overallRootHash = rootDigest;

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`[PASS] Build manifest generated at: ${OUTPUT_FILE}`);
  console.log(`- Total Artifacts Sealed: ${allFiles.length}`);
  console.log(`- Git Commit Anchor:      ${gitCommit}`);
  console.log(`- Composite Root Digest:  ${rootDigest}\n`);

  return manifest;
}

generateManifest();
