interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState = ({ icon = '📭', title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
    <span className="text-4xl mb-3" aria-hidden="true">
      {icon}
    </span>
    <p className="text-sm font-medium text-gray-700">{title}</p>
    {description && <p className="mt-1 text-xs text-gray-400">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default EmptyState;
