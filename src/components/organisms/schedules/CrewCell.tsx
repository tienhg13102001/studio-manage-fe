import { CalendarClock, UserPen, UserPlus, Users, UserX, Video } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { ExternalPhotographer, ScheduleResponse, User } from '../../../types';
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
  const { needed, assigned, missing, videoMissing } = crewStats(schedule);
  const cancelled = isScheduleCancelled(schedule);
  const names = conflictNames(schedule);
  const pending = (schedule.externalCrew ?? []).filter(
    (entry) => entry.photographer && entry.confirmation === 'pending',
  ).length;
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
      {!cancelled && videoMissing > 0 && (
        <span className={cn(flagCls, 'bg-rose-500/10 text-rose-700 dark:text-rose-300')}>
          <Video /> Thiếu thợ quay
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
      {!cancelled && pending > 0 && (
        <span className={cn(flagCls, 'bg-sky-500/10 text-sky-700 dark:text-sky-300')}>
          {pending} thợ ngoài chờ xác nhận
        </span>
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
  externalPhotographers: ExternalPhotographer[];
  onExternalCreated: (person: ExternalPhotographer) => void;
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
  externalPhotographers,
  onExternalCreated,
  isDesktop,
  onSaved,
}: CrewCellProps) => {
  const cancelled = isScheduleCancelled(schedule);
  const editable = canEdit && !cancelled;
  const externalLead = (schedule.externalCrew ?? []).find((entry) => entry.role === 'lead');
  const leadName = personName(schedule.leadPhotographer) || externalLead?.photographer?.name || '';
  const supports = [
    ...schedule.supportPhotographers.map((person) => ({
      name: personName(person),
      external: false,
      confirmation: '',
    })),
    ...(schedule.externalCrew ?? [])
      .filter((entry) => entry.role === 'support' && entry.photographer)
      .map((entry) => ({
        name: entry.photographer!.name,
        external: true,
        confirmation: entry.confirmation,
      })),
  ].filter((person) => person.name);
  const externalVideo = (schedule.externalCrew ?? []).find(
    (entry) => entry.role === 'video' && entry.photographer,
  );
  const videoName = personName(schedule.videographer) || externalVideo?.photographer?.name || '';
  const hasCrew = !!leadName || supports.length > 0 || !!videoName;
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
      {leadName && <LeadChip name={leadName} external={!!externalLead} className="max-w-[180px]" />}
      {card ? (
        supports.map((person, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 text-[13px] text-foreground/80">
            <CrewAvatar name={person.name} size={22} className="ring-0" />
            {person.name}
            {person.external && (
              <span className="text-xs text-sky-600 dark:text-sky-300">
                Ngoài{person.confirmation === 'declined' ? ' · Từ chối' : ''}
              </span>
            )}
          </span>
        ))
      ) : (
        <span className="inline-flex -space-x-1">
          {supports.map((person, i) => (
            <CrewAvatar
              key={i}
              name={person.name}
              size={24}
              tooltip={`${person.name} · ${person.external ? `Thợ ngoài · ${person.confirmation === 'confirmed' ? 'Đã xác nhận' : person.confirmation === 'declined' ? 'Từ chối' : 'Chờ xác nhận'}` : 'Thợ phụ'}`}
            />
          ))}
        </span>
      )}
      {videoName && (
        <span
          title={`Thợ quay MV${externalVideo && !schedule.videographer ? ' · Thợ ngoài' : ''}`}
          className="inline-flex max-w-[180px] items-center gap-1 text-[13px] text-foreground/80"
        >
          <Video className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate">{videoName}</span>
          {externalVideo && !schedule.videographer && (
            <span className="text-xs text-sky-600 dark:text-sky-300">Ngoài</span>
          )}
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
      externalPhotographers={externalPhotographers}
      onExternalCreated={onExternalCreated}
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
