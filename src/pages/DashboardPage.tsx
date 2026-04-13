import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
import { dashboardService, type DashboardStats, type UpcomingSchedule } from '../services/dashboardService';
import { userService } from '../services/userService';
import { formatCurrency, formatDate } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import type { User } from '../types';

const MONTH_LABELS: Record<string, string> = {
  '01': 'T1', '02': 'T2', '03': 'T3', '04': 'T4',
  '05': 'T5', '06': 'T6', '07': 'T7', '08': 'T8',
  '09': 'T9', '10': 'T10', '11': 'T11', '12': 'T12',
};

const shortLabel = (label: string) => {
  const [, mo] = label.split('-');
  return MONTH_LABELS[mo] ?? label;
};

const DashboardPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.roles.some((r) => r === 0 || r === 1) ?? false;
  const showTotalCustomers = user?.roles.some((r) => r === 0 || r === 1 || r === 2) ?? false;
  const showFinance = user?.roles.some((r) => r === 0 || r === 1 || r === 2) ?? false;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [scheduleViewMode, setScheduleViewMode] = useState<'table' | 'calendar'>('table');
  const [calendarDate, setCalendarDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [filterUserId, setFilterUserId] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async (uid = filterUserId) => {
    setLoading(true);
    const data = await dashboardService.getStats(uid ? { userId: uid } : undefined);
    setStats(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (isAdmin) userService.getAll().then(setUsers);
  }, []);

  const handleFilterChange = (uid: string) => {
    setFilterUserId(uid);
    load(uid);
  };

  const displayName = user?.name ?? user?.username ?? '';
  const selectedUserName = filterUserId
    ? (users.find((u) => u._id === filterUserId)?.name ?? users.find((u) => u._id === filterUserId)?.username ?? '')
    : '';

  const MONTH_VN = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
  const DOW_VN = ['CN','T2','T3','T4','T5','T6','T7'];

  const calendarDays = useMemo(() => {
    const { year, month } = calendarDate;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (string | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    return days;
  }, [calendarDate]);

  const schedulesByDay = useMemo(() => {
    const map: Record<string, UpcomingSchedule[]> = {};
    (stats?.upcomingSchedules ?? []).forEach((s) => {
      const key = s.shootDate.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return map;
  }, [stats?.upcomingSchedules]);

  if (loading) return <div className="text-gray-500">Đang tải…</div>;

  const { thisMonth, monthly, customerCount, scheduleCount, showSchedules, upcomingSchedules } = stats!;

  const STATUS_LABEL: Record<string, string> = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    completed: 'Hoàn thành',
    cancelled: 'Đã huỷ',
  };
  const STATUS_COLOR: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

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

  const chartData = monthly.map((m) => ({
    name: shortLabel(m.label),
    Thu: m.income,
    Chi: -m.expense,
    'Lợi nhuận': m.income - m.expense,
  }));

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Xin chào, {displayName}!
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Admin filter */}
      {isAdmin && (
        <div className="card flex items-center gap-3 py-3">
          <span className="text-sm text-gray-600 font-medium whitespace-nowrap">Xem theo người:</span>
          <select
            className="input flex-1 max-w-xs"
            value={filterUserId}
            onChange={(e) => handleFilterChange(e.target.value)}
          >
            <option value="">Tất cả</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name ?? u.username}
              </option>
            ))}
          </select>
          {selectedUserName && (
            <span className="text-sm text-blue-600 font-medium">— {selectedUserName}</span>
          )}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.filter((c) => c.show).map((c) => (
          <Link key={c.label} to={c.link} className="card hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          </Link>
        ))}
      </div>

      {/* Monthly chart */}
      {showFinance && (
      <div className="card">
        <h3 className="text-base font-semibold text-gray-700 mb-4">Thu chi 6 tháng gần đây</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => {
                const abs = Math.abs(v);
                const fmtd = abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(0)}M` : abs >= 1000 ? `${(abs / 1000).toFixed(0)}K` : String(abs);
                return v < 0 ? `-${fmtd}` : fmtd;
              }}
            />
            <ReferenceLine y={0} stroke="#d1d5db" strokeWidth={1.5} />
            <Tooltip
              formatter={(value, name) => [
                formatCurrency(Math.abs(Number(value ?? 0))),
                name,
              ]}
              labelStyle={{ fontWeight: 600 }}
            />
            <Legend />
            <Line type="monotone" dataKey="Thu" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="Chi" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="Lợi nhuận" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 4 }} activeDot={{ r: 6 }} />
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
              <Link to="/schedules" className="text-sm text-blue-600 hover:underline">Xem tất cả →</Link>
            </div>
          </div>
          {scheduleViewMode === 'calendar' ? (
            <div>
              {/* Month nav */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setCalendarDate(({ year, month }) => month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 })}
                  className="btn-secondary px-3 py-1 text-sm"
                >‹</button>
                <span className="font-semibold text-gray-700">{MONTH_VN[calendarDate.month]} {calendarDate.year}</span>
                <button
                  onClick={() => setCalendarDate(({ year, month }) => month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 })}
                  className="btn-secondary px-3 py-1 text-sm"
                >›</button>
              </div>
              {/* DOW headers */}
              <div className="grid grid-cols-7 mb-1">
                {DOW_VN.map((d) => (
                  <div key={d} className="text-center text-xs font-semibold text-gray-500 py-1">{d}</div>
                ))}
              </div>
              {/* Grid */}
              <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
                {calendarDays.map((day, i) => {
                  const daySch = day ? (schedulesByDay[day] ?? []) : [];
                  const isToday = day === new Date().toISOString().slice(0, 10);
                  const isSelected = day === selectedDay;
                  return (
                    <div
                      key={i}
                      onClick={() => day && setSelectedDay(isSelected ? null : day)}
                      className={`bg-white min-h-[4.5rem] p-1 cursor-pointer transition-colors ${
                        !day ? 'bg-gray-50 cursor-default' : 'hover:bg-primary-50'
                      } ${isSelected ? 'ring-2 ring-inset ring-primary-400' : ''}`}
                    >
                      {day && (
                        <>
                          <div className={`text-xs font-medium mb-1 w-5 h-5 flex items-center justify-center rounded-full ${
                            isToday ? 'bg-primary-600 text-white' : 'text-gray-700'
                          }`}>{parseInt(day.slice(8))}</div>
                          <div className="space-y-0.5">
                            {daySch.slice(0, 2).map((s) => (
                              <div
                                key={s._id}
                                className={`text-xs truncate rounded px-1 py-0.5 leading-tight ${
                                  s.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  s.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                  s.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}
                                title={s.customerId?.className ?? ''}
                              >
                                {s.customerId?.className ?? '—'}
                              </div>
                            ))}
                            {daySch.length > 2 && <div className="text-xs text-gray-400 pl-1">+{daySch.length - 2}</div>}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Selected day detail */}
              {selectedDay && (schedulesByDay[selectedDay] ?? []).length > 0 && (
                <div className="mt-4 border-t pt-4 space-y-2">
                  <h4 className="font-semibold text-sm text-gray-700">
                    Lịch ngày {parseInt(selectedDay.slice(8))}/{parseInt(selectedDay.slice(5,7))}/{selectedDay.slice(0,4)}
                  </h4>
                  {(schedulesByDay[selectedDay] ?? []).map((s) => (
                    <div key={s._id} className="flex items-start justify-between rounded-lg border border-gray-100 p-2.5">
                      <div className="space-y-0.5">
                        <div className="font-medium text-sm">{s.customerId?.className ?? '—'}</div>
                        {(s.startTime || s.endTime) && <div className="text-xs text-gray-500">⏰ {s.startTime}{s.endTime ? ` – ${s.endTime}` : ''}</div>}
                        {s.location && <div className="text-xs text-gray-500">📍 {s.location}</div>}
                        {s.leadPhotographer && <div className="text-xs text-gray-500">Leader: {s.leadPhotographer.name ?? s.leadPhotographer.username}</div>}
                      </div>
                      <span className={`badge text-xs ${STATUS_COLOR[s.status] ?? ''}`}>{STATUS_LABEL[s.status] ?? s.status}</span>
                    </div>
                  ))}
                </div>
              )}
              {selectedDay && (schedulesByDay[selectedDay] ?? []).length === 0 && (
                <div className="mt-4 border-t pt-4 text-center text-gray-400 text-sm">Không có lịch ngày này</div>
              )}
            </div>
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
                          {s.startTime ?? '—'}{s.endTime ? ` – ${s.endTime}` : ''}
                        </td>
                        <td className="px-3 py-2">
                          {s.customerId?.className ?? '—'}
                          {s.customerId?.school && (
                            <span className="text-xs text-gray-400 ml-1">({s.customerId.school})</span>
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
                            {s.startTime}{s.endTime ? ` – ${s.endTime}` : ''}
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

