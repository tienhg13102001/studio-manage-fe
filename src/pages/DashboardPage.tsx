import { useEffect, useState, useMemo } from 'react';
import { FaCalendarAlt, FaTable } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { Select, SegmentedControl } from '../components/atoms';
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
import {
  shortLabel,
  SCHEDULE_STATUS_LABEL,
  SCHEDULE_STATUS_COLOR,
} from '../utils/scheduleConstants';
import { DataTable, ScheduleCalendar } from '../components/organisms';
import type { Column } from '../components/organisms';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from '../components/atoms';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchDashboardStats } from '../store/slices/dashboardSlice';
import { fetchUsers } from '../store/slices/usersSlice';

const DashboardPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.roles.some((r) => r === 0 || r === 1) ?? false;
  const showTotalCustomers = user?.roles.some((r) => r === 0 || r === 1 || r === 2) ?? false;
  const showFinance = user?.roles.some((r) => r === 0 || r === 1 || r === 2 || r === 5) ?? false;

  const dispatch = useAppDispatch();
  const { stats, loading } = useAppSelector((s) => s.dashboard);
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
  }, [dispatch, isAdmin]);

  const handleChartMonthsChange = (m: number) => {
    setChartMonths(m);
    dispatch(
      fetchDashboardStats(filterUserId ? { userId: filterUserId, months: m } : { months: m }),
    );
  };

  const handleFilterChange = (uid: string) => {
    setFilterUserId(uid);
    dispatch(
      fetchDashboardStats(uid ? { userId: uid, months: chartMonths } : { months: chartMonths }),
    );
  };

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
      className: 'text-gray-500',
      render: (s) => `${s.startTime ?? '—'}${s.endTime ? ` – ${s.endTime}` : ''}`,
    },
    {
      key: 'class',
      header: 'Lớp',
      render: (s) => (
        <>
          {s.customer?.className ?? '—'}
          {s.customer?.school && (
            <span className="text-xs text-gray-400 ml-1">({s.customer.school})</span>
          )}
        </>
      ),
    },
    {
      key: 'location',
      header: 'Địa điểm',
      className: 'text-gray-500',
      render: (s) => s.location ?? '—',
    },
    {
      key: 'lead',
      header: 'Nhiếp ảnh chính',
      className: 'text-gray-500',
      render: (s) =>
        s.leadPhotographer ? (s.leadPhotographer.name ?? s.leadPhotographer.username) : '—',
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (s) => (
        <span className={`badge ${STATUS_COLOR[s.status] ?? ''}`}>
          {STATUS_LABEL[s.status] ?? s.status}
        </span>
      ),
    },
  ];

  if (loading || !stats) return <PageLoader />;

  const {
    thisMonth,
    monthly,
    granularity,
    customerCount,
    scheduleCount,
    showSchedules,
    upcomingSchedules,
  } = stats!;

  const STATUS_LABEL = SCHEDULE_STATUS_LABEL;
  const STATUS_COLOR = SCHEDULE_STATUS_COLOR;

  const cards = [
    {
      label: 'Tổng lớp đã tạo',
      value: customerCount,
      color: 'text-blue-600',
      link: '/customers',
      show: showTotalCustomers,
    },
    {
      label: 'Lịch chụp tháng này',
      value: scheduleCount,
      color: 'text-purple-600',
      link: '/schedules',
      show: showSchedules,
    },
    {
      label: 'Thu tháng này',
      value: formatCurrency(thisMonth.income),
      color: 'text-green-600',
      link: '/finance',
      show: showFinance,
    },
    {
      label: 'Chi tháng này',
      value: formatCurrency(thisMonth.expense),
      color: 'text-red-600',
      link: '/finance',
      show: showFinance,
    },
    {
      label: 'Lợi nhuận tháng này',
      value: formatCurrency(thisMonth.profit),
      color: thisMonth.profit >= 0 ? 'text-green-600' : 'text-red-600',
      link: '/finance',
      show: showFinance,
    },
  ];

  const formatChartLabel = (label: string) => {
    if (granularity === 'week') {
      // label = YYYY-MM-DD (ngày bắt đầu tuần) → hiển thị dd/MM
      const [, mo, dd] = label.split('-');
      return `${dd}/${mo}`;
    }
    return shortLabel(label);
  };

  const chartData = (() => {
    if (granularity === 'week') {
      // Chế độ tuần: cộng dồn theo thời gian (cumulative)
      let cumThu = 0;
      let cumChi = 0;
      return monthly.map((m) => {
        cumThu += m.income;
        cumChi += m.expense;
        return {
          name: formatChartLabel(m.label),
          Thu: cumThu,
          Chi: -cumChi,
          'Lợi nhuận': cumThu - cumChi,
        };
      });
    }
    // Chế độ tháng: hiển thị theo từng tháng riêng lẻ
    return monthly.map((m) => ({
      name: formatChartLabel(m.label),
      Thu: m.income,
      Chi: -m.expense,
      'Lợi nhuận': m.income - m.expense,
    }));
  })();

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold">Xin chào, {displayName}!</h2>
        <p className="text-sm text-gray-500 mt-0.5">Chúc bạn một ngày làm việc tốt lành!</p>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date().toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Admin filter */}
      {isAdmin && (
        <div className="card flex items-center gap-3 py-3">
          <span className="text-sm text-gray-600 font-medium whitespace-nowrap">
            Xem theo người:
          </span>
          <div className="flex-1 max-w-xs">
            <Select
              options={users.map((u) => ({ value: u._id, label: u.name ?? u.username }))}
              value={filterUserId}
              onChange={(v) => handleFilterChange(v as string)}
              placeholder="Tất cả"
            />
          </div>
          {selectedUserName && (
            <span className="text-sm text-blue-600 font-medium">— {selectedUserName}</span>
          )}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards
          .filter((c) => c.show)
          .map((c) => (
            <Link key={c.label} to={c.link} className="card hover:shadow-md transition-shadow">
              <p className="text-sm text-gray-500">{c.label}</p>
              <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
            </Link>
          ))}
      </div>

      {/* Monthly chart */}
      {showFinance && (
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-base font-semibold text-gray-700">
              {chartMonths === 1
                ? 'Thu chi 30 ngày gần đây'
                : `Thu chi ${chartMonths} tháng gần đây`}
            </h3>
            <SegmentedControl
              value={chartMonths}
              onChange={handleChartMonthsChange}
              items={[
                { value: 1, label: '1T', tone: 'blue' },
                { value: 3, label: '3T', tone: 'blue' },
                { value: 6, label: '6T', tone: 'blue' },
                { value: 12, label: '12T', tone: 'blue' },
              ]}
            />
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-4 px-1">
            <span
              className="inline-flex items-center gap-2 text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: '#22c55e', boxShadow: '0 0 10px rgba(34,197,94,0.5)' }}
              />
              Thu
            </span>
            <span
              className="inline-flex items-center gap-2 text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: '#ef4444', boxShadow: '0 0 10px rgba(239,68,68,0.5)' }}
              />
              Chi
            </span>
            <span
              className="inline-flex items-center gap-2 text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: '#3b82f6', boxShadow: '0 0 10px rgba(59,130,246,0.5)' }}
              />
              Lợi nhuận
            </span>
          </div>
          <div
            className="rounded-2xl p-3"
            style={{
              background:
                'radial-gradient(circle at 20% 0%, rgba(59,130,246,0.12) 0%, rgba(0,0,0,0) 40%), radial-gradient(circle at 80% 100%, rgba(124,58,237,0.12) 0%, rgba(0,0,0,0) 40%)',
              border: '1px solid var(--card-border)',
            }}
          >
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
                  <filter id="incomeGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2.8" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="expenseGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="profitGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
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
                  tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                  tickMargin={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickCount={4}
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
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
                    // "Chi" được lưu âm trong chart → hiển thị giá trị tuyệt đối
                    // "Lợi nhuận" giữ nguyên dấu để thấy lời/lỗ
                    const display = name === 'Chi' ? Math.abs(v) : v;
                    return [formatCurrency(display), name];
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
                  filter="url(#incomeGlow)"
                  dot={{ r: 4, strokeWidth: 2, stroke: '#34d399', fill: '#0f172a' }}
                  activeDot={{ r: 6, strokeWidth: 2.5, stroke: '#34d399', fill: '#ecfdf5' }}
                />
                <Line
                  type="monotone"
                  dataKey="Chi"
                  stroke="url(#expenseStroke)"
                  strokeWidth={3}
                  filter="url(#expenseGlow)"
                  dot={{ r: 4, strokeWidth: 2, stroke: '#ef4444', fill: '#0f172a' }}
                  activeDot={{ r: 6, strokeWidth: 2.5, stroke: '#ef4444', fill: '#fff1f2' }}
                />
                <Line
                  type="monotone"
                  dataKey="Lợi nhuận"
                  stroke="url(#profitStroke)"
                  strokeWidth={3}
                  strokeDasharray="6 4"
                  filter="url(#profitGlow)"
                  dot={{ r: 4, strokeWidth: 2, stroke: '#3b82f6', fill: '#0f172a' }}
                  activeDot={{ r: 6, strokeWidth: 2.5, stroke: '#3b82f6', fill: '#eff6ff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Upcoming schedules */}
      {showSchedules && (
        <div className="card">
          <div className="flex items-center justify-between mb-4 flex-wrap space-y-2">
            <h3 className="text-base font-semibold text-gray-700">Lịch chụp sắp tới</h3>
            <div className="flex items-center gap-3">
              <SegmentedControl
                value={scheduleViewMode}
                onChange={setScheduleViewMode}
                items={[
                  { value: 'table', label: 'Bảng', icon: <FaTable />, tone: 'blue' },
                  { value: 'calendar', label: 'Lịch', icon: <FaCalendarAlt />, tone: 'blue' },
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
            <p className="text-gray-400 text-sm">Không có lịch chụp nào sắp tới.</p>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <DataTable<UpcomingSchedule>
                  variant="plain"
                  data={upcomingSchedules as UpcomingSchedule[]}
                  keyExtractor={(s) => s._id}
                  columns={upcomingColumns}
                />
              </div>
              {/* Mobile */}
              <div className="md:hidden space-y-2">
                {(upcomingSchedules as UpcomingSchedule[]).map((s) => (
                  <div key={s._id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-sm">{formatDate(s.shootDate)}</div>
                        {(s.startTime || s.endTime) && (
                          <div className="text-xs text-gray-500">
                            {s.startTime}
                            {s.endTime ? ` – ${s.endTime}` : ''}
                          </div>
                        )}
                        <div className="text-sm mt-0.5">{s.customer?.className ?? '—'}</div>
                        {s.location && <div className="text-xs text-gray-400">{s.location}</div>}
                      </div>
                      <span className={`badge text-xs ${STATUS_COLOR[s.status] ?? ''}`}>
                        {STATUS_LABEL[s.status] ?? s.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
