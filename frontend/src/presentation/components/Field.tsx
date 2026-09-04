import React from 'react';

type FieldControlProps = {
  id?: string | undefined;
  'aria-describedby'?: string | undefined;
  'aria-invalid'?: React.AriaAttributes['aria-invalid'] | undefined;
  [key: string]: unknown;
};

type FieldProps = {
  label: React.ReactNode;
  control: React.ReactElement<FieldControlProps>;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  errorId?: string;
  className?: string;
};

export function Field({ label, control, hint, error, errorId, className = '' }: FieldProps) {
  const generatedId = React.useId();
  const controlId = control.props.id ?? `${generatedId}-control`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const resolvedErrorId = error ? (errorId ?? `${controlId}-error`) : undefined;
  const describedBy =
    [control.props['aria-describedby'], hintId, resolvedErrorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`field ${className}`.trim()}>
      <label className="fieldLabel" htmlFor={controlId}>
        {label}
      </label>
      {React.cloneElement(control, {
        id: controlId,
        'aria-describedby': describedBy,
        'aria-invalid': error ? 'true' : control.props['aria-invalid']
      })}
      {hint && (
        <span className="fieldHint" id={hintId}>
          {hint}
        </span>
      )}
      {error && (
        <span className="fieldError" id={resolvedErrorId}>
          {error}
        </span>
      )}
    </div>
  );
}
