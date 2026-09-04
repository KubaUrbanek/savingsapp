import React from 'react';

type InlineMessageProps = {
  variant?: 'info' | 'success' | 'warning' | 'error';
  children?: React.ReactNode;
  className?: string;
};

export const InlineMessage = React.forwardRef<HTMLDivElement, InlineMessageProps>(function InlineMessage(
  { variant = 'info', children, className = '' },
  ref
) {
  const isError = variant === 'error';
  return (
    <div
      ref={ref}
      className={`inlineMessage inlineMessage--${variant} ${children ? '' : 'visuallyHidden'} ${className}`.trim()}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      aria-atomic="true"
      tabIndex={isError ? -1 : undefined}
    >
      {children}
    </div>
  );
});
