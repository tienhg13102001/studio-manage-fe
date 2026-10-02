import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { Button, ConfirmDialog, Input, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils';
import ClassSummaryTable from '../components/organisms/finance/ClassSummaryTable';
import FinanceFilterSheet from '../components/organisms/finance/FinanceFilterSheet';
import FinanceKpis from '../components/organisms/finance/FinanceKpis';
import FinanceToolbar, {
  FinanceTabs,
  TypeSegmented,
  type FinanceTab,
} from '../components/organisms/finance/FinanceToolbar';
import TransactionFormModal from '../components/organisms/finance/TransactionFormModal';
import TransactionMobileList from '../components/organisms/finance/TransactionMobileList';
import TransactionTable from '../components/organisms/finance/TransactionTable';
import { exportTransactions } from '../components/organisms/finance/exportTransactions';
import {
  DEFAULT_FINANCE_FILTERS,
  EXPENSE_TEXT,
  INCOME_TEXT,
  activeFilterCount,
  buildTxParams,
  kpiFromSummary,
  rangeLabel,
  shortMoney,
  type FinanceFilters,
  type TxSort,
} from '../components/organisms/finance/financeHelpers';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { transactionService } from '../services/transactionService';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchCategories } from '../store/slices/categoriesSlice';
import { fetchCustomers } from '../store/slices/customersSlice';
import {
  fetchTransactions,
  fetchMoreTransactions,
  fetchTransactionSummary,
  patchTransaction,
} from '../store/slices/transactionsSlice';
import { fetchUsers } from '../store/slices/usersSlice';
import type { TransactionResponse } from '../types';
import { getSchoolName } from '../types';
import { classLabel } from '../utils/format';

const SEARCH_DEBOUNCE_MS = 300;
const MOBILE_PAGE_SIZE = 20;
/** Backend `limit` cap (GET /transactions). */
const MAX_LIMIT = 500;

