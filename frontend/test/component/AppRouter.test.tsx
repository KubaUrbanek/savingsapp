import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppRouter } from '../../src/app/AppRouter.js';

describe('AppRouter', () => {
  it('renders the about route', () => {
    window.history.pushState({}, '', '/about');
    render(<AppRouter dependencies={{}} />);
    expect(screen.getByText(/Portfele bez logowania/i)).toBeTruthy();
  });
});
