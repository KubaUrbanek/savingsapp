import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const stylesheet = await readFile(new URL('../../src/styles.css', import.meta.url), 'utf8');
const tokens = Object.fromEntries(
  [...stylesheet.matchAll(/--([\w-]+):\s*(#[\da-f]{6});/gi)].map(([, name, value]) => [name, value.toLowerCase()])
);

function luminance(hex) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground, background) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

const normalTextPairs = [
  ['ink', 'canvas'],
  ['ink', 'surface'],
  ['muted', 'canvas'],
  ['muted', 'surface'],
  ['muted', 'surface-muted'],
  ['muted', 'portfolio-soft'],
  ['control-text', 'surface'],
  ['portfolio', 'surface'],
  ['portfolio-strong', 'surface'],
  ['portfolio-strong', 'portfolio-soft'],
  ['on-portfolio', 'portfolio'],
  ['on-portfolio', 'portfolio-strong'],
  ['on-portfolio', 'portfolio-hover'],
  ['on-portfolio-muted', 'portfolio'],
  ['on-portfolio-muted', 'portfolio-strong'],
  ['on-portfolio-muted', 'portfolio-hover'],
  ['success-text', 'success-background'],
  ['warning-text', 'warning-background'],
  ['danger-text', 'danger-background'],
  ['disabled-text', 'disabled-background']
];

test('every semantic normal-text/background pair meets WCAG AA contrast', () => {
  for (const [foregroundName, backgroundName] of normalTextPairs) {
    const ratio = contrast(tokens[`color-${foregroundName}`], tokens[`color-${backgroundName}`]);
    assert.ok(ratio >= 4.5, `${foregroundName} on ${backgroundName}: ${ratio.toFixed(2)}:1`);
  }
});

test('the opaque focus color remains visible on white and green surfaces', () => {
  assert.match(tokens['color-focus'], /^#[\da-f]{6}$/);
  for (const backgroundName of ['surface', 'portfolio-strong']) {
    const ratio = contrast(tokens['color-focus'], tokens[`color-${backgroundName}`]);
    assert.ok(ratio >= 3, `focus on ${backgroundName}: ${ratio.toFixed(2)}:1`);
  }
  assert.match(stylesheet, /outline:\s*3px solid var\(--color-focus\)/);
  assert.match(stylesheet, /outline-offset:\s*3px/);
});

test('known low-contrast copy colors and opacity-based disabled text do not return', () => {
  assert.doesNotMatch(stylesheet, /#718078/i);
  assert.doesNotMatch(stylesheet, /\.button:disabled\s*{[^}]*opacity\s*:/s);
});
