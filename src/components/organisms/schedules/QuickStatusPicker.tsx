import { useState } from 'react';
import { ArrowRight, Camera, Check, ChevronDown, Info, Lock, X } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  Badge,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Spinner,
  Textarea,
  badgeVariants,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { customerService } from '../../../services/customerService';
import { getUserRefId, type CustomerStatus, type ScheduleResponse } from '../../../types';
import {
  SCHEDULE_CANCELLED_LABEL,
  SHOOT_STATUSES,
  SHOOT_STATUS_LABELS,
  SHOOT_STATUS_VARIANT,
  getShootStatus,
  isScheduleCancelled,
  type ShootStatus,
} from '../../../utils/scheduleConstants';
import {
  SHEET_CONTENT_CLS,
  SHOOT_STATUS_TARGET,
  apiErrorMessage,
  moveBlockReason,
  formatDay,
  weekdayShort,
  type StatusPickerRole,
} from './scheduleHelpers';

const DEFAULT_NOTE = 'Cập nhật từ lịch chụp';

const ShootBadge = ({ status, className }: { status: ShootStatus; className?: string }) => (
  <Badge variant={SHOOT_STATUS_VARIANT[status]} dot className={className}>
    {SHOOT_STATUS_LABELS[status]}
  </Badge>
);

interface BodyProps {
  schedule: ScheduleResponse;
  role: StatusPickerRole;
  onCrew: boolean;
  userId?: string;
  userRoles?: number[];
  onClose: () => void;
  onChanged: () => void;
  inDialog: boolean;
}

const QuickStatusBody = ({
  schedule,
  role,
  onCrew,
  userId,
  userRoles,
  onClose,
  onChanged,
  inDialog,
}: BodyProps) => {
  const current = getShootStatus(schedule);
  const classStatus: CustomerStatus = schedule.customer?.status ?? 'new';
  const deposit = schedule.customer?.deposit;
  const [picked, setPicked] = useState<ShootStatus | null>(null);
  const [note, setNote] = useState(DEFAULT_NOTE);
  const [saving, setSaving] = useState(false);

  const optionState = (st: ShootStatus) => {
    if (st === current) return { allowed: false, reason: null };
    const target = SHOOT_STATUS_TARGET[st];
    const blocked = moveBlockReason(
      {
        isAdmin: role === 'admin',
        isPhotographer: !!userRoles?.includes(3) || !!userRoles?.includes(6),
        userId,
        onCrew,
      },
      classStatus,
      target,
      getUserRefId(schedule.customer?.assignedSale),
    );
    if (blocked !== null) return { allowed: false, reason: blocked || null };
    if (target === 'deposited') {
      // An active contract would immediately move the class back to "Chưa chụp"
      if (schedule.customer?.contract?.url) return { allowed: false, reason: 'Lớp đã có hợp đồng' };
      // Moving (back) to "Đã cọc" re-sends the class's recorded deposit, which the API requires
      if (!(deposit?.amount && deposit.date)) {
        return { allowed: false, reason: 'Lớp chưa có thông tin cọc' };
      }
    }
    return { allowed: true, reason: null };
  };

  const submit = async () => {
    if (!picked || !note.trim() || !schedule.customer) return;
    const target = SHOOT_STATUS_TARGET[picked];
    setSaving(true);
    try {
      const result = await customerService.changeStatus(schedule.customer._id, {
        status: target,
        note: note.trim(),
        ...(target === 'deposited' && deposit
          ? { deposit: { amount: deposit.amount, date: deposit.date } }
          : {}),
      });
      toast.success(`Đã chuyển sang "${SHOOT_STATUS_LABELS[picked]}".`);
      result.warnings?.forEach((w) => toast.warning(w));
      onChanged();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const Title = inDialog ? DialogTitle : 'div';
  const Desc = inDialog ? DialogDescription : 'div';
  const subtitle = `Lớp ${schedule.customer?.className ?? '—'} · ${weekdayShort(schedule.shootDate)} ${formatDay(schedule.shootDate)}`;

  return (
    <div>
      <div className="flex items-start gap-2 px-4 pb-2 pt-4">
        <div className="min-w-0 flex-1">
          <Title className="text-[15px] font-bold text-foreground">Đổi trạng thái</Title>
          <Desc className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</Desc>
        </div>
        {role === 'photographer' && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-300">
            <Camera className="h-3 w-3" /> Thợ chụp
          </span>
        )}
        {inDialog && (
          <DialogClose
            aria-label="Đóng"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </DialogClose>
        )}
      </div>

      <div role="radiogroup" aria-label="Trạng thái" className="space-y-0.5 px-2 pb-2">
        {SHOOT_STATUSES.map((st) => {
          const isCurrent = st === current;
          const { allowed, reason } = optionState(st);
          const selected = picked === st;
          return (
            <button
              key={st}
              type="button"
              role="radio"
              aria-checked={selected || (isCurrent && !picked)}
              disabled={!allowed}
              onClick={() => setPicked(st)}
              className={cn(
                'flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left text-sm transition-colors',
                selected ? 'bg-muted' : allowed && 'hover:bg-muted/60',
                !allowed && !isCurrent && 'cursor-not-allowed',
              )}
            >
              <span
                className={cn(
                  'h-[18px] w-[18px] shrink-0 rounded-full border-2',
                  selected ? 'border-[5px] border-primary bg-card' : 'border-border bg-card',
                )}
              />
              <span
                className={cn(
                  badgeVariants({ variant: SHOOT_STATUS_VARIANT[st] }),
                  'h-2 w-2 shrink-0 border-0 bg-current p-0',
                  !allowed && !isCurrent && 'opacity-50',
                )}
              />
              <span
                className={cn(
                  'flex-1 font-semibold',
                  !allowed && !isCurrent ? 'text-muted-foreground' : 'text-foreground',
                )}
              >
                {SHOOT_STATUS_LABELS[st]}
                {reason && (
                  <span className="block text-xs font-normal text-muted-foreground">{reason}</span>
                )}
              </span>
              {isCurrent ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  Hiện tại <Check className="h-3.5 w-3.5 text-emerald-600" />
                </span>
              ) : selected ? (
                <span className="rounded-full bg-primary-100 px-2 py-px text-[11px] font-semibold text-primary-700 dark:bg-primary/15 dark:text-primary">
                  Mới
                </span>
              ) : !allowed ? (
                <Lock className="h-3.5 w-3.5 text-muted-foreground/60" />
              ) : null}
            </button>
          );
        })}
      </div>

      {picked ? (
        <>
          <div className="space-y-2 border-t px-4 py-3">
            <div className="flex items-center gap-2">
              <ShootBadge status={current} />
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              <ShootBadge status={picked} />
            </div>
            <label
              htmlFor="quick-status-note"
              className="block text-[13px] font-semibold text-muted-foreground"
            >
              Ghi chú <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="quick-status-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Bắt buộc · lưu vào lịch sử chăm sóc của lớp
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 border-t bg-muted/40 px-4 py-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Huỷ
            </Button>
            <Button type="button" onClick={submit} disabled={saving || !note.trim()}>
              {saving ? <Spinner size="sm" /> : <Check />} Xác nhận
            </Button>
          </div>
        </>
      ) : (
        role === 'photographer' && (
          <div className="px-2 pb-2">
            <div className="flex gap-2 rounded-[10px] bg-blue-500/10 px-3 py-2.5 text-[13px] text-blue-700 dark:text-blue-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Thợ chụp chỉ có thể chuyển Chưa chụp → Đã chụp. Liên hệ quản lý để đổi trạng thái
                khác.
              </span>
            </div>
          </div>
        )
      )}
    </div>
  );
};

