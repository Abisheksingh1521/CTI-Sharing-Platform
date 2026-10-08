const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { canAccessTLP } = require('../../src/middleware/tlpGuard');

describe('Unit Tests: Explicit canAccessTLP Authorization Policy (CTI-107)', () => {
  const originatingOrgId = 'org-cyber-defense';
  const partnerOrgId = 'org-cert-in';

  const userConsumer = { id: 'usr-consumer', role: 'ROLE_CONSUMER', orgId: originatingOrgId, trust_level: 'VERIFIED' };
  const userExternalConsumer = { id: 'usr-ext-consumer', role: 'ROLE_CONSUMER', orgId: partnerOrgId, trust_level: 'VERIFIED' };
  const userContributor = { id: 'usr-contrib', role: 'ROLE_CONTRIBUTOR', orgId: originatingOrgId, trust_level: 'VERIFIED' };
  const userAnalyst = { id: 'usr-analyst', role: 'ROLE_ANALYST', orgId: partnerOrgId, trust_level: 'VERIFIED' };
  const userAdmin = { id: 'usr-admin', role: 'ROLE_ADMIN', orgId: partnerOrgId, trust_level: 'VERIFIED' };
  const userProbationary = { id: 'usr-probation', role: 'ROLE_CONSUMER', orgId: 'org-unverified', trust_level: 'PROBATIONARY' };

  test('Case 1: Permitted CLEAR access - open to all authenticated roles', () => {
    const clearIndicator = { id: 'ioc-1', tlp_level: 'CLEAR', org_id: originatingOrgId };

    assert.strictEqual(canAccessTLP(userConsumer, clearIndicator), true);
    assert.strictEqual(canAccessTLP(userExternalConsumer, clearIndicator), true);
    assert.strictEqual(canAccessTLP(userContributor, clearIndicator), true);
    assert.strictEqual(canAccessTLP(userAnalyst, clearIndicator), true);
    assert.strictEqual(canAccessTLP(userAdmin, clearIndicator), true);
  });

  test('Case 2: Permitted GREEN access - open to verified community organizations', () => {
    const greenIndicator = { id: 'ioc-2', tlp_level: 'GREEN', org_id: originatingOrgId };

    assert.strictEqual(canAccessTLP(userConsumer, greenIndicator), true);
    assert.strictEqual(canAccessTLP(userExternalConsumer, greenIndicator), true);
    assert.strictEqual(canAccessTLP(userAnalyst, greenIndicator), true);

    // Denied for unverified probationary organizations
    assert.strictEqual(canAccessTLP(userProbationary, greenIndicator), false, 'Probationary org must be denied GREEN access');
  });

  test('Case 3: Permitted AMBER access - allowed for originating org, analysts, and admins', () => {
    const amberIndicator = { id: 'ioc-3', tlp_level: 'AMBER', org_id: originatingOrgId };

    // Member of submitting org has access
    assert.strictEqual(canAccessTLP(userContributor, amberIndicator), true);
    // Vetted analyst has access
    assert.strictEqual(canAccessTLP(userAnalyst, amberIndicator), true);
    // Platform admin has access
    assert.strictEqual(canAccessTLP(userAdmin, amberIndicator), true);
  });

  test('Case 4: Denied AMBER access for unauthorized consumer from external organization', () => {
    const amberIndicator = { id: 'ioc-3', tlp_level: 'AMBER', org_id: originatingOrgId };

    // External consumer is strictly denied AMBER intelligence
    assert.strictEqual(canAccessTLP(userExternalConsumer, amberIndicator), false);
  });

  test('Case 5: Permitted RED access - strictly allowed for submitting org and authorized analysts/admins', () => {
    const redIndicator = { id: 'ioc-4', tlp_level: 'RED', org_id: originatingOrgId };

    // Submitting org member permitted
    assert.strictEqual(canAccessTLP(userContributor, redIndicator), true);
    // Authorized analyst permitted
    assert.strictEqual(canAccessTLP(userAnalyst, redIndicator), true);
    // Administrator permitted
    assert.strictEqual(canAccessTLP(userAdmin, redIndicator), true);
  });

  test('Case 6: Denied RED access for unauthorized consumer and external contributors', () => {
    const redIndicator = { id: 'ioc-4', tlp_level: 'RED', org_id: originatingOrgId };

    // General consumers can NEVER access TLP:RED
    assert.strictEqual(canAccessTLP(userConsumer, redIndicator), false, 'Consumer in same org denied RED access');
    assert.strictEqual(canAccessTLP(userExternalConsumer, redIndicator), false, 'External consumer strictly denied RED access');
  });
});
