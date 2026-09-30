import type { Column } from '@/components/ui';
import {
  Badge,
  Button,
  Combobox,
  ConfirmDialog,
  DataTable,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  FormField,
  Input,
  MultiSelect,
  PageHeader,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TableSkeleton,
  Textarea,
  TimePicker,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  Calendar,
  CalendarPlus,
  Check,
  Clock,
  ExternalLink,
  FileText,
  FolderOpen,
  Gift,
  MapPin,
  Pencil,
  Plus,
  Search,
  Shirt,
  StickyNote,
  Table as TableIcon,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { ContractDialog, ScheduleCalendar } from '../components/organisms';
import { costumeService } from '../services/costumeService';
import { scheduleService } from '../services/scheduleService';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchCustomers } from '../store/slices/customersSlice';
import { fetchPackages } from '../store/slices/packagesSlice';
import { fetchSchedules } from '../store/slices/schedulesSlice';
import { fetchPhotographers, fetchSales } from '../store/slices/usersSlice';
import type { CostumeResponse, ExtraService, ScheduleResponse } from '../types';
import { ROLE_LABELS } from '../types';
import { formatDate } from '../utils/format';
import { SCHEDULE_STATUS_LABEL as statusLabel } from '../utils/scheduleConstants';

interface FilterState {
  status: string;
  dateFrom: string;
  dateTo: string;
  customer: string;
}

const defaultFilter: FilterState = { status: '', dateFrom: '', dateTo: '', customer: '' };
const ALL = '__all__';

const STATUS_VARIANT: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
  pending: 'warning',
  confirmed: 'info',
  completed: 'success',
  cancelled: 'danger',
};

const StatusBadge = ({ status, className }: { status: string; className?: string }) => (
  <Badge variant={STATUS_VARIANT[status] ?? 'neutral'} dot className={className}>
    {statusLabel[status] ?? status}
  </Badge>
);

/** Vietnamese names: the given name is the last word → use its first letter. */
const getInitial = (fullName: string) => {
  const words = fullName.trim().split(/\s+/);
  return (words[words.length - 1]?.[0] ?? '?').toUpperCase();
};

const getHue = (s: string) => {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
};

const AVATAR_TONES = [
  'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
  'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200',
  'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
  'bg-pink-100 text-pink-800 dark:bg-pink-500/20 dark:text-pink-200',
  'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200',
];

const avatarTone = (name: string) => AVATAR_TONES[getHue(name) % AVATAR_TONES.length];

const UserAvatar = ({
  name,
  size = 26,
  tooltip,
  className,
}: {
  name: string;
  size?: number;
  tooltip?: string;
  className?: string;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span
        className={cn(
          'inline-flex shrink-0 cursor-default select-none items-center justify-center rounded-full text-[11px] font-bold ring-2 ring-card',
          avatarTone(name),
          className,
        )}
        style={{ width: size, height: size }}
        aria-label={tooltip ?? name}
      >
        {getInitial(name)}
      </span>
    </TooltipTrigger>
    <TooltipContent>{tooltip ?? name}</TooltipContent>
  </Tooltip>
);

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

const filterControlCls = 'h-[38px] rounded-[10px] border-border bg-card shadow-none';

const DOW_LONG = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

const formatDateWithDow = (iso: string) => {
  const d = new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  return Number.isNaN(d.getTime())
    ? formatDate(iso)
    : `${DOW_LONG[d.getDay()]}, ${formatDate(iso)}`;
};

const InfoRow = ({
  icon,
  tone,
  label,
  children,
}: {
  icon: React.ReactNode;
  tone: string;
  label: string;
  children?: React.ReactNode;
}) => (
  <div className="flex items-center gap-3">
    <IconTile className={tone}>{icon}</IconTile>
    <div className="min-w-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="break-words text-sm font-medium text-foreground">
        {children || <span className="font-normal italic text-muted-foreground">Chưa có</span>}
      </div>
    </div>
  </div>
);

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
              className="h-9 bg-card pl-8 text-base sm:text-sm"
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
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  leadPhotographer?: string;
  bookedBy?: string;
  notes?: string;
  season?: string | null;
  extraServices: ExtraServiceFormRow[];
}

