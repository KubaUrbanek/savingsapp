import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  busy?: boolean;
  busyLabel?: React.ReactNode;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', busy = false, busyLabel, disabled, className = '', children, ...props },
  ref
) {
  return (
    <button
      {...props}
      ref={ref}
      className={`button button--${variant} ${className}`.trim()}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
    >
      {busy && busyLabel ? busyLabel : children}
    </button>
  );
});
