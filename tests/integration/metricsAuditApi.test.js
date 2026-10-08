const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../../src/server');
const { initDatabase } = require('../../src/config/database');

describe('Integration Tests: Tamper-Evident Audit & Prometheus Metrics (CTI-109, CTI-110)', () => {
  let adminToken;
  let contributorToken;

  before(async () => {
    process.env.NODE_ENV = 'test';
    await initDatabase();

    // 1. Authenticate Admin
    const adminLogin = await request(app).post('/api/auth/login').send({ username: 'admin_sec', password: 'Password123!' });
    const adminMfa = await request(app).post('/api/auth/verify-mfa').send({ tempToken: adminLogin.body.tempToken, totpCode: '123456' });
    adminToken = adminMfa.body.accessToken;

    // 2. Authenticate Contributor
    const contribLogin = await request(app).post('/api/auth/login').send({ username: 'contributor_alex', password: 'Password123!' });
    const contribMfa = await request(app).post('/api/auth/verify-mfa').send({ tempToken: contribLogin.body.tempToken, totpCode: '123456' });
    contributorToken = contribMfa.body.accessToken;
  });

  test('GET /api/audit rejects non-admin users with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${contributorToken}`);

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error, 'Forbidden');
  });

  test('GET /api/audit allows Platform Administrator and returns paginated records', async () => {
    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.auditLogs));
    assert.ok(res.body.count >= 1);
  });

  test('GET /api/audit/verify returns status VERIFIED on clean audit trail', async () => {
    const res = await request(app)
      .get('/api/audit/verify')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'VERIFIED');
    assert.strictEqual(res.body.details.valid, true);
  });

  test('GET /metrics returns standard Prometheus formatted metrics including all 5 required gauges/counters', async () => {
    const res = await request(app).get('/metrics');

    assert.strictEqual(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/plain'));

    const text = res.text;
    assert.ok(text.includes('cti_http_requests_total'), 'Metric 1: cti_http_requests_total must exist');
    assert.ok(text.includes('cti_failed_logins_total'), 'Metric 2: cti_failed_logins_total must exist');
    assert.ok(text.includes('cti_indicators_total'), 'Metric 3: cti_indicators_total must exist');
    assert.ok(text.includes('cti_audit_records_total'), 'Metric 4: cti_audit_records_total must exist');
    assert.ok(text.includes('cti_process_uptime_seconds'), 'Metric 5: cti_process_uptime_seconds must exist');
  });
});
