import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  MapPin,
  Phone,
  School,
  StickyNote,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { customerService } from '../services/customerService';
import { scheduleService } from '../services/scheduleService';
import { transactionService } from '../services/transactionService';
import { formatDate, formatCurrency } from '../utils/format';
import type { Customer, ScheduleResponse, TransactionResponse } from '../types';
import { SCHEDULE_STATUS_LABEL } from '../utils/scheduleConstants';
import { Badge, Card, CardContent, DataTable, PageLoader } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useAppSelector } from '../store';
import { cn } from '@/lib/utils';

const STATUS_VARIANT = {
  pending: 'warning',
  confirmed: 'info',
  completed: 'success',
  cancelled: 'danger',
} as const;

const Fact = ({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) => (
  <div className="min-w-0">
    <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
      {icon}
      {label}
    </div>
    <div className="truncate text-sm font-semibold text-foreground">{children}</div>
  </div>
);

const StatCard = ({
  label,
  value,
  icon,
  tile,
  valueClass,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tile: string;
  valueClass: string;
}) => (
  <Card className="rounded-[14px] shadow-none">
    <CardContent className="flex items-center gap-4 p-5">
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]', tile)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('font-display text-2xl font-bold tabular', valueClass)}>{value}</p>
      </div>
    </CardContent>
  </Card>
);

const CustomerDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const seasons = useAppSelector((st) => st.seasons.list);
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
  const profit = totalIncome - totalExpense;
  const seasonName = seasons.find((se) => se._id === customer.season)?.name;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/customers"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Danh sách lớp
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="rounded-[14px] shadow-none">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-primary-100 font-display text-base font-bold text-primary-700 dark:bg-primary/15 dark:text-primary">
                {customer.className}
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-2xl font-bold tracking-tight">
                  Lớp {customer.className}
                </h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <School className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {customer.school}
                    {seasonName ? ` · ${seasonName}` : ''}
                  </span>
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
              <Fact icon={<User className="h-3.5 w-3.5" />} label="Liên hệ">
                {customer.contactName}
              </Fact>
              <Fact icon={<Phone className="h-3.5 w-3.5" />} label="SĐT">
                <span className="tabular">{customer.contactPhone}</span>
              </Fact>
              <Fact icon={<MapPin className="h-3.5 w-3.5" />} label="Địa chỉ">
                {customer.contactAddress}
              </Fact>
              <Fact icon={<Users className="h-3.5 w-3.5" />} label="Sĩ số">
                {customer.total} (Nam {customer.totalMale ?? 0} · Nữ {customer.totalFemale ?? 0})
              </Fact>
            </div>
            {customer.notes && (
              <p className="mt-4 flex items-start gap-2 rounded-[10px] bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                <StickyNote className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{customer.notes}</span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Finance summary */}
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <StatCard
            label="Tổng thu"
            value={formatCurrency(totalIncome)}
            icon={<ArrowDownLeft className="h-4 w-4" />}
            tile="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            valueClass="text-emerald-600 dark:text-emerald-400"
          />
          <StatCard
            label="Tổng chi"
            value={formatCurrency(totalExpense)}
            icon={<ArrowUpRight className="h-4 w-4" />}
            tile="bg-rose-500/15 text-rose-600 dark:text-rose-400"
            valueClass="text-rose-600 dark:text-rose-400"
          />
          <StatCard
            label="Lợi nhuận"
            value={formatCurrency(profit)}
            icon={<Wallet className="h-4 w-4" />}
            tile="bg-primary-100 text-primary-700 dark:bg-primary/15 dark:text-primary"
            valueClass={
              profit >= 0
                ? 'text-primary-700 dark:text-primary'
                : 'text-rose-600 dark:text-rose-400'
            }
          />
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
              <span className="text-muted-foreground">
                {s.startTime}
                {s.endTime ? ` – ${s.endTime}` : ''}
              </span>
            ),
          },
          {
            key: 'location',
            header: 'Địa điểm',
            render: (s) => <span className="text-muted-foreground">{s.location}</span>,
          },
          {
            key: 'package',
            header: 'Gói chụp',
            render: (s) =>
              s.package ? (
                <div>
                  <span className="block font-semibold text-foreground">{s.package.name}</span>
                  <span className="block text-xs text-muted-foreground tabular">
                    {formatCurrency(s.package.pricePerMember)}/thành viên
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground">—</span>
              ),
          },
          {
            key: 'crew',
            header: 'Ekip',
            render: (s) => (
              <span className="text-muted-foreground">
                {s.leadPhotographer?.username ?? '—'}
                {s.supportPhotographers.length > 0 && (
                  <span className="ml-1 text-xs text-muted-foreground/70">
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
              <Badge variant={STATUS_VARIANT[s.status]} dot>
                {SCHEDULE_STATUS_LABEL[s.status]}
              </Badge>
            ),
          } satisfies Column<ScheduleResponse>,
        ]}
      />

      {/* Transactions */}
      <DataTable<TransactionResponse>
        title="Giao dịch"
        data={transactions}
        keyExtractor={(t) => t._id}
        emptyTitle="Chưa có giao dịch"
        columns={[
          { key: 'date', header: 'Ngày', render: (t) => formatDate(t.date) },
          {
            key: 'type',
            header: 'Loại',
            render: (t) => (
              <Badge variant={t.type === 'income' ? 'success' : 'danger'}>
                {t.type === 'income' ? 'Thu' : 'Chi'}
              </Badge>
            ),
          },
          {
            key: 'category',
            header: 'Danh mục',
            render: (t) => (
              <span className="text-muted-foreground">{t.categoryId?.name ?? '—'}</span>
            ),
          },
          {
            key: 'description',
            header: 'Mô tả',
            render: (t) => <span className="text-muted-foreground">{t.description}</span>,
          },
          {
            key: 'amount',
            header: 'Số tiền',
            align: 'right',
            render: (t) => (
              <span
                className={cn(
                  'font-semibold tabular',
                  t.type === 'income'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400',
                )}
              >
                {t.type === 'expense' ? '−' : '+'}
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
