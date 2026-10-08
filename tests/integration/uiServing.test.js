const { test, describe, before } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../../src/server');
const { initDatabase } = require('../../src/config/database');

describe('Integration Tests: Frontend UI Serving & Screen Assets (Phase 6 / M10)', () => {
  before(async () => {
    await initDatabase();
  });

  test('GET / serves index.html with all 4 required CTI screens', async () => {
    const res = await request(app).get('/');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.headers['content-type'].includes('text/html'));
    
    // Verify all 4 required screens are defined in the HTML structure
    assert.ok(res.text.includes('Screen 1: Identity, Authentication & TOTP MFA'), 'Screen 1 missing');
    assert.ok(res.text.includes('Screen 2: Threat Intelligence & IoC Ingestion'), 'Screen 2 missing');
    assert.ok(res.text.includes('Screen 3: Analyst Triage & TLP Classification Station'), 'Screen 3 missing');
    assert.ok(res.text.includes('Screen 4: STIX 2.1 Threat Feed & Security Metrics'), 'Screen 4 missing');

    // Verify presence of security controls and key UI elements
    assert.ok(res.text.includes('RFC 6238 TOTP'), 'TOTP reference missing');
    assert.ok(res.text.includes('LIVE CANONICAL DEFANGING PREVIEW'), 'Defanging preview element missing');
    assert.ok(res.text.includes('canAccessTLP'), 'canAccessTLP reference missing');
    assert.ok(res.text.includes('triage-modal'), 'Triage modal missing');
    assert.ok(res.text.includes('cti_failed_logins_total'), 'Prometheus failed login metric missing');
  });

  test('GET /styles.css serves the glassmorphic cybersecurity stylesheet', async () => {
    const res = await request(app).get('/styles.css');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.headers['content-type'].includes('text/css'));
    assert.ok(res.text.includes('--accent-cyan'));
    assert.ok(res.text.includes('--bg-surface'));
    assert.ok(res.text.includes('backdrop-filter'));
  });

  test('GET /app.js serves the client-side CTI application controller', async () => {
    const res = await request(app).get('/app.js');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.headers['content-type'].includes('javascript'));
    assert.ok(res.text.includes('class CTIApp'));
    assert.ok(res.text.includes('generateTOTP'));
    assert.ok(res.text.includes('updateDefangPreview'));
    assert.ok(res.text.includes('fetchStixFeed'));
    assert.ok(res.text.includes('verifyAuditChain'));
  });
});