const SchedulesPage = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { list: schedules, total, loading } = useAppSelector((s) => s.schedules);
  const { list: customers } = useAppSelector((s) => s.customers);
  const { list: packages } = useAppSelector((s) => s.packages);
  const { photographers, sales: salesUsers } = useAppSelector((s) => s.users);
  const { list: seasons, selectedSeasonId } = useAppSelector((s) => s.seasons);
  const [filter, setFilter] = useState<FilterState>(defaultFilter);
  const [appliedFilter, setAppliedFilter] = useState<FilterState>(defaultFilter);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [allCostumes, setAllCostumes] = useState<CostumeResponse[]>([]);
  const [selectedCostumes, setSelectedCostumes] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleResponse | null>(null);
  const [supportIds, setSupportIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [detail, setDetail] = useState<ScheduleResponse | null>(null);
  const [costumeTouched, setCostumeTouched] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [contractSchedule, setContractSchedule] = useState<ScheduleResponse | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting, errors },
    watch,
  } = useForm<ScheduleFormValues>({ defaultValues: { extraServices: [] } });

  const {
    fields: extraServiceFields,
    append: appendExtraService,
    remove: removeExtraService,
  } = useFieldArray({
    control,
    name: 'extraServices',
  });

  const buildFilterParams = (
    f: FilterState,
    p: number,
    l: number,
  ): Record<string, string | number> => {
    const params: Record<string, string | number> = { page: p, limit: l };
    if (f.status) params.status = f.status;
    if (f.dateFrom) params.dateFrom = f.dateFrom;
    if (f.dateTo) params.dateTo = f.dateTo;
    if (f.customer) params.customer = f.customer;
    if (selectedSeasonId) params.season = selectedSeasonId;
    return params;
  };

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
    dispatch(fetchSchedules(buildFilterParams(appliedFilter, page, pageSize)));
    dispatch(
      fetchCustomers(selectedSeasonId ? { limit: 200, season: selectedSeasonId } : { limit: 200 }),
    );
    dispatch(fetchPackages());
    dispatch(fetchPhotographers());
    dispatch(fetchSales());
    costumeService.getAll().then(setAllCostumes);
  }, [dispatch, appliedFilter, page, pageSize, selectedSeasonId]);

  const openCreate = () => {
    setEditing(null);
    setSupportIds([]);
    setSelectedCostumes([]);
    setCostumeTouched(false);
    reset({ status: 'pending', season: selectedSeasonId || null, extraServices: [] });
    setModalOpen(true);
  };

  useEffect(() => {
    if ((location.state as { openCreate?: boolean } | null)?.openCreate) {
      openCreate();
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEdit = (s: ScheduleResponse) => {
    setEditing(s);
    const leadId = s.leadPhotographer?._id ?? '';
    const supIds = s.supportPhotographers.map((u) => u._id);
    setSupportIds(supIds);
    setSelectedCostumes(s.costumes?.map((c) => c._id) ?? []);
    setCostumeTouched(false);
    reset({
      customer: s.customer._id,
      package: s.package?._id ?? '',
      shootDate: s.shootDate.slice(0, 10),
      startTime: s.startTime,
      endTime: s.endTime,
      location: s.location,
      status: s.status,
      notes: s.notes,
      leadPhotographer: leadId,
      bookedBy: s.bookedBy?._id ?? '',
      extraServices: (s.extraServices ?? []).map((es) => ({
        name: es.name,
        quantity: es.quantity,
        unitPrice: es.unitPrice,
        note: es.note,
      })),
    });
    setModalOpen(true);
  };

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
      const isEditing = !!editing;
      // create đợi backend tạo folder Drive xong mới trả về, nên getOne đã có
      // driveFolderUrl đầy đủ → mở thẳng modal chi tiết.
      const saved = isEditing
        ? await scheduleService.update(editing!._id, payload)
        : await scheduleService.create(payload);
      toast.success(isEditing ? 'Cập nhật lịch chụp thành công!' : 'Thêm lịch chụp thành công!');
      setModalOpen(false);
      dispatch(fetchSchedules(buildFilterParams(appliedFilter, page, pageSize)));

      setDetail(await scheduleService.getOne(saved._id));
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const handleDelete = (id: string) => setConfirmId(id);

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await scheduleService.remove(confirmId);
      toast.success('Đã xoá lịch chụp.');
      dispatch(fetchSchedules(buildFilterParams(appliedFilter, page, pageSize)));
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  const handleDownloadContract = (s: ScheduleResponse) => setContractSchedule(s);

  const applyFilter = () => {
    setPage(1);
    setAppliedFilter(filter);
  };
  const resetFilter = () => {
    setFilter(defaultFilter);
    setAppliedFilter(defaultFilter);
    setPage(1);
  };

  const calendarItems = useMemo(
    () =>
      schedules.map((s) => ({
        _id: s._id,
        shootDate: s.shootDate,
        startTime: s.startTime,
        endTime: s.endTime,
        location: s.location,
        status: s.status,
        notes: s.notes,
        className: s.customer?.className ?? '—',
        leadName: s.leadPhotographer?.name ?? s.leadPhotographer?.username,
        school: s.customer?.school,
        packageName: s.package?.name,
        packagePrice: s.package?.pricePerMember,
        supportNames: s.supportPhotographers
          .map((u) => u.name ?? u.username)
          .filter(Boolean) as string[],
        driveFolderUrl: s.driveFolderUrl,
        studentCount: s.customer?.total,
      })),
    [schedules],
  );

  // Status counts are only meaningful when every matching schedule is on this page.
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    schedules.forEach((s) => {
      counts[s.status] = (counts[s.status] ?? 0) + 1;
    });
    return counts;
  }, [schedules]);
  const showStatusCounts = schedules.length > 0 && schedules.length >= total;

  const findSchedule = (id: string) => schedules.find((x) => x._id === id);

  const scheduleColumns: Column<ScheduleResponse>[] = [
    {
      key: 'date',
      header: 'Ngày chụp',
      render: (s) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground tabular">{formatDate(s.shootDate)}</span>
          <span className="whitespace-nowrap break-keep text-xs text-muted-foreground tabular">{`${s.startTime ?? ''}${s.endTime ? ` – ${s.endTime}` : ''}`}</span>
        </div>
      ),
    },
    {
      key: 'class',
      header: 'Lớp',
      render: (s) => (
        <div className="flex flex-col">
          <span className="whitespace-nowrap break-keep font-semibold text-foreground">
            {s.customer?.className ?? '—'}
          </span>
          <span className="whitespace-nowrap break-keep text-xs text-muted-foreground">
            {s.customer?.school ?? ''}
          </span>
        </div>
      ),
    },
    {
      key: 'package',
      header: 'Gói chụp',
      className: 'whitespace-nowrap text-foreground/80',
      render: (s) => s.package?.name ?? '—',
    },
    {
      key: 'crew',
      header: 'Ekip',
      render: (s) => {
        const sale = s.bookedBy?.name ?? s.bookedBy?.username;
        const lead = s.leadPhotographer?.name ?? s.leadPhotographer?.username;
        const crew = [
          ...(sale ? [{ name: sale, role: 'Sale' }] : []),
          ...(lead ? [{ name: lead, role: 'Leader' }] : []),
          ...(
            s.supportPhotographers.map((u) => u.name ?? u.username).filter(Boolean) as string[]
          ).map((name) => ({ name, role: 'Support' })),
        ];
        if (crew.length === 0) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="inline-flex -space-x-1.5">
            {crew.map((c, i) => (
              <UserAvatar key={i} name={c.name} tooltip={`${c.role}: ${c.name}`} />
            ))}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (s) => <StatusBadge status={s.status} className="whitespace-nowrap" />,
    },
    {
      key: 'notes',
      header: 'Ghi chú',
      render: (s) =>
        s.notes ? (
          <span
            className="inline-flex max-w-[220px] items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 dark:bg-amber-500/10 dark:text-amber-200"
            title={s.notes}
          >
            <StickyNote className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{s.notes}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (s) => (
        <span className="inline-flex items-center gap-0.5">
          <button
            type="button"
            className={iconActionCls}
            title="Hợp đồng"
            aria-label="Hợp đồng"
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadContract(s);
            }}
          >
            <FileText className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={iconActionCls}
            title="Sửa"
            aria-label="Sửa"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(s);
            }}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={cn(iconActionCls, 'text-rose-600 hover:bg-rose-500/10 hover:text-rose-600')}
            title="Xoá"
            aria-label="Xoá"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(s._id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </span>
      ),
    },
  ];

  const formFieldCls = 'h-10 rounded-[10px]';

  return (
    <div className="flex flex-col md:min-h-0 md:flex-1">
      <PageHeader
        kicker="Schedules"
        title="Lịch chụp"
        description="Theo dõi và sắp xếp lịch chụp ảnh theo ngày."
        action={
          <div className="flex w-full items-center justify-between gap-2 md:w-auto">
            <SegmentedControl
              value={viewMode}
              onChange={(v) => setViewMode(v as 'table' | 'calendar')}
              items={[
                { value: 'table', label: 'Bảng', icon: <TableIcon className="h-3.5 w-3.5" /> },
                { value: 'calendar', label: 'Lịch', icon: <Calendar className="h-3.5 w-3.5" /> },
              ]}
            />
            <Button onClick={openCreate}>
              <Plus /> Thêm lịch
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          value={filter.status || ALL}
          onValueChange={(v) => setFilter((f) => ({ ...f, status: v === ALL ? '' : v }))}
        >
          <SelectTrigger className={cn(filterControlCls, 'w-full sm:w-[180px]')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tất cả trạng thái</SelectItem>
            {Object.entries(statusLabel).map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="w-full sm:w-[200px]">
          <Combobox
            options={[
              { value: '', label: 'Tất cả lớp' },
              ...customers.map((c) => ({ value: c._id, label: c.className })),
            ]}
            value={filter.customer}
            onChange={(v) => setFilter((f) => ({ ...f, customer: v }))}
            placeholder="Tất cả lớp"
            className={filterControlCls}
          />
        </div>
        <DatePicker
          value={filter.dateFrom}
          onChange={(v) => setFilter((f) => ({ ...f, dateFrom: v ?? '' }))}
          placeholder="Từ ngày"
          className={cn(filterControlCls, 'min-w-[8rem] flex-1 sm:w-[160px] sm:flex-none')}
        />
        <DatePicker
          value={filter.dateTo}
          onChange={(v) => setFilter((f) => ({ ...f, dateTo: v ?? '' }))}
          placeholder="Đến ngày"
          className={cn(filterControlCls, 'min-w-[8rem] flex-1 sm:w-[160px] sm:flex-none')}
        />
        <Button variant="outline" onClick={applyFilter}>
          <Search /> Lọc
        </Button>
        <Button variant="link" className="px-2" onClick={resetFilter}>
          Xoá lọc
        </Button>
        {showStatusCounts && (
          <div className="flex flex-wrap items-center gap-1.5 lg:ml-auto">
            {Object.keys(statusLabel)
              .filter((k) => statusCounts[k])
              .map((k) => (
                <Badge key={k} variant={STATUS_VARIANT[k]} dot className="font-medium">
                  {statusLabel[k]} · {statusCounts[k]}
                </Badge>
              ))}
          </div>
        )}
      </div>

      {loading ? (
        <TableSkeleton cols={7} />
      ) : viewMode === 'calendar' ? (
        <ScheduleCalendar
          items={calendarItems}
          sidePanel
          onOpen={(id) => {
            const s = findSchedule(id);
            if (s) setDetail(s);
          }}
          onContract={(id) => {
            const s = findSchedule(id);
            if (s) handleDownloadContract(s);
          }}
          onEdit={(id) => {
            const s = findSchedule(id);
            if (s) openEdit(s);
          }}
          onDelete={handleDelete}
        />
      ) : (
        <>
          <div className="hidden md:flex md:min-h-0 md:flex-1 md:flex-col">
            <DataTable<ScheduleResponse>
              fill
              className="flex-1"
              data={schedules}
              keyExtractor={(s) => s._id}
              emptyTitle="Chưa có dữ liệu"
              columns={scheduleColumns}
              onRowClick={(s) => setDetail(s)}
              pagination={{
                serverSide: true,
                page,
                pageSize,
                total,
                onPageChange: setPage,
                onPageSizeChange: (size: number) => {
                  setPageSize(size);
                  setPage(1);
                },
              }}
            />
          </div>

          <div className="space-y-3 md:hidden">
            {schedules.map((s) => {
              const customer = s.customer;
              const leadName = s.leadPhotographer?.name ?? s.leadPhotographer?.username ?? null;
              const bookedByName = s.bookedBy?.name ?? s.bookedBy?.username ?? null;
              const supports = s.supportPhotographers.map((u) => u.name ?? u.username).join(', ');
              return (
                <div key={s._id} className="rounded-[14px] border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[15px] font-semibold text-foreground">
                        {customer?.className ?? '—'}
                      </div>
                      {customer?.school && (
                        <div className="truncate text-xs text-muted-foreground">
                          {customer.school}
                        </div>
                      )}
                    </div>
                    <StatusBadge status={s.status} className="shrink-0" />
                  </div>
                  <div className="mt-3 space-y-1.5 text-[13px] text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span className="font-medium text-foreground tabular">
                        {formatDate(s.shootDate)}
                      </span>
                      {(s.startTime || s.endTime) && (
                        <span className="inline-flex items-center gap-1 tabular">
                          <Clock className="ml-1 h-3.5 w-3.5 shrink-0" />
                          {s.startTime}
                          {s.endTime ? ` – ${s.endTime}` : ''}
                        </span>
                      )}
                    </div>
                    {s.package?.name && (
                      <div className="flex items-center gap-2">
                        <Gift className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-foreground/80">{s.package.name}</span>
                      </div>
                    )}
                    {s.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-foreground/80">{s.location}</span>
                      </div>
                    )}
                    {leadName && (
                      <div className="flex items-center gap-2">
                        <UserAvatar name={leadName} size={20} className="text-[10px]" />
                        <span>Leader:</span> <span className="text-foreground">{leadName}</span>
                      </div>
                    )}
                    {supports && (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[10px] font-bold text-violet-700 dark:text-violet-300">
                          {s.supportPhotographers.length}
                        </span>
                        <span>Support:</span> <span className="text-foreground">{supports}</span>
                      </div>
                    )}
                    {s.notes && (
                      <div className="mt-2 flex items-start gap-2 whitespace-pre-line rounded-[10px] bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                        <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{s.notes}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-1 border-t pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => handleDownloadContract(s)}
                    >
                      <FileText /> Hợp đồng
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => openEdit(s)}
                    >
                      <Pencil /> Sửa
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-rose-600 hover:bg-rose-500/10 hover:text-rose-600"
                      onClick={() => handleDelete(s._id)}
                    >
                      <Trash2 /> Xoá
                    </Button>
                    {bookedByName && (
                      <span className="ml-auto inline-flex items-center gap-1.5 truncate rounded-full bg-primary-100 py-0.5 pl-0.5 pr-2.5 text-xs font-medium text-primary-700 dark:bg-primary/15 dark:text-primary">
                        <UserAvatar name={bookedByName} size={20} className="text-[10px]" />
                        {bookedByName}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {schedules.length === 0 && (
              <div className="rounded-[14px] border bg-card py-10 text-center text-muted-foreground">
                Chưa có dữ liệu
              </div>
            )}
          </div>
        </>
      )}

      {/* Add / edit modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
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
                            options={customers.map((c) => ({
                              value: c._id,
                              label: `${c.className} – ${c.school}`,
                            }))}
                            value={field.value ?? ''}
                            onChange={field.onChange}
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
                  <FormField label="Trạng thái">
                    <Controller
                      name="status"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value ?? 'pending'} onValueChange={field.onChange}>
                          <SelectTrigger className={cn(formFieldCls, 'bg-card')}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusLabel).map(([v, l]) => (
                              <SelectItem key={v} value={v}>
                                {l}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                  <FormField label="Thợ leader">
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
                          className={formFieldCls}
                        />
                      )}
                    />
                  </FormField>
                  {watch('leadPhotographer') && (
                    <FormField label="Thợ support">
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
                        className="min-h-10 rounded-[10px]"
                      />
                    </FormField>
                  )}
                </div>
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
                                  className="h-9 text-sm"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  {...register(`extraServices.${idx}.quantity`, {
                                    valueAsNumber: true,
                                  })}
                                  type="number"
                                  min={1}
                                  className="h-9 text-sm tabular"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  {...register(`extraServices.${idx}.unitPrice`, {
                                    valueAsNumber: true,
                                  })}
                                  type="number"
                                  min={0}
                                  className="h-9 text-sm tabular"
                                />
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 font-semibold text-foreground tabular">
                                {amount.toLocaleString('vi-VN')}₫
                              </td>
                              <td className="px-3 py-2">
                                <Input
                                  {...register(`extraServices.${idx}.note`)}
                                  placeholder="Ghi chú"
                                  className="h-9 text-sm"
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

            <div className="flex shrink-0 justify-end gap-2 border-t bg-muted/40 px-5 py-3.5 sm:px-6">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <Check /> Lưu lịch chụp
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Xác nhận xoá"
        message="Bạn có chắc muốn xoá lịch chụp này? Thao tác sẽ xoá luôn folder ảnh trên Google Drive và dòng tương ứng trong Google Sheet quản lý."
        onConfirm={doDelete}
      />

      {/* Detail modal */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[640px]">
          {detail &&
            (() => {
              const customer = detail.customer;
              const pkg = detail.package;
              const leadName =
                detail.leadPhotographer?.name ?? detail.leadPhotographer?.username ?? null;
              const bookedByName = detail.bookedBy?.name ?? detail.bookedBy?.username ?? null;
              const supportList = detail.supportPhotographers
                .map((u) => u.name ?? u.username)
                .filter(Boolean) as string[];
              const servicesTotal = (detail.extraServices ?? []).reduce(
                (sum, es) => sum + es.amount,
                0,
              );

              return (
                <>
                  <div className="shrink-0 border-b bg-gradient-to-b from-amber-50 to-card px-5 pb-5 pr-12 pt-5 dark:from-amber-500/10 sm:px-6">
                    <StatusBadge status={detail.status} />
                    <DialogTitle className="mt-2.5 text-2xl sm:text-[26px]">
                      {customer?.className ?? '—'}
                      {customer?.school && <span> · {customer.school}</span>}
                    </DialogTitle>
                    <DialogDescription asChild>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground/80">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-primary-700 dark:text-primary" />
                          <span className="font-medium">{formatDateWithDow(detail.shootDate)}</span>
                        </span>
                        {(detail.startTime || detail.endTime) && (
                          <span className="inline-flex items-center gap-1.5 tabular">
                            <Clock className="h-4 w-4 text-primary-700 dark:text-primary" />
                            <span className="font-medium">
                              {detail.startTime ?? ''}
                              {detail.endTime ? ` – ${detail.endTime}` : ''}
                            </span>
                          </span>
                        )}
                      </div>
                    </DialogDescription>
                  </div>

                  <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
                    <section>
                      <SectionLabel className="mb-3">Thông tin buổi chụp</SectionLabel>
                      <div className="space-y-3">
                        <InfoRow
                          icon={<MapPin />}
                          tone="bg-rose-500/10 text-rose-600 dark:text-rose-300"
                          label="Địa điểm"
                        >
                          {detail.location}
                        </InfoRow>
                        <InfoRow
                          icon={<Gift />}
                          tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                          label="Gói chụp"
                        >
                          {pkg ? (
                            <>
                              {pkg.name}
                              {typeof pkg.pricePerMember === 'number' && (
                                <span className="font-normal text-muted-foreground">
                                  {' '}
                                  · {pkg.pricePerMember.toLocaleString('vi-VN')}₫/thành viên
                                </span>
                              )}
                            </>
                          ) : null}
                        </InfoRow>
                        <InfoRow
                          icon={<FolderOpen />}
                          tone="bg-sky-500/10 text-sky-600 dark:text-sky-300"
                          label="Folder ảnh"
                        >
                          {detail.driveFolderUrl ? (
                            <a
                              href={detail.driveFolderUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
                            >
                              Mở folder trên Google Drive <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : (
                            <span className="font-normal italic text-muted-foreground">
                              Đang tạo folder…
                            </span>
                          )}
                        </InfoRow>
                      </div>
                    </section>

                    <section>
                      <SectionLabel className="mb-3">Đội ngũ phụ trách</SectionLabel>
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {[
                          { role: 'Sale', name: bookedByName },
                          { role: 'Leader', name: leadName },
                        ].map(({ role, name }) => (
                          <div
                            key={role}
                            className="flex items-center gap-3 rounded-[12px] border px-3.5 py-3"
                          >
                            {name ? (
                              <UserAvatar name={name} size={36} className="text-sm ring-0" />
                            ) : (
                              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                —
                              </span>
                            )}
                            <div className="min-w-0">
                              <div className="text-xs text-muted-foreground">{role}</div>
                              <div className="truncate text-sm font-semibold text-foreground">
                                {name ?? (
                                  <span className="font-normal italic text-muted-foreground">
                                    Chưa có
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-[13px] text-muted-foreground">
                          Support{supportList.length ? ` · ${supportList.length} người` : ''}
                        </span>
                        {supportList.length > 0 ? (
                          supportList.map((n, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 py-0.5 pl-0.5 pr-2.5 text-[13px] font-medium text-violet-700 dark:text-violet-300"
                            >
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-bold">
                                {getInitial(n)}
                              </span>
                              {n}
                            </span>
                          ))
                        ) : (
                          <span className="text-[13px] italic text-muted-foreground">Chưa có</span>
                        )}
                      </div>
                    </section>

                    {detail.notes && (
                      <section>
                        <SectionLabel className="mb-3">Ghi chú</SectionLabel>
                        <div className="flex items-start gap-2.5 rounded-[10px] bg-amber-50 px-3.5 py-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                          <StickyNote className="mt-0.5 h-4 w-4 shrink-0" />
                          <div className="min-w-0 whitespace-pre-line break-words leading-relaxed">
                            {detail.notes}
                          </div>
                        </div>
                      </section>
                    )}

                    {detail.extraServices && detail.extraServices.length > 0 && (
                      <section>
                        <SectionLabel className="mb-3">Dịch vụ sử dụng thêm</SectionLabel>
                        <div className="space-y-2">
                          {detail.extraServices.map((es, idx) => (
                            <div key={idx} className="flex items-baseline gap-3 text-sm">
                              <div className="min-w-0 flex-1">
                                <div className="text-foreground">{es.name}</div>
                                {es.note && (
                                  <div className="text-xs text-muted-foreground">{es.note}</div>
                                )}
                              </div>
                              <span className="whitespace-nowrap text-xs text-muted-foreground tabular">
                                {es.quantity} × {es.unitPrice.toLocaleString('vi-VN')}
                              </span>
                              <span className="w-28 whitespace-nowrap text-right font-semibold text-foreground tabular">
                                {es.amount.toLocaleString('vi-VN')} ₫
                              </span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between border-t pt-2.5">
                            <span className="text-sm font-semibold text-foreground">Tổng cộng</span>
                            <span className="font-display text-lg font-bold text-primary-700 tabular dark:text-primary">
                              {servicesTotal.toLocaleString('vi-VN')} ₫
                            </span>
                          </div>
                        </div>
                      </section>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t bg-muted/40 px-5 py-3.5 sm:px-6">
                    <Button
                      variant="ghost"
                      className="px-2 text-rose-600 hover:bg-rose-500/10 hover:text-rose-600"
                      onClick={() => {
                        const id = detail._id;
                        setDetail(null);
                        handleDelete(id);
                      }}
                    >
                      <Trash2 /> Xoá lịch chụp
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => handleDownloadContract(detail)}>
                        <FileText /> Hợp đồng
                      </Button>
                      <Button
                        onClick={() => {
                          setDetail(null);
                          openEdit(detail);
                        }}
                      >
                        <Pencil /> Sửa lịch
                      </Button>
                    </div>
                  </div>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>

      {/* Contract modal */}
      <ContractDialog
        schedule={contractSchedule}
        onClose={() => setContractSchedule(null)}
        onCreated={() => dispatch(fetchSchedules(buildFilterParams(appliedFilter, page, pageSize)))}
      />
    </div>
  );
};

export default SchedulesPage;
