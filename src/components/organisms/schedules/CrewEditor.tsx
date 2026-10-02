import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlarmClock, Check, Info, Search, Users, X } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Input,
  Popover,
  PopoverAnchor,
  PopoverContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Spinner,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { scheduleService } from '../../../services/scheduleService';
import { getSchoolName, type BusySchedule, type ScheduleResponse, type User } from '../../../types';
import { calcCrewCount } from '../../../utils/crewCount';
import { CrewAvatar } from './CrewAvatar';
import {
  SHEET_CONTENT_CLS,
  apiErrorMessage,
  formatWeekdayDayMonth,
  personName,
  timeRange,
  vnDayKey,
} from './scheduleHelpers';

const NO_LEAD = '__none__';

interface BodyProps {
  schedule: ScheduleResponse;
  photographers: User[];
  onClose: () => void;
  onSaved: () => void;
  /** Rendered inside a Dialog (title/description use Dialog primitives). */
  inDialog: boolean;
}

const busyLabel = (list: BusySchedule[] | undefined) => {
  if (!list?.length) return null;
  const first = list[0];
  const time = timeRange(first);
  return `Bận · ${[first.className, time].filter(Boolean).join(' · ')}${
    list.length > 1 ? ` · +${list.length - 1} lịch` : ''
  }`;
};

