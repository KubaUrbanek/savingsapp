import '@testing-library/jest-dom/vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from '../../src/presentation/components/Button.js';
import { Field } from '../../src/presentation/components/Field.js';
import { InlineMessage } from '../../src/presentation/components/InlineMessage.js';
import { SectionHeader } from '../../src/presentation/components/SectionHeader.js';

afterEach(cleanup);

describe('presentation components', () => {
  it.each(['info', 'success', 'warning', 'error'] as const)('renders the %s message variant', (variant) => {
    render(<InlineMessage variant={variant}>Treść komunikatu</InlineMessage>);

    const message = screen.getByText('Treść komunikatu');
    expect(message).toHaveClass(`inlineMessage--${variant}`);
    expect(message).toHaveAttribute('role', variant === 'error' ? 'alert' : 'status');
  });

  it('keeps an empty live region in the accessibility tree without displaying a visual block', () => {
    render(<InlineMessage variant="success" />);

    expect(screen.getByRole('status')).toHaveClass('visuallyHidden');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('associates field help and error with its control while preserving focus management', () => {
    render(<Field label="Kwota" hint="W PLN" error="Podaj kwotę" control={<input />} />);

    const control = screen.getByLabelText('Kwota');
    const error = screen.getByText('Podaj kwotę');
    const hint = screen.getByText('W PLN');
    expect(control).toHaveAttribute('aria-invalid', 'true');
    expect(control.getAttribute('aria-describedby')).toContain(error.id);
    expect(control.getAttribute('aria-describedby')).toContain(hint.id);
    control.focus();
    expect(control).toHaveFocus();
  });

  it('disables a busy button, exposes busy state and prevents another action', () => {
    const onClick = vi.fn();
    render(
      <Button variant="primary" busy busyLabel="Zapisywanie…" onClick={onClick}>
        Zapisz
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Zapisywanie…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders section copy and its action together', () => {
    render(<SectionHeader title="Plan" description="Opis planu" action={<Button>Edytuj</Button>} />);

    expect(screen.getByRole('heading', { name: 'Plan' })).toBeInTheDocument();
    expect(screen.getByText('Opis planu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edytuj' })).toBeEnabled();
  });
});