interface QuickStatusPickerProps {
  schedule: ScheduleResponse;
  role: StatusPickerRole;
  /** Current user is on this schedule's crew (photographers may only mark their own shoots). */
  onCrew: boolean;
  userId?: string;
  userRoles?: number[];
  isDesktop: boolean;
  onChanged: () => void;
  className?: string;
}

/** Status pill that opens the quick "Đổi trạng thái" picker (popover / bottom sheet). */
const QuickStatusPicker = ({
  schedule,
  role,
  onCrew,
  userId,
  userRoles,
  isDesktop,
  onChanged,
  className,
}: QuickStatusPickerProps) => {
  const [open, setOpen] = useState(false);

  if (isScheduleCancelled(schedule)) {
    return (
      <Badge variant="neutral" dot className={cn('whitespace-nowrap', className)}>
        {SCHEDULE_CANCELLED_LABEL}
      </Badge>
    );
  }

  const status = getShootStatus(schedule);
  const trigger = (
    <button
      type="button"
      aria-label={`Trạng thái: ${SHOOT_STATUS_LABELS[status]} — đổi trạng thái`}
      onClick={isDesktop ? undefined : () => setOpen(true)}
      className={cn(
        badgeVariants({ variant: SHOOT_STATUS_VARIANT[status] }),
        'cursor-pointer whitespace-nowrap py-1 hover:brightness-95 focus:ring-offset-0',
        className,
      )}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {SHOOT_STATUS_LABELS[status]}
      <ChevronDown className="h-3.5 w-3.5 opacity-70" />
    </button>
  );

  const body = (inDialog: boolean) => (
    <QuickStatusBody
      key={`${schedule._id}-${schedule.customer?.status}`}
      schedule={schedule}
      role={role}
      onCrew={onCrew}
      userId={userId}
      userRoles={userRoles}
      onClose={() => setOpen(false)}
      onChanged={onChanged}
      inDialog={inDialog}
    />
  );

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          align="start"
          collisionPadding={12}
          aria-label="Đổi trạng thái"
          className="w-[304px] overflow-hidden rounded-[14px] p-0"
        >
          {body(false)}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          aria-describedby={undefined}
          className={cn(SHEET_CONTENT_CLS, 'gap-0 px-0 pb-[env(safe-area-inset-bottom)]')}
        >
          <div className="flex justify-center" aria-hidden>
            <span className="h-1 w-10 rounded-full bg-border" />
          </div>
          {body(true)}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuickStatusPicker;
