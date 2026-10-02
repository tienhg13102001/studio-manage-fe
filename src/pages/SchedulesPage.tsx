import type { Column } from '@/components/ui';
import {
  Button,
  Combobox,
  ConfirmDialog,
  DataTable,
  DatePicker,
  PageHeader,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TableSkeleton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  badgeVariants,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  Camera,
  Info,
  ListFilter,
  Pencil,
  Plus,
  School,
  SlidersHorizontal,
  Table as TableIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ScheduleCalendar } from '../components/organisms';
import CrewCell from '../components/organisms/schedules/CrewCell';
import CrewEditor from '../components/organisms/schedules/CrewEditor';
import QuickStatusPicker from '../components/organisms/schedules/QuickStatusPicker';
import ScheduleDetailDialog from '../components/organisms/schedules/ScheduleDetailDialog';
import ScheduleFilterSheet from '../components/organisms/schedules/ScheduleFilterSheet';
import ScheduleFormDialog, {
  type PrefillCustomer,
} from '../components/organisms/schedules/ScheduleFormDialog';
import ScheduleMobileList from '../components/organisms/schedules/ScheduleMobileList';
import ScheduleRowMenu from '../components/organisms/schedules/ScheduleRowMenu';
import {
  DEFAULT_SCHEDULE_FILTERS,
  apiErrorMessage,
  crewStats,
  formatDay,
  isOnCrew,
  personName,
  statusPickerRole,
  timeRange,
  weekdayShort,
  type ScheduleFilters,
  type StatusCountKey,
} from '../components/organisms/schedules/scheduleHelpers';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { canEditCrew } from '../utils/permissions';
import { costumeService } from '../services/costumeService';
import { scheduleService } from '../services/scheduleService';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchCustomers } from '../store/slices/customersSlice';
import { fetchPackages } from '../store/slices/packagesSlice';
import { fetchSchedules } from '../store/slices/schedulesSlice';
import { fetchPhotographers, fetchSales } from '../store/slices/usersSlice';
import type { CostumeResponse, ScheduleResponse } from '../types';
import { getSchoolName } from '../types';
import {
  SCHEDULE_CANCELLED,
  SCHEDULE_CANCELLED_LABEL,
  SHOOT_STATUSES,
  SHOOT_STATUS_LABELS,
  SHOOT_STATUS_VARIANT,
  getShootStatus,
  isScheduleCancelled,
} from '../utils/scheduleConstants';

const ALL = '__all__';
const MOBILE_PAGE_SIZE = 20;

const filterControlCls = 'h-[38px] rounded-[10px] border-border bg-card shadow-none';

const iconActionCls =
  'inline-flex h-[30px] w-[30px] items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

const COUNT_KEYS: StatusCountKey[] = [...SHOOT_STATUSES, SCHEDULE_CANCELLED];

const countLabel = (k: StatusCountKey) =>
  k === SCHEDULE_CANCELLED ? SCHEDULE_CANCELLED_LABEL : SHOOT_STATUS_LABELS[k];
const countVariant = (k: StatusCountKey) =>
  k === SCHEDULE_CANCELLED ? 'neutral' : SHOOT_STATUS_VARIANT[k];

/** "01/02 – 28/02/2027" */
const rangeLabel = (from: string, to: string) => {
  if (from && to) return `${formatDay(from).slice(0, 5)} – ${formatDay(to)}`;
  if (from) return `Từ ${formatDay(from)}`;
  if (to) return `Đến ${formatDay(to)}`;
  return 'Khoảng ngày';
};

