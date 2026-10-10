import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlarmClock, Check, Info, Plus, Search, Users, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
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
import { externalPhotographerService } from '../../../services/externalPhotographerService';
import {
  getSchoolName,
  type BusySchedule,
  type ExternalCrewAssignment,
  type ExternalCrewConfirmation,
  type ExternalPhotographer,
  type ScheduleResponse,
  type User,
} from '../../../types';
import { neededCrewCount } from '../../../utils/crewCount';
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
const EXTERNAL_PREFIX = 'external:';
const CONFIRMATION_LABELS: Record<ExternalCrewConfirmation, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  declined: 'Từ chối',
};

interface BodyProps {
  schedule: ScheduleResponse;
  photographers: User[];
  externalPhotographers: ExternalPhotographer[];
  onExternalCreated: (person: ExternalPhotographer) => void;
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

const CrewEditorBody = ({
  schedule,
  photographers,
  externalPhotographers,
  onExternalCreated,
  onClose,
  onSaved,
  inDialog,
}: BodyProps) => {
  const [lead, setLead] = useState(schedule.leadPhotographer?._id ?? '');
  const [supports, setSupports] = useState(() => schedule.supportPhotographers.map((u) => u._id));
  const [externalCrew, setExternalCrew] = useState<ExternalCrewAssignment[]>(() =>
    (schedule.externalCrew ?? [])
      .filter((entry) => entry.photographer)
      .map((entry) => ({
        photographer: entry.photographer!._id,
        role: entry.role,
        confirmation: entry.confirmation,
      })),
  );
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<BusySchedule[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickFee, setQuickFee] = useState('');
  const [creatingExternal, setCreatingExternal] = useState(false);

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

  const externalPeople = useMemo(() => {
    const map = new Map<string, ExternalPhotographer>();
    for (const person of externalPhotographers) map.set(person._id, person);
    for (const entry of schedule.externalCrew ?? []) {
      if (entry.photographer && !map.has(entry.photographer._id)) {
        map.set(entry.photographer._id, { ...entry.photographer });
      }
    }
    return [...map.values()].filter(
      (person) =>
        person.isActive || externalCrew.some((entry) => entry.photographer === person._id),
    );
  }, [externalPhotographers, schedule.externalCrew, externalCrew]);

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

  const busyByExternal = useMemo(() => {
    const map = new Map<string, BusySchedule[]>();
    for (const row of busy ?? []) {
      for (const entry of row.externalCrew ?? []) {
        if (entry.confirmation === 'declined') continue;
        map.set(entry.photographer, [...(map.get(entry.photographer) ?? []), row]);
      }
    }
    return map;
  }, [busy]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return people;
    return people.filter((u) => `${u.name ?? ''} ${u.username}`.toLowerCase().includes(q));
  }, [people, search]);
  const filteredExternal = useMemo(() => {
    const q = search.trim().toLowerCase();
    return externalPeople.filter(
      (person) => !q || `${person.name} ${person.phone ?? ''}`.toLowerCase().includes(q),
    );
  }, [externalPeople, search]);

  const pkg = schedule.package;
  const total = schedule.customer?.total;
  const contractCrew = schedule.customer?.contract?.crewCount ?? null;
  const needed = neededCrewCount(schedule.customer, pkg?.studentsPerCrew);
  const externalLead = externalCrew.find((entry) => entry.role === 'lead');
  const assigned =
    (lead ? 1 : 0) +
    supports.filter((id) => id !== lead).length +
    externalCrew.filter((entry) => entry.confirmation !== 'declined').length;
  const missing = needed ? Math.max(needed - assigned, 0) : 0;

  const pickLead = (id: string) => {
    if (id.startsWith(EXTERNAL_PREFIX)) {
      const externalId = id.slice(EXTERNAL_PREFIX.length);
      setLead('');
      setExternalCrew((prev) => [
        ...prev.filter((entry) => entry.role !== 'lead' && entry.photographer !== externalId),
        {
          photographer: externalId,
          role: 'lead',
          confirmation:
            prev.find((entry) => entry.photographer === externalId)?.confirmation ?? 'pending',
        },
      ]);
    } else {
      setLead(id);
      setSupports((prev) => prev.filter((x) => x !== id));
      setExternalCrew((prev) => prev.filter((entry) => entry.role !== 'lead'));
    }
  };