const FinancePage = () => {
  const { user } = useAuth();
  const isAdmin = user?.roles.some((r) => r === 0 || r === 1) ?? false;
  const canRefund = user?.roles.some((r) => r === 5) ?? false;
  /** Privileged users (admin / accountant) see everyone's transactions. */
  const privileged = isAdmin || canRefund;
  // The dense table needs ~1024px; narrower screens (incl. tablets with the sidebar) get the list
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const dispatch = useAppDispatch();
  const {
    list: transactions,
    total,
    totals,
    summary,
    summaryLoading,
    loading,
    loadingMore,
  } = useAppSelector((s) => s.transactions);
  const { list: customers } = useAppSelector((s) => s.customers);
  const { list: categories } = useAppSelector((s) => s.categories);
  const { list: users } = useAppSelector((s) => s.users);
  const { list: seasons, selectedSeasonId } = useAppSelector((s) => s.seasons);
  const season = seasons.find((s) => s._id === selectedSeasonId) ?? null;

  const [filters, setFilters] = useState<FinanceFilters>(DEFAULT_FINANCE_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  /** "Tổng hợp theo lớp" search (client-side over class / school). */
  const [summarySearch, setSummarySearch] = useState('');
  const [sort, setSort] = useState<TxSort>('date_desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  /** Mobile pages loaded so far ("Tải thêm 20" appends the next one). */
  const [mobilePages, setMobilePages] = useState(1);
  const [tab, setTab] = useState<FinanceTab>('list');
  const [filterOpen, setFilterOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [formSession, setFormSession] = useState(0);
  const [editing, setEditing] = useState<TransactionResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TransactionResponse | null>(null);
  const [exporting, setExporting] = useState(false);
  /** Background refresh (after a mutation / load more): no loading overlay. */
  const [softReload, setSoftReload] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRequest = useRef<{ abort: () => void } | null>(null);
  const summaryRequest = useRef<{ abort: () => void } | null>(null);
  const moreRequest = useRef<{ abort: () => void } | null>(null);

  /** Mobile: first page, or every loaded page when refreshing after a mutation. */
  const listParams = (mobileCount = 1) =>
    buildTxParams(
      filters,
      selectedSeasonId,
      isDesktop
        ? { page, limit: pageSize, sort }
        : { page: 1, limit: Math.min(MOBILE_PAGE_SIZE * mobileCount, MAX_LIMIT), sort },
    );

  const fetchList = (mobileCount = 1) => {
    // Abort previous requests so a slow, stale response can't overwrite newer results
    listRequest.current?.abort();
    moreRequest.current?.abort();
    const request = dispatch(fetchTransactions(listParams(mobileCount)));
    listRequest.current = request;
    return request;
  };

  /** KPIs + per-class summary follow only the season / date range. */
  const fetchSummary = () => {
    summaryRequest.current?.abort();
    const request = dispatch(
      fetchTransactionSummary({
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        season: selectedSeasonId || undefined,
      }),
    );
    summaryRequest.current = request;
    return request;
  };

  const reload = () => {
    setSoftReload(true);
    fetchList(mobilePages);
    fetchSummary();
  };

  const loadMore = () => {
    moreRequest.current?.abort();
    const next = mobilePages + 1;
    moreRequest.current = dispatch(
      fetchMoreTransactions(
        buildTxParams(filters, selectedSeasonId, { page: next, limit: MOBILE_PAGE_SIZE, sort }),
      ),
    );
    setMobilePages(next);
  };

  useEffect(() => {
    const request = fetchList();
    return () => request.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, filters, page, pageSize, sort, isDesktop, selectedSeasonId]);

  useEffect(() => {
    const request = fetchSummary();
    return () => request.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, filters.dateFrom, filters.dateTo, selectedSeasonId]);

  useEffect(() => {
    if (!loading) setSoftReload(false);
  }, [loading]);

  // A new season starts from the first page
  useEffect(() => {
    setPage(1);
    setMobilePages(1);
  }, [selectedSeasonId]);

  useEffect(() => {
    dispatch(
      fetchCustomers(selectedSeasonId ? { limit: 200, season: selectedSeasonId } : { limit: 200 }),
    );
    dispatch(fetchCategories());
    if (privileged) dispatch(fetchUsers());
  }, [dispatch, privileged, selectedSeasonId]);

  const changeFilters = (patch: Partial<FinanceFilters>) => {
    setPage(1);
    setMobilePages(1);
    setSoftReload(false);
    setFilters((f) => {
      const next = { ...f, ...patch };
      // Refund status only exists on expenses: Thu ⇄ hoàn tiền are mutually exclusive
      if (patch.type === 'income') next.refund = '';
      else if (patch.refund && next.type === 'income') next.type = '';
      // Keep the category only if it matches the selected type
      if (patch.type !== undefined && next.categoryId && next.type) {
        const cat = categories.find((c) => c._id === next.categoryId);
        if (cat && cat.type !== next.type) next.categoryId = '';
      }
      if (next.dateFrom && next.dateTo && next.dateFrom > next.dateTo) {
        [next.dateFrom, next.dateTo] = [next.dateTo, next.dateFrom];
      }
      return next;
    });
  };

  const resetFilters = () => {
    setSearchInput('');
    changeFilters(DEFAULT_FINANCE_FILTERS);
  };

  // Debounced server-side search on the description
  useEffect(() => {
    if (searchInput === filters.search) return;
    const timer = setTimeout(() => changeFilters({ search: searchInput }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // "/" focuses the search box (unless typing somewhere else)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) {
        return;
      }
      // Not while a dialog / sheet / popover is open
      if (document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      if (!isDesktop) setMobileSearchOpen(true);
      setTimeout(() => searchRef.current?.focus(), 0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDesktop]);

  const openCreate = () => {
    setEditing(null);
    setFormSession((n) => n + 1);
    setModalOpen(true);
  };

  const openEdit = (t: TransactionResponse) => {
    setEditing(t);
    setFormSession((n) => n + 1);
    setModalOpen(true);
  };

  const toggleRefund = async (t: TransactionResponse, value: boolean) => {
    dispatch(patchTransaction({ id: t._id, changes: { accountantRefunded: value } }));
    try {
      await transactionService.update(t._id, { accountantRefunded: value });
      reload();
    } catch {
      dispatch(patchTransaction({ id: t._id, changes: { accountantRefunded: !value } }));
      toast.error('Không thể cập nhật trạng thái hoàn tiền.');
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      await transactionService.remove(deleteTarget._id);
      toast.success('Đã xoá giao dịch.');
      setModalOpen(false);
      reload();
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setDeleteTarget(null);
  };

  const doExport = async () => {
    setExporting(true);
    try {
      const params =
        tab === 'list'
          ? buildTxParams(filters, selectedSeasonId, { sort })
          : buildTxParams(
              {
                ...DEFAULT_FINANCE_FILTERS,
                customer: filters.customer,
                dateFrom: filters.dateFrom,
                dateTo: filters.dateTo,
              },
              selectedSeasonId,
              { sort },
            );
      await exportTransactions(params, `Thu chi${season ? ` - ${season.name}` : ''}.xlsx`);
    } catch {
      toast.error('Xuất Excel thất bại, vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  };

  const kpi = useMemo(() => kpiFromSummary(summary), [summary]);
  const pendingActive = filters.refund === 'pending';
  const togglePending = () => {
    setTab('list');
    if (pendingActive) {
      changeFilters({ refund: '' });
      return;
    }
    // Match the KPI: all pending expenses of the season / date range
    setSearchInput('');
    changeFilters({
      refund: 'pending',
      type: '',
      customer: '',
      categoryId: '',
      createdBy: '',
      search: '',
    });
  };

  const customerOptions = useMemo(
    () => [
      { value: '', label: 'Tất cả lớp' },
      ...customers.map((c) => ({ value: c._id, label: classLabel(c, ' - ') })),
    ],
    [customers],
  );
  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'Tất cả danh mục' },
      ...categories
        .filter((c) => !filters.type || c.type === filters.type)
        .map((c) => ({ value: c._id, label: c.name })),
    ],
    [categories, filters.type],
  );
  const userOptions = useMemo(
    () =>
      privileged && users.length > 0
        ? [
            { value: '', label: 'Tất cả người thực hiện' },
            ...users.map((u) => ({ value: u._id, label: u.name ?? u.username })),
          ]
        : undefined,
    [privileged, users],
  );

  const summaryRows = useMemo(() => {
    const q = summarySearch.trim().toLowerCase();
    return summary.filter((r) => {
      if (filters.customer && r._id !== filters.customer) return false;
      if (!q) return true;
      return `${r.customer?.className ?? ''} ${getSchoolName(r.customer)}`
        .toLowerCase()
        .includes(q);
    });
  }, [summary, filters.customer, summarySearch]);

  const filterCount = activeFilterCount(filters);
  const canReset = filterCount > 0 || !!filters.search;
  const seasonLabel = season?.name ?? 'Tất cả mùa';
  const datePlaceholder = season
    ? rangeLabel(season.startDate.slice(0, 10), season.endDate.slice(0, 10))
    : 'Khoảng ngày';
  const txCount = kpi.incomeCount + kpi.expenseCount;
  const listLoading = loading && !softReload;

  const searchBox = (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={searchRef}
        type="search"
        value={tab === 'list' ? searchInput : summarySearch}
        onChange={(e) =>
          tab === 'list' ? setSearchInput(e.target.value) : setSummarySearch(e.target.value)
        }
        onKeyDown={(e) => {
          if (e.key === 'Escape') (e.target as HTMLInputElement).blur();
        }}
        placeholder={tab === 'list' ? 'Tìm mô tả…' : 'Tìm lớp, trường…'}
        aria-label={tab === 'list' ? 'Tìm theo mô tả' : 'Tìm lớp, trường'}
        className="h-[34px] w-full rounded-[9px] bg-card pl-8 pr-8 text-base shadow-none md:w-[240px] md:text-[13px] [&::-webkit-search-cancel-button]:hidden"
      />
      {isDesktop && (
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border px-1 text-[11px] text-muted-foreground">
          /
        </kbd>
      )}
    </div>
  );

  /** Mobile chips for active filters (each removable). */
  const chips: { key: string; label: string; clear: Partial<FinanceFilters> }[] = [];
  if (filters.type) {
    chips.push({
      key: 'type',
      label: filters.type === 'income' ? 'Thu' : 'Chi',
      clear: { type: '' },
    });
  }
  if (filters.refund) {
    chips.push({
      key: 'refund',
      label: filters.refund === 'pending' ? 'Chưa hoàn' : 'Đã hoàn',
      clear: { refund: '' },
    });
  }
  if (filters.customer) {
    chips.push({
      key: 'customer',
      label: customers.find((c) => c._id === filters.customer)?.className ?? 'Lớp',
      clear: { customer: '' },
    });
  }
  if (filters.categoryId) {
    chips.push({
      key: 'category',
      label: categories.find((c) => c._id === filters.categoryId)?.name ?? 'Danh mục',
      clear: { categoryId: '' },
    });
  }
  if (filters.createdBy) {
    const u = users.find((x) => x._id === filters.createdBy);
    chips.push({
      key: 'user',
      label: u?.name ?? u?.username ?? 'Người thực hiện',
      clear: { createdBy: '' },
    });
  }
  if (filters.dateFrom || filters.dateTo) {
    chips.push({
      key: 'date',
      label: rangeLabel(filters.dateFrom, filters.dateTo),
      clear: { dateFrom: '', dateTo: '' },
    });
  }

  return (
    <div className="flex flex-col gap-3 md:min-h-0 md:flex-1">
      {/* Header */}
      {isDesktop ? (
        <div className="flex min-h-9 shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="shrink-0 font-display text-[22px] font-bold tracking-tight text-foreground">
            Quản lý Thu Chi
          </h1>
          <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
            {seasonLabel} · {txCount} giao dịch
          </span>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {searchBox}
            <Button variant="outline" className="h-[34px]" onClick={doExport} disabled={exporting}>
              {exporting ? <Spinner size="sm" /> : <Download />}
              Xuất Excel
            </Button>
            <Button className="h-[34px]" onClick={openCreate}>
              <Plus /> Thêm giao dịch
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[22px] font-bold tracking-tight text-foreground">
              Quản lý Thu Chi
            </h1>
            <p className="truncate text-[13px] text-muted-foreground">
              {seasonLabel} · {txCount} giao dịch
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus /> Thêm
          </Button>
        </div>
      )}

      <FinanceKpis
        kpi={kpi}
        compact={!isDesktop}
        pendingActive={pendingActive}
        onPendingClick={togglePending}
      />

      {/* Toolbar */}
      {isDesktop ? (
        <FinanceToolbar
          tab={tab}
          onTabChange={setTab}
          filters={filters}
          onChange={changeFilters}
          onReset={resetFilters}
          canReset={canReset}
          customerOptions={customerOptions}
          categoryOptions={categoryOptions}
          userOptions={userOptions}
          datePlaceholder={datePlaceholder}
        />
      ) : (
        <div className="space-y-2.5">
          <FinanceTabs tab={tab} onChange={setTab} className="flex w-full" />
          {tab === 'list' && (
            <>
              <div className="flex items-center gap-2">
                {mobileSearchOpen ? (
                  <div className="flex flex-1 items-center gap-2">
                    <div className="flex-1">{searchBox}</div>
                    <button
                      type="button"
                      aria-label="Đóng tìm kiếm"
                      className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-[9px] text-muted-foreground"
                      onClick={() => {
                        setMobileSearchOpen(false);
                        setSearchInput('');
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <TypeSegmented
                      value={filters.type}
                      onChange={(type) => changeFilters({ type })}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn(
                        'h-[34px] w-[34px] shrink-0 shadow-none',
                        filters.search && 'border-primary text-primary-700 dark:text-primary',
                      )}
                      aria-label="Tìm kiếm"
                      onClick={() => {
                        setMobileSearchOpen(true);
                        setTimeout(() => searchRef.current?.focus(), 0);
                      }}
                    >
                      <Search />
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  className="relative h-[34px] w-[34px] shrink-0 text-muted-foreground shadow-none"
                  aria-label="Bộ lọc"
                  onClick={() => setFilterOpen(true)}
                >
                  <SlidersHorizontal />
                  {filterCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground tabular">
                      {filterCount}
                    </span>
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none]">
                  {chips.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => changeFilters(c.clear)}
                      aria-label={`Bỏ lọc ${c.label}`}
                      className="inline-flex h-[26px] shrink-0 items-center gap-1 rounded-full bg-primary-100 px-2.5 text-xs font-semibold text-primary-700 dark:bg-primary/15 dark:text-primary"
                    >
                      <span className="tabular">{c.label}</span>
                      <X className="h-3 w-3" />
                    </button>
                  ))}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground tabular">
                  <span className={INCOME_TEXT}>Thu +{shortMoney(totals?.income ?? 0)}</span>
                  {' · '}
                  <span className={EXPENSE_TEXT}>Chi −{shortMoney(totals?.expense ?? 0)}</span>
                </span>
              </div>
            </>
          )}
          {tab === 'summary' && searchBox}
        </div>
      )}

      {/* Content */}
      {tab === 'list' ? (
        isDesktop ? (
          <TransactionTable
            rows={transactions}
            loading={listLoading}
            season={season}
            sort={sort}
            onSortToggle={() => {
              setPage(1);
              setSort((s) => (s === 'date_desc' ? 'date_asc' : 'date_desc'));
            }}
            canRefund={canRefund}
            onToggleRefund={toggleRefund}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
            totals={totals}
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        ) : listLoading && transactions.length === 0 ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : (
          <div className="relative" aria-busy={listLoading}>
            <div
              className={cn('transition-opacity', listLoading && 'pointer-events-none opacity-50')}
            >
              <TransactionMobileList
                rows={transactions}
                total={total}
                season={season}
                canRefund={canRefund}
                onToggleRefund={toggleRefund}
                onOpen={openEdit}
                hasMore={!listLoading && transactions.length < total}
                loadingMore={loadingMore}
                onLoadMore={loadMore}
              />
            </div>
            {listLoading && (
              <div className="pointer-events-none absolute inset-x-0 top-10 flex justify-center">
                <Spinner />
              </div>
            )}
          </div>
        )
      ) : (
        <ClassSummaryTable rows={summaryRows} loading={summaryLoading} compact={!isDesktop} />
      )}

      <FinanceFilterSheet
        open={filterOpen && !isDesktop}
        onOpenChange={setFilterOpen}
        filters={filters}
        onChange={changeFilters}
        onReset={resetFilters}
        canReset={canReset}
        customerOptions={customerOptions}
        categoryOptions={categoryOptions}
        userOptions={userOptions}
        total={total}
        loading={loading}
      />

      <TransactionFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editing={editing}
        sessionKey={formSession}
        customers={customers}
        categories={categories}
        users={users}
        seasons={seasons}
        selectedSeasonId={selectedSeasonId}
        isAdmin={isAdmin}
        canRefund={canRefund}
        onSaved={reload}
        onDelete={isDesktop ? undefined : setDeleteTarget}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Xác nhận xoá"
        message="Bạn có chắc muốn xoá giao dịch này?"
        onConfirm={doDelete}
      />
    </div>
  );
};

export default FinancePage;
