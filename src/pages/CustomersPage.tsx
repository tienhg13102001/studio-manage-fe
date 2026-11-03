import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  CalendarClock,
  ChevronsDown,
  Download,
  Pencil,
  Plus,
  School,
  Search,
  SlidersHorizontal,
  Trash2,
  UserCheck,
  UserRound,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { customerService } from '../services/customerService';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchCustomers } from '../store/slices/customersSlice';
import { fetchSales } from '../store/slices/usersSlice';
import { useAuth } from '../context/AuthContext';
import type {
  Customer,
  CustomerSaleRef,
  CustomerStatus,
  CustomerStatusCounts,
  SchoolRef,
} from '../types';
import {
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_STATUS_VARIANT,
  getCustomerStatus,
  getUserRefName,
  getSchoolName,
} from '../types';
import { formatDate } from '../utils/format';
import { cn } from '@/lib/utils';
import {
  Badge,
  badgeDotClass,
  Button,
  Combobox,
  ConfirmDialog,
  DataTable,
  EmptyState,
  FilterChip,
  FilterSection,
  FilterSheet,
  Input,
  PageHeader,
  RowActions,
  SearchInput,
  SHEET_CONTROL_CLS,
  Spinner,
  TableSkeleton,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import CustomerFormDialog from '../components/organisms/CustomerFormDialog';
import SchoolCombobox from '../components/organisms/SchoolCombobox';

const SEARCH_DEBOUNCE_MS = 400;

/** Chú thích kỷ yếu: tên lớp serif + trường chữ nhỏ tracking. */
const Caption = ({ c }: { c: Customer }) => (
  <div className="min-w-0">
    <Link
      to={`/customers/${c._id}`}
      className="block truncate font-display text-[17px] font-bold leading-tight text-foreground hover:underline hover:decoration-primary hover:decoration-2 hover:underline-offset-4"
    >
      {c.className}
    </Link>
    {getSchoolName(c) && (
      <span className="mt-0.5 block truncate text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground">
        {getSchoolName(c)}
      </span>
    )}
  </div>
);

const Headcount = ({ c }: { c: Customer }) => {
  const male = c.totalMale ?? 0;
  const female = c.totalFemale ?? 0;
  return (
    <span className="tabular whitespace-nowrap">
      <span className="font-semibold text-foreground">{c.total ?? 0}</span>
      <span className="text-muted-foreground"> HS</span>
      {male + female > 0 && (
        <span className="text-muted-foreground">
          {' '}
          · {male} nam · {female} nữ
        </span>
      )}
    </span>
  );
};

const StatusBadge = ({ customer }: { customer: Customer }) => {
  const status = getCustomerStatus(customer);
  return (
    <Badge variant={CUSTOMER_STATUS_VARIANT[status]} dot className="whitespace-nowrap">
      {CUSTOMER_STATUS_LABELS[status]}
    </Badge>
  );
};

/** Chip bộ lọc đang bật (mobile), bấm để bỏ. */
const ActiveFilter = ({
  label,
  dot,
  icon,
  onRemove,
}: {
  label: string;
  dot?: string;
  icon?: React.ReactNode;
  onRemove: () => void;
}) => (
  <button
    type="button"
    onClick={onRemove}
    aria-label={`Bỏ lọc ${label}`}
    className="inline-flex h-9 max-w-[240px] shrink-0 items-center gap-2 rounded-md border bg-card px-3 text-[13px] text-foreground [&_svg]:shrink-0 [&_svg]:text-muted-foreground"
  >
    {dot && <span className={cn('h-2 w-2 shrink-0 rounded-full', dot)} aria-hidden />}
    {icon}
    <span className="truncate">{label}</span>
    <X className="h-3.5 w-3.5" />
  </button>
);

const CustomersPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list: customers, total, loading, error: loadError } = useAppSelector((s) => s.customers);
  const { selectedSeasonId } = useAppSelector((s) => s.seasons);
  const { user } = useAuth();
  const isAdmin = !!user?.roles.some((r) => r === 0 || r === 1);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | ''>('');
  const [mine, setMine] = useState(false);
  const [schoolFilter, setSchoolFilter] = useState<SchoolRef | null>(null);
  /** Creator user id, '' = all. */
  const [creatorFilter, setCreatorFilter] = useState('');
  const [creators, setCreators] = useState<CustomerSaleRef[]>([]);
  const [counts, setCounts] = useState<CustomerStatusCounts | null>(null);
  /** Mobile "Tải thêm lớp": pages appended after the current redux page. */
  const [extra, setExtra] = useState<Customer[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  /** Total from the latest load-more response; exhausted once a short page comes back. */
  const [moreTotal, setMoreTotal] = useState<number | null>(null);
  const [moreExhausted, setMoreExhausted] = useState(false);
  /** Bumped after a create so appended pages are dropped (edit/delete patch them locally). */
  const [extraEpoch, setExtraEpoch] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const loadMoreToken = useRef(0);
  /** Number of pages appended to `extra` (independent of de-duplication). */
  const loadedExtraPages = useRef(0);

  const buildParams = (s: string, p: number, l: number): Record<string, string | number> => {
    const params: Record<string, string | number> = { page: p, limit: l };
    if (s) params.search = s;
    if (selectedSeasonId) params.season = selectedSeasonId;
    if (statusFilter) params.status = statusFilter;
    if (mine) params.assignedSale = 'me';
    if (schoolFilter) params.schoolId = schoolFilter._id;
    if (creatorFilter) params.createdBy = creatorFilter;
    return params;
  };

  const loadCounts = () => {
    const params: Record<string, string> = {};
    if (selectedSeasonId) params.season = selectedSeasonId;
    if (mine) params.assignedSale = 'me';
    if (schoolFilter) params.schoolId = schoolFilter._id;
    if (creatorFilter) params.createdBy = creatorFilter;
    customerService
      .getStatusCounts(params)
      .then(setCounts)
      .catch(() => setCounts(null));
  };

  // Auto-search while typing; Enter / clear apply immediately (setting appliedSearch cancels this)
  useEffect(() => {
    if (search === appliedSearch) return;
    const timer = setTimeout(() => {
      setPage(1);
      setAppliedSearch(search);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, appliedSearch]);

  useEffect(() => {
    // Abort the previous request so a slow, stale response can't overwrite newer results
    const request = dispatch(fetchCustomers(buildParams(appliedSearch, page, pageSize)));
    return () => request.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dispatch,
    appliedSearch,
    page,
    pageSize,
    selectedSeasonId,
    statusFilter,
    mine,
    schoolFilter,
    creatorFilter,
  ]);

  const resetExtra = () => {
    loadMoreToken.current += 1;
    loadedExtraPages.current = 0;
    setExtra([]);
    setMoreTotal(null);
    setMoreExhausted(false);
    setLoadingMore(false);
  };

  // Filter/search/season/paging changes (and creates) drop appended mobile pages and cancel
  // in-flight loads. Edit/delete keep them and patch `extra` locally instead.
  useEffect(() => {
    resetExtra();
  }, [
    appliedSearch,
    statusFilter,
    mine,
    schoolFilter,
    creatorFilter,
    selectedSeasonId,
    page,
    pageSize,
    extraEpoch,
  ]);

  useEffect(() => {
    if (isAdmin) dispatch(fetchSales());
  }, [dispatch, isAdmin]);

  useEffect(() => {
    loadCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeasonId, mine, schoolFilter, creatorFilter]);

  useEffect(() => {
    customerService
      .getCreators()
      .then(setCreators)
      .catch(() => setCreators([]));
  }, []);

  const creatorOptions = useMemo(
    () => [
      { value: '', label: 'Tất cả người tạo' },
      ...creators.map((u) => ({ value: u._id, label: u.name || u.username })),
    ],
    [creators],
  );
  const creatorName = creatorOptions.find((o) => o.value === creatorFilter)?.label;

  const changeSchoolFilter = (school: SchoolRef | null) => {
    setPage(1);
    setSchoolFilter(school);
  };

  const changeCreatorFilter = (id: string) => {
    setPage(1);
    setCreatorFilter(id);
  };

  const changeStatusFilter = (st: CustomerStatus | '') => {
    setPage(1);
    setStatusFilter(st);
  };

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setModalOpen(true);
  };

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await customerService.remove(confirmId);
      toast.success('Đã xoá lớp.');
      setExtra((prev) => prev.filter((c) => c._id !== confirmId));
      setMoreTotal(null);
      dispatch(fetchCustomers(buildParams(appliedSearch, page, pageSize)));
      loadCounts();
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  const runSearch = () => {
    setPage(1);
    setAppliedSearch(search);
  };

  const mobileList = [
    ...customers,
    ...extra.filter((e) => !customers.some((c) => c._id === e._id)),
  ];
  const mobileStart = (page - 1) * pageSize;
  const hasMore = !moreExhausted && mobileStart + mobileList.length < (moreTotal ?? total);

  const loadMore = async () => {
    const token = loadMoreToken.current;
    const nextPage = page + 1 + loadedExtraPages.current;
    setLoadingMore(true);
    try {
      const res = await customerService.getAll(buildParams(appliedSearch, nextPage, pageSize));
      if (token !== loadMoreToken.current) return;
      loadedExtraPages.current += 1;
      setExtra((prev) => [
        ...prev,
        ...res.data.filter(
          (c, i, arr) =>
            !prev.some((p) => p._id === c._id) && arr.findIndex((x) => x._id === c._id) === i,
        ),
      ]);
      setMoreTotal(res.total);
      if (res.data.length < pageSize) setMoreExhausted(true);
    } catch {
      if (token === loadMoreToken.current) toast.error('Không tải được thêm lớp.');
    } finally {
      if (token === loadMoreToken.current) setLoadingMore(false);
    }
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const rows: Customer[] = [];
      const limit = 100;
      for (let p = 1; ; p += 1) {
        const res = await customerService.getAll(buildParams(appliedSearch, p, limit));
        rows.push(...res.data);
        if (res.data.length < limit || rows.length >= res.total) break;
      }
      const { default: ExcelJS } = await import('exceljs');
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Lớp');
      ws.columns = [
        { width: 6 },
        { width: 14 },
        { width: 28 },
        { width: 16 },
        { width: 18 },
        { width: 22 },
        { width: 15 },
        { width: 32 },
        { width: 8 },
        { width: 8 },
        { width: 8 },
        { width: 16 },
        { width: 32 },
      ];
      const border: Partial<import('exceljs').Borders> = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      const headerRow = ws.addRow([
        'STT',
        'Lớp',
        'Trường',
        'Trạng thái',
        'Người tạo',
        'Người liên hệ',
        'Số điện thoại',
        'Địa chỉ',
        'Sĩ số',
        'Nam',
        'Nữ',
        'Ngày dự kiến chụp',
        'Ghi chú',
      ]);
      headerRow.font = { bold: true };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        cell.border = border;
      });
      rows.forEach((c, i) => {
        const row = ws.addRow([
          i + 1,
          c.className,
          getSchoolName(c),
          CUSTOMER_STATUS_LABELS[getCustomerStatus(c)],
          getUserRefName(c.createdBy) ?? '',
          c.contactName ?? '',
          c.contactPhone ?? '',
          c.contactAddress ?? '',
          c.total ?? '',
          c.totalMale ?? '',
          c.totalFemale ?? '',
          c.expectedShootDate ? formatDate(c.expectedShootDate) : '',
          c.notes ?? '',
        ]);
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = border;
        });
      });
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Danh sách lớp.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error('Xuất Excel thất bại, vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  };

  const toggleMine = () => {
    setPage(1);
    setMine((m) => !m);
  };

  const anyFilter = !!(statusFilter || mine || schoolFilter || creatorFilter);
  const reloadList = () => {
    dispatch(fetchCustomers(buildParams(appliedSearch, page, pageSize)));
    loadCounts();
  };
  const allCount = counts
    ? CUSTOMER_STATUSES.reduce((sum, st) => sum + (counts[st] ?? 0), 0)
    : null;
  const resetAllFilters = () => {
    setPage(1);
    setStatusFilter('');
    setMine(false);
    setSchoolFilter(null);
    setCreatorFilter('');
  };

  const rowActions = (c: Customer) => (
    <RowActions
      subject={`lớp ${c.className}`}
      primary={{ label: 'Sửa', icon: <Pencil className="h-4 w-4" />, onSelect: () => openEdit(c) }}
      actions={[
        {
          label: 'Mở chi tiết',
          icon: <ArrowUpRight className="h-4 w-4" />,
          onSelect: () => navigate(`/customers/${c._id}`),
        },
        {
          label: 'Xoá lớp',
          icon: <Trash2 className="h-4 w-4" />,
          onSelect: () => setConfirmId(c._id),
          destructive: true,
        },
      ]}
    />
  );

  const statusChips = (
    <>
      <FilterChip active={!statusFilter} onClick={() => changeStatusFilter('')}>
        Tất cả
        <span className="tabular">{allCount ?? '–'}</span>
      </FilterChip>
      {/* Trạng thái 0 lớp thì ẩn để dải lọc gọn một hàng; trạng thái đang chọn luôn hiện. */}
      {CUSTOMER_STATUSES.filter(
        (st) => !counts || (counts[st] ?? 0) > 0 || statusFilter === st,
      ).map((st) => (
        <FilterChip
          key={st}
          active={statusFilter === st}
          dot={badgeDotClass[CUSTOMER_STATUS_VARIANT[st]]}
          onClick={() => changeStatusFilter(statusFilter === st ? '' : st)}
        >
          {CUSTOMER_STATUS_LABELS[st]}
          <span className="tabular">{counts ? (counts[st] ?? 0) : '–'}</span>
        </FilterChip>
      ))}
    </>
  );

  return (
    <div className="flex flex-col md:min-h-0 md:flex-1">
      <PageHeader
        title="Lớp học"
        description={
          loading && !customers.length
            ? 'Đang tải danh sách lớp…'
            : `${total} lớp${anyFilter || appliedSearch ? ' khớp bộ lọc' : selectedSeasonId ? ' trong mùa này' : ''}`
        }
        action={
          <>
            <Button
              variant="outline"
              onClick={exportExcel}
              disabled={exporting}
              className="max-md:flex-1"
            >
              {exporting ? <Spinner size="sm" /> : <Download />}
              Xuất Excel
            </Button>
            <Button onClick={openCreate} className="max-md:flex-1">
              <Plus />
              Thêm lớp
            </Button>
          </>
        }
      />

      {/* Tìm + lọc (mobile) */}
      <div className="mb-3 space-y-3 md:hidden">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              enterKeyHint="search"
              aria-label="Tìm lớp hoặc trường"
              className="h-11 pl-9 pr-10 [&::-webkit-search-cancel-button]:hidden"
              placeholder="Tìm lớp, trường…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            />
            {search && (
              <button
                type="button"
                className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Xoá tìm kiếm"
                onClick={() => {
                  setSearch('');
                  setAppliedSearch('');
                  setPage(1);
                }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="relative h-11 w-11 shrink-0"
            aria-label={anyFilter ? 'Bộ lọc (đang lọc)' : 'Bộ lọc'}
            onClick={() => setFilterOpen(true)}
          >
            <SlidersHorizontal />
            {anyFilter && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
            )}
          </Button>
        </div>
        {anyFilter && (
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
            {statusFilter && (
              <ActiveFilter
                label={CUSTOMER_STATUS_LABELS[statusFilter]}
                dot={badgeDotClass[CUSTOMER_STATUS_VARIANT[statusFilter]]}
                onRemove={() => changeStatusFilter('')}
              />
            )}
            {schoolFilter && (
              <ActiveFilter
                label={schoolFilter.name}
                icon={<School className="h-4 w-4" />}
                onRemove={() => changeSchoolFilter(null)}
              />
            )}
            {creatorFilter && (
              <ActiveFilter
                label={creatorName ?? 'Người tạo'}
                icon={<UserRound className="h-4 w-4" />}
                onRemove={() => changeCreatorFilter('')}
              />
            )}
            {mine && (
              <ActiveFilter
                label="Lớp của tôi"
                icon={<UserCheck className="h-4 w-4" />}
                onRemove={toggleMine}
              />
            )}
          </div>
        )}
      </div>

      {/* Mục lục trạng thái (desktop) */}
      <div
        role="group"
        aria-label="Lọc theo trạng thái"
        className="mb-3 hidden flex-wrap gap-1.5 md:flex"
      >
        {statusChips}
      </div>

      <div className="mb-4 hidden flex-wrap items-center gap-2 md:flex">
        <SearchInput
          className="flex-1 sm:max-w-sm"
          placeholder="Tìm lớp, trường…"
          value={search}
          onChange={setSearch}
          onSearch={runSearch}
          onClear={() => {
            setSearch('');
            setAppliedSearch('');
            setPage(1);
          }}
        />
        <SchoolCombobox
          allLabel="Tất cả trường"
          value={schoolFilter}
          onChange={changeSchoolFilter}
          className="h-10 w-[220px] rounded-md border-input bg-card shadow-none"
        />
        <Combobox
          options={creatorOptions}
          value={creatorFilter}
          onChange={changeCreatorFilter}
          placeholder="Tất cả người tạo"
          searchPlaceholder="Tìm người tạo…"
          className="h-10 w-[200px] rounded-md border-input bg-card shadow-none"
        />
        <Button
          type="button"
          variant="outline"
          aria-pressed={mine}
          onClick={toggleMine}
          className={cn(
            'h-10',
            mine &&
              'border-foreground bg-foreground text-background hover:bg-foreground/90 hover:text-background',
          )}
        >
          <UserCheck />
          Lớp của tôi
        </Button>
        {anyFilter && (
          <Button variant="link" className="px-2" onClick={resetAllFilters}>
            Xoá bộ lọc
          </Button>
        )}
      </div>

      {/* Bảng (desktop) */}
      <div className="hidden md:flex md:min-h-0 md:flex-1 md:flex-col">
        <DataTable<Customer>
          fill
          className="flex-1"
          loading={loading}
          error={loadError ? 'Kiểm tra kết nối mạng rồi thử lại.' : undefined}
          onRetry={reloadList}
          data={customers}
          keyExtractor={(c) => c._id}
          emptyTitle={
            anyFilter || appliedSearch
              ? 'Không có lớp nào khớp'
              : selectedSeasonId
                ? 'Chưa có lớp nào trong mùa này'
                : 'Chưa có lớp nào'
          }
          emptyAction={
            anyFilter || appliedSearch ? (
              <Button variant="outline" size="sm" onClick={resetAllFilters}>
                Xoá bộ lọc
              </Button>
            ) : (
              <Button size="sm" onClick={openCreate}>
                <Plus /> Thêm lớp
              </Button>
            )
          }
          onRowClick={(c) => navigate(`/customers/${c._id}`)}
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
          columns={[
            {
              key: 'className',
              header: 'Lớp',
              className: 'min-w-[200px] max-w-[280px]',
              render: (c) => <Caption c={c} />,
            },
            {
              key: 'status',
              header: 'Trạng thái',
              render: (c) => (
                <div>
                  <StatusBadge customer={c} />
                  {c.expectedShootDate && (
                    <span
                      className="tabular mt-1 flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground"
                      title="Ngày dự kiến chụp"
                    >
                      <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                      Dự kiến {formatDate(c.expectedShootDate)}
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: 'contact',
              header: 'Liên hệ',
              render: (c) => (
                <div className="min-w-0">
                  <span className="block truncate font-medium text-foreground">
                    {c.contactName || '—'}
                  </span>
                  {c.contactPhone && (
                    <span className="tabular block text-[13px] text-muted-foreground">
                      {c.contactPhone}
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: 'contactAddress',
              header: 'Địa chỉ',
              className: 'max-2xl:hidden',
              render: (c) =>
                c.contactAddress ? (
                  <span className="block max-w-[220px] truncate" title={c.contactAddress}>
                    {c.contactAddress}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                ),
            },
            {
              key: 'total',
              header: 'Sĩ số',
              render: (c) => <Headcount c={c} />,
            },
            {
              key: 'createdBy',
              header: 'Người tạo',
              className: 'max-lg:hidden',
              render: (c) => {
                const name = getUserRefName(c.createdBy);
                return name ? (
                  <span className="whitespace-nowrap text-foreground">{name}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                );
              },
            },
            {
              key: 'notes',
              header: 'Ghi chú',
              className: 'max-xl:hidden',
              render: (c) =>
                c.notes ? (
                  <span
                    className="block max-w-[220px] truncate text-muted-foreground"
                    title={c.notes}
                  >
                    {c.notes}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                ),
            },
            {
              key: 'actions',
              header: <span className="sr-only">Thao tác</span>,
              align: 'right',
              className: 'w-24',
              render: rowActions,
            } satisfies Column<Customer>,
          ]}
        />
      </div>

      {/* Danh sách thẻ (mobile) */}
      <div className="md:hidden">
        {loading && !loadingMore ? (
          <TableSkeleton rows={5} cols={2} />
        ) : loadError ? (
          <div
            role="alert"
            className="flex flex-col items-center gap-3 rounded-lg border bg-card px-6 py-12 text-center"
          >
            <p className="text-sm font-semibold text-foreground">Không tải được danh sách lớp</p>
            <p className="text-sm text-muted-foreground">Kiểm tra kết nối mạng rồi thử lại.</p>
            <Button variant="outline" size="sm" onClick={reloadList}>
              Thử lại
            </Button>
          </div>
        ) : mobileList.length === 0 ? (
          <EmptyState
            className="rounded-lg border bg-card"
            title={
              anyFilter || appliedSearch
                ? 'Không có lớp nào khớp'
                : selectedSeasonId
                  ? 'Chưa có lớp nào trong mùa này'
                  : 'Chưa có lớp nào'
            }
            action={
              anyFilter || appliedSearch ? (
                <Button variant="outline" size="sm" onClick={resetAllFilters}>
                  Xoá bộ lọc
                </Button>
              ) : (
                <Button size="sm" onClick={openCreate}>
                  <Plus /> Thêm lớp
                </Button>
              )
            }
          />
        ) : (
          <>
            <ul className="divide-y overflow-hidden rounded-lg border bg-card">
              {mobileList.map((c) => (
                <li key={c._id} className="relative px-4 py-3.5 active:bg-muted/60">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/customers/${c._id}`}
                        className="block truncate font-display text-[17px] font-bold leading-tight text-foreground after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
                      >
                        {c.className}
                      </Link>
                      {getSchoolName(c) && (
                        <span className="mt-0.5 block truncate text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground">
                          {getSchoolName(c)}
                        </span>
                      )}
                    </div>
                    <div className="relative z-10 -mr-2 -mt-1">{rowActions(c)}</div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px]">
                    <StatusBadge customer={c} />
                    <Headcount c={c} />
                    {c.expectedShootDate && (
                      <span className="tabular inline-flex items-center gap-1 text-muted-foreground">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {formatDate(c.expectedShootDate)}
                      </span>
                    )}
                  </div>
                  {(c.contactName || c.contactPhone) && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                      <UserRound className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{c.contactName}</span>
                      {c.contactPhone && (
                        <a
                          href={`tel:${c.contactPhone}`}
                          className="tabular relative z-10 shrink-0 text-foreground underline decoration-border underline-offset-4"
                        >
                          {c.contactPhone}
                        </a>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <div className="space-y-2.5 pt-3 text-center">
              <p className="tabular text-[13px] text-muted-foreground">
                Hiển thị {mobileStart + 1}–{mobileStart + mobileList.length} trong {total} lớp
              </p>
              {hasMore && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? <Spinner size="sm" /> : <ChevronsDown />}
                  Tải thêm lớp
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      <FilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        onReset={resetAllFilters}
        canReset={anyFilter}
        total={total}
        unit="lớp"
        loading={loading}
      >
        <FilterSection label="Trạng thái">
          <div role="group" aria-label="Trạng thái" className="flex flex-wrap gap-2">
            {statusChips}
          </div>
        </FilterSection>
        <FilterSection label="Trường">
          <SchoolCombobox
            allLabel="Tất cả trường"
            value={schoolFilter}
            onChange={changeSchoolFilter}
            className={SHEET_CONTROL_CLS}
          />
        </FilterSection>
        <FilterSection label="Người tạo">
          <Combobox
            options={creatorOptions}
            value={creatorFilter}
            onChange={changeCreatorFilter}
            placeholder="Tất cả người tạo"
            searchPlaceholder="Tìm người tạo…"
            className={SHEET_CONTROL_CLS}
          />
        </FilterSection>
        <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">Lớp của tôi</span>
            <span className="block text-[13px] text-muted-foreground">
              Chỉ hiện lớp bạn phụ trách
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={mine}
            onChange={toggleMine}
            className="h-5 w-5 accent-[hsl(var(--primary))]"
          />
        </label>
      </FilterSheet>

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Xoá lớp này?"
        message="Lớp sẽ bị xoá khỏi danh sách. Hãy chắc chắn lớp không còn lịch chụp hay giao dịch cần giữ."
        onConfirm={doDelete}
      />

      <CustomerFormDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        customer={editing}
        isAdmin={isAdmin}
        onSaved={(saved) => {
          if (editing) {
            setExtra((prev) => prev.map((c) => (c._id === editing._id ? { ...c, ...saved } : c)));
          } else {
            setExtraEpoch((n) => n + 1);
          }
          dispatch(fetchCustomers(buildParams(appliedSearch, page, pageSize)));
          loadCounts();
        }}
      />
    </div>
  );
};

export default CustomersPage;
