import type { ReactNode } from 'react';
import { FiInbox } from 'react-icons/fi';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
    <span className="text-4xl mb-3 text-gray-400" aria-hidden="true">
      {icon ?? <FiInbox />}
    </span>
    <p className="text- font-medium text-gray-700">{title}</p>
    {description && <p className="mt-1 text-xs text-gray-400">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default EmptyState;
