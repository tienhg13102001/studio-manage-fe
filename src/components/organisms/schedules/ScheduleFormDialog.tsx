import {
  Button,
  Combobox,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  FormField,
  Input,
  MultiSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  TimePicker,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  Ban,
  CalendarPlus,
  Check,
  Info,
  MapPin,
  Plus,
  RotateCcw,
  Search,
  Shirt,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { scheduleService } from '../../../services/scheduleService';
import type {
  CostumeResponse,
  Customer,
  ExtraService,
  Package,
  ScheduleResponse,
  Season,
  User,
} from '../../../types';
import { ROLE_LABELS } from '../../../types';
import { classLabel } from '../../../utils/format';
import { CREW_EDITOR_HINT } from '../../../utils/permissions';
import { isScheduleCancelled } from '../../../utils/scheduleConstants';

/** Soft tinted square icon tile. */
const IconTile = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <span
    className={cn(
      'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] [&_svg]:h-4 [&_svg]:w-4',
      className,
    )}
  >
    {children}
  </span>
);

const SectionLabel = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground',
      className,
    )}
  >
    {children}
  </div>
);

const iconActionCls =
  'inline-flex h-[30px] w-[30px] items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

const GENDER_META: Record<'male' | 'female' | 'unisex', { label: string; cls: string }> = {
  male: {
    label: 'Nam',
    cls: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  },
  female: {
    label: 'Nữ',
    cls: 'bg-pink-500/15 text-pink-700 dark:text-pink-300',
  },
  unisex: {
    label: 'Unisex',
    cls: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  },
};

interface CostumePickerProps {
  costumes: CostumeResponse[];
  selected: string[];
  onChange: (next: string[]) => void;
  showError?: boolean;
}

