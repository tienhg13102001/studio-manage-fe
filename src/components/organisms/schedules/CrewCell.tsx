import { CalendarClock, UserPen, UserPlus, Users, UserX } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { ScheduleResponse, User } from '../../../types';
import { isScheduleCancelled } from '../../../utils/scheduleConstants';
import { CrewAvatar, LeadChip } from './CrewAvatar';
import CrewEditor from './CrewEditor';
import { conflictNames, crewStats, personName, timeRange } from './scheduleHelpers';

const flagCls =
  'inline-flex items-center gap-1 whitespace-nowrap rounded-[6px] px-1.5 py-0.5 text-xs font-semibold [&_svg]:h-3 [&_svg]:w-3';

/** "2/2 thợ" · "Thiếu 1 thợ" · "Trùng lịch · Khoa" */
export const CrewFlags = ({
  schedule,
  className,
}: {
  schedule: ScheduleResponse;
  className?: string;
}) => {
  const { needed, assigned, missing } = crewStats(schedule);
  const cancelled = isScheduleCancelled(schedule);
  const names = conflictNames(schedule);
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {cancelled || needed === null ? (
        <span className={cn(flagCls, 'bg-muted text-muted-foreground')}>
          <Users /> {assigned} thợ
        </span>
      ) : missing > 0 ? (
        <span className={cn(flagCls, 'bg-rose-500/10 text-rose-700 dark:text-rose-300')}>
          <UserX /> Thiếu {missing} thợ
        </span>
      ) : (
        <span className={cn(flagCls, 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300')}>
          <Users /> {assigned}/{needed} thợ
        </span>
      )}
      {!cancelled && names.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              className={cn(
                flagCls,
                'cursor-default bg-amber-500/10 text-amber-800 dark:text-amber-300',
              )}
            >
              <CalendarClock /> Trùng lịch · {names.join(', ')}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {(schedule.conflicts ?? []).map((c, i) => (
              <div key={i}>
                {c.user.name}:{' '}
                {[c.schedule.className, timeRange(c.schedule)].filter(Boolean).join(' · ')}
              </div>
            ))}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};

interface CrewCellProps {
  schedule: ScheduleResponse;
  /** `table`: compact avatars; `card`: names next to avatars (mobile). */
  variant: 'table' | 'card';
  canEdit: boolean;
  crewOpen: boolean;
  onCrewOpenChange: (open: boolean) => void;
  photographers: User[];
  isDesktop: boolean;
  onSaved: () => void;
}

/** EKIP cell: lead chip + supports, edit-crew trigger, and crew flags. */
const CrewCell = ({
  schedule,
  variant,
  canEdit,
  crewOpen,
  onCrewOpenChange,
  photographers,
  isDesktop,
  onSaved,
}: CrewCellProps) => {
  const cancelled = isScheduleCancelled(schedule);
  const editable = canEdit && !cancelled;
  const leadName = personName(schedule.leadPhotographer);
  const supports = schedule.supportPhotographers.map(personName).filter(Boolean);
  const hasCrew = !!leadName || supports.length > 0;
  const card = variant === 'card';

  const editButton = editable ? (
    <button
      type="button"
      aria-label="Sửa ekip"
      title="Sửa ekip"
      onClick={() => onCrewOpenChange(true)}
      className={cn(
        'inline-flex shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground',
        card
          ? 'h-8 w-8 rounded-[9px] border bg-card hover:bg-muted'
          : 'h-[26px] w-[26px] rounded-full hover:bg-muted',
      )}
    >
      <UserPen className="h-4 w-4" />
    </button>
  ) : null;

  const emptyChip = (
    <button
      type="button"
      disabled={!editable}
      onClick={() => onCrewOpenChange(true)}
      className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-muted-foreground/40 px-2.5 py-1 text-[13px] text-muted-foreground transition-colors enabled:hover:border-primary enabled:hover:text-foreground"
    >
      <UserPlus className="h-3.5 w-3.5" />
      {card ? 'Chưa phân công' : 'Phân công ekip'}
    </button>
  );

  const crew = hasCrew ? (
    <div
      className={cn(
        'flex min-w-0 flex-wrap items-center',
        card ? 'gap-x-2.5 gap-y-1.5' : 'gap-1.5',
      )}
    >
      {leadName && <LeadChip name={leadName} className="max-w-[150px]" />}
      {card ? (
        supports.map((n, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 text-[13px] text-foreground/80">
            <CrewAvatar name={n} size={22} className="ring-0" />
            {n}
          </span>
        ))
      ) : (
        <span className="inline-flex -space-x-1">
          {supports.map((n, i) => (
            <CrewAvatar key={i} name={n} size={24} tooltip={`${n} · Thợ phụ`} />
          ))}
        </span>
      )}
    </div>
  ) : (
    emptyChip
  );

  const editor = editable ? (
    <CrewEditor
      schedule={schedule}
      photographers={photographers}
      open={crewOpen}
      onOpenChange={onCrewOpenChange}
      onSaved={onSaved}
      isDesktop={isDesktop}
      anchor={editButton}
    />
  ) : null;

  if (card) {
    return (
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          {crew}
          <CrewFlags schedule={schedule} />
        </div>
        {editor}
      </div>
    );
  }

  return (
    <div className="min-w-[200px] space-y-1.5">
      <div className="flex items-center gap-1.5">
        {crew}
        {editor}
      </div>
      <CrewFlags schedule={schedule} />
    </div>
  );
};

export default CrewCell;