const SchedulesPage = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const {
    list: schedules,
    total,
    loading,
    statusCounts: serverCounts,
  } = useAppSelector((s) => s.schedules);
  const { list: customers } = useAppSelector((s) => s.customers);
  const { list: packages } = useAppSelector((s) => s.packages);
  const { photographers, sales: salesUsers } = useAppSelector((s) => s.users);
  const { list: seasons, selectedSeasonId } = useAppSelector((s) => s.seasons);

  const [filters, setFilters] = useState<ScheduleFilters>(DEFAULT_SCHEDULE_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  /** Mobile "Xem thêm": the list grows by reloading page 1 with a larger limit. */
  const [mobileLimit, setMobileLimit] = useState(MOBILE_PAGE_SIZE);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [filterOpen, setFilterOpen] = useState(false);
  const [allCostumes, setAllCostumes] = useState<CostumeResponse[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [formSession, setFormSession] = useState(0);
  const [editing, setEditing] = useState<ScheduleResponse | null>(null);
  const [prefill, setPrefill] = useState<PrefillCustomer | null>(null);
  const [detail, setDetail] = useState<ScheduleResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScheduleResponse | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ScheduleResponse | null>(null);
  /** Schedule whose "Sửa ekip" editor is open (anchored in its row, or a dialog in calendar view). */
  const [crewEdit, setCrewEdit] = useState<ScheduleResponse | null>(null);
  /** Latest list request — aborted when superseded so stale responses can't land. */
  const requestRef = useRef<{ abort: () => void } | null>(null);
  /** Background refresh (after a mutation / load more): keep the list instead of a skeleton. */
  const [softReload, setSoftReload] = useState(false);

  const role = statusPickerRole(user?.roles);
  const crewEditor = canEditCrew(user);

  const buildParams = (): Record<string, string | number> => {
    const params: Record<string, string | number> = isDesktop
      ? { page, limit: pageSize }
      : { page: 1, limit: mobileLimit };
    if (filters.status) params.status = filters.status;
    // "Tất cả" includes cancelled schedules (shown muted) so every status can be counted
    else params.includeCancelled = 'true';
    if (filters.customer) params.customer = filters.customer;
    const photographer = filters.mine ? user?._id : filters.photographer;
    if (photographer) params.photographer = photographer;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    if (selectedSeasonId) params.season = selectedSeasonId;
    return params;
  };

  const fetchList = () => {
    // Abort the previous request so a slow, stale response can't overwrite newer results
    requestRef.current?.abort();
    const request = dispatch(fetchSchedules(buildParams()));
    requestRef.current = request;
    return request;
  };

  const reload = () => {
    setSoftReload(true);
    fetchList();
  };

  useEffect(() => {
    const request = fetchList();
    return () => request.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, filters, page, pageSize, mobileLimit, isDesktop, selectedSeasonId, user?._id]);

  // A new season starts from the first page
  useEffect(() => {
    setPage(1);
    setMobileLimit(MOBILE_PAGE_SIZE);
  }, [selectedSeasonId]);

  useEffect(() => {
    if (!loading) setSoftReload(false);
  }, [loading]);

  useEffect(() => {
    dispatch(
      fetchCustomers(selectedSeasonId ? { limit: 200, season: selectedSeasonId } : { limit: 200 }),
    );
    dispatch(fetchPackages());
    dispatch(fetchPhotographers());
    dispatch(fetchSales());
    costumeService.getAll().then(setAllCostumes);
  }, [dispatch, selectedSeasonId]);

  const changeFilters = (patch: Partial<ScheduleFilters>) => {
    setPage(1);
    setMobileLimit(MOBILE_PAGE_SIZE);
    setSoftReload(false);
    setFilters((f) => ({ ...f, ...patch }));
  };
  const resetFilters = () => changeFilters(DEFAULT_SCHEDULE_FILTERS);

  const openCreate = (pre?: string | PrefillCustomer) => {
    setEditing(null);
    setPrefill(typeof pre === 'string' ? { _id: pre } : (pre ?? null));
    setFormSession((n) => n + 1);
    setFormOpen(true);
  };

  const openEdit = (s: ScheduleResponse) => {
    setEditing(s);
    setPrefill(null);
    setFormSession((n) => n + 1);
    setFormOpen(true);
  };

  useEffect(() => {
    const state = location.state as {
      openCreate?: boolean;
      customer?: string | PrefillCustomer;
    } | null;
    if (state?.openCreate) {
      openCreate(state.customer);
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFormSaved = async (saved: ScheduleResponse) => {
    reload();
    try {
      setDetail(await scheduleService.getOne(saved._id));
    } catch {
      // the list refresh already reflects the change
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      await scheduleService.remove(deleteTarget._id);
      toast.success('Đã xoá lịch chụp.');
      reload();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Xoá thất bại, vui lòng thử lại.'));
    }
    setDeleteTarget(null);
  };

  /** Cancel (or restore) a schedule — only the cancel flag is changed. */
  const doToggleCancel = async () => {
    const target = cancelTarget;
    if (!target) return;
    const cancelling = !isScheduleCancelled(target);
    try {
      const saved = await scheduleService.update(target._id, {
        status: cancelling ? 'cancelled' : 'active',
      });
      toast.success(cancelling ? 'Đã huỷ lịch chụp.' : 'Đã khôi phục lịch chụp.');
      setCancelTarget(null);
      if (formOpen && editing?._id === target._id) {
        setFormOpen(false);
        setDetail(await scheduleService.getOne(saved._id));
      }
      reload();
    } catch (err) {
      setCancelTarget(null);
      // e.g. 409 when restoring while the class already has another active schedule
      toast.error(apiErrorMessage(err));
    }
  };

  /** Server facets (all matches, ignoring the status filter); page-based until they arrive. */
  const counts = useMemo(() => {
    if (serverCounts) return serverCounts as Record<StatusCountKey, number>;
    const c = Object.fromEntries(COUNT_KEYS.map((k) => [k, 0])) as Record<StatusCountKey, number>;
    for (const s of schedules) c[isScheduleCancelled(s) ? SCHEDULE_CANCELLED : getShootStatus(s)]++;
    return c;
  }, [serverCounts, schedules]);
  const hasCounts = COUNT_KEYS.some((k) => counts[k] > 0);
  /** Shortage / conflict totals only cover the loaded rows. */
  const issuesScope = schedules.length < total ? ' trên trang này' : '';

  const issues = useMemo(() => {
    const active = schedules.filter((s) => !isScheduleCancelled(s));
    return {
      short: active.filter((s) => crewStats(s).missing > 0).length,
      conflict: active.filter((s) => (s.conflicts?.length ?? 0) > 0).length,
    };
  }, [schedules]);

  const customerOptions = useMemo(
    () => [
      { value: '', label: 'Tất cả lớp' },
      ...customers.map((c) => ({ value: c._id, label: c.className })),
    ],
    [customers],
  );

  const calendarItems = useMemo(
    () =>
      schedules.map((s) => ({
        _id: s._id,
        shootDate: s.shootDate,
        startTime: s.startTime,
        endTime: s.endTime,
        location: s.location,
        shootStatus: getShootStatus(s),
        cancelled: isScheduleCancelled(s),
        notes: s.notes,
        className: s.customer?.className ?? '—',
        leadName: personName(s.leadPhotographer) || undefined,
        school: getSchoolName(s.customer),
        packageName: s.package?.name,
        packagePrice: s.package?.pricePerMember,
        supportNames: s.supportPhotographers.map(personName).filter(Boolean),
        driveFolderUrl: s.driveFolderUrl,
        studentCount: s.customer?.total,
        crew: [
          ...(s.leadPhotographer ? [{ name: personName(s.leadPhotographer), lead: true }] : []),
          ...s.supportPhotographers.map((u) => ({ name: personName(u) })),
        ],
      })),
    [schedules],
  );

  const findSchedule = (id: string) => schedules.find((x) => x._id === id);

  const renderStatus = (s: ScheduleResponse) => (
    <QuickStatusPicker
      schedule={s}
      role={role}
      onCrew={isOnCrew(s, user?._id)}
      userId={user?._id}
      userRoles={user?.roles}
      isDesktop={isDesktop}
      onChanged={reload}
    />
  );

  const renderMenu = (s: ScheduleResponse, vertical = false) => (
    <ScheduleRowMenu
      cancelled={isScheduleCancelled(s)}
      vertical={vertical}
      onEdit={() => openEdit(s)}
      onEditCrew={crewEditor ? () => setCrewEdit(s) : undefined}
      onToggleCancel={() => setCancelTarget(s)}
      onDelete={() => setDeleteTarget(s)}
    />
  );

  const renderCrew = (s: ScheduleResponse, variant: 'table' | 'card') => (
    <CrewCell
      schedule={s}
      variant={variant}
      canEdit={crewEditor}
      crewOpen={viewMode === 'table' && crewEdit?._id === s._id}
      onCrewOpenChange={(o) => setCrewEdit(o ? s : null)}
      photographers={photographers}
      isDesktop={isDesktop}
      onSaved={reload}
    />
  );

  const scheduleColumns: Column<ScheduleResponse>[] = [
    {
      key: 'date',
      header: 'Ngày chụp',
      render: (s) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground tabular">{formatDay(s.shootDate)}</span>
          <span className="whitespace-nowrap text-xs text-muted-foreground tabular">
            {[weekdayShort(s.shootDate), timeRange(s)].filter(Boolean).join(' · ')}
          </span>
        </div>
      ),
    },
    {
      key: 'class',
      header: 'Lớp',
      render: (s) => {
        const school = getSchoolName(s.customer);
        const total = s.customer?.total;
        return (
          <div className="flex flex-col">
            <span
              className={cn(
                'whitespace-nowrap font-semibold text-foreground',
                isScheduleCancelled(s) && 'line-through',
              )}
            >
              {s.customer?.className ?? '—'}
            </span>
            <span className="max-w-[220px] text-xs text-muted-foreground">
              {[school, total != null && `${total} HS`].filter(Boolean).join(' · ')}
            </span>
          </div>
        );
      },
    },
    {
      key: 'package',
      header: 'Gói',
      render: (s) => (
        <div className="flex flex-col whitespace-nowrap">
          <span className="text-foreground/90">{s.package?.name ?? '—'}</span>
          {s.package?.studentsPerCrew ? (
            <span className="text-xs text-muted-foreground tabular">
              {s.package.studentsPerCrew} HS/thợ
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'crew',
      header: (
        <span className="inline-flex items-center gap-1">
          Ekip
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 cursor-help" aria-label="Cách tính số thợ" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[260px] normal-case tracking-normal">
              Số thợ cần = sĩ số ÷ số HS mỗi thợ của gói (làm tròn xuống, dư hơn 50% thì thêm 1
              thợ).
            </TooltipContent>
          </Tooltip>
        </span>
      ),
      render: (s) => renderCrew(s, 'table'),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: renderStatus,
    },
    {
      key: 'notes',
      header: 'Ghi chú',
      render: (s) =>
        s.notes ? (
          <span
            className="line-clamp-2 block max-w-[220px] text-[13px] text-foreground/80"
            title={s.notes}
          >
            {s.notes}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      className: 'whitespace-nowrap',
      render: (s) => (
        <span className="inline-flex items-center gap-0.5">
          <button
            type="button"
            className={iconActionCls}
            title="Sửa lịch"
            aria-label="Sửa lịch"
            onClick={() => openEdit(s)}
          >
            <Pencil className="h-4 w-4" />
          </button>
          {renderMenu(s)}
        </span>
      ),
    },
  ];

  const activeFilterCount =
    [
      filters.status,
      filters.customer,
      filters.photographer,
      filters.dateFrom || filters.dateTo,
    ].filter(Boolean).length + (filters.mine ? 1 : 0);
  const hasFilters = activeFilterCount > 0;
  const showSkeleton = loading && !softReload;

  const issuesSummary = (issues.short > 0 || issues.conflict > 0) && (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
      <AlertTriangle className="h-4 w-4 text-rose-500" />
      {issues.short} lịch thiếu thợ · {issues.conflict} lịch trùng thợ{issuesScope}
    </span>
  );

  return (
    <div className="flex flex-col md:min-h-0 md:flex-1">
      <PageHeader
        kicker="Schedules"
        title="Lịch chụp"
        description="Phân công ekip thợ chụp và cập nhật trạng thái buổi chụp."
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
            <Button onClick={() => openCreate()}>
              <Plus /> Thêm lịch
            </Button>
          </div>
        }
      />

      {isDesktop ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Select
            value={filters.status || ALL}
            onValueChange={(v) => changeFilters({ status: v === ALL ? '' : v })}
          >
            <SelectTrigger className={cn(filterControlCls, 'w-[180px]')}>
              <div className="flex items-center gap-2">
                <ListFilter className="h-4 w-4 text-muted-foreground" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tất cả trạng thái</SelectItem>
              {SHOOT_STATUSES.map((v) => (
                <SelectItem key={v} value={v}>
                  {SHOOT_STATUS_LABELS[v]}
                </SelectItem>
              ))}
              <SelectItem value={SCHEDULE_CANCELLED}>{SCHEDULE_CANCELLED_LABEL}</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative w-[200px]">
            <School className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Combobox
              options={customerOptions}
              value={filters.customer}
              onChange={(v) => changeFilters({ customer: v })}
              placeholder="Tất cả lớp"
              className={cn(filterControlCls, 'pl-9')}
            />
          </div>
          <Select
            value={filters.mine ? ALL : filters.photographer || ALL}
            onValueChange={(v) => changeFilters({ photographer: v === ALL ? '' : v, mine: false })}
          >
            <SelectTrigger className={cn(filterControlCls, 'w-[200px]')}>
              <div className="flex min-w-0 items-center gap-2">
                <Camera className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  Thợ chụp:{' '}
                  {filters.photographer && !filters.mine
                    ? personName(photographers.find((u) => u._id === filters.photographer)) ||
                      'Đã chọn'
                    : 'Tất cả'}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tất cả</SelectItem>
              {photographers.map((u) => (
                <SelectItem key={u._id} value={u._id}>
                  {personName(u)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            role="switch"
            aria-checked={filters.mine}
            onClick={() => changeFilters({ mine: !filters.mine, photographer: '' })}
            className={cn(
              'inline-flex h-[38px] items-center gap-2 rounded-full border px-3 text-[13.5px] transition-colors',
              filters.mine
                ? 'border-primary bg-primary-100 text-primary-700 dark:bg-primary/15 dark:text-primary'
                : 'bg-card text-foreground hover:bg-muted/60',
            )}
          >
            <span
              className={cn(
                'relative inline-flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors',
                filters.mine ? 'bg-primary' : 'bg-muted-foreground/30',
              )}
            >
              <span
                className={cn(
                  'h-3 w-3 rounded-full bg-white shadow-sm transition-transform',
                  filters.mine ? 'translate-x-3' : 'translate-x-0',
                )}
              />
            </span>
            Lịch của tôi
          </button>
          <DatePicker
            value={filters.dateFrom}
            onChange={(v) => changeFilters({ dateFrom: v ?? '' })}
            placeholder="Từ ngày"
            className={cn(filterControlCls, 'w-[160px]')}
          />
          <span className="text-muted-foreground">–</span>
          <DatePicker
            value={filters.dateTo}
            onChange={(v) => changeFilters({ dateTo: v ?? '' })}
            placeholder="Đến ngày"
            className={cn(filterControlCls, 'w-[160px]')}
          />
          {hasFilters && (
            <Button variant="link" className="px-2" onClick={resetFilters}>
              Xoá lọc
            </Button>
          )}
        </div>
      ) : (
        <div className="mb-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className="inline-flex h-[42px] min-w-0 flex-1 items-center gap-2 rounded-[10px] border bg-card px-3 text-[13.5px] text-foreground"
            >
              <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate tabular">
                {rangeLabel(filters.dateFrom, filters.dateTo)}
              </span>
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={filters.mine}
              onClick={() => changeFilters({ mine: !filters.mine, photographer: '' })}
              className={cn(
                'inline-flex h-[42px] shrink-0 items-center gap-2 rounded-full border px-3 text-[13.5px]',
                filters.mine
                  ? 'border-primary bg-primary-100 text-primary-700 dark:bg-primary/15 dark:text-primary'
                  : 'bg-card text-foreground',
              )}
            >
              <span
                className={cn(
                  'relative inline-flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors',
                  filters.mine ? 'bg-primary' : 'bg-muted-foreground/30',
                )}
              >
                <span
                  className={cn(
                    'h-3 w-3 rounded-full bg-white shadow-sm transition-transform',
                    filters.mine ? 'translate-x-3' : 'translate-x-0',
                  )}
                />
              </span>
              Của tôi
            </button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="relative h-[42px] w-[42px] shrink-0 text-muted-foreground shadow-none [&_svg]:size-[17px]"
              aria-label="Bộ lọc"
              onClick={() => setFilterOpen(true)}
            >
              <SlidersHorizontal />
              {activeFilterCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground tabular">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      )}

      {hasCounts && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          {COUNT_KEYS.filter((k) => isDesktop || counts[k] > 0).map((k) => {
            const on = filters.status === k;
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                onClick={() => changeFilters({ status: on ? '' : k })}
                className={cn(
                  badgeVariants({ variant: countVariant(k) }),
                  'border-[1.5px] focus:ring-offset-0',
                  on ? 'border-current' : 'border-transparent',
                  counts[k] === 0 && 'opacity-60',
                )}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                {countLabel(k)} · {counts[k]}
              </button>
            );
          })}
          {isDesktop ? (
            <span className="ml-auto">{issuesSummary}</span>
          ) : (
            (issues.short > 0 || issues.conflict > 0) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    tabIndex={0}
                    className={cn(badgeVariants({ variant: 'danger' }), 'focus:ring-offset-0')}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {issues.short + issues.conflict}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {issues.short} lịch thiếu thợ · {issues.conflict} lịch trùng thợ{issuesScope}
                </TooltipContent>
              </Tooltip>
            )
          )}
        </div>
      )}

      {showSkeleton ? (
        <TableSkeleton cols={7} />
      ) : viewMode === 'calendar' ? (
        <ScheduleCalendar
          items={calendarItems}
          sidePanel
          onOpen={(id) => {
            const s = findSchedule(id);
            if (s) setDetail(s);
          }}
          onEditCrew={
            crewEditor
              ? (id) => {
                  const s = findSchedule(id);
                  if (s) setCrewEdit(s);
                }
              : undefined
          }
          onEdit={(id) => {
            const s = findSchedule(id);
            if (s) openEdit(s);
          }}
          onDelete={(id) => {
            const s = findSchedule(id);
            if (s) setDeleteTarget(s);
          }}
        />
      ) : isDesktop ? (
        <div className="flex md:min-h-0 md:flex-1 md:flex-col">
          <DataTable<ScheduleResponse>
            fill
            className="flex-1"
            data={schedules}
            keyExtractor={(s) => s._id}
            emptyTitle="Chưa có dữ liệu"
            columns={scheduleColumns}
            rowClassName={(s) => (isScheduleCancelled(s) ? 'opacity-60' : '')}
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
      ) : (
        <ScheduleMobileList
          schedules={schedules}
          total={total}
          hasMore={schedules.length < total}
          loadingMore={loading && softReload}
          onLoadMore={() => {
            setSoftReload(true);
            setMobileLimit((n) => n + MOBILE_PAGE_SIZE);
          }}
          onOpen={setDetail}
          renderStatus={renderStatus}
          renderMenu={(s) => renderMenu(s, true)}
          renderCrew={(s) => renderCrew(s, 'card')}
        />
      )}

      {/* Calendar view: no row anchor → dialog (bottom sheet on mobile) */}
      {viewMode === 'calendar' && (
        <CrewEditor
          schedule={crewEdit}
          photographers={photographers}
          open={!!crewEdit}
          onOpenChange={(o) => !o && setCrewEdit(null)}
          onSaved={reload}
          isDesktop={isDesktop}
        />
      )}

      <ScheduleFilterSheet
        open={filterOpen && !isDesktop}
        onOpenChange={setFilterOpen}
        filters={filters}
        onChange={changeFilters}
        onReset={resetFilters}
        counts={counts}
        customerOptions={customerOptions}
        photographers={photographers}
        total={total}
        loading={loading}
      />

      <ScheduleFormDialog
        open={formOpen}
        // `editing` is kept after closing so the title doesn't flip during the close animation
        onOpenChange={setFormOpen}
        editing={editing}
        prefill={prefill}
        sessionKey={formSession}
        customers={customers}
        packages={packages}
        photographers={photographers}
        salesUsers={salesUsers}
        seasons={seasons}
        selectedSeasonId={selectedSeasonId}
        costumes={allCostumes}
        onSaved={onFormSaved}
        onToggleCancel={() => editing && setCancelTarget(editing)}
        canEditCrew={crewEditor}
      />

      <ScheduleDetailDialog
        detail={detail}
        onClose={() => setDetail(null)}
        onEdit={(s) => {
          setDetail(null);
          openEdit(s);
        }}
        onEditCrew={
          crewEditor
            ? (s) => {
                setDetail(null);
                // Open after the detail dialog has closed and restored focus
                setTimeout(() => setCrewEdit(s), 0);
              }
            : undefined
        }
        onDelete={(s) => {
          setDetail(null);
          setDeleteTarget(s);
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Xác nhận xoá"
        message="Bạn có chắc muốn xoá lịch chụp này? Thao tác sẽ xoá luôn folder ảnh trên Google Drive và dòng tương ứng trong Google Sheet quản lý."
        onConfirm={doDelete}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(o) => !o && setCancelTarget(null)}
        title={
          cancelTarget && isScheduleCancelled(cancelTarget)
            ? 'Khôi phục lịch chụp'
            : 'Huỷ lịch chụp'
        }
        message={
          cancelTarget && isScheduleCancelled(cancelTarget)
            ? 'Khôi phục lịch chụp này? Lịch sẽ được tính lại là lịch đang áp dụng của lớp.'
            : 'Huỷ lịch chụp này? Lịch vẫn được giữ lại (có thể khôi phục), thợ chụp sẽ nhận thông báo huỷ.'
        }
        confirmLabel={cancelTarget && isScheduleCancelled(cancelTarget) ? 'Khôi phục' : 'Huỷ lịch'}
        cancelLabel="Đóng"
        destructive={!(cancelTarget && isScheduleCancelled(cancelTarget))}
        onConfirm={doToggleCancel}
      />
    </div>
  );
};

export default SchedulesPage;