const CostumePicker = ({ costumes, selected, onChange, showError }: CostumePickerProps) => {
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female' | 'unisex'>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return costumes.filter((c) => {
      if (genderFilter !== 'all' && c.gender !== genderFilter) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || (c.type?.name?.toLowerCase().includes(q) ?? false);
    });
  }, [costumes, search, genderFilter]);

  const groups = useMemo(() => {
    const map = new Map<string, { id: string; name: string; items: CostumeResponse[] }>();
    for (const c of filtered) {
      const id = c.type?._id ?? '__none__';
      const name = c.type?.name ?? 'Khác';
      if (!map.has(id)) map.set(id, { id, name, items: [] });
      map.get(id)!.items.push(c);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  const toggle = (id: string, on: boolean) => {
    onChange(on ? [...selected, id] : selected.filter((x) => x !== id));
  };

  const toggleGroup = (groupItems: CostumeResponse[], allSelected: boolean) => {
    const ids = groupItems.map((c) => c._id);
    if (allSelected) {
      onChange(selected.filter((id) => !ids.includes(id)));
    } else {
      onChange(Array.from(new Set([...selected, ...ids])));
    }
  };

  if (costumes.length === 0) {
    return (
      <div>
        <SectionLabel className="mb-3">
          Trang phục <span className="text-destructive">*</span>
        </SectionLabel>
        <div className="rounded-[12px] border border-dashed border-destructive/50 bg-destructive/5 px-4 py-6 text-center">
          <Shirt className="mx-auto mb-2 h-6 w-6 text-destructive" />
          <p className="text-sm font-medium text-destructive">
            Gói chụp này chưa có trang phục nào được liên kết.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionLabel className="mb-3">
        Trang phục <span className="text-destructive">*</span>
      </SectionLabel>

      <div
        className={cn(
          'rounded-[12px] border bg-muted/50 p-3 sm:p-4',
          showError && 'border-destructive/60',
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[10rem] flex-1 sm:max-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm trang phục..."
              className="h-9 bg-card pl-8"
            />
          </div>
          <div className="inline-flex items-center gap-0.5 rounded-[9px] bg-muted p-[3px] text-xs">
            {(['all', 'male', 'female', 'unisex'] as const).map((g) => {
              const active = genderFilter === g;
              const labels: Record<typeof g, string> = {
                all: 'Tất cả',
                male: 'Nam',
                female: 'Nữ',
                unisex: 'Unisex',
              };
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenderFilter(g)}
                  className={cn(
                    'rounded-[7px] px-2.5 py-1 transition-colors',
                    active
                      ? 'bg-card font-semibold text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.1)]'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {labels[g]}
                </button>
              );
            })}
          </div>
          <div className="ml-auto flex items-center gap-3 text-[13px]">
            {selected.length > 0 && (
              <span className="font-semibold text-primary-700 tabular dark:text-primary">
                {selected.length}/{costumes.length} đã chọn
              </span>
            )}
            {selected.length > 0 && (
              <button
                type="button"
                className="text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => onChange([])}
              >
                Bỏ chọn tất cả
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1">
          {groups.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Không tìm thấy trang phục phù hợp.
            </div>
          ) : (
            groups.map((g) => {
              const allSelected = g.items.every((c) => selected.includes(c._id));
              const someSelected = g.items.some((c) => selected.includes(c._id));
              return (
                <div key={g.id}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-foreground">{g.name}</span>
                      <span className="text-[11px] text-muted-foreground tabular">
                        {g.items.length}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="text-xs font-medium text-primary-700 hover:underline dark:text-primary"
                      onClick={() => toggleGroup(g.items, allSelected)}
                    >
                      {allSelected
                        ? 'Bỏ chọn nhóm'
                        : someSelected
                          ? 'Chọn hết nhóm'
                          : 'Chọn tất cả'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {g.items.map((c) => {
                      const checked = selected.includes(c._id);
                      const meta = GENDER_META[c.gender];
                      return (
                        <label
                          key={c._id}
                          className={cn(
                            'group inline-flex max-w-full cursor-pointer items-center gap-2 rounded-[9px] border bg-card px-2.5 py-1.5 transition-colors',
                            checked
                              ? 'border-primary bg-primary-100/60 dark:bg-primary/10'
                              : 'border-border hover:border-primary/50',
                          )}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={(e) => toggle(c._id, e.target.checked)}
                          />
                          <span
                            className={cn(
                              'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                              checked
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-muted-foreground/40 group-hover:border-primary',
                            )}
                          >
                            {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                          </span>
                          <span className="truncate text-[13px] text-foreground">{c.name}</span>
                          <span
                            className={cn(
                              'shrink-0 rounded-[5px] px-1.5 py-px text-[10px] font-semibold',
                              meta.cls,
                            )}
                          >
                            {meta.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showError && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
          <X className="h-3 w-3" /> Vui lòng chọn ít nhất một trang phục.
        </p>
      )}
    </div>
  );
};

interface ExtraServiceFormRow {
  name: string;
  quantity: number;
  unitPrice: number;
  note?: string;
}

/** Ép về số hợp lệ; ô number bị xoá trắng cho NaN → quy về 0. */
const toSafeNumber = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

interface ScheduleFormValues {
  customer: string;
  package?: string;
  shootDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  leadPhotographer?: string;
  bookedBy?: string;
  notes?: string;
  season?: string | null;
  extraServices: ExtraServiceFormRow[];
}

/** Customer prefill passed via location.state from CustomerDetailPage. */
export interface PrefillCustomer {
  _id: string;
  label?: string;
  season?: string | null;
  expectedShootDate?: string | null;
}

interface ScheduleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Schedule being edited; `null` → create. */
  editing: ScheduleResponse | null;
  /** Create only: class to preselect. */
  prefill: PrefillCustomer | null;
  /** Bumped on every open so the form re-initialises. */
  sessionKey: number;
  customers: Customer[];
  packages: Package[];
  photographers: User[];
  salesUsers: User[];
  seasons: Season[];
  selectedSeasonId: string;
  costumes: CostumeResponse[];
  onSaved: (saved: ScheduleResponse) => void;
  /** Ask to cancel / restore `editing` (confirmation handled by the page). */
  onToggleCancel: () => void;
  /** Only crew editors (see utils/permissions) may set the lead / support photographers. */
  canEditCrew: boolean;
}

/** Add / edit schedule form: shoot info, crew, costumes, extra services, notes. */
const ScheduleFormDialog = ({
  open,
  onOpenChange,
  editing,
  prefill,
  sessionKey,
  customers,
  packages,
  photographers,
  salesUsers,
  seasons,
  selectedSeasonId,
  costumes: allCostumes,
  onSaved,
  onToggleCancel,
  canEditCrew,
}: ScheduleFormDialogProps) => {
  const [selectedCostumes, setSelectedCostumes] = useState<string[]>([]);
  const [supportIds, setSupportIds] = useState<string[]>([]);
  const [costumeTouched, setCostumeTouched] = useState(false);
  /** Class passed in from CustomerDetailPage — may be missing from the (season-filtered, capped) list. */
  const [prefillCustomer, setPrefillCustomer] = useState<{ value: string; label: string } | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting, errors, isDirty },
    watch,
    getValues,
    setValue,
  } = useForm<ScheduleFormValues>({ defaultValues: { extraServices: [] } });

  const {
    fields: extraServiceFields,
    append: appendExtraService,
    remove: removeExtraService,
  } = useFieldArray({
    control,
    name: 'extraServices',
  });

  const selectedPackageId = watch('package');
  const selectedPackage = packages.find((p) => p._id === selectedPackageId);
  const packageTypeIds = useMemo(
    () => new Set((selectedPackage?.costumes ?? []).map((ct) => ct._id)),
    [selectedPackage],
  );
  const availableCostumes = useMemo(
    () => allCostumes.filter((c) => c.type && packageTypeIds.has(c.type._id)),
    [allCostumes, packageTypeIds],
  );

  useEffect(() => {
    if (!open) return;
    setCostumeTouched(false);
    if (editing) {
      setPrefillCustomer(null);
      setSupportIds(editing.supportPhotographers.map((u) => u._id));
      setSelectedCostumes(editing.costumes?.map((c) => c._id) ?? []);
      reset({
        customer: editing.customer._id,
        package: editing.package?._id ?? '',
        shootDate: editing.shootDate.slice(0, 10),
        startTime: editing.startTime,
        endTime: editing.endTime,
        location: editing.location,
        notes: editing.notes,
        leadPhotographer: editing.leadPhotographer?._id ?? '',
        bookedBy: editing.bookedBy?._id ?? '',
        extraServices: (editing.extraServices ?? []).map((es) => ({
          name: es.name,
          quantity: es.quantity,
          unitPrice: es.unitPrice,
          note: es.note,
        })),
      });
    } else {
      setSupportIds([]);
      setSelectedCostumes([]);
      setPrefillCustomer(prefill?.label ? { value: prefill._id, label: prefill.label } : null);
      reset({
        season: prefill?.season || selectedSeasonId || null,
        extraServices: [],
        ...(prefill?._id ? { customer: prefill._id } : {}),
        ...(prefill?.expectedShootDate
          ? { shootDate: prefill.expectedShootDate.slice(0, 10) }
          : {}),
      });
    }
    // Re-initialise only when a new form session starts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sessionKey]);

  const onSubmit = async (data: ScheduleFormValues) => {
    if (selectedCostumes.length === 0) {
      setCostumeTouched(true);
      toast.error('Vui lòng chọn ít nhất một trang phục.');
      return;
    }
    const payload = {
      ...data,
      costumes: selectedCostumes,
      leadPhotographer: data.leadPhotographer || undefined,
      bookedBy: data.bookedBy || undefined,
      supportPhotographers: supportIds,
      extraServices: (data.extraServices ?? []).map((es): ExtraService => {
        const quantity = toSafeNumber(es.quantity);
        const unitPrice = toSafeNumber(es.unitPrice);
        return { name: es.name, quantity, unitPrice, amount: quantity * unitPrice, note: es.note };
      }),
    };
    try {
      // create đợi backend tạo folder Drive xong mới trả về
      const saved = editing
        ? await scheduleService.update(editing._id, payload)
        : await scheduleService.create(payload);
      toast.success(editing ? 'Cập nhật lịch chụp thành công!' : 'Thêm lịch chụp thành công!');
      onOpenChange(false);
      onSaved(saved);
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  // Costumes / support photographers live outside react-hook-form, so compare them separately.
  const sameIds = (a: string[], b: string[]) =>
    a.length === b.length && [...a].sort().join() === [...b].sort().join();
  const hasUnsavedChanges =
    !!editing &&
    (isDirty ||
      !sameIds(
        selectedCostumes,
        (editing.costumes ?? []).map((c) => c._id),
      ) ||
      !sameIds(
        supportIds,
        editing.supportPhotographers.map((u) => u._id),
      ));

  const formFieldCls = 'h-10 rounded-[10px]';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[900px]">
        <div className="flex shrink-0 items-center gap-3 border-b px-5 py-4 pr-12 sm:px-6">
          <IconTile className="h-10 w-10 rounded-[10px] bg-primary-100 text-primary-700 dark:bg-primary/15 dark:text-primary">
            <CalendarPlus />
          </IconTile>
          <div className="min-w-0 text-left">
            <DialogTitle>{editing ? 'Sửa lịch chụp' : 'Thêm lịch chụp'}</DialogTitle>
            <DialogDescription className="mt-0.5 text-[13px]">
              {editing
                ? 'Cập nhật thông tin buổi chụp, ekip và trang phục.'
                : 'Tạo lịch sẽ tự tạo folder ảnh trên Google Drive.'}
            </DialogDescription>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
            <section>
              <SectionLabel className="mb-3">Thông tin buổi chụp</SectionLabel>
              <div className="grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <FormField label="Lớp" required>
                  <Controller
                    name="customer"
                    control={control}
                    rules={{ required: true }}
                    render={({ field, fieldState }) => (
                      <>
                        <Combobox
                          options={[
                            ...(prefillCustomer &&
                            !customers.some((c) => c._id === prefillCustomer.value)
                              ? [prefillCustomer]
                              : []),
                            ...customers.map((c) => ({
                              value: c._id,
                              label: classLabel(c),
                            })),
                          ]}
                          value={field.value ?? ''}
                          onChange={(v) => {
                            field.onChange(v);
                            // Lịch mới chưa chọn ngày → lấy ngày dự kiến chụp của lớp
                            const expected = customers.find((c) => c._id === v)?.expectedShootDate;
                            if (!editing && expected && !getValues('shootDate')) {
                              setValue('shootDate', expected.slice(0, 10), {
                                shouldDirty: true,
                              });
                            }
                          }}
                          placeholder="-- Chọn lớp --"
                          className={formFieldCls}
                        />
                        {fieldState.error && (
                          <p className="mt-1 text-xs text-destructive">Vui lòng chọn lớp.</p>
                        )}
                      </>
                    )}
                  />
                </FormField>
                <FormField label="Gói chụp" required>
                  <Controller
                    name="package"
                    control={control}
                    rules={{ required: true }}
                    render={({ field, fieldState }) => (
                      <>
                        <Combobox
                          options={packages.map((p) => ({
                            value: p._id,
                            label: `${p.name} – ${p.pricePerMember.toLocaleString('vi-VN')}₫/thành viên`,
                          }))}
                          value={field.value ?? ''}
                          onChange={(v) => field.onChange(v || undefined)}
                          placeholder="-- Chọn gói chụp --"
                          className={formFieldCls}
                        />
                        {fieldState.error && (
                          <p className="mt-1 text-xs text-destructive">Vui lòng chọn gói chụp.</p>
                        )}
                      </>
                    )}
                  />
                </FormField>
                <FormField label="Ngày chụp" required htmlFor="shootDate">
                  <Controller
                    name="shootDate"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Chọn ngày chụp"
                        className={formFieldCls}
                      />
                    )}
                  />
                  {errors.shootDate && (
                    <p className="mt-1 text-xs text-destructive">Vui lòng chọn ngày chụp.</p>
                  )}
                </FormField>
                <FormField label="Giờ bắt đầu" htmlFor="startTime">
                  <Controller
                    name="startTime"
                    control={control}
                    render={({ field }) => (
                      <TimePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Chọn giờ bắt đầu"
                        className={formFieldCls}
                      />
                    )}
                  />
                </FormField>
                <FormField label="Giờ kết thúc" htmlFor="endTime">
                  <Controller
                    name="endTime"
                    control={control}
                    render={({ field }) => (
                      <TimePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Chọn giờ kết thúc"
                        className={formFieldCls}
                      />
                    )}
                  />
                </FormField>
                <FormField label="Mùa chụp">
                  <Controller
                    name="season"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ''}
                        onValueChange={(v) => field.onChange(v || null)}
                      >
                        <SelectTrigger className={cn(formFieldCls, 'bg-card')}>
                          <SelectValue placeholder="-- Chọn mùa --" />
                        </SelectTrigger>
                        <SelectContent>
                          {seasons.map((s) => (
                            <SelectItem key={s._id} value={s._id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
                <FormField label="Địa điểm" htmlFor="location">
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="location" className="pl-9" {...register('location')} />
                  </div>
                </FormField>
                <FormField label="Người chốt lớp (Sale)">
                  <Controller
                    name="bookedBy"
                    control={control}
                    render={({ field }) => (
                      <Combobox
                        options={salesUsers.map((u) => ({
                          value: u._id,
                          label: u.username + (u.name ? ` (${u.name})` : ''),
                        }))}
                        value={field.value ?? ''}
                        onChange={(v) => field.onChange(v || undefined)}
                        placeholder="-- Không chỉ định --"
                        className={formFieldCls}
                      />
                    )}
                  />
                </FormField>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2">
                <FormField label="Thợ chính">
                  <Controller
                    name="leadPhotographer"
                    control={control}
                    render={({ field }) => (
                      <Combobox
                        options={photographers.map((u) => ({
                          value: u._id,
                          label: `${u.username}${u.name ? ` (${u.name})` : ''} – ${ROLE_LABELS[3]}`,
                        }))}
                        value={field.value ?? ''}
                        onChange={(v) => field.onChange(v || undefined)}
                        placeholder="-- Không chỉ định --"
                        disabled={!canEditCrew}
                        className={formFieldCls}
                      />
                    )}
                  />
                </FormField>
                {watch('leadPhotographer') && (
                  <FormField label="Thợ phụ">
                    <MultiSelect
                      options={photographers
                        .filter((u) => u._id !== watch('leadPhotographer'))
                        .map((u) => ({
                          value: u._id,
                          label: `${u.username}${u.name ? ` (${u.name})` : ''}`,
                        }))}
                      value={supportIds}
                      onChange={setSupportIds}
                      placeholder={`-- Chọn ${ROLE_LABELS[3].toLowerCase()} support --`}
                      emptyText="Không có người dùng phù hợp"
                      maxBadges={8}
                      disabled={!canEditCrew}
                      className="min-h-10 rounded-[10px]"
                    />
                  </FormField>
                )}
              </div>
              {!canEditCrew && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 shrink-0" /> {CREW_EDITOR_HINT}
                </p>
              )}
            </section>

            {selectedPackageId && (
              <section>
                <CostumePicker
                  costumes={availableCostumes}
                  selected={selectedCostumes}
                  onChange={setSelectedCostumes}
                  showError={costumeTouched && selectedCostumes.length === 0}
                />
              </section>
            )}

            {/* Dịch vụ sử dụng thêm */}
            <section>
              <SectionLabel className="mb-3">Dịch vụ sử dụng thêm</SectionLabel>
              {extraServiceFields.length > 0 && (
                <div className="overflow-x-auto rounded-[12px] border">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/60 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                        <th className="px-3 py-2.5 text-left font-bold">Tên</th>
                        <th className="w-24 px-3 py-2.5 text-left font-bold">Số lượng</th>
                        <th className="w-32 px-3 py-2.5 text-left font-bold">Đơn giá (₫)</th>
                        <th className="w-32 px-3 py-2.5 text-left font-bold">Thành tiền</th>
                        <th className="px-3 py-2.5 text-left font-bold">Ghi chú</th>
                        <th className="w-10 px-2 py-2.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {extraServiceFields.map((field, idx) => {
                        const qty = toSafeNumber(watch(`extraServices.${idx}.quantity`));
                        const price = toSafeNumber(watch(`extraServices.${idx}.unitPrice`));
                        const amount = qty * price;
                        return (
                          <tr key={field.id}>
                            <td className="px-3 py-2">
                              <Input
                                {...register(`extraServices.${idx}.name`)}
                                placeholder="Tên dịch vụ"
                                className="h-9"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                {...register(`extraServices.${idx}.quantity`, {
                                  valueAsNumber: true,
                                })}
                                type="number"
                                min={1}
                                className="h-9 tabular"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                {...register(`extraServices.${idx}.unitPrice`, {
                                  valueAsNumber: true,
                                })}
                                type="number"
                                min={0}
                                className="h-9 tabular"
                              />
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 font-semibold text-foreground tabular">
                              {amount.toLocaleString('vi-VN')}₫
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                {...register(`extraServices.${idx}.note`)}
                                placeholder="Ghi chú"
                                className="h-9"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <button
                                type="button"
                                onClick={() => removeExtraService(idx)}
                                className={cn(
                                  iconActionCls,
                                  'hover:bg-rose-500/10 hover:text-rose-600',
                                )}
                                title="Xoá"
                                aria-label="Xoá"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-muted/40">
                        <td colSpan={3} className="px-3 py-2.5 font-semibold text-foreground">
                          Tổng cộng:
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 font-bold text-foreground tabular">
                          {extraServiceFields
                            .reduce((sum, _, idx) => {
                              const qty = toSafeNumber(watch(`extraServices.${idx}.quantity`));
                              const price = toSafeNumber(watch(`extraServices.${idx}.unitPrice`));
                              return sum + qty * price;
                            }, 0)
                            .toLocaleString('vi-VN')}
                          ₫
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              <button
                type="button"
                className={cn(
                  'inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary-700 hover:underline dark:text-primary',
                  extraServiceFields.length > 0 && 'mt-3',
                )}
                onClick={() =>
                  appendExtraService({ name: '', quantity: 1, unitPrice: 0, note: '' })
                }
              >
                <Plus className="h-4 w-4" /> Thêm dịch vụ
              </button>
            </section>

            <FormField label="Ghi chú" htmlFor="notes">
              <Textarea id="notes" rows={3} {...register('notes')} />
            </FormField>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t bg-muted/40 px-5 py-3.5 sm:px-6">
            {editing && (
              // Wrapper carries the tooltip: a disabled button receives no pointer events
              <span
                className="mr-auto"
                title={hasUnsavedChanges ? 'Lưu thay đổi trước' : undefined}
              >
                <Button
                  type="button"
                  variant="ghost"
                  disabled={hasUnsavedChanges}
                  className={cn(
                    'px-2',
                    !isScheduleCancelled(editing) &&
                      'text-rose-600 hover:bg-rose-500/10 hover:text-rose-600',
                  )}
                  onClick={onToggleCancel}
                >
                  {isScheduleCancelled(editing) ? (
                    <>
                      <RotateCcw /> Khôi phục lịch
                    </>
                  ) : (
                    <>
                      <Ban /> Huỷ lịch
                    </>
                  )}
                </Button>
              </span>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Check /> Lưu lịch chụp
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleFormDialog;
