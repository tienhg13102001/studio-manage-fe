import { useEffect, useMemo, useState } from 'react';
import {
  FaCalendarAlt,
  FaTable,
  FaRegClock,
  FaMapMarkerAlt,
  FaRegStickyNote,
  FaUserTie,
  FaUsers,
  FaSearch,
  FaTshirt,
  FaMars,
  FaVenus,
  FaVenusMars,
  FaCheck,
  FaTimes,
} from 'react-icons/fa';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import { costumeService } from '../services/costumeService';
import { ConfirmModal, DataTable, Modal, ScheduleCalendar } from '../components/organisms';
import type { Column } from '../components/organisms';
import { scheduleService } from '../services/scheduleService';
import type { ScheduleResponse, CostumeResponse } from '../types';
import { ROLE_LABELS } from '../types';
import { formatDate } from '../utils/format';
import {
  TableSkeleton,
  Select,
  SegmentedControl,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '../components/atoms';
import {
  SCHEDULE_STATUS_COLOR as statusColor,
  SCHEDULE_STATUS_LABEL as statusLabel,
} from '../utils/scheduleConstants';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchSchedules } from '../store/slices/schedulesSlice';
import { fetchCustomers } from '../store/slices/customersSlice';
import { fetchPackages } from '../store/slices/packagesSlice';
import { fetchPhotographers, fetchSales } from '../store/slices/usersSlice';

interface FilterState {
  status: string;
  dateFrom: string;
  dateTo: string;
  customer: string;
}

const defaultFilter: FilterState = { status: '', dateFrom: '', dateTo: '', customer: '' };

const getInitials = (fullName: string) =>
  fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

const getHue = (s: string) => {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
};

const UserAvatar = ({ name, size = 32 }: { name: string; size?: number }) => {
  const hue = getHue(name);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="rounded-full inline-flex items-center justify-center text-xs font-semibold text-white ring-2 ring-white dark:ring-gray-800 shadow-sm select-none cursor-default"
          style={{
            backgroundColor: `hsl(${hue}, 65%, 45%)`,
            width: size,
            height: size,
          }}
          aria-label={name}
        >
          {getInitials(name)}
        </span>
      </TooltipTrigger>
      <TooltipContent>{name}</TooltipContent>
    </Tooltip>
  );
};

const GENDER_META: Record<
  'male' | 'female' | 'unisex',
  { label: string; icon: React.ReactNode; cls: string }
