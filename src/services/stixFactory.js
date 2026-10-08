const crypto = require('crypto');

/**
 * OASIS STIX 2.1 Factory (Phase 5, CTI-108)
 * Transforms platform threat indicators into official STIX 2.1 JSON Bundle specifications.
 */

const TLP_MARKING_IDS = {
  CLEAR: 'marking-definition--613f2e26-407d-48c7-9eca-b8e91df99dc9', // TLP:CLEAR / WHITE
  GREEN: 'marking-definition--34098fce-860f-48ae-8e50-ebd3cc5e41da', // TLP:GREEN
  AMBER: 'marking-definition--f88d31f6-486f-44da-b317-01333bde0b82', // TLP:AMBER
  RED: 'marking-definition--5e57c739-391a-4220-b66d-30412f302392'    // TLP:RED
};

class STIXFactory {
  /**
   * Convert indicator observable to STIX 2.1 Pattern Expression
   */
  static generateSTIXPattern(type, value) {
    switch (type.toUpperCase()) {
      case 'IPV4':
        return `[ipv4-addr:value = '${value}']`;
      case 'IPV6':
        return `[ipv6-addr:value = '${value}']`;
      case 'DOMAIN':
        return `[domain-name:value = '${value}']`;
      case 'MD5':
        return `[file:hashes.'MD5' = '${value}']`;
      case 'SHA1':
        return `[file:hashes.'SHA-1' = '${value}']`;
      case 'SHA256':
        return `[file:hashes.'SHA-256' = '${value}']`;
      default:
        return `[custom-observable:value = '${value}']`;
    }
  }

  /**
   * Create a STIX 2.1 Indicator Domain Object (SDO)
   */
  static createIndicatorSDO(indicator) {
    const stixId = `indicator--${indicator.id.replace(/^ioc-/, '')}`;
    const pattern = this.generateSTIXPattern(indicator.type, indicator.value);
    const tlpMarking = TLP_MARKING_IDS[indicator.tlp_level] || TLP_MARKING_IDS.AMBER;

    const sdo = {
      type: 'indicator',
      spec_version: '2.1',
      id: stixId,
      created: indicator.created_at ? new Date(indicator.created_at).toISOString() : new Date().toISOString(),
      modified: new Date().toISOString(),
      name: `${indicator.type} - ${indicator.value_defanged || indicator.value}`,
      description: indicator.description || 'Observed cyber threat indicator',
      indicator_types: ['malicious-activity'],
      pattern: pattern,
      pattern_type: 'stix',
      pattern_version: '2.1',
      valid_from: new Date().toISOString(),
      confidence: indicator.confidence_score || 50,
      object_marking_refs: [tlpMarking]
    };

    if (indicator.mitre_attack_id) {
      sdo.external_references = [
        {
          source_name: 'mitre-attack',
          external_id: indicator.mitre_attack_id,
          url: `https://attack.mitre.org/techniques/${indicator.mitre_attack_id.replace(/\./g, '/')}`
        }
      ];
    }

    return sdo;
  }

  /**
   * Assemble a list of indicators into an official STIX 2.1 Bundle
   */
  static createBundle(indicators = [], report = null) {
    const bundleId = `bundle--${crypto.randomUUID()}`;
    const stixObjects = [];

    // Add STIX indicator objects
    for (const ind of indicators) {
      stixObjects.push(this.createIndicatorSDO(ind));
    }

    return {
      type: 'bundle',
      id: bundleId,
      spec_version: '2.1',
      objects: stixObjects
    };
  }
}

module.exports = {
  STIXFactory,
  TLP_MARKING_IDS
};
