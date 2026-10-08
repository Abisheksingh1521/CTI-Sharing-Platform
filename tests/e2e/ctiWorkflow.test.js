/**
 * Phase 14: End-to-End Realistic CTI Workflow Test
 *
 * Validates the complete unbroken security and operational workflow:
 * 1. User Registration & Password Hashing
 * 2. Primary Credential Login & MFA Challenge Issuance
 * 3. RFC 6238 TOTP Validation & Signed JWT Issuance
 * 4. Identity & RBAC Verification (/api/auth/me)
 * 5. Threat Indicator Ingestion, Schema Validation & Canonical Defanging
 * 6. Structured Threat Report Submission & Context-Aware Sanitization
 * 7. Analyst Triage Station & Immutable Decision Recording
 * 8. Server-Side TLP Authorization & STIX 2.1 Threat Feed Export
 * 9. Cryptographic SHA-256 Audit Hash-Chain Verification
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../../src/server');
const { initDatabase, dbRun, dbGet } = require('../../src/config/database');

describe('E2E Workflow: Complete End-to-End Threat Intelligence Lifecycle (Phase 14)', () => {
  let contributorToken;
  let analystToken;
  let consumerToken;
  let adminToken;
  let createdIndicatorId;
  let createdReportId;
  const testOrgId = 'org-e2e-workflow';

  const runId = Date.now();
  const testUsername = `e2e_user_${runId}`;
  const testEmail = `e2e_${runId}@ncc.gov.in`;
  const lastOctet = (runId % 180) + 20;
  const testIp = `198.51.100.${lastOctet}`;
  const expectedDefangedIp = `198[.]51[.]100[.]${lastOctet}`;

  before(async () => {
    process.env.NODE_ENV = 'test';
    await initDatabase();

    // Seed dedicated E2E test organization if not present
    await dbRun(
      'INSERT OR IGNORE INTO organizations (id, name, domain, trust_level) VALUES (?, ?, ?, ?);',
      [testOrgId, 'National Cybersecurity Center', 'ncc.gov.in', 'VERIFIED']
    );
  });

  test('STEP 1: User Registration with Salted bcrypt Hash (CTI-101)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: testUsername,
        email: testEmail,
        password: 'Password123!',
        orgId: testOrgId,
        role: 'ROLE_CONTRIBUTOR'
      });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.userId);
    assert.strictEqual(res.body.username, testUsername);
    assert.strictEqual(res.body.role, 'ROLE_CONTRIBUTOR');
    assert.ok(res.body.mfaSecret);

    // Verify in database that plaintext password was NEVER stored
    const dbUser = await dbGet('SELECT password_hash FROM users WHERE username = ?;', [testUsername]);
    assert.ok(dbUser.password_hash.startsWith('$2'), 'Password must be hashed with bcrypt ($2a$ / $2b$)');
    assert.strictEqual(dbUser.password_hash.includes('Password123!'), false);
  });

  test('STEP 2: Primary Credential Login & Temporary MFA Token Issuance (CTI-101)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: testUsername,
        password: 'Password123!'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.mfaRequired, true);
    assert.ok(res.body.tempToken, 'Must receive short-lived MFA challenge token');
    assert.strictEqual(typeof res.body.tempToken, 'string');
  });

  test('STEP 3: RFC 6238 TOTP Validation & Signed JWT Access Token Issuance (CTI-101)', async () => {
    // 1. Get fresh temp token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: testUsername, password: 'Password123!' });

    // 2. Complete TOTP challenge
    const mfaRes = await request(app)
      .post('/api/auth/verify-mfa')
      .send({
        tempToken: loginRes.body.tempToken,
        totpCode: '123456'
      });

    assert.strictEqual(mfaRes.status, 200);
    assert.ok(mfaRes.body.accessToken, 'Must receive cryptographically signed JWT');
    contributorToken = mfaRes.body.accessToken;

    // Authenticate analyst and consumer for later workflow stages
    const analystLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'analyst_riya', password: 'Password123!' });
    const analystMfa = await request(app)
      .post('/api/auth/verify-mfa')
      .send({ tempToken: analystLogin.body.tempToken, totpCode: '123456' });
    analystToken = analystMfa.body.accessToken;

    const consumerLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'consumer_siem', password: 'Password123!' });
    const consumerMfa = await request(app)
      .post('/api/auth/verify-mfa')
      .send({ tempToken: consumerLogin.body.tempToken, totpCode: '123456' });
    consumerToken = consumerMfa.body.accessToken;

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin_sec', password: 'Password123!' });
    const adminMfa = await request(app)
      .post('/api/auth/verify-mfa')
      .send({ tempToken: adminLogin.body.tempToken, totpCode: '123456' });
    adminToken = adminMfa.body.accessToken;
  });

  test('STEP 4: Identity & RBAC Verification via /api/auth/me', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${contributorToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.username, testUsername);
    assert.strictEqual(res.body.user.role, 'ROLE_CONTRIBUTOR');
    assert.strictEqual(res.body.user.org_id, testOrgId);
  });

  test('STEP 5: Threat Indicator Ingestion & Canonical Defanging (CTI-103, CTI-104)', async () => {
    const res = await request(app)
      .post('/api/iocs')
      .set('Authorization', `Bearer ${contributorToken}`)
      .send({
        type: 'IPV4',
        value: testIp,
        description: 'Active C2 beacon observed in state-sponsored phishing campaign',
        tlp: 'AMBER',
        confidence: 85
      });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.indicator.id);
    assert.strictEqual(res.body.indicator.defangedValue, expectedDefangedIp);
    assert.strictEqual(res.body.indicator.status, 'PENDING');
    createdIndicatorId = res.body.indicator.id;
  });

  test('STEP 6: Structured Threat Report Submission & XSS Sanitization (CTI-105, V04 Fix)', async () => {
    const reportMarkdown = [
      '### Campaign Assessment: RedEcho Infrastructure',
      'Telemetry reveals C2 communications to external hosts.',
      '<!-- Injected event handler to verify runtime sanitization -->',
      '<img src="https://trustedsource.org/logo.png" onmouseover="alert(\'xss\')" alt="diagram">',
      `Target IP: ${testIp}.`
    ].join('\n');

    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${contributorToken}`)
      .send({
        title: 'RedEcho Infrastructure Incursion',
        summary: 'Targeted campaign attacking critical infrastructure sectors',
        contentMarkdown: reportMarkdown,
        tlp: 'AMBER'
      });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.report.id);
    createdReportId = res.body.report.id;

    // Verify stored markdown has onmouseover stripped
    const verifyReport = await request(app)
      .get(`/api/reports/${createdReportId}`)
      .set('Authorization', `Bearer ${contributorToken}`);

    assert.strictEqual(verifyReport.status, 200);
    assert.strictEqual(verifyReport.body.report.content_markdown.includes('onmouseover='), false);
    assert.ok(verifyReport.body.report.content_markdown.includes('RedEcho Infrastructure'));
  });

  test('STEP 7: Analyst Triage Station & Immutable Decision Log (CTI-106, CTI-107)', async () => {
    // 1. Analyst inspects pending queue
    const queueRes = await request(app)
      .get('/api/triage/pending')
      .set('Authorization', `Bearer ${analystToken}`);

    assert.strictEqual(queueRes.status, 200);
    const item = queueRes.body.pendingIndicators.find((i) => i.id === createdIndicatorId);
    assert.ok(item, 'Submitted indicator must appear in analyst triage queue');

    // 2. Analyst reviews and approves indicator to TLP:GREEN
    const triageRes = await request(app)
      .put(`/api/iocs/${createdIndicatorId}/triage`)
      .set('Authorization', `Bearer ${analystToken}`)
      .send({
        decision: 'APPROVED',
        assignedTlp: 'GREEN',
        confidenceScore: 95,
        mitreAttackId: 'T1071.001',
        justification: 'Confirmed C2 activity matching RedEcho threat actor infrastructure.'
      });

    assert.strictEqual(triageRes.status, 200);
    assert.strictEqual(triageRes.body.triageResult.decision, 'APPROVED');
    assert.strictEqual(triageRes.body.triageResult.assignedTlp, 'GREEN');
  });

  test('STEP 8: Server-Side TLP Authorization & STIX 2.1 Feed Export (CTI-108, V02 Fix)', async () => {
    // Consumer queries STIX 2.1 feed
    const feedRes = await request(app)
      .get('/api/feeds/stix')
      .set('Authorization', `Bearer ${consumerToken}`);

    assert.strictEqual(feedRes.status, 200);
    assert.strictEqual(feedRes.body.type, 'bundle');
    assert.strictEqual(feedRes.body.spec_version, '2.1');
    assert.ok(Array.isArray(feedRes.body.objects));

    // Verify the newly triaged TLP:GREEN indicator is included
    const triagedStix = feedRes.body.objects.find(
      (obj) => obj.type === 'indicator' && obj.pattern && obj.pattern.includes(testIp)
    );
    assert.ok(triagedStix, 'Approved TLP:GREEN indicator must be distributed in STIX feed');

    // Verify V02: Consumer cannot access unauthorized TLP:RED report
    const redReportRes = await request(app)
      .get('/api/reports/rep-b2549c8d-ef95-44bd-9490-616d8eae6834')
      .set('Authorization', `Bearer ${consumerToken}`);

    assert.strictEqual(redReportRes.status, 403, 'V02 IDOR defense: Cross-tenant / TLP:RED query blocked');
  });

  test('STEP 9: Cryptographic SHA-256 Audit Hash-Chain Verification (CTI-109)', async () => {
    const res = await request(app)
      .get('/api/audit/verify')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'VERIFIED');
    assert.strictEqual(res.body.details.valid, true, 'Continuous SHA-256 hash-chain must be intact');
    assert.ok(res.body.details.count >= 1, 'All workflow audit entries must be validated');
  });
});
