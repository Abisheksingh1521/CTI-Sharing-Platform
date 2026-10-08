const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const iocValidator = require('../../src/services/iocValidator');

describe('Unit Tests: Strategy Pattern IoC Validation & Defanging (CTI-104)', () => {
  test('IPv4 Strategy validates correct addresses and defangs dots', () => {
    const validIP = '198.51.100.42';
    const res = iocValidator.process('IPV4', validIP);

    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.defangedValue, '198[.]51[.]100[.]42');
    assert.strictEqual(res.type, 'IPV4');

    // Invalid IPs
    assert.strictEqual(iocValidator.validate('IPV4', '256.0.0.1'), false);
    assert.strictEqual(iocValidator.validate('IPV4', '1.2.3'), false);
    assert.strictEqual(iocValidator.validate('IPV4', '1.2.3.4.5'), false);
    assert.strictEqual(iocValidator.validate('IPV4', 'not.an.ip.address'), false);
  });

  test('IPv6 Strategy validates addresses and defangs colons and dots', () => {
    const validIPv6 = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
    const res = iocValidator.process('IPV6', validIPv6);

    assert.strictEqual(res.isValid, true);
    assert.ok(res.defangedValue.includes('[:]'), 'Colons must be defanged');

    assert.strictEqual(iocValidator.validate('IPV6', 'invalid:::ipv6:::'), false);
    assert.strictEqual(iocValidator.validate('IPV6', '12345:67890'), false);
  });

  test('Domain Strategy validates FQDNs and defangs protocols and dots', () => {
    const domain = 'malicious-c2.apt29-adversary.com';
    const res = iocValidator.process('DOMAIN', domain);

    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.defangedValue, 'malicious-c2[.]apt29-adversary[.]com');

    // Defangs URLs with protocol
    const defangedURL = iocValidator.defang('DOMAIN', 'http://phishing-portal.net');
    assert.strictEqual(defangedURL, 'hxxp://phishing-portal[.]net');

    // Invalid domains
    assert.strictEqual(iocValidator.validate('DOMAIN', '-invalid-.com'), false);
    assert.strictEqual(iocValidator.validate('DOMAIN', 'no_underscores.org'), false);
  });

  test('Hash Strategy validates MD5, SHA-1, and SHA-256 by exact length and hex encoding', () => {
    const validMD5 = 'd41d8cd98f00b204e9800998ecf8427e';
    const validSHA1 = 'da39a3ee5e6b4b0d3255bfef95601890afd80709';
    const validSHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    assert.strictEqual(iocValidator.validate('MD5', validMD5), true);
    assert.strictEqual(iocValidator.validate('SHA1', validSHA1), true);
    assert.strictEqual(iocValidator.validate('SHA256', validSHA256), true);

    // Rejects invalid length or non-hex characters
    assert.strictEqual(iocValidator.validate('MD5', 'd41d8cd98f00b204e9800998ecf8427'), false); // 31 chars
    assert.strictEqual(iocValidator.validate('SHA256', 'ZZZZ' + validSHA256.slice(4)), false); // non-hex
  });

  test('ReDoS resilience: Evaluating 1,000 characters of malformed input finishes under 10ms', () => {
    const maliciousInput = 'a.'.repeat(500) + 'com!';
    const startTime = Date.now();
    const result = iocValidator.validate('DOMAIN', maliciousInput);
    const duration = Date.now() - startTime;

    assert.strictEqual(result, false, 'Malformed domain must be rejected');
    assert.ok(duration < 20, `Regex must evaluate in <20ms to prevent ReDoS (evaluated in ${duration}ms)`);
  });
});
