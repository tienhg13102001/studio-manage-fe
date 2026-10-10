import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui';
import { cn } from '@/lib/utils';
import { avatarTone, getInitial } from './scheduleHelpers';

interface CrewAvatarProps {
  name: string;
  size?: number;
  /** Lead photographer: amber ring. */
  lead?: boolean;
  tooltip?: string;
  className?: string;
}

/** Initial avatar of a crew member; the lead gets a primary ring. */
export const CrewAvatar = ({ name, size = 26, lead, tooltip, className }: CrewAvatarProps) => {
  const avatar = (
    <span
      className={cn(
        'inline-flex shrink-0 cursor-default select-none items-center justify-center rounded-full font-bold',
        size <= 20 ? 'text-[10px]' : 'text-[11px]',
        avatarTone(name),
        lead ? 'ring-2 ring-primary' : 'ring-2 ring-card',
        className,
      )}
      style={{ width: size, height: size }}
      aria-label={tooltip ?? name}
    >
      {getInitial(name)}
    </span>
  );
  if (!tooltip) return avatar;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{avatar}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
};

/** "(N) Ngọc [Chính]" chip for the lead photographer. */
export const LeadChip = ({
  name,
  className,
  external = false,
}: {
  name: string;
  className?: string;
  external?: boolean;
}) => (
  <span
    className={cn(
      'inline-flex min-w-0 items-center gap-1.5 rounded-full border bg-card py-0.5 pl-0.5 pr-1.5 text-[13px] font-semibold text-foreground',
      className,
    )}
  >
    <CrewAvatar name={name} size={22} lead />
    <span className="truncate">{name}</span>
    <span className="shrink-0 rounded-[5px] bg-primary-100 px-1.5 py-px text-[10.5px] font-semibold text-primary-700 dark:bg-primary/15 dark:text-primary">
      Chính
    </span>
    {external && <span className="shrink-0 text-[10px] text-sky-600 dark:text-sky-300">Ngoài</span>}
  </span>
);
