/**
 * IoC Validation & Defanging Engine
 * Implements the Strategy Pattern (Phase 5, CTI-104)
 * Provides strict RFC-compliant schema validation and automated canonical defanging
 * to prevent accidental execution or clickable malicious hyperlinks.
 */

// Base Strategy Interface
class IoCStrategy {
  validate(value) {
    throw new Error('Strategy.validate must be implemented');
  }

  defang(value) {
    throw new Error('Strategy.defang must be implemented');
  }
}

// 1. IPv4 Validation & Defanging Strategy
class IPv4Strategy extends IoCStrategy {
  constructor() {
    super();
    // Strict IPv4 regex: 4 octets each between 0 and 255 with no catastrophic backtracking
    this.regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])$/;
  }

  validate(value) {
    if (!value || typeof value !== 'string') return false;
    const clean = value.trim();
    if (clean.length > 15) return false;
    return this.regex.test(clean);
  }

  defang(value) {
    return value.trim().replace(/\./g, '[.]');
  }
}

// 2. IPv6 Validation & Defanging Strategy
class IPv6Strategy extends IoCStrategy {
  constructor() {
    super();
    // Safe standard IPv6 regex
    this.regex = /^(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}$|^::(?:[a-fA-F0-9]{1,4}:){0,6}[a-fA-F0-9]{1,4}$|^(?:[a-fA-F0-9]{1,4}:){1,7}:$/;
  }

  validate(value) {
    if (!value || typeof value !== 'string') return false;
    const clean = value.trim();
    if (clean.length > 39) return false;
    return this.regex.test(clean);
  }

  defang(value) {
    return value.trim().replace(/:/g, '[:]').replace(/\./g, '[.]');
  }
}

// 3. Fully Qualified Domain Name (FQDN) Strategy
class DomainStrategy extends IoCStrategy {
  constructor() {
    super();
    // Safe anchored domain regex preventing ReDoS
    this.regex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;
  }

  validate(value) {
    if (!value || typeof value !== 'string') return false;
    const clean = value.trim().toLowerCase();
    if (clean.length > 253 || clean.length < 3) return false;
    return this.regex.test(clean);
  }

  defang(value) {
    return value
      .trim()
      .toLowerCase()
      .replace(/http:\/\//gi, 'hxxp://')
      .replace(/https:\/\//gi, 'hxxps://')
      .replace(/\./g, '[.]');
  }
}

// 4. Cryptographic Hash Strategy (MD5, SHA1, SHA256)
class HashStrategy extends IoCStrategy {
  constructor(expectedLength, hashName) {
    super();
    this.expectedLength = expectedLength;
    this.hashName = hashName;
    this.regex = new RegExp(`^[a-fA-F0-9]{${expectedLength}}$`);
  }

  validate(value) {
    if (!value || typeof value !== 'string') return false;
    const clean = value.trim();
    if (clean.length !== this.expectedLength) return false;
    return this.regex.test(clean);
  }

  defang(value) {
    // Cryptographic hashes do not trigger execution but are normalized to lowercase
    return value.trim().toLowerCase();
  }
}

// Validation Service Manager (Context in Strategy Pattern)
class IoCValidatorService {
  constructor() {
    this.strategies = {
      IPV4: new IPv4Strategy(),
      IPV6: new IPv6Strategy(),
      DOMAIN: new DomainStrategy(),
      MD5: new HashStrategy(32, 'MD5'),
      SHA1: new HashStrategy(40, 'SHA1'),
      SHA256: new HashStrategy(64, 'SHA256')
    };
  }

  getStrategy(type) {
    const upperType = (type || '').toUpperCase();
    const strategy = this.strategies[upperType];
    if (!strategy) {
      throw new Error(`Unsupported observable type: '${type}'. Supported types: [${Object.keys(this.strategies).join(', ')}]`);
    }
    return strategy;
  }

  validate(type, value) {
    const strategy = this.getStrategy(type);
    return strategy.validate(value);
  }

  defang(type, value) {
    const strategy = this.getStrategy(type);
    return strategy.defang(value);
  }

  process(type, value) {
    const strategy = this.getStrategy(type);
    if (!strategy.validate(value)) {
      return {
        isValid: false,
        error: `Value '${value}' is not a valid ${type.toUpperCase()} observable`
      };
    }

    return {
      isValid: true,
      type: type.toUpperCase(),
      normalizedValue: value.trim().toLowerCase(),
      defangedValue: strategy.defang(value)
    };
  }
}

// Export singleton instance
module.exports = new IoCValidatorService();
