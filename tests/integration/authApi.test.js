const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../../src/server');
const { initDatabase } = require('../../src/config/database');

describe('Integration Tests: Authentication & RBAC Access Control (CTI-101, CTI-102)', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    await initDatabase();
  });

  let contributorTempToken;
  let contributorAccessToken;
  let analystTempToken;
  let analystAccessToken;

  test('POST /api/auth/login rejects invalid password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'contributor_alex', password: 'WrongPassword999!' });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'Unauthorized');
  });

  test('POST /api/auth/login accepts valid credentials and returns tempToken for MFA', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'contributor_alex', password: 'Password123!' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.mfaRequired, true);
    assert.ok(res.body.tempToken, 'Must issue a temporary token');
    assert.ok(res.body.demoTotpCode, 'Must provide current valid TOTP code');

    contributorTempToken = res.body.tempToken;
  });

  test('POST /api/auth/verify-mfa rejects invalid TOTP code with 401', async () => {
    const res = await request(app)
      .post('/api/auth/verify-mfa')
      .send({ tempToken: contributorTempToken, totpCode: '999999' });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'Unauthorized');
  });

  test('POST /api/auth/verify-mfa accepts valid TOTP and returns JWT accessToken', async () => {
    // In test environment, '123456' is accepted as demo code
    const res = await request(app)
      .post('/api/auth/verify-mfa')
      .send({ tempToken: contributorTempToken, totpCode: '123456' });

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.accessToken, 'Must return full access token');
    assert.strictEqual(res.body.user.role, 'ROLE_CONTRIBUTOR');

    contributorAccessToken = res.body.accessToken;
  });

  test('GET /api/auth/me returns current user identity with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${contributorAccessToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.username, 'contributor_alex');
    assert.strictEqual(res.body.user.org_id, 'org-cyber-defense');
  });

  test('GET /api/test/analyst-only rejects Contributor with 403 Forbidden (RBAC)', async () => {
    const res = await request(app)
      .get('/api/test/analyst-only')
      .set('Authorization', `Bearer ${contributorAccessToken}`);

    assert.strictEqual(res.status, 403, 'Contributor MUST NOT be permitted on analyst route');
    assert.strictEqual(res.body.error, 'Forbidden');
    assert.ok(res.body.message.includes('Access denied'));
  });

  test('Analyst login and MFA verification succeeds and accesses analyst route', async () => {
    // 1. Analyst login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'analyst_riya', password: 'Password123!' });

    assert.strictEqual(loginRes.status, 200);
    analystTempToken = loginRes.body.tempToken;

    // 2. Analyst MFA
    const mfaRes = await request(app)
      .post('/api/auth/verify-mfa')
      .send({ tempToken: analystTempToken, totpCode: '123456' });

    assert.strictEqual(mfaRes.status, 200);
    analystAccessToken = mfaRes.body.accessToken;
    assert.strictEqual(mfaRes.body.user.role, 'ROLE_ANALYST');

    // 3. Analyst access route
    const accessRes = await request(app)
      .get('/api/test/analyst-only')
      .set('Authorization', `Bearer ${analystAccessToken}`);

    assert.strictEqual(accessRes.status, 200);
    assert.strictEqual(accessRes.body.message, 'Authorized analyst access granted');
  });

  test('Protected routes reject requests with missing or forged tokens', async () => {
    const missingRes = await request(app).get('/api/auth/me');
    assert.strictEqual(missingRes.status, 401);

    const forgedRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer forged.token.signature');
    assert.strictEqual(forgedRes.status, 401);
  });
});
