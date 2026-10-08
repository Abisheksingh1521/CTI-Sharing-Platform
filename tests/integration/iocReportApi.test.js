const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../../src/server');
const { initDatabase } = require('../../src/config/database');

describe('Integration Tests: IoC Ingestion & Threat Reports (CTI-103, CTI-104, CTI-105)', () => {
  let contributorToken;
  let consumerToken;
  let createdReportId;

  before(async () => {
    process.env.NODE_ENV = 'test';
    await initDatabase();

    // 1. Authenticate Contributor
    const contribLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'contributor_alex', password: 'Password123!' });
    const contribMfa = await request(app)
      .post('/api/auth/verify-mfa')
      .send({ tempToken: contribLogin.body.tempToken, totpCode: '123456' });
    contributorToken = contribMfa.body.accessToken;

    // 2. Authenticate Consumer
    const consumerLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'consumer_siem', password: 'Password123!' });
    const consumerMfa = await request(app)
      .post('/api/auth/verify-mfa')
      .send({ tempToken: consumerLogin.body.tempToken, totpCode: '123456' });
    consumerToken = consumerMfa.body.accessToken;
  });

  test('POST /api/iocs ingests valid IPv4 indicator and returns defanged value', async () => {
    const res = await request(app)
      .post('/api/iocs')
      .set('Authorization', `Bearer ${contributorToken}`)
      .send({
        type: 'IPV4',
        value: '203.0.113.195',
        description: 'Command and control IP observed in Lazarus campaign',
        tlp: 'AMBER',
        confidence: 85
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.indicator.defangedValue, '203[.]0[.]113[.]195');
    assert.strictEqual(res.body.indicator.status, 'PENDING');
    assert.strictEqual(res.body.indicator.tlp, 'AMBER');
  });

  test('POST /api/iocs rejects invalid IPv4 observable with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/iocs')
      .set('Authorization', `Bearer ${contributorToken}`)
      .send({
        type: 'IPV4',
        value: '999.999.999.999',
        description: 'Malformed IP address test'
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'Bad Request');
    assert.ok(res.body.message.includes('not a valid IPV4 observable'));
  });

  test('POST /api/iocs records duplicate sighting on identical indicator submission', async () => {
    // Re-submit the exact same IP
    const res = await request(app)
      .post('/api/iocs')
      .set('Authorization', `Bearer ${contributorToken}`)
      .send({
        type: 'IPV4',
        value: '203.0.113.195',
        description: 'Second sighting of Lazarus C2'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.isDuplicate, true);
    assert.ok(res.body.message.includes('already cataloged'));
  });

  test('POST /api/reports submits Markdown incident report with Stored XSS sanitization', async () => {
    const maliciousPayload = '### Threat Campaign\nAttackers deployed ransomware.\n<script>alert("XSS")</script>';

    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${contributorToken}`)
      .send({
        title: 'APT41 Ransomware Incursion',
        summary: 'Targeted attack against critical energy sector endpoints',
        contentMarkdown: maliciousPayload,
        tlp: 'AMBER'
      });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.report.id);
    createdReportId = res.body.report.id;

    // Verify in GET /api/reports/:id that <script> was stripped
    const verifyRes = await request(app)
      .get(`/api/reports/${createdReportId}`)
      .set('Authorization', `Bearer ${contributorToken}`);

    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.body.report.content_markdown.includes('<script>'), false, 'Script tag MUST be stripped');
    assert.ok(verifyRes.body.report.content_markdown.includes('Attackers deployed ransomware'));
  });

  test('POST /api/iocs links indicator to an existing threat report ID', async () => {
    const res = await request(app)
      .post('/api/iocs')
      .set('Authorization', `Bearer ${contributorToken}`)
      .send({
        type: 'SHA256',
        value: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
        description: 'Ransomware binary hash linked to report',
        tlp: 'AMBER',
        reportId: createdReportId
      });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.indicator.id);

    // Verify report now contains the linked indicator
    const reportRes = await request(app)
      .get(`/api/reports/${createdReportId}`)
      .set('Authorization', `Bearer ${contributorToken}`);

    assert.strictEqual(reportRes.status, 200);
    assert.ok(reportRes.body.report.linkedIndicators.length >= 1);
  });

  test('POST /api/iocs rejects submission from ROLE_CONSUMER with 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/iocs')
      .set('Authorization', `Bearer ${consumerToken}`)
      .send({
        type: 'DOMAIN',
        value: 'unauthorized-submission.org'
      });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error, 'Forbidden');
  });

  test('POST /api/iocs rejects unauthenticated request with 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/iocs')
      .send({ type: 'IPV4', value: '1.1.1.1' });

    assert.strictEqual(res.status, 401);
  });
});
