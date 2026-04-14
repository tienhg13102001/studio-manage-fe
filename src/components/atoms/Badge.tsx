type Variant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'gray'
  | 'purple'
  | 'teal'
  | 'orange';

const variantClass: Record<Variant, string> = {
  primary: 'bg-blue-100 text-blue-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-indigo-100 text-indigo-800',
  gray: 'bg-gray-100 text-gray-700',
  purple: 'bg-purple-100 text-purple-800',
  teal: 'bg-teal-100 text-teal-800',
  orange: 'bg-orange-100 text-orange-800',
};

interface BadgeProps {
  variant?: Variant;
  /** Override with arbitrary Tailwind classes (e.g. from SCHEDULE_STATUS_COLOR) */
  colorClass?: string;
  className?: string;
  children: React.ReactNode;
}

const Badge = ({ variant = 'gray', colorClass, className = '', children }: BadgeProps) => (
  <span className={`badge ${colorClass ?? variantClass[variant]} ${className}`}>{children}</span>
);

export default Badge;
