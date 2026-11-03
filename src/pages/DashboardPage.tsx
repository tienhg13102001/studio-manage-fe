import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronRight, Plus, RotateCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency, formatDate } from '../utils/format';
import { WeekAgenda } from '../components/dashboard/WeekAgenda';
import { FinanceChart } from '../components/dashboard/FinanceChart';
import { useAuth } from '../context/AuthContext';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchDashboardStats } from '../store/slices/dashboardSlice';
import { fetchUsers } from '../store/slices/usersSlice';
import { isSaleCollaborator } from '../utils/permissions';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Button, Combobox, Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';

const todayHeading = () => {
  const s = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

function DashboardSkeleton({ withAgenda }: { withAgenda: boolean }) {
  return (
    <div className="space-y-4" role="status" aria-busy="true">
      <span className="sr-only">Đang tải tổng quan…</span>
      {withAgenda && (
        <>
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-[66px] rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-[188px] rounded-lg" />
        </>
      )}
      <Skeleton className="h-40 rounded-lg" />
    </div>
  );
}

const DashboardPage = () => {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const isAdmin = roles.some((r) => r === 0 || r === 1);
  const showTotalCustomers = roles.some((r) => r === 0 || r === 1 || r === 2);
  // CTV sale không xem thu chi (kể cả khi kiêm Sale)
  const showFinance =
    roles.some((r) => r === 0 || r === 1 || r === 2 || r === 5) && !isSaleCollaborator(user);
  const canOpenCustomer = roles.some((r) => r === 0 || r === 1 || r === 2 || r === 4);

  const dispatch = useAppDispatch();
  const { stats, error } = useAppSelector((s) => s.dashboard);
  const { list: users } = useAppSelector((s) => s.users);
  const { selectedSeasonId, list: seasons } = useAppSelector((s) => s.seasons);

  const [now] = useState(() => Date.now());
  const isWide = useMediaQuery('(min-width: 1760px)');
  const [filterUserId, setFilterUserId] = useState('');

  const selectedSeason = useMemo(
    () => seasons.find((s) => s._id === selectedSeasonId),
    [seasons, selectedSeasonId],
  );

  useEffect(() => {
    const params: { userId?: string; season?: string } = {};
    if (filterUserId) params.userId = filterUserId;
    if (selectedSeasonId) params.season = selectedSeasonId;
    dispatch(fetchDashboardStats(params));
    if (isAdmin) dispatch(fetchUsers());
  }, [dispatch, isAdmin, filterUserId, selectedSeasonId]);

  const seasonProgress = (() => {
    if (!selectedSeason) return null;
    const start = new Date(selectedSeason.startDate).getTime();
    const end = new Date(selectedSeason.endDate).getTime() + 24 * 3600 * 1000 - 1;
    if (!(end > start)) return null;
    const pct = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
    const daysLeft = Math.max(0, Math.ceil((end - now) / 86_400_000));
    return { pct, daysLeft };
  })();

  const showSchedules = stats?.showSchedules ?? false;
  // Màn rộng (≥1760px): biểu đồ thu chi đứng cạnh lịch tuần thay vì trôi xuống dưới.
  const chartBesideAgenda = isWide && showSchedules && showFinance;

  const header = (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <h1 className="font-display text-2xl font-bold tracking-tight max-sm:sr-only md:text-[28px]">
        {todayHeading()}
      </h1>
      <div className="flex items-center gap-2 max-sm:empty:hidden">
        {isAdmin && (
          <div className="min-w-0 flex-1 sm:w-56 sm:flex-none">
            <Combobox
              options={users.map((u) => ({ value: u._id, label: u.name ?? u.username }))}
              value={filterUserId}
              onChange={setFilterUserId}
              placeholder="Tất cả nhân viên"
            />
          </div>
        )}
        {showSchedules && (
          <Button asChild className={cn('shrink-0', isAdmin && 'max-sm:w-[38px] max-sm:px-0')}>
            <Link to="/schedules" state={{ openCreate: true }} aria-label="Thêm lịch chụp">
              <Plus className="h-4 w-4" />
              <span className={cn(isAdmin && 'max-sm:sr-only')}>Thêm lịch chụp</span>
            </Link>
          </Button>
        )}
      </div>
    </header>
  );

  const reload = () => {
    const params: { userId?: string; season?: string } = {};
    if (filterUserId) params.userId = filterUserId;
    if (selectedSeasonId) params.season = selectedSeasonId;
    dispatch(fetchDashboardStats(params));
  };

  if (!stats && error) {
    return (
      <div className="space-y-5">
        {header}
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-lg border bg-card px-6 py-12 text-center"
        >
          <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden />
          <p className="text-sm font-semibold text-foreground">Không tải được số liệu tổng quan</p>
          <Button variant="outline" size="sm" onClick={reload}>
            <RotateCw /> Thử lại
          </Button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-5">
        {header}
        <DashboardSkeleton withAgenda />
      </div>
    );
  }

  const { totals, daily, customerCount, scheduleCount, upcomingSchedules } = stats;

  const figures = [
    { label: 'Lớp mới', value: String(customerCount), to: '/customers', show: showTotalCustomers },
    { label: 'Lịch chụp', value: String(scheduleCount), to: '/schedules', show: showSchedules },
    {
      label: 'Tổng thu',
      value: formatCurrency(totals.income),
      to: '/manage/finance',
      show: showFinance,
    },
    {
      label: 'Tổng chi',
      value: formatCurrency(totals.expense),
      to: '/manage/finance',
      show: showFinance,
    },
    {
      label: 'Lợi nhuận',
      value: formatCurrency(totals.profit),
      to: '/manage/finance',
      show: showFinance,
      strong: true,
      negative: totals.profit < 0,
    },
  ].filter((f) => f.show);

  const seasonPanel = (
    <section aria-labelledby="season-title" className="rounded-lg border bg-card">
      <div className="p-4 sm:p-5">
        {selectedSeason ? (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="season-title" className="font-display text-lg font-bold">
                {selectedSeason.name}
              </h2>
              {seasonProgress && (
                <span className="whitespace-nowrap text-[13px] font-medium text-muted-foreground tabular">
                  còn {seasonProgress.daysLeft} ngày
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[13px] text-muted-foreground tabular">
              {formatDate(selectedSeason.startDate)} – {formatDate(selectedSeason.endDate)}
            </p>
            {seasonProgress && (
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={seasonProgress.pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Tiến độ mùa"
                >
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${seasonProgress.pct}%` }}
                  />
                </div>
                <span className="text-xs font-semibold tabular">{seasonProgress.pct}%</span>
              </div>
            )}
          </>
        ) : (
          <>
            <h2 id="season-title" className="font-display text-lg font-bold">
              12 tháng gần đây
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Chưa chọn mùa chụp. Chọn mùa ở góc trên để xem số liệu theo mùa.
            </p>
          </>
        )}
      </div>
      {figures.length > 0 && (
        <ul className="border-t">
          {figures.map((f) => (
            <li key={f.label} className="border-b last:border-b-0">
              <Link
                to={f.to}
                className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60 sm:px-5"
              >
                <span className="flex-1 text-sm text-muted-foreground">{f.label}</span>
                <span
                  className={cn(
                    'text-[15px] tabular',
                    f.strong ? 'font-bold' : 'font-semibold',
                    f.negative && 'text-red-700 dark:text-red-400',
                  )}
                >
                  {f.value}
                </span>
                <ChevronRight
                  className="h-4 w-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div className="space-y-5 md:space-y-6">
      {header}

      {showSchedules ? (
        <div
          className={cn(
            'grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:gap-6',
            chartBesideAgenda && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]',
          )}
        >
          <WeekAgenda schedules={upcomingSchedules} canOpenCustomer={canOpenCustomer} />
          {chartBesideAgenda && <FinanceChart daily={daily} />}
          <aside className="space-y-5 lg:sticky lg:top-0">{seasonPanel}</aside>
        </div>
      ) : (
        <div className="max-w-xl">{seasonPanel}</div>
      )}

      {showFinance && !chartBesideAgenda && <FinanceChart daily={daily} />}
    </div>
  );
};

export default DashboardPage;
