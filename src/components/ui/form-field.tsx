import * as React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  className?: string;
  /** Class bổ sung cho label (opt-in) */
  labelClassName?: string;
  children: React.ReactNode;
}

export const FormField = ({
  label,
  htmlFor,
  error,
  required,
  hint,
  className,
  labelClassName,
  children,
}: FormFieldProps) => (
  <div className={cn('space-y-1.5', className)}>
    <Label htmlFor={htmlFor} className={labelClassName}>
      {label}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </Label>
    {children}
    {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
);