  const toggleSupport = (id: string, on: boolean) =>
    setSupports((prev) => (on ? [...prev, id] : prev.filter((x) => x !== id)));

  const toggleExternalSupport = (id: string, on: boolean) =>
    setExternalCrew((prev) =>
      on
        ? [...prev, { photographer: id, role: 'support', confirmation: 'pending' }]
        : prev.filter((entry) => entry.photographer !== id),
    );

  const setExternalConfirmation = (id: string, confirmation: ExternalCrewConfirmation) =>
    setExternalCrew((prev) =>
      prev.map((entry) => (entry.photographer === id ? { ...entry, confirmation } : entry)),
    );

  const createExternal = async () => {
    const name = quickName.trim();
    const fee = quickFee.trim() === '' ? null : Number(quickFee);
    if (!name) {
      toast.error('Vui lòng nhập tên thợ ngoài.');
      return;
    }
    if (fee !== null && (!Number.isFinite(fee) || fee < 0)) {
      toast.error('Chi phí phải là số không âm.');
      return;
    }
    setCreatingExternal(true);
    try {
      const person = await externalPhotographerService.create({
        name,
        phone: quickPhone.trim(),
        defaultFee: fee,
        isActive: true,
      });
      onExternalCreated(person);
      setExternalCrew((prev) => [
        ...prev,
        { photographer: person._id, role: 'support', confirmation: 'pending' },
      ]);
      setSearch('');
      setQuickName('');
      setQuickPhone('');
      setQuickFee('');
      setQuickAddOpen(false);
      toast.success('Đã thêm thợ ngoài. Bấm Lưu để phân công vào lịch.');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Không thêm được thợ ngoài.'));
    } finally {
      setCreatingExternal(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await scheduleService.update(schedule._id, {
        leadPhotographer: lead || null,
        supportPhotographers: supports.filter((id) => id !== lead),
        externalCrew,
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
  const externalAvailability = (id: string) => {
    if (busy === null) return 'Đang kiểm tra lịch…';
    return busyLabel(busyByExternal.get(id)) ?? 'Rảnh cả ngày';
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
  const externalLeadPerson = externalPeople.find(
    (person) => person._id === externalLead?.photographer,
  );

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
                {contractCrew != null
                  ? 'Theo hợp đồng'
                  : `${total ?? 0} HS · ${pkg?.studentsPerCrew} HS/thợ`}
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
          <Select
            value={
              externalLead ? `${EXTERNAL_PREFIX}${externalLead.photographer}` : lead || NO_LEAD
            }
            onValueChange={(v) => pickLead(v === NO_LEAD ? '' : v)}
          >
            <SelectTrigger className="h-11 rounded-[10px] bg-card shadow-none data-[state=open]:border-primary">
              {leadUser || externalLeadPerson ? (
                <div className="flex min-w-0 flex-1 items-center gap-2 pl-0.5">
                  <CrewAvatar
                    name={leadUser ? personName(leadUser) : externalLeadPerson!.name}
                    size={24}
                    lead
                  />
                  <span className="truncate font-semibold text-foreground">
                    {leadUser ? personName(leadUser) : externalLeadPerson!.name}
                  </span>
                  {externalLeadPerson && (
                    <span className="text-xs text-sky-600 dark:text-sky-300">Ngoài</span>
                  )}
                  <span className="ml-auto mr-1 shrink-0 text-xs font-semibold">
                    {busy === null ? null : (
                        externalLeadPerson
                          ? busyByExternal.get(externalLeadPerson._id)?.length
                          : busyByUser.get(lead)?.length
                      ) ? (
                      <span className="text-amber-700 dark:text-amber-300">Bận</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        Rảnh
                      </span>
                    )}
                  </span>
                </div>
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
              {externalPeople.map((person) => (
                <SelectItem
                  key={`${EXTERNAL_PREFIX}${person._id}`}
                  value={`${EXTERNAL_PREFIX}${person._id}`}
                >
                  <span className="flex flex-col">
                    <span className="font-medium">{person.name} · Thợ ngoài</span>
                    <span className="text-xs text-muted-foreground">
                      {externalAvailability(person._id)}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {externalLead && (
            <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              Xác nhận
              <select
                value={externalLead.confirmation}
                onChange={(event) =>
                  setExternalConfirmation(
                    externalLead.photographer,
                    event.target.value as ExternalCrewConfirmation,
                  )
                }
                className="rounded-md border bg-card px-2 py-1 text-foreground"
              >
                {Object.entries(CONFIRMATION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
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
              className="h-9 rounded-[10px] border-transparent bg-muted pl-9 shadow-none"
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

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2 text-[13px]">
            <span className="font-semibold text-muted-foreground">Thợ ngoài hỗ trợ</span>
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuickAddOpen((open) => !open)}
                className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary-700 hover:underline dark:text-primary"
              >
                <Plus className="h-3.5 w-3.5" /> Thêm nhanh
              </button>
              <Link
                to="/manage/external-photographers"
                className="text-xs text-muted-foreground hover:underline"
                onClick={onClose}
              >
                Quản lý
              </Link>
            </span>
          </div>
          {quickAddOpen && (
            <div className="mb-2 space-y-2 rounded-[10px] border bg-muted/40 p-2.5">
              <Input
                value={quickName}
                onChange={(event) => setQuickName(event.target.value)}
                placeholder="Tên thợ ngoài *"
                aria-label="Tên thợ ngoài"
                autoFocus
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={quickPhone}
                  onChange={(event) => setQuickPhone(event.target.value)}
                  type="tel"
                  placeholder="Số điện thoại"
                  aria-label="Số điện thoại thợ ngoài"
                />
                <Input
                  value={quickFee}
                  onChange={(event) => setQuickFee(event.target.value)}
                  type="number"
                  min={0}
                  placeholder="Chi phí/buổi"
                  aria-label="Chi phí mặc định mỗi buổi"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setQuickAddOpen(false)}
                >
                  Huỷ
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={createExternal}
                  disabled={creatingExternal}
                >
                  {creatingExternal ? <Spinner size="sm" /> : <Plus className="h-3.5 w-3.5" />}
                  Thêm & chọn
                </Button>
              </div>
            </div>
          )}
          {filteredExternal.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">Chưa có thợ ngoài phù hợp.</p>
          ) : (
            <div className="space-y-1">
              {filteredExternal.map((person) => {
                const assignment = externalCrew.find((entry) => entry.photographer === person._id);
                const isLead = assignment?.role === 'lead';
                const checked = assignment?.role === 'support';
                return (
                  <div key={person._id} className="rounded-[10px] px-2.5 py-2 hover:bg-muted/60">
                    <label
                      className={cn(
                        'flex cursor-pointer items-center gap-3',
                        isLead && 'cursor-not-allowed opacity-50',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isLead}
                        onChange={(event) =>
                          toggleExternalSupport(person._id, event.target.checked)
                        }
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={cn(
                          'inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring',
                          checked
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-card',
                        )}
                      >
                        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <CrewAvatar name={person.name} size={28} className="ring-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{person.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {isLead ? 'Đang là thợ chính' : externalAvailability(person._id)}
                          {person.phone ? ` · ${person.phone}` : ''}
                          {person.defaultFee != null
                            ? ` · ${person.defaultFee.toLocaleString('vi-VN')}₫`
                            : ''}
                        </span>
                      </span>
                    </label>
                    {assignment?.role === 'support' && (
                      <label className="ml-7 mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        Xác nhận
                        <select
                          value={assignment.confirmation}
                          onChange={(event) =>
                            setExternalConfirmation(
                              person._id,
                              event.target.value as ExternalCrewConfirmation,
                            )
                          }
                          className="rounded-md border bg-card px-2 py-1 text-foreground"
                        >
                          {Object.entries(CONFIRMATION_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t bg-muted/40 px-4 py-3">
        <span className="mr-auto inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            Thợ nội bộ được báo qua Telegram; liên hệ thợ ngoài trực tiếp
          </span>
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
  externalPhotographers: ExternalPhotographer[];
  onExternalCreated: (person: ExternalPhotographer) => void;
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
  externalPhotographers,
  onExternalCreated,
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
              externalPhotographers={externalPhotographers}
              onExternalCreated={onExternalCreated}
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
              ? 'max-h-[calc(100dvh-2rem)] max-w-[372px] rounded-[14px] [&>button:last-child]:hidden'
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
              externalPhotographers={externalPhotographers}
              onExternalCreated={onExternalCreated}
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
