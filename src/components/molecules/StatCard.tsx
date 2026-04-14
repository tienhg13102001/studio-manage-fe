import { Link } from 'react-router-dom';

interface StatCardProps {
  label: string;
  value: string | number;
  /** Tailwind text-color class, e.g. "text-blue-600" */
  color?: string;
  /** If provided, the whole card becomes a link */
  to?: string;
  className?: string;
}

/**
 * Molecule: displays a single KPI stat — label + prominent value.
 * Optionally wraps in a react-router Link.
 */
const StatCard = ({ label, value, color = 'text-gray-900', to, className = '' }: StatCardProps) => {
  const inner = (
    <div className={`card hover:shadow-md transition-shadow ${className}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );

  return to ? <Link to={to}>{inner}</Link> : inner;
};

export default StatCard;
