/**
 * Content Sanitizer & XSS Defense Service (Phase 12: Remediation for V04 / CWE-79)
 *
 * Implements context-aware sanitization, event-handler neutralization,
 * dangerous scheme filtering, and HTML entity encoding.
 */

class SanitizerService {
  /**
   * Escape HTML entities for safe context rendering
   */
  static escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Strip all HTML tags entirely for plain-text fields (titles, summaries)
   */
  static stripHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/\0/g, '') // Strip null bytes
      .replace(/<[^>]*>?/gm, '')
      .trim();
  }

  /**
   * Sanitize rich Markdown incident descriptions:
   * 1. Neutralizes dangerous HTML tags (script, iframe, object, embed, svg, etc.)
   * 2. Strips all inline event handlers (onmouseover, ontoggle, onload, onerror, onclick, etc.)
   * 3. Blocks dangerous URI schemes (javascript:, data:, vbscript:) in href and src
   * 4. Preserves legitimate markdown formatting, images, and links
   */
  static sanitizeMarkdown(str) {
    if (typeof str !== 'string') return '';

    let clean = str.replace(/\0/g, ''); // Strip null bytes

    // 1. Strip prohibited high-risk HTML tags
    const DANGEROUS_TAGS = ['script', 'iframe', 'object', 'embed', 'svg', 'audio', 'video', 'style', 'link', 'meta', 'base', 'form', 'input', 'button', 'frame', 'frameset', 'applet'];
    const tagPattern = new RegExp(`</?(?:${DANGEROUS_TAGS.join('|')})\\b[^>]*>`, 'gi');
    clean = clean.replace(tagPattern, '');

    // 2. Strip ALL HTML event handlers (on* attributes)
    // Matches onmouseover="...", ontoggle='...', onerror=alert(1), etc.
    clean = clean.replace(/\bon[a-zA-Z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');

    // 3. Neutralize dangerous URI schemes in href and src attributes
    // Replaces javascript:..., data:text/html..., vbscript:... with blocked:
    clean = clean.replace(/\b(href|src)\s*=\s*(["']?)\s*(?:javascript|data|vbscript):([^"'>\s]*)\2/gi, '$1="blocked:"');

    // 4. Also catch markdown style links [text](javascript:...) or [text](data:...)
    clean = clean.replace(/\[([^\]]+)\]\(\s*(?:javascript|data|vbscript):[^\)]*\)/gi, '[$1](blocked:)');

    return clean;
  }
}

module.exports = SanitizerService;
