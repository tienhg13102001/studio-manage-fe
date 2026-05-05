import { useEffect, useState, useMemo } from 'react';
import { Calendar, Table as TableIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  LineChart,
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
import { SCHEDULE_STATUS_LABEL, SCHEDULE_STATUS_COLOR } from '../utils/scheduleConstants';
import { ScheduleCalendar } from '../components/organisms';
import { useAuth } from '../context/AuthContext';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchDashboardStats } from '../store/slices/dashboardSlice';
import { fetchUsers } from '../store/slices/usersSlice';
import {
  Badge,
  Card,
  CardContent,
  Combobox,
  DataTable,
  PageLoader,
  SegmentedControl,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import { cn } from '@/lib/utils';

const DashboardPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.roles.some((r) => r === 0 || r === 1) ?? false;
  const showTotalCustomers = user?.roles.some((r) => r === 0 || r === 1 || r === 2) ?? false;
  const showFinance = user?.roles.some((r) => r === 0 || r === 1 || r === 2 || r === 5) ?? false;

  const dispatch = useAppDispatch();
  const { stats } = useAppSelector((s) => s.dashboard);
  const { list: users } = useAppSelector((s) => s.users);
  const [scheduleViewMode, setScheduleViewMode] = useState<'table' | 'calendar'>('table');
  const [filterUserId, setFilterUserId] = useState('');
  const [chartMonths, setChartMonths] = useState(1);

  useEffect(() => {
    dispatch(
      fetchDashboardStats(
        filterUserId ? { userId: filterUserId, months: chartMonths } : { months: chartMonths },
      ),
    );
    if (isAdmin) dispatch(fetchUsers());
  }, [dispatch, isAdmin, filterUserId, chartMonths]);

  const displayName = user?.name ?? user?.username ?? '';
  const selectedUserName = filterUserId
    ? (users.find((u) => u._id === filterUserId)?.name ??
      users.find((u) => u._id === filterUserId)?.username ??
      '')
    : '';

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

  const upcomingColumns: Column<UpcomingSchedule>[] = [
    {
      key: 'date',
      header: 'Ngày chụp',
      className: 'font-medium',
      render: (s) => formatDate(s.shootDate),
    },
    {
      key: 'time',
      header: 'Giờ',
      className: 'text-muted-foreground',
      render: (s) => `${s.startTime ?? '—'}${s.endTime ? ` – ${s.endTime}` : ''}`,
    },
    {
      key: 'class',
      header: 'Lớp',
      render: (s) => (
        <>
          {s.customer?.className ?? '—'}
          {s.customer?.school && (
            <span className="text-xs text-muted-foreground/70 ml-1">({s.customer.school})</span>
          )}
        </>
      ),
    },
    {
      key: 'location',
      header: 'Địa điểm',
      className: 'text-muted-foreground',
      render: (s) => s.location ?? '—',
    },
    {
      key: 'lead',
      header: 'Nhiếp ảnh chính',
      className: 'text-muted-foreground',
      render: (s) =>
        s.leadPhotographer ? (s.leadPhotographer.name ?? s.leadPhotographer.username) : '—',
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (s) => (
        <Badge
          variant="outline"
          className={cn('border-transparent', SCHEDULE_STATUS_COLOR[s.status] ?? '')}
        >
          {SCHEDULE_STATUS_LABEL[s.status] ?? s.status}
        </Badge>
      ),
    },
  ];

  const periodLabel = chartMonths === 1 ? '1 tháng gần đây' : `${chartMonths} tháng gần đây`;

  const cards = [
    {
      label: `Lớp mới (${periodLabel})`,
      value: customerCount,
      color: 'text-blue-600',
      link: '/customers',
      show: showTotalCustomers,
    },
    {
      label: `Lịch chụp (${periodLabel})`,
      value: scheduleCount,
      color: 'text-violet-600',
      link: '/schedules',
      show: showSchedules,
    },
    {
      label: `Tổng thu (${periodLabel})`,
      value: formatCurrency(totals.income),
      color: 'text-emerald-600',
      link: '/finance',
      show: showFinance,
    },
    {
      label: `Tổng chi (${periodLabel})`,
      value: formatCurrency(totals.expense),
      color: 'text-rose-600',
      link: '/finance',
      show: showFinance,
    },
    {
      label: `Lợi nhuận (${periodLabel})`,
      value: formatCurrency(totals.profit),
      color: totals.profit >= 0 ? 'text-emerald-600' : 'text-rose-600',
      link: '/finance',
      show: showFinance,
    },
  ];

  const formatChartLabel = (label: string) => {
    const [yr, mo, dd] = label.split('-');
    if (chartMonths >= 12) return `${dd}/${mo}/${yr.slice(2)}`;
    return `${dd}/${mo}`;
  };

  const chartData = daily.reduce<
    Array<{ name: string; Thu: number; Chi: number; 'Lợi nhuận': number }>
  >((acc, d) => {
    const prev = acc[acc.length - 1];
    const thu = (prev?.Thu ?? 0) + d.income;
    const chiAbs = Math.abs(prev?.Chi ?? 0) + d.expense;
    const profit = (prev?.['Lợi nhuận'] ?? 0) + (d.income - d.expense);
    acc.push({
      name: formatChartLabel(d.label),
      Thu: thu,
      Chi: -chiAbs,
      'Lợi nhuận': profit,
    });
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Xin chào, {displayName}!</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Chúc bạn một ngày làm việc tốt lành!</p>
        <p className="text-sm text-muted-foreground mt-0.5">
          {new Date().toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {isAdmin && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">
              Xem theo người:
            </span>
            <div className="flex-1 max-w-xs">
              <Combobox
                options={users.map((u) => ({ value: u._id, label: u.name ?? u.username }))}
                value={filterUserId}
                onChange={setFilterUserId}
                placeholder="Tất cả"
              />
            </div>
            {selectedUserName && (
              <span className="text-sm text-blue-600 font-medium">— {selectedUserName}</span>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards
          .filter((c) => c.show)
          .map((c) => (
            <Link
              key={c.label}
              to={c.link}
              className="rounded-xl border bg-card px-4 py-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group"
            >
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-none">{c.label}</p>
              <p className={cn('text-2xl font-bold mt-2 tabular-nums', c.color)}>{c.value}</p>
              <div className="mt-2 text-xs text-muted-foreground/60 group-hover:text-muted-foreground/80 transition-colors">
                Xem chi tiết →
              </div>
            </Link>
          ))}
      </div>

      {/* Monthly chart */}
      {showFinance && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="text-base font-semibold">
                {chartMonths === 1
                  ? 'Thu chi 30 ngày gần đây'
                  : `Thu chi ${chartMonths} tháng gần đây`}
              </h3>
              <SegmentedControl
                value={chartMonths}
                onChange={setChartMonths}
                items={[
                  { value: 1, label: '1T' },
                  { value: 3, label: '3T' },
                  { value: 6, label: '6T' },
                  { value: 12, label: '12T' },
                ]}
              />
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-4 px-1">
              <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                Thu
              </span>
              <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                Chi
              </span>
              <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                Lợi nhuận
              </span>
            </div>
            <div className="rounded-2xl p-3 border border-border/60 bg-gradient-to-br from-blue-500/5 via-transparent to-violet-500/5">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 12, right: 20, left: 8, bottom: 4 }}>
                  <defs>
                    <linearGradient id="incomeStroke" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#22c55e" />
                    </linearGradient>
                    <linearGradient id="expenseStroke" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fb7185" />
                      <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                    <linearGradient id="profitStroke" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 8"
                    stroke="rgba(148,163,184,0.22)"
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
                    tickCount={4}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v) => {
                      const abs = Math.abs(v);
                      const fmtd =
                        abs >= 1_000_000
                          ? `${(abs / 1_000_000).toFixed(0)}M`
                          : abs >= 1000
                            ? `${(abs / 1000).toFixed(0)}K`
                            : String(abs);
                      return v < 0 ? `-${fmtd}` : fmtd;
                    }}
                  />
                  <ReferenceLine y={0} stroke="rgba(203,213,225,0.5)" strokeWidth={1.2} />
                  <Tooltip
                    formatter={(value, name) => {
                      const v = Number(value ?? 0);
                      const display = name === 'Chi' ? Math.abs(v) : v;
                      return [formatCurrency(display), name];
                    }}
                    itemSorter={(item) => {
                      const order: Record<string, number> = { Thu: 0, 'Lợi nhuận': 1, Chi: 2 };
                      return order[String(item.name ?? '')] ?? 99;
                    }}
                    cursor={false}
                    contentStyle={{
                      background: 'rgba(15, 23, 42, 0.86)',
                      border: '1px solid rgba(148,163,184,0.3)',
                      borderRadius: '12px',
                      boxShadow: '0 10px 28px rgba(15,23,42,0.4)',
                      backdropFilter: 'blur(12px)',
                    }}
                    labelStyle={{ fontWeight: 700, color: '#e2e8f0' }}
                    itemStyle={{ color: '#cbd5e1' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Thu"
                    stroke="url(#incomeStroke)"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, stroke: '#34d399', fill: '#0f172a' }}
                    activeDot={{ r: 6, strokeWidth: 2.5, stroke: '#34d399', fill: '#ecfdf5' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Chi"
                    stroke="url(#expenseStroke)"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, stroke: '#ef4444', fill: '#0f172a' }}
                    activeDot={{ r: 6, strokeWidth: 2.5, stroke: '#ef4444', fill: '#fff1f2' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Lợi nhuận"
                    stroke="url(#profitStroke)"
                    strokeWidth={3}
                    strokeDasharray="6 4"
                    dot={{ r: 4, strokeWidth: 2, stroke: '#3b82f6', fill: '#0f172a' }}
                    activeDot={{ r: 6, strokeWidth: 2.5, stroke: '#3b82f6', fill: '#eff6ff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming schedules */}
      {showSchedules && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-base font-semibold">Lịch chụp sắp tới</h3>
              <div className="flex items-center gap-3">
                <SegmentedControl
                  value={scheduleViewMode}
                  onChange={setScheduleViewMode}
                  items={[
                    { value: 'table', label: 'Bảng', icon: <TableIcon className="h-3.5 w-3.5" /> },
                    {
                      value: 'calendar',
                      label: 'Lịch',
                      icon: <Calendar className="h-3.5 w-3.5" />,
                    },
                  ]}
                />
                <Link to="/schedules" className="text-sm text-blue-600 hover:underline">
                  Xem tất cả →
                </Link>
              </div>
            </div>
            {scheduleViewMode === 'calendar' ? (
              <ScheduleCalendar items={calendarItems} maxBadges={2} />
            ) : upcomingSchedules.length === 0 ? (
              <p className="text-muted-foreground text-sm">Không có lịch chụp nào sắp tới.</p>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <DataTable<UpcomingSchedule>
                    variant="plain"
                    data={upcomingSchedules as UpcomingSchedule[]}
                    keyExtractor={(s) => s._id}
                    columns={upcomingColumns}
                  />
                </div>
                <div className="md:hidden space-y-2">
                  {(upcomingSchedules as UpcomingSchedule[]).map((s) => (
                    <div key={s._id} className="rounded-xl border bg-card p-3 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-sm">{formatDate(s.shootDate)}</div>
                          {(s.startTime || s.endTime) && (
                            <div className="text-xs text-muted-foreground">
                              {s.startTime}
                              {s.endTime ? ` – ${s.endTime}` : ''}
                            </div>
                          )}
                          <div className="text-sm mt-0.5">{s.customer?.className ?? '—'}</div>
                          {s.location && (
                            <div className="text-xs text-muted-foreground">{s.location}</div>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'border-transparent text-xs',
                            SCHEDULE_STATUS_COLOR[s.status] ?? '',
                          )}
                        >
                          {SCHEDULE_STATUS_LABEL[s.status] ?? s.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DashboardPage;
