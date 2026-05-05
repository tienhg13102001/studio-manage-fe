import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
  to?: string;
  className?: string;
}

export const StatCard = ({
  label,
  value,
  color = 'text-foreground',
  to,
  className,
}: StatCardProps) => {
  const inner = (
    <Card className={cn('p-5 hover:shadow-md transition-shadow', className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn('text-2xl font-bold mt-1', color)}>{value}</p>
    </Card>
  );
  return to ? (
    <Link to={to} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
};