> = {
  male: {
    label: 'Nam',
    icon: <FaMars />,
    cls: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  },
  female: {
    label: 'Nữ',
    icon: <FaVenus />,
    cls: 'bg-pink-500/10 text-pink-500 border-pink-500/30',
  },
  unisex: {
    label: 'Unisex',
    icon: <FaVenusMars />,
    cls: 'bg-violet-500/10 text-violet-500 border-violet-500/30',
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
      return (
        c.name.toLowerCase().includes(q) ||
        (c.type?.name?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [costumes, search, genderFilter]);

  // Group by costume type
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
      <>
        <label className="label">
          Trang phục <span className="text-red-500">*</span>
        </label>
        <div className="rounded-lg border border-dashed border-red-400/50 bg-red-500/5 px-4 py-6 text-center">
          <FaTshirt className="mx-auto text-2xl text-red-400 mb-2" />
          <p className="text-sm text-red-500 font-medium">
            Gói chụp này chưa có trang phục nào được liên kết.
          </p>
        </div>
      </>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <label className="label !mb-0 flex items-center gap-2">
          <FaTshirt className="text-primary-500" />
          Trang phục <span className="text-red-500">*</span>
          {selected.length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-500 text-xs font-semibold">
              {selected.length}/{costumes.length} đã chọn
            </span>
          )}
        </label>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs theme-text-muted hover:text-red-500 inline-flex items-center gap-1"
          >
            <FaTimes /> Bỏ chọn tất cả
          </button>
        )}
      </div>

      <div className="rounded-xl border border-[color:var(--card-border)] bg-[var(--card-bg)] overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-2.5 py-2 border-b border-[color:var(--card-border)]">
          <div className="relative flex-1 min-w-[10rem]">
            <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs theme-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm trang phục..."
              className="input !pl-8 !py-1.5 !text-sm w-full"
            />
          </div>
          <div className="inline-flex rounded-lg border border-[color:var(--card-border)] overflow-hidden text-xs">
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
                  className={`px-2.5 py-1.5 transition-colors ${
                    active
                      ? 'bg-primary-500 text-white font-medium'
                      : 'theme-text-muted hover:bg-[var(--table-row-hover)]'
                  }`}
                >
                  {labels[g]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Groups */}
        <div className="max-h-72 overflow-y-auto p-2 space-y-3">
          {groups.length === 0 ? (
            <div className="text-center py-6 text-sm theme-text-muted">
              Không tìm thấy trang phục phù hợp.
            </div>
          ) : (
            groups.map((g) => {
              const allSelected = g.items.every((c) => selected.includes(c._id));
              const someSelected = g.items.some((c) => selected.includes(c._id));
              return (
                <div key={g.id}>
                  <div className="flex items-center justify-between mb-1.5 px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide theme-text-muted">
                        {g.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--table-row-hover)] theme-text-muted">
                        {g.items.length}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleGroup(g.items, allSelected)}
                      className="text-xs text-primary-500 hover:underline"
                    >
                      {allSelected
                        ? 'Bỏ chọn nhóm'
                        : someSelected
                          ? 'Chọn hết nhóm'
                          : 'Chọn tất cả'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                    {g.items.map((c) => {
                      const checked = selected.includes(c._id);
                      const meta = GENDER_META[c.gender];
                      return (
                        <label
                          key={c._id}
                          className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-pointer transition-all ${
                            checked
                              ? 'border-primary-500 bg-primary-500/10 ring-1 ring-primary-500/40'
                              : 'border-[color:var(--card-border)] hover:border-primary-500/50 hover:bg-[var(--table-row-hover)]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={(e) => toggle(c._id, e.target.checked)}
                          />
                          <span
                            className={`shrink-0 w-4 h-4 rounded border inline-flex items-center justify-center transition-colors ${
                              checked
                                ? 'bg-primary-500 border-primary-500 text-white'
                                : 'border-gray-400 group-hover:border-primary-500'
                            }`}
                          >
                            {checked && <FaCheck className="text-[8px]" />}
                          </span>
                          <span className="text-sm theme-text-primary truncate flex-1">
                            {c.name}
                          </span>
                          <span
                            className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-medium ${meta.cls}`}
                            title={meta.label}
                          >
                            {meta.icon}
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
        <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
          <FaTimes /> Vui lòng chọn ít nhất một trang phục.
        </p>
      )}
    </div>
  );
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
}

const SchedulesPage = () => {
  const dispatch = useAppDispatch();
  const { list: schedules, loading } = useAppSelector((s) => s.schedules);
  const { list: customers } = useAppSelector((s) => s.customers);
  const { list: packages } = useAppSelector((s) => s.packages);
  const { photographers, sales: salesUsers } = useAppSelector((s) => s.users);
  const [filter, setFilter] = useState<FilterState>(defaultFilter);
  const [allCostumes, setAllCostumes] = useState<CostumeResponse[]>([]);
  const [selectedCostumes, setSelectedCostumes] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleResponse | null>(null);
  const [supportIds, setSupportIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [detail, setDetail] = useState<ScheduleResponse | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting, errors },
    watch,
  } = useForm<ScheduleFormValues>();

  const buildFilterParams = (f: FilterState): Record<string, string> => {
    const params: Record<string, string> = {};
    if (f.status) params.status = f.status;
    if (f.dateFrom) params.dateFrom = f.dateFrom;
    if (f.dateTo) params.dateTo = f.dateTo;
    if (f.customer) params.customer = f.customer;
    return params;
  };

  const selectedPackageId = watch('package');
  const selectedPackage = packages.find((p) => p._id === selectedPackageId);
  // IDs of CostumeTypes linked to the selected package
  const packageTypeIds = useMemo(
    () => new Set((selectedPackage?.costumes ?? []).map((ct) => ct._id)),
    [selectedPackage],
  );
  // Costumes whose type belongs to the selected package
  const availableCostumes = useMemo(
    () => allCostumes.filter((c) => c.type && packageTypeIds.has(c.type._id)),
    [allCostumes, packageTypeIds],
  );

  useEffect(() => {
    dispatch(fetchSchedules({}));
    dispatch(fetchCustomers({ limit: 200 }));
    dispatch(fetchPackages());
    dispatch(fetchPhotographers());
    dispatch(fetchSales());
    costumeService.getAll().then(setAllCostumes);
  }, [dispatch]);

  const openCreate = () => {
    setEditing(null);
    setSupportIds([]);
    setSelectedCostumes([]);
    setCostumeTouched(false);
    reset({ status: 'pending' });
    setModalOpen(true);
  };

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
    });
    setModalOpen(true);
  };

  const [costumeTouched, setCostumeTouched] = useState(false);

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
    };
    try {
      if (editing) {
        await scheduleService.update(editing._id, payload);
        toast.success('Cập nhật lịch chụp thành công!');
      } else {
        await scheduleService.create(payload);
        toast.success('Thêm lịch chụp thành công!');
      }
      setModalOpen(false);
      dispatch(fetchSchedules(buildFilterParams(filter)));
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleDelete = (id: string) => setConfirmId(id);

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await scheduleService.remove(confirmId);
      toast.success('Đã xoá lịch chụp.');
      dispatch(fetchSchedules(buildFilterParams(filter)));
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  const handleDownloadContract = async (s: ScheduleResponse) => {
    const customer = s.customer;
    const filename = `${customer?.className?.replace(/\s+/g, '-') ?? s._id}-${customer?.school?.replace(/\s+/g, '-') ?? ''}`;
    await scheduleService.downloadContract(s._id, filename);
  };

  const applyFilter = () => dispatch(fetchSchedules(buildFilterParams(filter)));
  const resetFilter = () => {
    setFilter(defaultFilter);
    dispatch(fetchSchedules({}));
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
      })),
    [schedules],
  );

  const scheduleColumns: Column<ScheduleResponse>[] = [
    {
      key: 'date',
      header: 'Ngày chụp',
      className: 'font-medium max-w-14',
      render: (s) => (
        <div className="flex flex-col">
          <span>{formatDate(s.shootDate)} </span>
          <span className="text-gray-500 text-xs whitespace-nowrap">{`${s.startTime ?? ''}${s.endTime ? ` – ${s.endTime}` : ''}`}</span>
        </div>
      ),
    },
    {
      key: 'class',
      header: 'Lớp',
      className: 'text-primary-600',
      render: (s) => (
        <div className="flex flex-col">
          <span className="font-medium">{s.customer?.className ?? '—'}</span>
          <span className="text-gray-600 text-xs">{s.customer?.school ?? ''}</span>
        </div>
      ),
    },
    {
      key: 'package',
      header: 'Gói chụp',
      className: 'text-gray-600',
      render: (s) => s.package?.name ?? '—',
    },
    {
      key: 'sale',
      header: 'Sale',
      className: 'text-gray-600',
      render: (s) => {
        const fullName = s.bookedBy?.name ?? s.bookedBy?.username;
        if (!fullName) return '—';
        return <UserAvatar name={fullName} />;
      },
    },
    {
      key: 'leader',
      header: 'Leader',
      className: 'text-gray-600',
      render: (s) => {
        const fullName = s.leadPhotographer?.name ?? s.leadPhotographer?.username;
        if (!fullName) return '—';
        return <UserAvatar name={fullName} />;
      },
    },
    {
      key: 'support',
      header: 'Support',
      className: 'text-gray-600',
      render: (s) => {
        const names = s.supportPhotographers
          .map((u) => u.name ?? u.username)
          .filter(Boolean) as string[];
        if (names.length === 0) return '—';
        return (
          <span className="inline-flex -space-x-2">
            {names.map((n, i) => (
              <UserAvatar key={i} name={n} size={28} />
            ))}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (s) => (
        <span className={`badge ${statusColor[s.status]}`}>{statusLabel[s.status]}</span>
      ),
    },
    {
      key: 'notes',
      header: 'Ghi chú',
      render: (s) => (
        <span
          className="block max-w-96 truncate text-gray-600 whitespace-pre-line"
          title={s.notes || ''}
        >
          {s.notes || '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (s) => (
        <span className="space-x-2">
          <button
            onClick={() => handleDownloadContract(s)}
            className="text-green-600 hover:underline text-xs"
          >
            Hợp đồng
          </button>
          <button onClick={() => openEdit(s)} className="text-blue-600 hover:underline text-xs">
            Sửa
          </button>
          <button
            onClick={() => handleDelete(s._id)}
            className="text-red-600 hover:underline text-xs"
          >
            Xoá
          </button>
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-kicker">Schedules</span>
          <h2 className="page-title">Lịch chụp</h2>
          <p className="page-subtitle">Theo dõi và sắp xếp lịch chụp ảnh theo ngày.</p>
        </div>
        <div className="flex items-center gap-2 justify-between w-full md:w-auto">
          <SegmentedControl
            value={viewMode}
            onChange={setViewMode}
            items={[
              { value: 'table', label: 'Bảng', icon: <FaTable />, tone: 'blue' },
              { value: 'calendar', label: 'Lịch', icon: <FaCalendarAlt />, tone: 'violet' },
            ]}
          />
          <button onClick={openCreate} className="btn-primary">
            + Thêm lịch
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-[8rem]">
            <Select
              options={[
                { value: '', label: 'Tất cả trạng thái' },
                ...Object.entries(statusLabel).map(([v, l]) => ({ value: v, label: l })),
              ]}
              value={filter.status}
              onChange={(v) => setFilter((f) => ({ ...f, status: v as string }))}
            />
          </div>
          <div className="flex-1 min-w-[8rem]">
            <Select
              options={[
                { value: '', label: 'Tất cả lớp' },
                ...customers.map((c) => ({ value: c._id, label: c.className })),
              ]}
              value={filter.customer}
              onChange={(v) => setFilter((f) => ({ ...f, customer: v as string }))}
            />
          </div>
          <input
            type="date"
            className="input flex-1 min-w-[8rem]"
            value={filter.dateFrom}
            onChange={(e) => setFilter((f) => ({ ...f, dateFrom: e.target.value }))}
          />
          <input
            type="date"
            className="input flex-1 min-w-[8rem]"
            value={filter.dateTo}
            onChange={(e) => setFilter((f) => ({ ...f, dateTo: e.target.value }))}
          />
          <button onClick={applyFilter} className="btn-primary">
            Lọc
          </button>
          <button onClick={resetFilter} className="btn-secondary">
            Xoá lọc
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton cols={11} />
      ) : viewMode === 'calendar' ? (
        <div className="card p-4">
          <ScheduleCalendar
            items={calendarItems}
            onEdit={(id) => {
              const s = schedules.find((x) => x._id === id);
              if (s) openEdit(s);
            }}
            onDelete={handleDelete}
          />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <DataTable<ScheduleResponse>
              data={schedules}
              keyExtractor={(s) => s._id}
              emptyTitle="Chưa có dữ liệu"
              columns={scheduleColumns}
              onRowClick={(s) => setDetail(s)}
            />
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {schedules.map((s) => {
              const customer = s.customer;
              const leadName = s.leadPhotographer?.name ?? s.leadPhotographer?.username ?? null;
              const bookedByName = s.bookedBy?.name ?? s.bookedBy?.username ?? null;
              const supports = s.supportPhotographers.map((u) => u.name ?? u.username).join(', ');
              return (
                <div key={s._id} className="card p-4">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold theme-text-primary">
                        {formatDate(s.shootDate)}
                      </div>
                      <div className="text-primary-500 text-sm mt-0.5 truncate">
                        {customer?.className ?? '—'}
                        {customer?.school && (
                          <span className="theme-text-muted"> · {customer.school}</span>
                        )}
                      </div>
                    </div>
                    <span className={`badge shrink-0 ${statusColor[s.status]}`}>
                      {statusLabel[s.status]}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm theme-text-muted">
                    {(s.startTime || s.endTime) && (
                      <div className="flex items-center gap-2">
                        <FaRegClock className="shrink-0 text-primary-500" />
                        <span>
                          {s.startTime}
                          {s.endTime ? ` – ${s.endTime}` : ''}
                        </span>
                      </div>
                    )}
                    {s.location && (
                      <div className="flex items-center gap-2">
                        <FaMapMarkerAlt className="shrink-0 text-rose-500" />
                        <span>{s.location}</span>
                      </div>
                    )}
                    {leadName && (
                      <div className="flex items-center gap-2">
                        <FaUserTie className="shrink-0 text-blue-500" />
                        <span className="theme-text-muted">Leader:</span>{' '}
                        <span className="theme-text-primary">{leadName}</span>
                      </div>
                    )}
                    {supports && (
                      <div className="flex items-center gap-2">
                        <FaUsers className="shrink-0 text-violet-500" />
                        <span className="theme-text-muted">Support:</span>{' '}
                        <span className="theme-text-primary">{supports}</span>
                      </div>
                    )}
                    {s.notes && (
                      <div className="mt-1 flex items-start gap-2 rounded-md border border-yellow-400/40 bg-yellow-500/10 text-yellow-600 dark:text-yellow-300 text-xs font-medium px-2 py-1 whitespace-pre-line">
                        <FaRegStickyNote className="shrink-0 mt-0.5" />
                        <span>{s.notes}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 theme-divider-top">
                    <button
                      onClick={() => handleDownloadContract(s)}
                      className="text-green-500 text-xs font-medium hover:underline"
                    >
                      Hợp đồng
                    </button>
                    <button
                      onClick={() => openEdit(s)}
                      className="text-blue-500 text-xs font-medium hover:underline"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(s._id)}
                      className="text-red-500 text-xs font-medium hover:underline"
                    >
                      Xoá
                    </button>
                    {bookedByName && (
                      <span className="ml-auto bg-primary-500/15 text-primary-500 text-xs font-medium px-2 py-0.5 rounded-full border border-primary-500/30">
                        {bookedByName}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {schedules.length === 0 && (
              <div className="card py-10 text-center theme-text-muted">Chưa có dữ liệu</div>
            )}
          </div>
        </>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Sửa lịch chụp' : 'Thêm lịch chụp'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div>
              <label className="label">
                Lớp <span className="text-red-500">*</span>
              </label>
              <Controller
                name="customer"
                control={control}
                rules={{ required: true }}
                render={({ field, fieldState }) => (
                  <>
                    <Select
                      options={customers.map((c) => ({
                        value: c._id,
                        label: `${c.className} – ${c.school}`,
                      }))}
                      value={field.value ?? ''}
                      onChange={(v) => field.onChange(v)}
                      placeholder="-- Chọn lớp --"
                    />
                    {fieldState.error && (
                      <p className="text-xs text-red-500 mt-1">Vui lòng chọn lớp.</p>
                    )}
                  </>
                )}
              />
            </div>
            <div>
              <label className="label">
                Gói chụp <span className="text-red-500">*</span>
              </label>
              <Controller
                name="package"
                control={control}
                rules={{ required: true }}
                render={({ field, fieldState }) => (
                  <>
                    <Select
                      options={packages.map((p) => ({
                        value: p._id,
                        label: `${p.name} – ${p.pricePerMember.toLocaleString('vi-VN')}₫/thành viên`,
                      }))}
                      value={field.value ?? ''}
                      onChange={(v) => field.onChange(v || undefined)}
                      placeholder="-- Chọn gói chụp --"
                    />
                    {fieldState.error && (
                      <p className="text-xs text-red-500 mt-1">Vui lòng chọn gói chụp.</p>
                    )}
                  </>
                )}
              />
            </div>
            <div>
              <label className="label">Trạng thái</label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select
                    options={Object.entries(statusLabel).map(([v, l]) => ({ value: v, label: l }))}
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(v)}
                  />
                )}
              />
            </div>
            {selectedPackageId && (
              <div className="lg:col-span-3">
                <CostumePicker
                  costumes={availableCostumes}
                  selected={selectedCostumes}
                  onChange={setSelectedCostumes}
                  showError={costumeTouched && selectedCostumes.length === 0}
                />
              </div>
            )}
            <div>
              <label className="label">
                Ngày chụp <span className="text-red-500">*</span>
              </label>
              <input {...register('shootDate', { required: true })} type="date" className="input" />
              {errors.shootDate && (
                <p className="text-xs text-red-500 mt-1">Vui lòng chọn ngày chụp.</p>
              )}
            </div>
            <div>
              <label className="label">Giờ bắt đầu</label>
              <input {...register('startTime')} type="time" className="input" />
            </div>
            <div>
              <label className="label">Giờ kết thúc</label>
              <input {...register('endTime')} type="time" className="input" />
            </div>
            <div className="lg:col-span-3">
              <label className="label">Địa điểm</label>
              <input {...register('location')} className="input" />
            </div>
            <div className="lg:col-span-1">
              <label className="label">Người chốt lớp (Sale)</label>
              <Controller
                name="bookedBy"
                control={control}
                render={({ field }) => (
                  <Select
                    options={salesUsers.map((u) => ({
                      value: u._id,
                      label: u.username + (u.name ? ` (${u.name})` : ''),
                    }))}
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(v || undefined)}
                    placeholder="-- Không chỉ định --"
                  />
                )}
              />
            </div>
            <div className="lg:col-span-2">
              <label className="label">Thợ leader</label>
              <Controller
                name="leadPhotographer"
                control={control}
                render={({ field }) => (
                  <Select
                    options={photographers.map((u) => ({
                      value: u._id,
                      label: `${u.username}${u.name ? ` (${u.name})` : ''} – ${ROLE_LABELS[3]}`,
                    }))}
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(v || undefined)}
                    placeholder="-- Không chỉ định --"
                  />
                )}
              />
            </div>
            {/* khi có thợ lead mới chọn thợ support */}
            {watch('leadPhotographer') && (
              <div className="lg:col-span-3">
                <label className="label">Thợ support</label>
                <div className="border border-[color:var(--card-border)] rounded-lg p-2 max-h-36 overflow-y-auto space-y-1">
                  {photographers
                    .filter((u) => u._id !== watch('leadPhotographer'))
                    .map((u) => (
                      <label
                        key={u._id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-[var(--table-row-hover)] px-1 py-0.5 rounded"
                      >
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                          checked={supportIds.includes(u._id)}
                          onChange={(e) =>
                            setSupportIds((prev) =>
                              e.target.checked
                                ? [...prev, u._id]
                                : prev.filter((id) => id !== u._id),
                            )
                          }
                        />
                        <span className="text-sm theme-text-primary">
                          {u.username}
                          {u.name ? ` (${u.name})` : ''}
                        </span>
                        -<span className="text-xs theme-text-muted">{ROLE_LABELS[3]}</span>
                      </label>
                    ))}
                  {photographers.length === 0 && (
                    <p className="text-sm theme-text-muted px-1">Không có người dùng phù hợp</p>
                  )}
                </div>
              </div>
            )}
            <div className="lg:col-span-3">
              <label className="label">Ghi chú</label>
              <textarea {...register('notes')} className="input" rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Huỷ
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              Lưu
            </button>
          </div>
        </form>
      </Modal>
      <ConfirmModal
        isOpen={!!confirmId}
        message="Bạn có chắc muốn xoá lịch chụp này?"
        onConfirm={doDelete}
        onCancel={() => setConfirmId(null)}
      />

      {/* Detail modal */}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title="Chi tiết lịch chụp" size="lg">
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

            const heroHue = getHue(customer?.className ?? detail._id);

            const InfoItem = ({
              icon,
              label,
              value,
              full,
              tone = 'primary',
            }: {
              icon: React.ReactNode;
              label: string;
              value: React.ReactNode;
              full?: boolean;
              tone?: 'primary' | 'rose' | 'emerald' | 'violet' | 'amber' | 'sky';
            }) => {
              const tones: Record<string, string> = {
                primary: 'bg-primary-500/10 text-primary-500',
                rose: 'bg-rose-500/10 text-rose-500',
                emerald: 'bg-emerald-500/10 text-emerald-500',
                violet: 'bg-violet-500/10 text-violet-500',
                amber: 'bg-amber-500/10 text-amber-500',
                sky: 'bg-sky-500/10 text-sky-500',
              };
              return (
                <div
                  className={`group flex items-start gap-3 rounded-xl border border-[color:var(--card-border)] bg-[var(--card-bg)] px-3.5 py-3 transition-all hover:shadow-md hover:border-primary-500/40 ${
                    full ? 'sm:col-span-2' : ''
                  }`}
                >
                  <span
                    className={`shrink-0 w-9 h-9 inline-flex items-center justify-center rounded-lg ${tones[tone]} transition-transform group-hover:scale-110`}
                  >
                    {icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase tracking-[0.08em] font-semibold theme-text-muted">
                      {label}
                    </div>
                    <div className="text-sm theme-text-primary mt-1 break-words leading-relaxed">
                      {value || <span className="theme-text-muted italic">Chưa có</span>}
                    </div>
                  </div>
                </div>
              );
            };

            return (
              <div className="space-y-5 -mx-2">
                {/* Hero header */}
                <div
                  className="relative overflow-hidden rounded-2xl px-5 py-5"
                  style={{
                    background: `linear-gradient(135deg, hsl(${heroHue}, 70%, 50%) 0%, hsl(${(heroHue + 40) % 360}, 75%, 45%) 100%)`,
                  }}
                >
                  {/* Decorative blobs */}
                  <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
                  <div className="absolute -bottom-12 -left-8 w-32 h-32 rounded-full bg-black/10 blur-2xl" />

                  <div className="relative flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 text-white">
                      <div className="inline-flex items-center gap-2 mb-2">
                        <span
                          className={`badge ${statusColor[detail.status]} backdrop-blur-sm bg-white/90`}
                        >
                          {statusLabel[detail.status]}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold tracking-tight truncate drop-shadow-sm">
                        {customer?.className ?? '—'}
                      </h3>
                      {customer?.school && (
                        <p className="text-sm text-white/85 mt-1 truncate">{customer.school}</p>
                      )}
                      <div className="mt-3 flex items-center gap-4 flex-wrap text-sm text-white/95">
                        <span className="inline-flex items-center gap-1.5">
                          <FaCalendarAlt />
                          <span className="font-medium">{formatDate(detail.shootDate)}</span>
                        </span>
                        {(detail.startTime || detail.endTime) && (
                          <span className="inline-flex items-center gap-1.5">
                            <FaRegClock />
                            <span className="font-medium">
                              {detail.startTime ?? ''}
                              {detail.endTime ? ` – ${detail.endTime}` : ''}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="relative flex gap-2 shrink-0">
                      <button
                        onClick={() => handleDownloadContract(detail)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white border border-white/20 transition-colors"
                      >
                        Hợp đồng
                      </button>
                      <button
                        onClick={() => {
                          setDetail(null);
                          openEdit(detail);
                        }}
                        className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white text-gray-900 hover:bg-white/90 shadow-sm transition-colors"
                      >
                        Sửa
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sections */}
                <div className="px-2 space-y-5">
                  {/* Section: Buổi chụp */}
                  <section>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="h-px flex-1 bg-[color:var(--card-border)]" />
                      <span className="text-[11px] uppercase tracking-[0.1em] font-semibold theme-text-muted">
                        Thông tin buổi chụp
                      </span>
                      <span className="h-px flex-1 bg-[color:var(--card-border)]" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <InfoItem
                        icon={<FaMapMarkerAlt />}
                        label="Địa điểm"
                        value={detail.location}
                        tone="rose"
                      />
                      <InfoItem
                        icon={<span className="text-[11px] font-bold">₫</span>}
                        label="Gói chụp"
                        tone="emerald"
                        value={
                          pkg ? (
                            <div className="flex flex-col">
                              <span className="font-semibold">{pkg.name}</span>
                              {typeof pkg.pricePerMember === 'number' && (
                                <span className="text-xs theme-text-muted">
                                  {pkg.pricePerMember.toLocaleString('vi-VN')}₫/thành viên
                                </span>
                              )}
                            </div>
                          ) : null
                        }
                      />
                    </div>
                  </section>

                  {/* Section: Đội ngũ */}
                  <section>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="h-px flex-1 bg-[color:var(--card-border)]" />
                      <span className="text-[11px] uppercase tracking-[0.1em] font-semibold theme-text-muted">
                        Đội ngũ phụ trách
                      </span>
                      <span className="h-px flex-1 bg-[color:var(--card-border)]" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <InfoItem
                        icon={<FaUserTie />}
                        label="Sale"
                        tone="sky"
                        value={
                          bookedByName ? (
                            <span className="inline-flex items-center gap-2">
                              <UserAvatar name={bookedByName} size={28} />
                              <span className="font-medium">{bookedByName}</span>
                            </span>
                          ) : null
                        }
                      />
                      <InfoItem
                        icon={<FaUserTie />}
                        label="Leader"
                        tone="primary"
                        value={
                          leadName ? (
                            <span className="inline-flex items-center gap-2">
                              <UserAvatar name={leadName} size={28} />
                              <span className="font-medium">{leadName}</span>
                            </span>
                          ) : null
                        }
                      />
                      <InfoItem
                        icon={<FaUsers />}
                        label={`Support${supportList.length ? ` · ${supportList.length} người` : ''}`}
                        tone="violet"
                        full
                        value={
                          supportList.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-0.5">
                              {supportList.map((n, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 pl-0.5 pr-2.5 py-0.5"
                                >
                                  <UserAvatar name={n} size={22} />
                                  <span className="text-xs font-medium">{n}</span>
                                </span>
                              ))}
                            </div>
                          ) : null
                        }
                      />
                    </div>
                  </section>

                  {/* Ghi chú */}
                  {detail.notes && (
                    <section>
                      <div className="rounded-xl border border-amber-400/40 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-500/10 dark:to-yellow-500/5 px-4 py-3.5 flex items-start gap-3">
                        <span className="shrink-0 w-9 h-9 inline-flex items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-300">
                          <FaRegStickyNote />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] uppercase tracking-[0.08em] font-semibold text-amber-700 dark:text-amber-300">
                            Ghi chú
                          </div>
                          <div className="text-sm theme-text-primary mt-1 whitespace-pre-line break-words leading-relaxed">
                            {detail.notes}
                          </div>
                        </div>
                      </div>
                    </section>
                  )}
                </div>

                <div className="flex justify-end px-2 pt-3 theme-divider-top">
                  <button
                    onClick={() => {
                      const id = detail._id;
                      setDetail(null);
                      handleDelete(id);
                    }}
                    className="inline-flex items-center gap-1.5 text-red-500 hover:text-red-600 text-sm font-medium pt-2 hover:underline"
                  >
                    Xoá lịch chụp
                  </button>
                </div>
              </div>
            );
          })()}
      </Modal>
    </div>
  );
};

export default SchedulesPage;
