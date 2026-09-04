import '@testing-library/jest-dom/vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from '../../src/presentation/components/Button.js';
import { Field } from '../../src/presentation/components/Field.js';
import { InlineMessage } from '../../src/presentation/components/InlineMessage.js';
import { SectionHeader } from '../../src/presentation/components/SectionHeader.js';
import { QueryBoundary } from '../../src/presentation/components/QueryBoundary.js';

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

  it('renders stable loading and empty states for a query section', () => {
    const { rerender } = render(
      <QueryBoundary state={{ status: 'loading' }} loadingLabel="Wczytywanie historii…">
        {() => <p>Dane</p>}
      </QueryBoundary>
    );

    expect(screen.getByRole('status', { name: 'Wczytywanie historii…' })).toHaveClass('querySkeleton');
    expect(screen.queryByText('Dane')).not.toBeInTheDocument();

    rerender(
      <QueryBoundary
        state={{ status: 'success', data: [] }}
        emptyTitle="Brak wycen"
        emptyDescription="Dodaj pierwszą wycenę."
        emptyAction={<a href="#form">Dodaj wycenę</a>}
      >
        {() => <p>Dane</p>}
      </QueryBoundary>
    );
    expect(screen.getByText('Brak wycen')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dodaj wycenę' })).toHaveAttribute('href', '#form');
  });

  it('shows a safe failure and invokes the query retry action', () => {
    const retry = vi.fn();
    render(
      <QueryBoundary state={{ status: 'failure', error: new Error('tajny komunikat adaptera') }} onRetry={retry}>
        {() => <p>Dane</p>}
      </QueryBoundary>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Nie udało się wczytać tej sekcji');
    expect(screen.queryByText('tajny komunikat adaptera')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('keeps successful data visible while a query refreshes', () => {
    render(
      <QueryBoundary state={{ status: 'loading', data: ['wartość'] }}>
        {(data) => <p>{(data as string[])[0]}</p>}
      </QueryBoundary>
    );

    expect(screen.getByText('wartość')).toBeInTheDocument();
    expect(screen.getByText('Odświeżanie danych…')).toHaveAttribute('role', 'status');
    expect(screen.getByText('wartość').parentElement).toHaveAttribute('aria-busy', 'true');
  });
});
