interface PageHeaderProps {
  title: string;
  /** Optional content on the right side (Button, etc.) */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Molecule: page title row with an optional right-side action slot.
 * Matches the "flex items-center justify-between mb-6" pattern used across all pages.
 */
const PageHeader = ({ title, action, className = '' }: PageHeaderProps) => (
  <div className={`flex items-center justify-between mb-6 ${className}`}>
    <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
    {action && <div>{action}</div>}
  </div>
);

export default PageHeader;
