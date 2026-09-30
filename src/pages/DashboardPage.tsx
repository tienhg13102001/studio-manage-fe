import { useEffect, useState, useMemo } from 'react';
import {
  Calendar,
  CalendarDays,
  Clock,
  GraduationCap,
  MapPin,
  Plus,
  Sun,
  Table as TableIcon,
  TrendingDown,
  TrendingUp,
  User as UserIcon,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { UpcomingSchedule } from '../services/dashboardService';
import { formatCurrency, formatDate } from '../utils/format';
import { SCHEDULE_STATUS_LABEL } from '../utils/scheduleConstants';
import { ScheduleCalendar } from '../components/organisms';
import { useAuth } from '../context/AuthContext';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchDashboardStats } from '../store/slices/dashboardSlice';
import { fetchUsers } from '../store/slices/usersSlice';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Combobox,
  PageLoader,
  SegmentedControl,
} from '@/components/ui';
import { cn } from '@/lib/utils';

const STATUS_BADGE: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
  pending: 'warning',
  confirmed: 'info',
  completed: 'success',
  cancelled: 'danger',
};

const ScheduleItem = ({ s }: { s: UpcomingSchedule }) => {
  const d = new Date(s.shootDate);
  const time = `${s.startTime ?? '—'}${s.endTime ? ` – ${s.endTime}` : ''}`;
  return (
    <div className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
      <div className="flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-[10px] border bg-muted/40">
        <span className="text-[10px] font-bold uppercase leading-none text-primary-700 dark:text-primary">
          Th{d.getMonth() + 1}
        </span>
        <span className="mt-0.5 font-display text-lg font-bold leading-none">
          {String(d.getDate()).padStart(2, '0')}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">
          {s.customer?.className ?? '—'}
          {s.customer?.school && <span> · {s.customer.school}</span>}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {time}
          </span>
          {s.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {s.location}
            </span>
          )}
          {s.leadPhotographer && (
            <span className="inline-flex items-center gap-1">
              <UserIcon className="h-3 w-3" />
              {s.leadPhotographer.name ?? s.leadPhotographer.username}
            </span>
          )}
        </div>
        <Badge variant={STATUS_BADGE[s.status] ?? 'neutral'} dot className="mt-1.5">
          {SCHEDULE_STATUS_LABEL[s.status] ?? s.status}
        </Badge>
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.roles.some((r) => r === 0 || r === 1) ?? false;
  const showTotalCustomers = user?.roles.some((r) => r === 0 || r === 1 || r === 2) ?? false;
  const showFinance = user?.roles.some((r) => r === 0 || r === 1 || r === 2 || r === 5) ?? false;

  const dispatch = useAppDispatch();
  const { stats } = useAppSelector((s) => s.dashboard);
  const { list: users } = useAppSelector((s) => s.users);
  const { selectedSeasonId, list: seasons } = useAppSelector((s) => s.seasons);

  const [scheduleViewMode, setScheduleViewMode] = useState<'table' | 'calendar'>('table');
  const [now] = useState(() => Date.now());
  const [filterUserId, setFilterUserId] = useState('');
  const [chartView, setChartView] = useState<'day' | 'month'>('month');

  const selectedSeason = useMemo(
    () => seasons.find((s) => s._id === selectedSeasonId),
    [seasons, selectedSeasonId],
  );

  // Re-fetch whenever season or user filter changes
  useEffect(() => {
    const params: { userId?: string; season?: string } = {};
    if (filterUserId) params.userId = filterUserId;
    if (selectedSeasonId) params.season = selectedSeasonId;
    dispatch(fetchDashboardStats(params));
    if (isAdmin) dispatch(fetchUsers());
  }, [dispatch, isAdmin, filterUserId, selectedSeasonId]);

  const calendarItems = useMemo(
    () =>
      (stats?.upcomingSchedules ?? []).map((s) => ({
        _id: s._id,
        shootDate: s.shootDate,
        startTime: s.startTime,
        endTime: s.endTime,
        location: s.location,
        status: s.status,
        className: s.customer?.className ?? '—',
        leadName: s.leadPhotographer
          ? (s.leadPhotographer.name ?? s.leadPhotographer.username)
          : undefined,
      })),
    [stats?.upcomingSchedules],
  );

  if (!stats) return <PageLoader />;

  const { totals, daily, customerCount, scheduleCount, showSchedules, upcomingSchedules } = stats;

  const displayName = user?.name ?? user?.username ?? '';
  const selectedUserName = filterUserId
    ? (users.find((u) => u._id === filterUserId)?.name ??
      users.find((u) => u._id === filterUserId)?.username ??
      '')
    : '';

  // ── Chart data ──────────────────────────────────────────────────────────────
  const chartBaseData =
    chartView === 'day'
      ? daily
      : (() => {
          const byMonth: Record<string, { income: number; expense: number }> = {};
          for (const d of daily) {
            const key = d.label.slice(0, 7); // YYYY-MM
            if (!byMonth[key]) byMonth[key] = { income: 0, expense: 0 };
            byMonth[key].income += d.income;
            byMonth[key].expense += d.expense;
          }
          return Object.entries(byMonth)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([label, v]) => ({ label: `${label}-01`, ...v }));
        })();

  const formatChartLabel = (label: string) => {
    const parts = label.split('-');
    if (chartView === 'month') return `${parts[1]}/${parts[0].slice(2)}`;
    return `${parts[2]}/${parts[1]}`;
  };

  const chartData = chartBaseData.reduce<
    Array<{ name: string; Thu: number; Chi: number; 'Lợi nhuận': number; 'Lợi nhuận dồn': number }>
  >((acc, d) => {
    const profit = d.income - d.expense;
    const cumulative = (acc[acc.length - 1]?.['Lợi nhuận dồn'] ?? 0) + profit;
    acc.push({
      name: formatChartLabel(d.label),
      Thu: d.income,
      Chi: d.expense,
      'Lợi nhuận': profit,
      'Lợi nhuận dồn': cumulative,
    });
    return acc;
  }, []);

  // ── Season progress ──────────────────────────────────────────────────────────
  const seasonProgress = (() => {
    if (!selectedSeason) return null;
    const start = new Date(selectedSeason.startDate).getTime();
    const end = new Date(selectedSeason.endDate).getTime() + 24 * 3600 * 1000 - 1;
    if (!(end > start)) return null;
    const pct = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
    const daysLeft = Math.max(0, Math.ceil((end - now) / 86_400_000));
    return { pct, daysLeft };
  })();

  // ── Stat cards ───────────────────────────────────────────────────────────────
  const cards = [
    {
      label: 'Lớp mới',
      value: customerCount,
      icon: GraduationCap,
      tile: 'bg-blue-500/15 text-blue-600 dark:text-blue-300',
      link: '/customers',
      show: showTotalCustomers,
    },
    {
      label: 'Lịch chụp',
      value: scheduleCount,
      icon: CalendarDays,
      tile: 'bg-violet-500/15 text-violet-600 dark:text-violet-300',
      link: '/schedules',
      show: showSchedules,
    },
    {
      label: 'Tổng thu',
      value: formatCurrency(totals.income),
      icon: TrendingUp,
      tile: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
      link: '/finance',
      show: showFinance,
    },
    {
      label: 'Tổng chi',
      value: formatCurrency(totals.expense),
      icon: TrendingDown,
      tile: 'bg-rose-500/15 text-rose-600 dark:text-rose-300',
      link: '/finance',
      show: showFinance,
    },
    {
      label: 'Lợi nhuận',
      value: formatCurrency(totals.profit),
      icon: Wallet,
      tile: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
      valueClass: totals.profit < 0 ? 'text-rose-600 dark:text-rose-400' : '',
      link: '/finance',
      show: showFinance,
    },
  ];

  const scheduleCardSpan = scheduleViewMode === 'calendar' ? 'xl:col-span-2' : '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-[28px] font-bold leading-tight">
            Xin chào, {displayName} 👋
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString('vi-VN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
            {' · '}Chúc bạn một ngày làm việc tốt lành!
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">
                Xem theo người:
              </span>
              <div className="w-52">
                <Combobox
                  options={users.map((u) => ({ value: u._id, label: u.name ?? u.username }))}
                  value={filterUserId}
                  onChange={setFilterUserId}
                  placeholder="Tất cả"
                />
              </div>
              {selectedUserName && (
                <span className="text-sm text-primary-700 dark:text-primary font-medium">
                  — {selectedUserName}
                </span>
              )}
            </div>
          )}
          {showSchedules && (
            <Button asChild>
              <Link to="/schedules" state={{ openCreate: true }}>
                <Plus className="h-4 w-4" />
                Thêm lịch chụp
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Season banner */}
      {selectedSeason ? (
        <div className="rounded-[14px] border bg-card px-5 py-4 flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-primary-100 text-primary-700 dark:bg-primary/15 dark:text-primary">
              <Sun className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-base font-bold leading-tight">
                {selectedSeason.name}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {formatDate(selectedSeason.startDate)} – {formatDate(selectedSeason.endDate)}
              </div>
            </div>
          </div>
          {seasonProgress && (
            <div className="min-w-[220px] flex-1">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tiến độ mùa</span>
                <span className="font-semibold text-primary-700 dark:text-primary">
                  {seasonProgress.pct}% · còn {seasonProgress.daysLeft} ngày
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-cyan-400"
                  style={{ width: `${seasonProgress.pct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-[14px] border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          Chưa chọn mùa chụp — đang hiển thị dữ liệu 12 tháng gần đây.
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards
          .filter((c) => c.show)
          .map((c) => (
            <Link
              key={c.label}
              to={c.link}
              className="rounded-[14px] border bg-card p-5 hover:border-primary/40 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{c.label}</span>
                <div
                  className={cn('flex h-9 w-9 items-center justify-center rounded-[9px]', c.tile)}
                >
                  <c.icon className="h-[18px] w-[18px]" />
                </div>
              </div>
              <p
                className={cn(
                  'font-display text-[28px] font-bold mt-3 leading-tight tabular',
                  'valueClass' in c && c.valueClass,
                )}
              >
                {c.value}
              </p>
              <div className="mt-2 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                Xem chi tiết →
              </div>
            </Link>
          ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-4 items-start">
        {/* Finance chart */}
        {showFinance && (
          <Card className="rounded-[14px] shadow-none">
            <CardContent className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 className="font-display text-base font-bold">Biểu đồ thu chi</h3>
                <SegmentedControl
                  value={chartView}
                  onChange={setChartView}
                  items={[
                    { value: 'day', label: 'Ngày' },
                    { value: 'month', label: 'Tháng' },
                  ]}
                />
              </div>

              {/* Legend */}
              <div className="mb-3 flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-[3px] bg-[#10B981]" />
                  Thu
                </span>
                <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-[3px] bg-[#F43F5E]" />
                  Chi
                </span>
                <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
                  Lợi nhuận
                </span>
                <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#8B5CF6]" />
                  Lợi nhuận dồn
                </span>
              </div>

              {chartData.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-12">
                  Không có dữ liệu tài chính trong khoảng thời gian này.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="3 6"
                      stroke="rgba(148,163,184,0.25)"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      tickMargin={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tickCount={5}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(v) => {
                        const abs = Math.abs(v);
                        const sign = v < 0 ? '-' : '';
                        return abs >= 1_000_000
                          ? `${sign}${+(abs / 1_000_000).toFixed(1)}M`
                          : abs >= 1_000
                            ? `${sign}${(abs / 1_000).toFixed(0)}K`
                            : `${sign}${abs}`;
                      }}
                    />
                    <ReferenceLine y={0} stroke="rgba(148,163,184,0.5)" strokeWidth={1} />
                    <Tooltip
                      formatter={(value, name) => [formatCurrency(Number(value ?? 0)), name]}
                      itemSorter={(item) =>
                        (
                          ({ Thu: 0, Chi: 1, 'Lợi nhuận': 2, 'Lợi nhuận dồn': 3 }) as Record<
                            string,
                            number
                          >
                        )[String(item.name ?? '')] ?? 99
                      }
                      cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                      contentStyle={{
                        background: 'rgba(15, 23, 42, 0.92)',
                        border: '1px solid rgba(148,163,184,0.3)',
                        borderRadius: '12px',
                        boxShadow: '0 10px 28px rgba(15,23,42,0.4)',
                      }}
                      labelStyle={{ fontWeight: 700, color: '#e2e8f0' }}
                      itemStyle={{ color: '#cbd5e1' }}
                    />
                    <Bar dataKey="Thu" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={22} />
                    <Bar dataKey="Chi" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={22} />
                    <Line
                      type="monotone"
                      dataKey="Lợi nhuận"
                      stroke="#F59E0B"
                      strokeWidth={2.5}
                      dot={{ r: 3, strokeWidth: 1.5, stroke: '#F59E0B', fill: '#fff' }}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: '#F59E0B', fill: '#fff' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Lợi nhuận dồn"
                      stroke="#8B5CF6"
                      strokeWidth={2.5}
                      strokeDasharray="5 3"
                      dot={{ r: 3, strokeWidth: 1.5, stroke: '#8B5CF6', fill: '#fff' }}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: '#8B5CF6', fill: '#fff' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Upcoming schedules */}
        {showSchedules && (
          <Card className={cn('rounded-[14px] shadow-none', scheduleCardSpan)}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="font-display text-base font-bold">Lịch chụp sắp tới</h3>
                <div className="flex items-center gap-3">
                  <SegmentedControl
                    value={scheduleViewMode}
                    onChange={setScheduleViewMode}
                    items={[
                      {
                        value: 'table',
                        label: 'Bảng',
                        icon: <TableIcon className="h-3.5 w-3.5" />,
                      },
                      {
                        value: 'calendar',
                        label: 'Lịch',
                        icon: <Calendar className="h-3.5 w-3.5" />,
                      },
                    ]}
                  />
                  <Link
                    to="/schedules"
                    className="text-sm font-semibold text-primary-700 dark:text-primary hover:underline"
                  >
                    Xem tất cả →
                  </Link>
                </div>
              </div>

              {scheduleViewMode === 'calendar' ? (
                <ScheduleCalendar items={calendarItems} maxBadges={2} />
              ) : upcomingSchedules.length === 0 ? (
                <p className="text-muted-foreground text-sm">Không có lịch chụp nào sắp tới.</p>
              ) : (
                <div className="divide-y">
                  {(upcomingSchedules as UpcomingSchedule[]).map((s) => (
                    <ScheduleItem key={s._id} s={s} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
