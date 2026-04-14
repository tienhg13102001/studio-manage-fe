interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}

/**
 * Molecule: wraps a label + control + error message.
 * Use with Input, Select, Textarea atoms (they handle their own error display)
 * or pass error here for controls outside the atom system.
 */
const FormField = ({ label, htmlFor, error, required, hint, children }: FormFieldProps) => (
  <div>
    <label htmlFor={htmlFor} className="label">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

export default FormField;
