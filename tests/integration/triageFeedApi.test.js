const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../../src/server');
const { initDatabase, dbGet } = require('../../src/config/database');

describe('Integration Tests: Analyst Triage & STIX 2.1 Feed Distribution (CTI-106, CTI-107, CTI-108)', () => {
  let analystToken;
  let contributorToken;
  let consumerToken;

  let testIndicatorGreenId;
  let testIndicatorRedId;

  before(async () => {
    process.env.NODE_ENV = 'test';
    await initDatabase();

    // 1. Authenticate Analyst
    const aLogin = await request(app).post('/api/auth/login').send({ username: 'analyst_riya', password: 'Password123!' });
    const aMfa = await request(app).post('/api/auth/verify-mfa').send({ tempToken: aLogin.body.tempToken, totpCode: '123456' });
    analystToken = aMfa.body.accessToken;

    // 2. Authenticate Contributor
    const cLogin = await request(app).post('/api/auth/login').send({ username: 'contributor_alex', password: 'Password123!' });
    const cMfa = await request(app).post('/api/auth/verify-mfa').send({ tempToken: cLogin.body.tempToken, totpCode: '123456' });
    contributorToken = cMfa.body.accessToken;

    // 3. Authenticate Consumer
    const coLogin = await request(app).post('/api/auth/login').send({ username: 'consumer_siem', password: 'Password123!' });
    const coMfa = await request(app).post('/api/auth/verify-mfa').send({ tempToken: coLogin.body.tempToken, totpCode: '123456' });
    consumerToken = coMfa.body.accessToken;

    // 4. Ingest Two Indicators as Contributor (resetting to PENDING if already cataloged)
    const ind1 = await request(app)
      .post('/api/iocs')
      .set('Authorization', `Bearer ${contributorToken}`)
      .send({
        type: 'DOMAIN',
        value: 'apt28-c2-beacon.ru',
        description: 'CozyBear domain observable',
        tlp: 'GREEN'
      });
    testIndicatorGreenId = ind1.body.indicator ? ind1.body.indicator.id : ind1.body.indicatorId;

    const ind2 = await request(app)
      .post('/api/iocs')
      .set('Authorization', `Bearer ${contributorToken}`)
      .send({
        type: 'IPV4',
        value: '198.51.100.77',
        description: 'Highly sensitive critical infrastructure zero-day C2',
        tlp: 'RED'
      });
    testIndicatorRedId = ind2.body.indicator ? ind2.body.indicator.id : ind2.body.indicatorId;

    // Reset both to PENDING state before test suite runs
    const { dbRun } = require('../../src/config/database');
    await dbRun("UPDATE threat_indicators SET status = 'PENDING' WHERE id IN (?, ?);", [testIndicatorGreenId, testIndicatorRedId]);
  });

  test('GET /api/triage/pending rejects Contributor and Consumer with 403 Forbidden (RBAC)', async () => {
    const resContrib = await request(app)
      .get('/api/triage/pending')
      .set('Authorization', `Bearer ${contributorToken}`);
    assert.strictEqual(resContrib.status, 403);

    const resConsumer = await request(app)
      .get('/api/triage/pending')
      .set('Authorization', `Bearer ${consumerToken}`);
    assert.strictEqual(resConsumer.status, 403);
  });

  test('GET /api/triage/pending allows Analyst and returns pending queue', async () => {
    const res = await request(app)
      .get('/api/triage/pending')
      .set('Authorization', `Bearer ${analystToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.pendingIndicators));
    const ids = res.body.pendingIndicators.map(i => i.id);
    assert.ok(ids.includes(testIndicatorGreenId), 'Pending list must include submitted domain');
  });

  test('PUT /api/iocs/:id/triage rejects non-analysts with 403 Forbidden', async () => {
    const res = await request(app)
      .put(`/api/iocs/${testIndicatorGreenId}/triage`)
      .set('Authorization', `Bearer ${contributorToken}`)
      .send({
        decision: 'APPROVED',
        assignedTlp: 'GREEN',
        justification: 'Self-approval attempt'
      });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error, 'Forbidden');
  });

  test('PUT /api/iocs/:id/triage rejects missing justification with 400 Bad Request', async () => {
    const res = await request(app)
      .put(`/api/iocs/${testIndicatorGreenId}/triage`)
      .set('Authorization', `Bearer ${analystToken}`)
      .send({
        decision: 'APPROVED',
        assignedTlp: 'GREEN',
        justification: '' // Missing
      });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.message.includes('justification'));
  });

  test('PUT /api/iocs/:id/triage approves GREEN indicator and writes review log', async () => {
    const res = await request(app)
      .put(`/api/iocs/${testIndicatorGreenId}/triage`)
      .set('Authorization', `Bearer ${analystToken}`)
      .send({
        decision: 'APPROVED',
        assignedTlp: 'GREEN',
        confidenceScore: 90,
        mitreAttackId: 'T1071.001',
        justification: 'Confirmed DNS beaconing against internal sinkhole'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.triageResult.decision, 'APPROVED');
    assert.strictEqual(res.body.triageResult.assignedTlp, 'GREEN');

    // Verify record in review_logs table
    const reviewLog = await dbGet('SELECT * FROM review_logs WHERE indicator_id = ?;', [testIndicatorGreenId]);
    assert.ok(reviewLog);
    assert.strictEqual(reviewLog.decision, 'APPROVED');
    assert.strictEqual(reviewLog.justification, 'Confirmed DNS beaconing against internal sinkhole');
  });

  test('PUT /api/iocs/:id/triage approves RED indicator', async () => {
    const res = await request(app)
      .put(`/api/iocs/${testIndicatorRedId}/triage`)
      .set('Authorization', `Bearer ${analystToken}`)
      .send({
        decision: 'APPROVED',
        assignedTlp: 'RED',
        confidenceScore: 98,
        mitreAttackId: 'T1190',
        justification: 'Classified zero-day targeting SCADA perimeter'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.triageResult.assignedTlp, 'RED');
  });

  test('GET /api/feeds/stix enforces server-side TLP separation: Consumer receives GREEN, NEVER RED', async () => {
    const res = await request(app)
      .get('/api/feeds/stix')
      .set('Authorization', `Bearer ${consumerToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.type, 'bundle');
    assert.strictEqual(res.body.spec_version, '2.1');
    assert.ok(Array.isArray(res.body.objects));

    const indicatorNames = res.body.objects.map(obj => obj.name);

    // Green indicator must be present
    assert.ok(
      indicatorNames.some(name => name.includes('apt28-c2-beacon[.]ru')),
      'Consumer MUST receive approved TLP:GREEN indicator'
    );

    // Red indicator MUST be absent (Strict TLP Information Barrier)
    assert.ok(
      !indicatorNames.some(name => name.includes('198[.]51[.]100[.]77')),
      'Consumer MUST NEVER receive classified TLP:RED indicator'
    );
  });

  test('GET /api/feeds/stix allows Analyst to receive classified TLP:RED indicators', async () => {
    const res = await request(app)
      .get('/api/feeds/stix')
      .set('Authorization', `Bearer ${analystToken}`);

    assert.strictEqual(res.status, 200);
    const indicatorNames = res.body.objects.map(obj => obj.name);

    // Analyst receives both GREEN and RED
    assert.ok(indicatorNames.some(name => name.includes('apt28-c2-beacon[.]ru')));
    assert.ok(indicatorNames.some(name => name.includes('198[.]51[.]100[.]77')), 'Analyst clearance permits TLP:RED');
  });
});
