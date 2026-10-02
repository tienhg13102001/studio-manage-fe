import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronsDown,
  Download,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  School,
  Search,
  SlidersHorizontal,
  StickyNote,
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
import type { Customer, CustomerStatus, CustomerStatusCounts, SchoolRef } from '../types';
import {
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_STATUS_VARIANT,
  getCustomerStatus,
  getUserRefName,
  getSchoolName,
} from '../types';
import { cn } from '@/lib/utils';
import {
  Badge,
  badgeVariants,
  Button,
  ConfirmDialog,
  DataTable,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  Input,
  PageHeader,
  SearchInput,
  Spinner,
  TableSkeleton,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import CustomerFormDialog from '../components/organisms/CustomerFormDialog';
import SchoolCombobox from '../components/organisms/SchoolCombobox';

const SEARCH_DEBOUNCE_MS = 400;

const StatusBadge = ({ customer }: { customer: Customer }) => {
  const status = getCustomerStatus(customer);
  return (
    <Badge variant={CUSTOMER_STATUS_VARIANT[status]} dot className="whitespace-nowrap">
      {CUSTOMER_STATUS_LABELS[status]}
    </Badge>
  );
};

/** "Lớp 12A1" / "12A1" -> "12A1" (for the mobile code tile). */
const classCode = (name: string) => name.replace(/^lớp\s+/i, '');

const CustomersPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list: customers, total, loading } = useAppSelector((s) => s.customers);
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
    return params;
  };

  const loadCounts = () => {
    const params: Record<string, string> = {};
    if (selectedSeasonId) params.season = selectedSeasonId;
    if (mine) params.assignedSale = 'me';
    if (schoolFilter) params.schoolId = schoolFilter._id;
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
  }, [dispatch, appliedSearch, page, pageSize, selectedSeasonId, statusFilter, mine, schoolFilter]);

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
  }, [selectedSeasonId, mine, schoolFilter]);

  const changeSchoolFilter = (school: SchoolRef | null) => {
    setPage(1);
    setSchoolFilter(school);
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
        'Sale phụ trách',
        'Người liên hệ',
        'Số điện thoại',
        'Địa chỉ',
        'Sĩ số',
        'Nam',
        'Nữ',
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
          getUserRefName(c.assignedSale) ?? '',
          c.contactName ?? '',
          c.contactPhone ?? '',
          c.contactAddress ?? '',
          c.total ?? '',
          c.totalMale ?? '',
          c.totalFemale ?? '',
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

  return (
    <div className="flex flex-col md:min-h-0 md:flex-1">
      <PageHeader
        kicker="Customers"
        title="Khách hàng (Lớp)"
        description="Danh sách lớp học, trường và thông tin liên hệ."
        className="mb-3.5 md:mb-6 max-md:[&>div:last-child]:hidden"
        action={
          <Button variant="gradient" className="hidden md:inline-flex" onClick={openCreate}>
            <Plus />
            Thêm lớp
          </Button>
        }
      />

      {/* Mobile header actions */}
      <div className="mb-3.5 grid grid-cols-2 gap-2.5 md:hidden">
        <Button variant="outline" onClick={exportExcel} disabled={exporting}>
          {exporting ? <Spinner size="sm" /> : <Download />}
          Xuất Excel
        </Button>
        <Button variant="gradient" onClick={openCreate}>
          <Plus />
          Thêm lớp
        </Button>
      </div>

      {/* Mobile search + filters */}
      <div className="mb-3.5 space-y-3.5 md:hidden">
        <div className="flex gap-2.5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              enterKeyHint="search"
              className="h-[42px] rounded-[10px] bg-card pl-9 pr-9 text-[13px] [&::-webkit-search-cancel-button]:hidden"
              placeholder="Tìm kiếm lớp, trường…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            />
            {search && (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
            className="relative h-[42px] w-[42px] shrink-0 text-muted-foreground shadow-none [&_svg]:size-[17px]"
            aria-label="Bộ lọc"
            onClick={() => setFilterOpen(true)}
          >
            <SlidersHorizontal />
            {(statusFilter || mine || schoolFilter) && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
            )}
          </Button>
        </div>
        {(statusFilter || mine || schoolFilter) && (
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
            {statusFilter && (
              <button
                type="button"
                onClick={() => changeStatusFilter('')}
                aria-label={`Bỏ lọc ${CUSTOMER_STATUS_LABELS[statusFilter]}`}
                className="inline-flex h-[34px] shrink-0 items-center gap-2 rounded-full border bg-card px-3 text-[13px] text-foreground"
              >
                <Badge
                  variant={CUSTOMER_STATUS_VARIANT[statusFilter]}
                  dot
                  className="px-0 border-transparent bg-transparent"
                >
                  {CUSTOMER_STATUS_LABELS[statusFilter]}
                </Badge>
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
            {schoolFilter && (
              <button
                type="button"
                onClick={() => changeSchoolFilter(null)}
                aria-label={`Bỏ lọc trường ${schoolFilter.name}`}
                className="inline-flex h-[34px] max-w-[240px] shrink-0 items-center gap-2 rounded-full border bg-card px-3 text-[13px] text-foreground"
              >
                <School className="h-[15px] w-[15px] shrink-0 text-muted-foreground" />
                <span className="truncate">{schoolFilter.name}</span>
                <X className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </button>
            )}
            {mine && (
              <button
                type="button"
                onClick={toggleMine}
                aria-label="Bỏ lọc Lớp của tôi"
                className="inline-flex h-[34px] shrink-0 items-center gap-2 rounded-full border bg-card px-3 text-[13px] text-foreground"
              >
                <UserCheck className="h-[15px] w-[15px] text-muted-foreground" />
                Lớp của tôi
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        )}
        <p className="text-[13px] text-muted-foreground tabular">{total} lớp</p>
      </div>

      {/* Pipeline status strip */}
      <div className="mb-4 hidden flex-wrap gap-2 md:flex">
        {CUSTOMER_STATUSES.map((st) => {
          const active = statusFilter === st;
          return (
            <button
              key={st}
              type="button"
              onClick={() => changeStatusFilter(active ? '' : st)}
              aria-pressed={active}
              className={cn(
                'rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                  : statusFilter
                    ? 'opacity-60 hover:opacity-100'
                    : 'hover:opacity-80',
              )}
            >
              <Badge variant={CUSTOMER_STATUS_VARIANT[st]} dot className="py-1 text-[12.5px]">
                {CUSTOMER_STATUS_LABELS[st]}
                <span className="font-bold tabular">{counts ? (counts[st] ?? 0) : '–'}</span>
              </Badge>
            </button>
          );
        })}
      </div>

      <div className="mb-4 hidden flex-wrap items-center gap-3 md:flex">
        <SearchInput
          className="flex-1 sm:max-w-md"
          placeholder="Tìm kiếm lớp, trường…"
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
          className="h-[38px] w-[220px] rounded-[10px] border-border bg-card shadow-none"
        />
        <Button
          type="button"
          variant="outline"
          aria-pressed={mine}
          onClick={toggleMine}
          className={cn(
            mine &&
              'border-primary/60 bg-primary/10 text-primary-700 hover:bg-primary/15 dark:text-primary',
          )}
        >
          <UserCheck />
          Lớp của tôi
        </Button>
        <span className="ml-auto text-sm text-muted-foreground tabular">{total} lớp</span>
      </div>

      {loading ? (
        <TableSkeleton cols={6} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:flex md:min-h-0 md:flex-1 md:flex-col">
            <DataTable<Customer>
              fill
              className="flex-1"
              data={customers}
              keyExtractor={(c) => c._id}
              emptyTitle="Chưa có dữ liệu"
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
                  render: (c) => (
                    <div className="min-w-0">
                      <Link
                        to={`/customers/${c._id}`}
                        className="block font-semibold text-foreground hover:text-primary-700 dark:hover:text-primary"
                      >
                        {c.className}
                      </Link>
                      {getSchoolName(c) && (
                        <span className="block text-xs text-muted-foreground">
                          {getSchoolName(c)}
                        </span>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'status',
                  header: 'Trạng thái',
                  render: (c) => <StatusBadge customer={c} />,
                },
                {
                  key: 'assignedSale',
                  header: 'Sale phụ trách',
                  render: (c) => {
                    const name = getUserRefName(c.assignedSale);
                    return name ? (
                      <span className="whitespace-nowrap text-foreground">{name}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    );
                  },
                },
                {
                  key: 'contact',
                  header: 'Liên hệ',
                  render: (c) => (
                    <div>
                      <span className="block font-semibold text-foreground">{c.contactName}</span>
                      <span className="block text-xs text-muted-foreground tabular">
                        {c.contactPhone}
                      </span>
                    </div>
                  ),
                },
                {
                  key: 'contactAddress',
                  header: 'Địa chỉ',
                  render: (c) => <span>{c.contactAddress}</span>,
                },
                {
                  key: 'total',
                  header: 'Sĩ số',
                  render: (c) => {
                    const male = c.totalMale ?? 0;
                    const female = c.totalFemale ?? 0;
                    const sum = male + female;
                    return (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground tabular">{c.total}</span>
                          {sum > 0 && (
                            <span className="flex h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                              <span
                                className="bg-blue-400"
                                style={{ width: `${(male / sum) * 100}%` }}
                              />
                              <span
                                className="bg-pink-400"
                                style={{ width: `${(female / sum) * 100}%` }}
                              />
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground tabular">
                          ♂ {male} · ♀ {female}
                        </span>
                      </div>
                    );
                  },
                },
                {
                  key: 'notes',
                  header: 'Ghi chú',
                  render: (c) => (
                    <span
                      className="block max-w-[240px] truncate text-muted-foreground"
                      title={c.notes || ''}
                    >
                      {c.notes || '—'}
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  header: '',
                  align: 'right',
                  className: 'whitespace-nowrap',
                  render: (c) => (
                    <span className="inline-flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-[30px] w-[30px] text-muted-foreground"
                        title="Sửa"
                        aria-label="Sửa"
                        onClick={() => openEdit(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-[30px] w-[30px] text-rose-600 hover:text-rose-700 dark:text-rose-400"
                        title="Xoá"
                        aria-label="Xoá"
                        onClick={() => setConfirmId(c._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </span>
                  ),
                } satisfies Column<Customer>,
              ]}
            />
          </div>

          {/* Mobile cards */}
          <div className="space-y-2.5 md:hidden">
            {mobileList.map((c) => {
              const male = c.totalMale ?? 0;
              const female = c.totalFemale ?? 0;
              const sum = male + female;
              const code = classCode(c.className);
              const sale = getUserRefName(c.assignedSale);
              return (
                <div
                  key={c._id}
                  className="relative rounded-[14px] border bg-card p-3.5 transition-colors active:bg-muted/40"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary-100 px-1 font-bold text-primary-700 dark:bg-primary/15 dark:text-primary',
                        code.length > 4 ? 'text-[12px]' : 'text-[14px]',
                      )}
                    >
                      <span className="truncate">{code}</span>
                    </div>
                    <div className="min-w-0 flex-1 space-y-[3px]">
                      <Link
                        to={`/customers/${c._id}`}
                        className="block truncate text-[15px] font-semibold text-foreground after:absolute after:inset-0 after:rounded-[14px] after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
                      >
                        Lớp {code}
                      </Link>
                      {getSchoolName(c) && (
                        <span className="block truncate text-[12.5px] text-muted-foreground">
                          {getSchoolName(c)}
                        </span>
                      )}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
                        <StatusBadge customer={c} />
                        {sale && (
                          <span className="text-xs text-muted-foreground">Sale: {sale}</span>
                        )}
                      </div>
                    </div>
                    <div className="relative z-10 -mr-1 -mt-1 flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-[30px] w-[30px] rounded-lg text-muted-foreground [&_svg]:size-[15px]"
                        title="Sửa"
                        aria-label="Sửa"
                        onClick={() => openEdit(c)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-[30px] w-[30px] rounded-lg text-rose-600 hover:text-rose-700 dark:text-rose-400 [&_svg]:size-[15px]"
                        title="Xoá"
                        aria-label="Xoá"
                        onClick={() => setConfirmId(c._id)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>

                  {(c.contactName || c.contactPhone || c.contactAddress || c.notes) && (
                    <div className="mt-3 space-y-[7px] border-t pt-3 text-[13px]">
                      {(c.contactName || c.contactPhone) && (
                        <div className="flex items-start gap-2 text-foreground">
                          <UserRound className="mt-[3px] h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="min-w-0">
                            {c.contactName}
                            {c.contactName && c.contactPhone && ' · '}
                            {c.contactPhone && (
                              <a
                                href={`tel:${c.contactPhone}`}
                                className="relative z-10 tabular hover:text-primary-700 dark:hover:text-primary"
                              >
                                {c.contactPhone}
                              </a>
                            )}
                          </span>
                        </div>
                      )}
                      {c.contactAddress && (
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <MapPin className="mt-[3px] h-3.5 w-3.5 shrink-0" />
                          <span className="min-w-0">{c.contactAddress}</span>
                        </div>
                      )}
                      {c.notes && (
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <StickyNote className="mt-[3px] h-3.5 w-3.5 shrink-0" />
                          <span className="min-w-0">{c.notes}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {c.total != null && (
                    <div className="mt-3 flex items-center gap-2.5 rounded-[10px] bg-muted px-3 py-[9px]">
                      <span className="text-xs text-muted-foreground">Sĩ số</span>
                      <span className="text-[13.5px] font-semibold text-foreground tabular">
                        {c.total}
                      </span>
                      {sum > 0 && (
                        <span className="flex h-1.5 w-16 overflow-hidden rounded-full bg-background">
                          <span
                            className="bg-blue-400"
                            style={{ width: `${(male / sum) * 100}%` }}
                          />
                          <span
                            className="bg-pink-400"
                            style={{ width: `${(female / sum) * 100}%` }}
                          />
                        </span>
                      )}
                      <span className="ml-auto text-[11.5px] text-muted-foreground tabular">
                        ♂ {male}&nbsp;&nbsp;♀ {female}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
            {mobileList.length === 0 ? (
              <div className="rounded-[14px] border bg-card py-10 text-center text-muted-foreground">
                Chưa có dữ liệu
              </div>
            ) : (
              <div className="space-y-2.5 pt-1 text-center">
                <p className="text-[12.5px] text-muted-foreground tabular">
                  Hiển thị {mobileStart + 1}–{mobileStart + mobileList.length} trong {total} lớp
                </p>
                {hasMore && (
                  <Button
                    variant="outline"
                    className="w-full shadow-none"
                    onClick={loadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? <Spinner size="sm" /> : <ChevronsDown />}
                    Tải thêm lớp
                  </Button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent
          aria-describedby={undefined}
          className="inset-x-0 bottom-0 left-0 top-auto max-h-[calc(100dvh-2rem)] max-w-none translate-x-0 translate-y-0 gap-4 overflow-y-auto rounded-none rounded-t-[24px] border-0 bg-card px-4 pb-[calc(30px+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-12px_40px_rgba(15,23,42,0.18)] duration-300 data-[state=closed]:!slide-out-to-left-0 data-[state=closed]:!slide-out-to-bottom-full data-[state=closed]:!zoom-out-100 data-[state=open]:!slide-in-from-left-0 data-[state=open]:!slide-in-from-bottom-full data-[state=open]:!zoom-in-100 sm:rounded-none sm:rounded-t-[24px] [&>button]:hidden"
        >
          <div className="flex justify-center" aria-hidden>
            <span className="h-1 w-10 rounded-full bg-border" />
          </div>
          <div className="flex items-center">
            <DialogTitle className="flex-1 text-[17px]">Bộ lọc</DialogTitle>
            <DialogClose
              aria-label="Đóng"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </DialogClose>
          </div>
          <span
            id="customer-filter-status-label"
            className="block text-[11px] font-bold uppercase tracking-[0.8px] text-muted-foreground"
          >
            Trạng thái
          </span>
          <div
            role="group"
            aria-labelledby="customer-filter-status-label"
            className="flex flex-wrap gap-2"
          >
            <button
              type="button"
              onClick={() => changeStatusFilter('')}
              aria-pressed={!statusFilter}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-transparent px-[10.5px] py-[4.5px] text-[12.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                !statusFilter ? 'bg-foreground text-card' : 'bg-muted text-muted-foreground',
              )}
            >
              Tất cả
              <span className="font-bold tabular">
                {counts ? CUSTOMER_STATUSES.reduce((sum, st) => sum + (counts[st] ?? 0), 0) : '–'}
              </span>
            </button>
            {CUSTOMER_STATUSES.map((st) => {
              const active = statusFilter === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => changeStatusFilter(active ? '' : st)}
                  aria-pressed={active}
                  className={cn(
                    badgeVariants({ variant: CUSTOMER_STATUS_VARIANT[st] }),
                    'gap-1.5 border-[1.5px] px-[10.5px] py-[4.5px] text-[12.5px] focus:ring-offset-0',
                    active ? 'border-current' : 'border-transparent',
                  )}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                  {CUSTOMER_STATUS_LABELS[st]}
                  <span className="font-bold tabular">{counts ? (counts[st] ?? 0) : '–'}</span>
                </button>
              );
            })}
          </div>
          <div className="h-px bg-border" />
          <span className="block text-[11px] font-bold uppercase tracking-[0.8px] text-muted-foreground">
            Trường
          </span>
          <SchoolCombobox
            allLabel="Tất cả trường"
            value={schoolFilter}
            onChange={changeSchoolFilter}
            className="h-[42px] rounded-[10px] bg-card shadow-none"
          />
          <div className="h-px bg-border" />
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary/15 text-primary-700 dark:text-primary">
              <UserCheck className="h-[17px] w-[17px]" />
            </span>
            <div className="min-w-0 flex-1 space-y-0.5">
              <p id="customer-filter-mine-label" className="text-sm font-semibold text-foreground">
                Lớp của tôi
              </p>
              <p id="customer-filter-mine-desc" className="text-xs text-muted-foreground">
                Chỉ hiện lớp bạn phụ trách
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={mine}
              aria-labelledby="customer-filter-mine-label"
              aria-describedby="customer-filter-mine-desc"
              onClick={toggleMine}
              className={cn(
                'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full p-[3px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                mine ? 'bg-primary' : 'bg-muted-foreground/30',
              )}
            >
              <span
                className={cn(
                  'h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform',
                  mine ? 'translate-x-4' : 'translate-x-0',
                )}
              />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5 pt-1.5">
            <Button
              type="button"
              variant="outline"
              className="h-[42px]"
              disabled={!statusFilter && !mine && !schoolFilter}
              onClick={() => {
                setPage(1);
                setStatusFilter('');
                setMine(false);
                setSchoolFilter(null);
              }}
            >
              <RotateCcw />
              Xoá bộ lọc
            </Button>
            <Button type="button" className="h-[42px]" onClick={() => setFilterOpen(false)}>
              {loading ? <Spinner size="sm" /> : <Check />}
              {loading ? 'Xem kết quả' : `Xem ${total} lớp`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Xác nhận xoá"
        message="Bạn có chắc muốn xoá lớp này?"
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
