import { forwardRef } from 'react';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Label shown to the right of the checkbox */
  label?: React.ReactNode;
  /** Optional helper text below the label */
  description?: React.ReactNode;
  /** Error message — shown below and switches border to red */
  error?: string;
  /** Wrapper class (applied to the outer <label>) */
  wrapperClassName?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    { label, description, error, wrapperClassName = '', className = '', disabled, id, ...props },
    ref,
  ) => {
    const autoId = `cb-${Math.random().toString(36).slice(2, 9)}`;
    const inputId = id ?? autoId;

    return (
      <div className={wrapperClassName}>
        <label
          htmlFor={inputId}
          className={`inline-flex items-start gap-2 ${
            disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            disabled={disabled}
            className={`mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 accent-primary-600 ${
              error ? 'border-red-500' : ''
            } ${className}`}
            {...props}
          />
          {(label || description) && (
            <span className="select-none">
              {label && <span className="text-sm text-gray-700">{label}</span>}
              {description && (
                <span className="block text-xs text-gray-500 mt-0.5">{description}</span>
              )}
            </span>
          )}
        </label>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  },
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
