import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Select } from '../components/atoms';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
import { ScheduleCalendar } from '../components/organisms';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from '../components/atoms';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchDashboardStats } from '../store/slices/dashboardSlice';
import { fetchUsers } from '../store/slices/usersSlice';

const DashboardPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.roles.some((r) => r === 0 || r === 1) ?? false;
  const showTotalCustomers = user?.roles.some((r) => r === 0 || r === 1 || r === 2) ?? false;
  const showFinance = user?.roles.some((r) => r === 0 || r === 1 || r === 2) ?? false;

  const dispatch = useAppDispatch();
  const { stats, loading } = useAppSelector((s) => s.dashboard);
  const { list: users } = useAppSelector((s) => s.users);
  const [scheduleViewMode, setScheduleViewMode] = useState<'table' | 'calendar'>('table');
  const [filterUserId, setFilterUserId] = useState('');
  const [chartMonths, setChartMonths] = useState(1);

  useEffect(() => {
    dispatch(fetchDashboardStats(filterUserId ? { userId: filterUserId, months: chartMonths } : { months: chartMonths }));
    if (isAdmin) dispatch(fetchUsers());
  }, [dispatch, isAdmin]);

  const handleChartMonthsChange = (m: number) => {
    setChartMonths(m);
    dispatch(fetchDashboardStats(filterUserId ? { userId: filterUserId, months: m } : { months: m }));
  };

  const handleFilterChange = (uid: string) => {
    setFilterUserId(uid);
    dispatch(fetchDashboardStats(uid ? { userId: uid, months: chartMonths } : { months: chartMonths }));
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
        className: s.customerId?.className ?? '—',
        leadName: s.leadPhotographer
          ? (s.leadPhotographer.name ?? s.leadPhotographer.username)
          : undefined,
      })),
    [stats?.upcomingSchedules],
  );

  if (loading || !stats) return <PageLoader />;

  const { thisMonth, monthly, granularity, customerCount, scheduleCount, showSchedules, upcomingSchedules } =
    stats!;

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
    if (granularity === 'day') {
      // label = YYYY-MM-DD → hiển thị dd/MM
      const [, mo, dd] = label.split('-');
      return `${dd}/${mo}`;
    }
    return shortLabel(label);
  };

  const chartData = (() => {
    if (granularity === 'day') {
      // Chế độ ngày: cộng dồn theo thời gian (cumulative)
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
        <h2 className="text-2xl font-bold text-gray-900">Xin chào, {displayName}!</h2>
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
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {[1, 3, 6, 12].map((m) => (
                <button
                  key={m}
                  onClick={() => handleChartMonthsChange(m)}
                  className={`px-3 py-1 text-xs font-medium transition-colors border-l first:border-l-0 border-gray-200 ${
                    chartMonths === m
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {m}T
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 11 }}
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
              <ReferenceLine y={0} stroke="#d1d5db" strokeWidth={1.5} />
              <Tooltip
                formatter={(value, name) => {
                  const v = Number(value ?? 0);
                  // "Chi" được lưu âm trong chart → hiển thị giá trị tuyệt đối
                  // "Lợi nhuận" giữ nguyên dấu để thấy lời/lỗ
                  const display = name === 'Chi' ? Math.abs(v) : v;
                  return [formatCurrency(display), name];
                }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="Thu"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="Chi"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="Lợi nhuận"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Upcoming schedules */}
      {showSchedules && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-700">Lịch chụp sắp tới</h3>
            <div className="flex items-center gap-3">
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setScheduleViewMode('table')}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${scheduleViewMode === 'table' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  ☰ Bảng
                </button>
                <button
                  onClick={() => setScheduleViewMode('calendar')}
                  className={`px-3 py-1 text-xs font-medium transition-colors border-l border-gray-200 ${scheduleViewMode === 'calendar' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  ◫ Lịch
                </button>
              </div>
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
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 border-b">
                    <tr>
                      <th className="text-left px-3 py-2">Ngày chụp</th>
                      <th className="text-left px-3 py-2">Giờ</th>
                      <th className="text-left px-3 py-2">Lớp</th>
                      <th className="text-left px-3 py-2">Địa điểm</th>
                      <th className="text-left px-3 py-2">Nhiếp ảnh chính</th>
                      <th className="text-left px-3 py-2">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(upcomingSchedules as UpcomingSchedule[]).map((s) => (
                      <tr key={s._id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{formatDate(s.shootDate)}</td>
                        <td className="px-3 py-2 text-gray-500">
                          {s.startTime ?? '—'}
                          {s.endTime ? ` – ${s.endTime}` : ''}
                        </td>
                        <td className="px-3 py-2">
                          {s.customerId?.className ?? '—'}
                          {s.customerId?.school && (
                            <span className="text-xs text-gray-400 ml-1">
                              ({s.customerId.school})
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-500">{s.location ?? '—'}</td>
                        <td className="px-3 py-2 text-gray-500">
                          {s.leadPhotographer
                            ? (s.leadPhotographer.name ?? s.leadPhotographer.username)
                            : '—'}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`badge ${STATUS_COLOR[s.status] ?? ''}`}>
                            {STATUS_LABEL[s.status] ?? s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                        <div className="text-sm mt-0.5">{s.customerId?.className ?? '—'}</div>
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
