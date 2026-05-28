/**
 * Label Component
 *
 * Form field label with optional required indicator.
 */

import { type LabelHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({ required, className, children, ...props }: LabelProps) {
  return (
    <label
      className={clsx('block text-sm font-medium text-gray-700', className)}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}
