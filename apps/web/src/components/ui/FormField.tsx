/**
 * FormField Component
 *
 * Wrapper for form inputs with label, help text, and error handling.
 */

import { type ReactNode } from 'react';
import { clsx } from 'clsx';
import { Label } from './Label';

export interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  error?: string | undefined;
  hint?: string;
  className?: string;
  children: ReactNode;
}

export function FormField({
  label,
  htmlFor,
  required,
  error,
  hint,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={clsx('space-y-1', className)}>
      {label && (
        <Label htmlFor={htmlFor} required={required === true}>
          {label}
        </Label>
      )}
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {hint && !error && <p className="text-sm text-gray-500">{hint}</p>}
    </div>
  );
}
