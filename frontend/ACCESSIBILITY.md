# Accessibility verification checklist

Run the automated component, semantic markup, and stylesheet contrast tests before this manual pass. Perform the
manual checks in a production build with representative owner and household data, including validation errors and
disabled actions.

## Manual WCAG AA pass

- [ ] **200% zoom:** At a 1280 CSS-pixel-wide viewport, zoom to 200%. Confirm that the owner and household views
      reflow without two-dimensional page scrolling, clipped text, overlapping controls, or hidden content.
- [ ] **Keyboard:** Starting at the address bar, use only `Tab`, `Shift+Tab`, `Enter`, `Space`, and arrow keys. Confirm
      the skip link works, focus order follows the page, every action is operable, scrollable charts/tables receive
      focus, and the 3 px focus outline plus 3 px offset is never obscured.
- [ ] **Forced colors:** Enable Windows High Contrast / `forced-colors: active`. Confirm text and controls remain
      visible, selected and disabled states are distinguishable, focus indicators remain visible, and buy/limit
      recommendations still include words rather than relying on arrows or color.
- [ ] **Reduced motion:** Enable “Reduce motion” / `prefers-reduced-motion: reduce`. Confirm transitions are effectively
      removed, smooth scrolling is disabled, and no information depends on animation.
- [ ] **Screen reader:** With NVDA + Firefox or VoiceOver + Safari, traverse landmarks and headings, switch between an
      owner and “Razem”, submit invalid data, and inspect tables/charts. Confirm decorative owner/household symbols are
      silent, pressed states and status/error updates are announced once, and recommendations are read as “Kup” or
      “Ogranicz”.
- [ ] **Contrast spot check:** In browser developer tools, verify normal text is at least 4.5:1, large text and UI
      boundaries are at least 3:1, and focus remains at least 3:1 against both white and dark-green surfaces.
