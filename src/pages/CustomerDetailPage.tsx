import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { customerService } from '../services/customerService';
import { scheduleService } from '../services/scheduleService';
import { transactionService } from '../services/transactionService';
import { formatDate, formatCurrency } from '../utils/format';
import type { Customer, ScheduleResponse, TransactionResponse } from '../types';
import { PageLoader } from '../components/atoms';
import { DataTable } from '../components/organisms';
import type { Column } from '../components/organisms';
import { SCHEDULE_STATUS_COLOR, SCHEDULE_STATUS_LABEL } from '../utils/scheduleConstants';

const CustomerDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      customerService.getOne(id),
      scheduleService.getAll({ customer: id, limit: 100 }),
      transactionService.getAll({ customer: id, limit: 100 }),
    ]).then(([c, s, t]) => {
      setCustomer(c);
      setSchedules(s.data);
      setTransactions(t.data);
    });
  }, [id]);

  if (!customer) return <PageLoader />;

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/customers" className="text-sm text-gray-500 hover:text-gray-700">
          ← Danh sách lớp
        </Link>
      </div>

      <div className="card">
        <h2 className="text-2xl font-bold mb-1">{customer.className}</h2>
        <p className="text-gray-500">{customer.school}</p>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Liên hệ:</span>{' '}
            <span className="font-medium">{customer.contactName}</span>
          </div>
          <div>
            <span className="text-gray-500">SĐT:</span>{' '}
            <span className="font-medium">{customer.contactPhone}</span>
          </div>
          <div>
            <span className="text-gray-500">Địa chỉ:</span>{' '}
            <span className="font-medium">{customer.contactAddress}</span>
          </div>
          <div>
            <span className="text-gray-500">Sĩ số:</span>{' '}
            <span className="font-medium">{customer.total}</span>
          </div>
          <div>
            <span className="text-gray-500">Nam:</span>{' '}
            <span className="font-medium">{customer.totalMale ?? 0}</span>
          </div>
          <div>
            <span className="text-gray-500">Nữ:</span>{' '}
            <span className="font-medium">{customer.totalFemale ?? 0}</span>
          </div>
        </div>
        {customer.notes && <p className="mt-3 text-sm text-gray-600">{customer.notes}</p>}
      </div>

      {/* Finance summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-xs text-gray-500">Tổng thu</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500">Tổng chi</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500">Lợi nhuận</p>
          <p
            className={`text-xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            {formatCurrency(totalIncome - totalExpense)}
          </p>
        </div>
      </div>

      {/* Schedules */}
      <DataTable<ScheduleResponse>
        title="Lịch chụp"
        data={schedules}
        keyExtractor={(s) => s._id}
        emptyTitle="Chưa có lịch"
        columns={[
          { key: 'date', header: 'Ngày', render: (s) => formatDate(s.shootDate) },
          {
            key: 'time',
            header: 'Giờ',
            render: (s) => (
              <span className="text-gray-600">
                {s.startTime}
                {s.endTime ? ` – ${s.endTime}` : ''}
              </span>
            ),
          },
          {
            key: 'location',
            header: 'Địa điểm',
            render: (s) => <span className="text-gray-600">{s.location}</span>,
          },
          {
            key: 'crew',
            header: 'Ekip',
            render: (s) => (
              <span className="text-gray-600">
                {s.leadPhotographer?.username ?? '—'}
                {s.supportPhotographers.length > 0 && (
                  <span className="ml-1 text-xs text-gray-400">
                    (+{s.supportPhotographers.length})
                  </span>
                )}
              </span>
            ),
          },
          {
            key: 'status',
            header: 'Trạng thái',
            render: (s) => (
              <span className={`badge ${SCHEDULE_STATUS_COLOR[s.status]}`}>
                {SCHEDULE_STATUS_LABEL[s.status]}
              </span>
            ),
          } satisfies Column<ScheduleResponse>,
        ]}
      />

      {/* Transactions */}
      <DataTable<TransactionResponse>
        title="Thu chi"
        data={transactions}
        keyExtractor={(t) => t._id}
        emptyTitle="Chưa có giao dịch"
        columns={[
          { key: 'date', header: 'Ngày', render: (t) => formatDate(t.date) },
          {
            key: 'type',
            header: 'Loại',
            render: (t) => (
              <span
                className={`badge ${t.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
              >
                {t.type === 'income' ? 'Thu' : 'Chi'}
              </span>
            ),
          },
          {
            key: 'category',
            header: 'Danh mục',
            render: (t) => <span className="text-gray-600">{t.categoryId?.name ?? '—'}</span>,
          },
          {
            key: 'description',
            header: 'Mô tả',
            render: (t) => <span className="text-gray-600">{t.description}</span>,
          },
          {
            key: 'amount',
            header: 'Số tiền',
            align: 'right',
            render: (t) => (
              <span
                className={`font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}
              >
                {t.type === 'expense' ? '-' : '+'}
                {formatCurrency(t.amount)}
              </span>
            ),
          } satisfies Column<TransactionResponse>,
        ]}
      />
    </div>
  );
};

export default CustomerDetailPage;
