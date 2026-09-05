import axe from 'axe-core';
import { expect } from 'vitest';

export async function expectNoAccessibilityViolations(container: HTMLElement): Promise<void> {
  const result = await axe.run(container, {
    // jsdom does not calculate layout or resolved CSS colors. Contrast is covered by
    // the stylesheet contrast test and by the manual browser checklist.
    rules: { 'color-contrast': { enabled: false } }
  });

  expect(result.violations, result.violations.map(({ help }) => help).join('\n')).toEqual([]);
}
