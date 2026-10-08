/**
 * Phase 14: Unit Tests for SanitizerService
 * Validates unit-level defense-in-depth against CWE-79 (Cross-Site Scripting)
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const SanitizerService = require('../../src/services/sanitizerService');

describe('Unit Tests: SanitizerService (Phase 14 & V04 CWE-79 Defense)', () => {
  test('escapeHtml: Replaces dangerous characters with HTML entity references', () => {
    const raw = '<script>alert("XSS" & \'attack\')</script>';
    const escaped = SanitizerService.escapeHtml(raw);
    assert.strictEqual(escaped.includes('<script>'), false);
    assert.strictEqual(escaped, '&lt;script&gt;alert(&quot;XSS&quot; &amp; &#x27;attack&#x27;)&lt;&#x2F;script&gt;');
  });

  test('escapeHtml: Handles non-string inputs safely without thrown exceptions', () => {
    assert.strictEqual(SanitizerService.escapeHtml(null), '');
    assert.strictEqual(SanitizerService.escapeHtml(undefined), '');
    assert.strictEqual(SanitizerService.escapeHtml(12345), '');
    assert.strictEqual(SanitizerService.escapeHtml({}), '');
  });

  test('stripHtml: Completely strips all HTML tags and null bytes from plain strings', () => {
    const malicious = 'Threat Report <img src=x onerror=alert(1)> Title \0with Null Byte';
    const stripped = SanitizerService.stripHtml(malicious);
    assert.strictEqual(stripped, 'Threat Report  Title with Null Byte');
    assert.strictEqual(stripped.includes('<img'), false);
    assert.strictEqual(stripped.includes('\0'), false);
  });

  test('stripHtml: Handles empty and non-string inputs gracefully', () => {
    assert.strictEqual(SanitizerService.stripHtml(null), '');
    assert.strictEqual(SanitizerService.stripHtml(''), '');
  });

  test('sanitizeMarkdown: Neutralizes dangerous HTML tags while preserving formatting', () => {
    const md = '# Header\n<script>alert(1)</script><iframe src="evil.com"></iframe>\n**Bold Text**';
    const sanitized = SanitizerService.sanitizeMarkdown(md);
    assert.strictEqual(sanitized.includes('<script>'), false);
    assert.strictEqual(sanitized.includes('<iframe>'), false);
    assert.ok(sanitized.includes('# Header'));
    assert.ok(sanitized.includes('**Bold Text**'));
  });

  test('sanitizeMarkdown: Neutralizes nested tag collapse evasion (CWE-182)', () => {
    const nested = '<<SCRIPT>script>alert(1)<</SCRIPT>/script>';
    const sanitized = SanitizerService.sanitizeMarkdown(nested);
    assert.strictEqual(/<script\b/i.test(sanitized), false, 'Nested script tag must not survive iterative stripping');
  });

  test('sanitizeMarkdown: Neutralizes inline event handlers across diverse tags', () => {
    const testCases = [
      '<img src="valid.png" onmouseover="alert(\'xss\')">',
      '<svg onload=alert(1)>',
      '<details ontoggle="fetch(\'evil.com\')">',
      '<a href="test" onclick="doEvil()">link</a>',
      '<input type="text" onfocus="pwn()">'
    ];

    for (const testCase of testCases) {
      const sanitized = SanitizerService.sanitizeMarkdown(testCase);
      assert.strictEqual(/on[a-zA-Z]+\s*=/i.test(sanitized), false, `Must strip event handlers from: ${testCase}`);
    }
  });

  test('sanitizeMarkdown: Neutralizes dangerous URI schemes (javascript:, data:, vbscript:)', () => {
    const htmlWithDangerousHrefs = '<a href="javascript:alert(1)">Click me</a> <img src="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">';
    const mdLinks = '[Malicious](javascript:alert(1)) and [Data](data:text/html,evil)';

    const sanitizedHtml = SanitizerService.sanitizeMarkdown(htmlWithDangerousHrefs);
    assert.strictEqual(sanitizedHtml.includes('javascript:'), false);
    assert.ok(sanitizedHtml.includes('href="blocked:"'));

    const sanitizedMd = SanitizerService.sanitizeMarkdown(mdLinks);
    assert.strictEqual(sanitizedMd.includes('javascript:'), false);
    assert.strictEqual(sanitizedMd.includes('data:'), false);
    assert.ok(sanitizedMd.includes('[Malicious](blocked:)'));
    assert.ok(sanitizedMd.includes('[Data](blocked:)'));
  });
});