const CrewEditorBody = ({ schedule, photographers, onClose, onSaved, inDialog }: BodyProps) => {
  const [lead, setLead] = useState(schedule.leadPhotographer?._id ?? '');
  const [supports, setSupports] = useState(() => schedule.supportPhotographers.map((u) => u._id));
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<BusySchedule[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    scheduleService
      .getBusy(vnDayKey(schedule.shootDate), schedule._id)
      .then((rows) => alive && setBusy(rows))
      .catch(() => alive && setBusy([]));
    return () => {
      alive = false;
    };
  }, [schedule._id, schedule.shootDate]);

  /** Active photographers plus current crew members (who may have been deactivated since). */
  const people = useMemo(() => {
    const map = new Map<string, User>();
    for (const u of photographers) map.set(u._id, u);
    for (const u of [schedule.leadPhotographer, ...schedule.supportPhotographers]) {
      if (u && !map.has(u._id)) map.set(u._id, u);
    }
    return [...map.values()];
  }, [photographers, schedule.leadPhotographer, schedule.supportPhotographers]);

  const busyByUser = useMemo(() => {
    const map = new Map<string, BusySchedule[]>();
    for (const b of busy ?? []) {
      for (const id of [b.leadPhotographer, ...b.supportPhotographers]) {
        if (!id) continue;
        map.set(id, [...(map.get(id) ?? []), b]);
      }
    }
    return map;
  }, [busy]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return people;
    return people.filter((u) => `${u.name ?? ''} ${u.username}`.toLowerCase().includes(q));
  }, [people, search]);

  const pkg = schedule.package;
  const total = schedule.customer?.total;
  const needed = calcCrewCount(total, pkg?.studentsPerCrew);
  const assigned = (lead ? 1 : 0) + supports.filter((id) => id !== lead).length;
  const missing = needed ? Math.max(needed - assigned, 0) : 0;

  const pickLead = (id: string) => {
    setLead(id);
    setSupports((prev) => prev.filter((x) => x !== id));
  };

  const toggleSupport = (id: string, on: boolean) =>
    setSupports((prev) => (on ? [...prev, id] : prev.filter((x) => x !== id)));

  const save = async () => {
    setSaving(true);
    try {
      await scheduleService.update(schedule._id, {
        leadPhotographer: lead || null,
        supportPhotographers: supports.filter((id) => id !== lead),
      });
      toast.success('Đã cập nhật ekip.');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const availability = (id: string) => {
    if (busy === null) return <span className="text-muted-foreground">Đang kiểm tra lịch…</span>;
    const label = busyLabel(busyByUser.get(id));
    return label ? (
      <span className="inline-flex min-w-0 items-center gap-1 text-amber-700 dark:text-amber-300">
        <AlarmClock className="h-3 w-3 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
    ) : (
      <span className="text-muted-foreground">Rảnh cả ngày</span>
    );
  };

  const subtitle = [
    schedule.customer?.className,
    getSchoolName(schedule.customer),
    formatWeekdayDayMonth(schedule.shootDate),
    timeRange(schedule),
  ]
    .filter(Boolean)
    .join(' · ');

  const Title = inDialog ? DialogTitle : 'div';
  const Desc = inDialog ? DialogDescription : 'div';
  const leadUser = people.find((u) => u._id === lead);

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-start gap-2 px-4 pb-3 pt-4">
        <div className="min-w-0 flex-1">
          <Title className="text-[15px] font-bold text-foreground">Sửa ekip</Title>
          <Desc className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</Desc>
        </div>
        {inDialog ? (
          <DialogClose
            aria-label="Đóng"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </DialogClose>
        ) : (
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
        {needed !== null && (
          <div className="flex items-center gap-3 rounded-[12px] border bg-muted/50 px-3 py-2.5">
            <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground">Cần {needed} thợ</div>
              <div className="truncate text-xs text-muted-foreground">
                {total ?? 0} HS · {pkg?.studentsPerCrew} HS/thợ
                {pkg?.name ? ` (Gói ${pkg.name})` : ''}
              </div>
            </div>
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular',
                missing
                  ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
              )}
            >
              {missing ? (
                `Thiếu ${missing}`
              ) : (
                <>
                  <Check className="h-3 w-3" /> Đã chọn {assigned}/{needed}
                </>
              )}
            </span>
          </div>
        )}

        <div>
          <div className="mb-1.5 flex items-center justify-between text-[13px]">
            <span className="font-semibold text-muted-foreground">Thợ chính</span>
            <span className="text-xs text-muted-foreground">Chọn 1</span>
          </div>
          <Select value={lead || NO_LEAD} onValueChange={(v) => pickLead(v === NO_LEAD ? '' : v)}>
            <SelectTrigger className="h-11 rounded-[10px] bg-card shadow-none data-[state=open]:border-primary">
              {leadUser ? (
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <CrewAvatar name={personName(leadUser)} size={24} lead />
                  <span className="truncate font-semibold text-foreground">
                    {personName(leadUser)}
                  </span>
                  <span className="ml-auto mr-1 shrink-0 text-xs font-semibold">
                    {busy === null ? null : busyByUser.get(lead)?.length ? (
                      <span className="text-amber-700 dark:text-amber-300">Bận</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        Rảnh
                      </span>
                    )}
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground">Chưa chọn thợ chính</span>
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_LEAD}>
                <span className="text-muted-foreground">Không chỉ định</span>
              </SelectItem>
              {people.map((u) => (
                <SelectItem key={u._id} value={u._id}>
                  <span className="flex flex-col">
                    <span className="font-medium">{personName(u)}</span>
                    <span className="text-xs">{availability(u._id)}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-[13px]">
            <span className="font-semibold text-muted-foreground">Thợ phụ</span>
            <span className="text-xs text-muted-foreground">
              Đã chọn {supports.filter((id) => id !== lead).length}
            </span>
          </div>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm thợ chụp..."
              className="h-9 rounded-[10px] border-transparent bg-muted pl-9 text-base shadow-none sm:text-sm"
            />
          </div>
          <div className="space-y-1">
            {filtered.length === 0 && (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Không tìm thấy thợ chụp.
              </div>
            )}
            {filtered.map((u) => {
              const isLead = u._id === lead;
              const checked = !isLead && supports.includes(u._id);
              const name = personName(u);
              return (
                <label
                  key={u._id}
                  className={cn(
                    'flex items-center gap-3 rounded-[10px] px-2.5 py-2 transition-colors',
                    isLead
                      ? 'cursor-not-allowed opacity-50'
                      : checked
                        ? 'cursor-pointer bg-primary-100/70 dark:bg-primary/10'
                        : 'cursor-pointer hover:bg-muted/60',
                  )}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    disabled={isLead}
                    onChange={(e) => toggleSupport(u._id, e.target.checked)}
                  />
                  <span
                    className={cn(
                      'inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors',
                      checked
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card',
                    )}
                  >
                    {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  <CrewAvatar name={name} size={28} className="ring-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {name}
                    </span>
                    <span className="block truncate text-xs">
                      {isLead ? (
                        <span className="text-muted-foreground">Đang là thợ chính</span>
                      ) : (
                        availability(u._id)
                      )}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t bg-muted/40 px-4 py-3">
        <span className="mr-auto inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Lưu sẽ báo cho thợ được thêm</span>
        </span>
        <Button type="button" variant="outline" onClick={onClose}>
          Huỷ
        </Button>
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? <Spinner size="sm" /> : <Check />} Lưu
        </Button>
      </div>
    </div>
  );
};

interface CrewEditorProps {
  schedule: ScheduleResponse | null;
  photographers: User[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  isDesktop: boolean;
  /** Desktop only: popover anchored to this element. Without it a dialog is used. */
  anchor?: ReactNode;
}

/**
 * "Sửa ekip": lead + support photographers with same-day availability.
 * Desktop → 372px popover on `anchor` (or centered dialog), mobile → bottom sheet.
 */
const CrewEditor = ({
  schedule,
  photographers,
  open,
  onOpenChange,
  onSaved,
  isDesktop,
  anchor,
}: CrewEditorProps) => {
  const close = () => onOpenChange(false);

  if (isDesktop && anchor) {
    return (
      <Popover open={open && !!schedule} onOpenChange={onOpenChange}>
        <PopoverAnchor asChild>{anchor}</PopoverAnchor>
        <PopoverContent
          align="start"
          collisionPadding={12}
          aria-label="Sửa ekip"
          className="flex max-h-[min(640px,var(--radix-popover-content-available-height))] w-[372px] flex-col overflow-hidden rounded-[14px] p-0"
        >
          {schedule && (
            <CrewEditorBody
              schedule={schedule}
              photographers={photographers}
              onClose={close}
              onSaved={onSaved}
              inDialog={false}
            />
          )}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <>
      {anchor}
      <Dialog open={open && !!schedule} onOpenChange={onOpenChange}>
        <DialogContent
          aria-describedby={undefined}
          className={cn(
            'flex flex-col gap-0 overflow-hidden p-0',
            isDesktop
              ? 'max-h-[calc(100dvh-2rem)] max-w-[372px] rounded-[14px] [&>button]:hidden'
              : cn(SHEET_CONTENT_CLS, 'overflow-hidden px-0 pb-[env(safe-area-inset-bottom)]'),
          )}
        >
          {!isDesktop && (
            <div className="flex justify-center pt-2.5" aria-hidden>
              <span className="h-1 w-10 rounded-full bg-border" />
            </div>
          )}
          {schedule && (
            <CrewEditorBody
              schedule={schedule}
              photographers={photographers}
              onClose={close}
              onSaved={onSaved}
              inDialog
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CrewEditor;
