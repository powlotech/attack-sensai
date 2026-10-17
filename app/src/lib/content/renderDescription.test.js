import { expect, test } from 'vitest'
import { renderDescription } from './renderDescription.js'

test('strips script tags and event handlers', () => {
  const html = renderDescription('hi <script>alert(1)</script> <img src=x onerror="alert(1)">')
  expect(html).not.toMatch(/script|onerror|<img/i)
})

test('relative MITRE links become absolute and open safely', () => {
  const html = renderDescription('see [T1003](/techniques/T1003)')
  expect(html).toContain('href="https://attack.mitre.org/techniques/T1003"')
  expect(html).toContain('target="_blank"')
  expect(html).toContain('rel="noopener"')
})

test('markdown lists render as ul', () => {
  expect(renderDescription('- a\n- b')).toMatch(/<ul>\s*<li>a<\/li>/)
})
