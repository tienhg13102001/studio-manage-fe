import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock,
  CircleSlash,
  Copy,
  ExternalLink,
  FilePlus,
  FilePen,
  FileText,
  FolderOpen,
  FolderPlus,
  History,
  MapPin,
  MessageSquare,
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  School,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  StickyNote,
  User,
  UserCheck,
  Users,
  Video,
  Wallet,
  XCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { toast } from 'react-toastify';
import { customerService } from '../services/customerService';
import { scheduleService } from '../services/scheduleService';
import { transactionService } from '../services/transactionService';
import { classLabel, formatDate, formatDateTime, formatCurrency } from '../utils/format';
import type {
  Customer,
  CustomerActivity,
  CustomerStatus,
  ScheduleResponse,
  TransactionResponse,
} from '../types';
import {
  CUSTOMER_LOSABLE_STATUSES,
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_STATUS_ORDER,
  CUSTOMER_STATUS_VARIANT,
  getCustomerStatus,
  getUserRefId,
  getUserRefName,
  getSchoolName,
} from '../types';
import { SCHEDULE_CANCELLED_LABEL, isScheduleCancelled } from '../utils/scheduleConstants';
import { contractChanges } from '../utils/contractChanges';
import {
  Badge,
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  PageLoader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Textarea,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import { ContractDialog, CustomerStatusDialog } from '../components/organisms';
import CustomerFormDialog from '../components/organisms/CustomerFormDialog';
import { useAuth } from '../context/AuthContext';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchPackages } from '../store/slices/packagesSlice';
import { fetchPhotographers, fetchSales } from '../store/slices/usersSlice';
import { cn } from '@/lib/utils';

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
    <CardContent className="flex items-center gap-3 px-4 py-3.5 md:gap-4 md:p-5">
      <div
        className={cn(
          'flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] md:h-9 md:w-9',
          tile,
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('font-display text-[19px] font-bold tabular md:text-2xl', valueClass)}>
          {value}
        </p>
      </div>
    </CardContent>
  </Card>
);

const getApiErrorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

const StatusBadge = ({ status, className }: { status: CustomerStatus; className?: string }) => (
  <Badge
    variant={CUSTOMER_STATUS_VARIANT[status]}
    dot
    className={cn('whitespace-nowrap', className)}
  >
    {CUSTOMER_STATUS_LABELS[status]}
  </Badge>
);

/** Compact 8-step pipeline progress. `lost` greys the whole track out. */
const StatusProgress = ({ status }: { status: CustomerStatus }) => {
  const lost = status === 'lost';
  const currentIdx = lost ? -1 : CUSTOMER_STATUS_ORDER.indexOf(status);
  return (
    <div className={cn(lost && 'opacity-50')}>
      <ol className="grid grid-cols-8 gap-1">
        {CUSTOMER_STATUS_ORDER.map((st, i) => {
          const done = i < currentIdx;
          const current = i === currentIdx;
          return (
            <li key={st} className="flex min-w-0 flex-col items-center text-center">
              <div className="flex w-full items-center">
                <span
                  className={cn(
                    'h-0.5 flex-1 rounded-full',
                    i === 0 ? 'opacity-0' : i <= currentIdx ? 'bg-primary' : 'bg-border',
                  )}
                />
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold tabular transition-colors',
                    done && 'border-primary bg-primary text-primary-foreground',
                    current &&
                      'border-primary bg-primary/15 text-primary-700 ring-4 ring-primary/15 dark:text-primary',
                    !done && !current && 'border-border bg-card text-muted-foreground',
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span
                  className={cn(
                    'h-0.5 flex-1 rounded-full',
                    i === CUSTOMER_STATUS_ORDER.length - 1
                      ? 'opacity-0'
                      : i < currentIdx
                        ? 'bg-primary'
                        : 'bg-border',
                  )}
                />
              </div>
              <span
                className={cn(
                  'mt-1.5 hidden text-[11px] leading-tight sm:block',
                  current ? 'font-semibold text-foreground' : 'text-muted-foreground',
                )}
              >
                {CUSTOMER_STATUS_LABELS[st]}
              </span>
            </li>
          );
        })}
      </ol>
      {!lost && (
        <p className="mt-2 text-xs text-muted-foreground sm:hidden">
          Bước {currentIdx + 1}/{CUSTOMER_STATUS_ORDER.length}:{' '}
          <span className="font-semibold text-foreground">{CUSTOMER_STATUS_LABELS[status]}</span>
        </p>
      )}
    </div>
  );
};

/** Mobile pipeline progress: step counter, 8 segment bars and the upcoming steps. */
const StatusSegments = ({ status }: { status: CustomerStatus }) => {
  const lost = status === 'lost';
  const currentIdx = lost ? -1 : CUSTOMER_STATUS_ORDER.indexOf(status);
  const upcoming = lost ? [] : CUSTOMER_STATUS_ORDER.slice(currentIdx + 1);
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        {!lost && (
          <span className="text-xs font-semibold text-muted-foreground tabular">
            Bước {currentIdx + 1}/{CUSTOMER_STATUS_ORDER.length}
          </span>
        )}
        <StatusBadge status={status} />
      </div>
      <div className={cn('flex gap-1', lost && 'opacity-50')}>
        {CUSTOMER_STATUS_ORDER.map((st, i) => (
          <span
            key={st}
            className={cn(
              'h-1.5 flex-1 rounded-[3px]',
              i <= currentIdx ? 'bg-primary' : 'bg-muted',
            )}
          />
        ))}
      </div>
      {upcoming.length > 0 && (
        <p className="truncate text-[12.5px] text-muted-foreground">
          Tiếp theo:{' '}
          <span className="font-medium text-foreground">
            {upcoming
              .slice(0, 3)
              .map((st) => CUSTOMER_STATUS_LABELS[st])
              .join(' → ')}
            {upcoming.length > 3 ? ' …' : ''}
          </span>
        </p>
      )}
    </div>
  );
};

const ACTIVITY_ICON: Record<CustomerActivity['kind'], { icon: ReactNode; tile: string }> = {
  status: {
    icon: <ArrowRight className="h-3.5 w-3.5" />,
    tile: 'bg-primary-100 text-primary-700 dark:bg-primary/15 dark:text-primary',
  },
  note: {
    icon: <MessageSquare className="h-3.5 w-3.5" />,
    tile: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  },
  system: {
    icon: <Sparkles className="h-3.5 w-3.5" />,
    tile: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  },
};

const ActivityTimeline = ({ activities }: { activities: CustomerActivity[] }) => {
  if (activities.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Chưa có hoạt động nào.</p>;
  }
  return (
    <ol className="relative space-y-5 before:absolute before:bottom-2 before:left-[13px] before:top-2 before:w-px before:bg-border">
      {activities.map((a) => {
        const meta = ACTIVITY_ICON[a.kind] ?? ACTIVITY_ICON.note;
        const author = getUserRefName(a.createdBy);
        return (
          <li key={a._id} className="relative flex gap-3">
            <span
              className={cn(
                'relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-4 ring-card',
                meta.tile,
              )}
            >
              {meta.icon}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {a.kind === 'status' && a.toStatus ? (
                  <>
                    {a.fromStatus && <StatusBadge status={a.fromStatus} />}
                    {a.fromStatus && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
                    <StatusBadge status={a.toStatus} />
                  </>
                ) : a.kind === 'system' ? (
                  <span className="text-sm font-semibold text-foreground">Hệ thống</span>
                ) : (
                  <span className="text-sm font-semibold text-foreground">Ghi chú</span>
                )}
                {a.kind === 'system' && a.toStatus && <StatusBadge status={a.toStatus} />}
              </div>
              {a.note && (
                <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-foreground/90">
                  {a.note}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {author ?? 'Hệ thống'} · {formatDateTime(a.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
};

/** Contract can be prepared any time before the shoot (deposit may still be missing). */
const CONTRACT_STATUSES: CustomerStatus[] = [
  'new',
  'contacting',
  'contacted',
  'deposited',
  'scheduled',
];

const cardTile =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] [&_svg]:h-4 [&_svg]:w-4';

/** Muted dashed placeholder card ("Chưa có …") when the user can't act on it. */
const EmptyLinkCard = ({ icon, label }: { icon: ReactNode; label: string }) => (
  <div className="flex items-center gap-3 rounded-[12px] border border-dashed bg-card px-3 py-2.5 text-sm">
    <span className={cn(cardTile, 'bg-muted text-muted-foreground')}>{icon}</span>
    <span className="min-w-0 flex-1 truncate text-muted-foreground">{label}</span>
  </div>
);

/** Small "Mở ↗" label used as a stretched link (the whole card opens the target). */
const OpenLink = ({ href }: { href: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="flex shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground after:absolute after:inset-0 after:rounded-[12px]"
  >
    Mở <ExternalLink className="h-3.5 w-3.5" />
  </a>
);

/** "Folder ảnh" card of the class: open link, or "Tạo folder" when the class has none yet. */
const DriveCard = ({
  customer,
  canCreate,
  onCreated,
}: {
  customer: Customer;
  canCreate: boolean;
  onCreated: (customer: Customer) => void;
}) => {
  const [creating, setCreating] = useState(false);
  if (customer.driveFolderUrl) {
    return (
      <div className="relative flex items-center gap-3 rounded-[12px] border bg-card px-3 py-2.5 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5">
        <span className={cn(cardTile, 'bg-amber-500/15 text-amber-700 dark:text-amber-300')}>
          <FolderOpen />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-foreground">Folder ảnh</span>
          <span className="block truncate text-xs text-muted-foreground">
            Google Drive · lớp {customer.className}
          </span>
        </span>
        <OpenLink href={customer.driveFolderUrl} />
      </div>
    );
  }
  const create = async () => {
    setCreating(true);
    try {
      onCreated(await customerService.createDriveFolder(customer._id));
      toast.success('Đã tạo folder Drive');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Không tạo được folder Drive.'));
    } finally {
      setCreating(false);
    }
  };
  return (
    <div className="flex items-center gap-3 rounded-[12px] border bg-card px-3 py-2.5 text-sm">
      <span className={cn(cardTile, 'bg-muted text-muted-foreground')}>
        <FolderPlus />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-foreground">Chưa có folder</span>
        <span className="block truncate text-xs text-muted-foreground">
          Tạo folder Google Drive cho lớp
        </span>
      </span>
      {canCreate && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 shrink-0 px-3"
          disabled={creating}
          onClick={create}
        >
          {creating ? <Spinner size="sm" /> : <FolderPlus />} Tạo folder
        </Button>
      )}
    </div>
  );
};

/**
 * "Hợp đồng" card of the class (next to Folder Drive): open link + deposit sync state,
 * or a highlighted "Chưa có hợp đồng" card with a create button.
 */
const ContractCard = ({
  customer,
  canCreate,
  createHint,
  onCreate,
  canRegenerate,
  onRegenerate,
  canSync,
  onSynced,
  onUpdate,
}: {
  customer: Customer;
  canCreate: boolean;
  createHint: string;
  onCreate: () => void;
  /** Admin-only "Tạo lại" (overwrites the existing contract). */
  canRegenerate: boolean;
  onRegenerate: () => void;
  canSync: boolean;
  onSynced: (customer: Customer) => void;
  /** "Cập nhật hợp đồng" — re-render the same doc; shown to class managers when the doc id is known. */
  onUpdate: () => void;
}) => {
  const [syncing, setSyncing] = useState(false);
  const contract = customer.contract;
  if (!contract?.url) {
    if (!canCreate) return <EmptyLinkCard icon={<FileText />} label="Chưa có hợp đồng" />;
    return (
      <div className="flex items-center gap-3 rounded-[12px] border border-primary/60 bg-primary-100 px-3 py-2.5 text-sm dark:bg-primary/15">
        <span className={cn(cardTile, 'bg-card text-primary-700 shadow-sm dark:text-primary')}>
          <FilePlus />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-foreground">Chưa có hợp đồng</span>
          <span className="block text-xs text-muted-foreground">{createHint}</span>
        </span>
        <Button size="sm" className="h-8 shrink-0 px-3" onClick={onCreate}>
          <Plus /> Tạo
        </Button>
      </div>
    );
  }
  // Legacy contracts (created before named ranges) have no doc id and never auto-sync.
  const legacy = !contract.docId;
  const canUpdate = canSync && !legacy;
  const printed = contract.depositAmount ?? null;
  const deposit =
    customer.deposit?.amount && customer.deposit.amount > 0 ? customer.deposit.amount : null;
  // Waiting for the class deposit / printed amount matches / differs from the class deposit
  const state =
    deposit === null && printed === null ? 'pending' : printed === deposit ? 'synced' : 'mismatch';
  const syncNow = async () => {
    setSyncing(true);
    try {
      onSynced(await customerService.syncContractDeposit(customer._id));
      toast.success('Đã cập nhật tiền cọc trên hợp đồng');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Không cập nhật được tiền cọc trên hợp đồng.'));
    } finally {
      setSyncing(false);
    }
  };
  return (
    <div className="relative flex items-center gap-3 rounded-[12px] border bg-card px-3 py-2.5 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5">
      <span className={cn(cardTile, 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300')}>
        <FileText />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-foreground">Hợp đồng</span>
        {legacy ? (
          <span className="block truncate text-xs text-muted-foreground">
            Hợp đồng cũ · không tự cập nhật cọc
          </span>
        ) : state === 'synced' ? (
          <span className="flex items-start gap-1 text-xs text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
            {contract.depositSyncedAt
              ? `Tiền cọc đã cập nhật ${formatDate(contract.depositSyncedAt)}`
              : 'Đã điền tiền cọc'}
          </span>
        ) : state === 'pending' ? (
          <span className="flex items-center gap-1 truncate text-xs text-primary-700 dark:text-primary">
            <Clock className="h-3 w-3 shrink-0" />
            Tiền cọc: chờ cập nhật
          </span>
        ) : (
          <span className="flex flex-wrap items-center gap-x-1 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            Tiền cọc chưa khớp hợp đồng
            {canSync && (
              <>
                {' · '}
                <button
                  type="button"
                  disabled={syncing}
                  onClick={syncNow}
                  className="relative z-10 font-semibold underline-offset-2 hover:underline disabled:opacity-60"
                >
                  {syncing ? 'Đang cập nhật…' : 'Cập nhật lại'}
                </button>
              </>
            )}
          </span>
        )}
      </span>
      <OpenLink href={contract.url} />
      {(canRegenerate || canUpdate) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Thao tác hợp đồng"
              className="relative z-10 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {canUpdate && (
              <DropdownMenuItem onSelect={onUpdate} className="items-start gap-2.5 py-2">
                <FilePen className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <span className="block font-medium">Cập nhật hợp đồng</span>
                  <span className="block text-xs text-muted-foreground">
                    Điền lại theo thông tin lớp · giữ nguyên link
                  </span>
                </span>
              </DropdownMenuItem>
            )}
            {canRegenerate && (
              <DropdownMenuItem onSelect={onRegenerate} className="items-start gap-2.5 py-2">
                <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <span className="block font-medium">Tạo lại hợp đồng</span>
                  <span className="block text-xs text-muted-foreground">
                    Chỉ admin · tạo file mới thay thế
                  </span>
                </span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

const CustomerDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const seasons = useAppSelector((st) => st.seasons.list);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [activities, setActivities] = useState<CustomerActivity[]>([]);
  const [statusTarget, setStatusTarget] = useState<CustomerStatus | null>(null);
  // Contract dialog: closed / create / admin "Tạo lại"
  const [contractMode, setContractMode] = useState<'create' | 'regenerate' | 'update' | null>(null);
  const [regenerateConfirm, setRegenerateConfirm] = useState(false);
  const [updateConfirm, setUpdateConfirm] = useState(false);
  const packages = useAppSelector((st) => st.packages.list);
  const [noteOpen, setNoteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // Id of the class currently shown — responses for any other id are stale and ignored.
  const currentIdRef = useRef(id);
  // Delayed refetch after a deposit change (the contract doc is re-filled in the background)
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const loadActivities = useCallback(() => {
    if (!id) return;
    customerService
      .getActivities(id)
      .then((list) => {
        if (currentIdRef.current === id) setActivities(list);
      })
      .catch(() => {
        if (currentIdRef.current === id) setActivities([]);
      });
  }, [id]);

  const load = useCallback(() => {
    if (!id) return;
    Promise.all([
      customerService.getOne(id),
      // Include cancelled schedules so the class history shows them (marked "Đã huỷ")
      scheduleService.getAll({ customer: id, limit: 100, includeCancelled: 'true' }),
      transactionService.getAll({ customer: id, limit: 100 }),
    ])
      .then(([c, s, t]) => {
        if (currentIdRef.current !== id) return;
        setCustomer(c);
        setSchedules(s.data);
        setTransactions(t.data);
        setLoadError(false);
      })
      .catch(() => {
        if (currentIdRef.current !== id) return;
        setLoadError(true);
        toast.error('Không tải được thông tin lớp.');
      });
    loadActivities();
  }, [id, loadActivities]);

  useEffect(() => {
    // Switching /customers/A → /customers/B: drop A's data before loading B.
    currentIdRef.current = id;
    setCustomer(null);
    setSchedules([]);
    setTransactions([]);
    setActivities([]);
    setLoadError(false);
    setStatusTarget(null);
    setContractMode(null);
    setRegenerateConfirm(false);
    setNoteOpen(false);
    setEditOpen(false);
    load();
  }, [id, load]);

  useEffect(() => () => clearTimeout(refetchTimerRef.current), [id]);

  useEffect(() => {
    dispatch(fetchPackages());
    dispatch(fetchPhotographers());
    dispatch(fetchSales());
  }, [dispatch]);

  if (!customer) {
    if (!loadError) return <PageLoader />;
    return (
      <div className="space-y-4">
        <Link
          to="/customers"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Danh sách lớp
        </Link>
        <Card className="rounded-[14px] shadow-none">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <XCircle className="h-8 w-8 text-rose-500" />
            <p className="text-sm text-muted-foreground">
              Không tải được thông tin lớp. Lớp có thể đã bị xoá hoặc kết nối gặp sự cố.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setLoadError(false);
                load();
              }}
            >
              Thử lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Pipeline permissions (mirror backend rules; backend stays authoritative) ---
  const status = getCustomerStatus(customer);
  const roles = user?.roles ?? [];
  const userId = user?._id ?? null;
  const isAdmin = roles.includes(0) || roles.includes(1);
  const isSaleRole = roles.includes(2) || roles.includes(4);
  const assignedId = getUserRefId(customer.assignedSale);
  const saleName = getUserRefName(customer.assignedSale);
  const isAssigned = !!userId && assignedId === userId;
  const isClassPhotographer =
    (roles.includes(3) || roles.includes(6)) &&
    schedules.some(
      (s) =>
        s.leadPhotographer?._id === userId ||
        s.supportPhotographers.some((u) => u._id === userId) ||
        s.videographer?._id === userId,
    );
  const orderIdx = CUSTOMER_STATUS_ORDER.indexOf(status as (typeof CUSTOMER_STATUS_ORDER)[number]);
  const nextStatus: CustomerStatus | null =
    orderIdx >= 0 && orderIdx < CUSTOMER_STATUS_ORDER.length - 1
      ? CUSTOMER_STATUS_ORDER[orderIdx + 1]
      : null;
  // A sale can claim an unassigned class while it is still in new/contacting/contacted
  // (the backend assigns them on the transition).
  const canClaim = isSaleRole && !assignedId && CUSTOMER_LOSABLE_STATUSES.includes(status);
  const canAdvance =
    !!nextStatus &&
    (isAdmin || isAssigned || canClaim || (status === 'scheduled' && isClassPhotographer));
  const canLose = CUSTOMER_LOSABLE_STATUSES.includes(status) && (isAdmin || isAssigned || canClaim);
  const canNote = isAdmin || isAssigned || (!assignedId && isSaleRole);

  // Cancelled schedules don't count: the main schedule is the first non-cancelled one.
  const activeSchedules = schedules.filter((s) => !isScheduleCancelled(s));
  const mainSchedule = activeSchedules[0] ?? null;
  const contractStale = customer ? contractChanges(customer, mainSchedule) : [];
  // Mirrors backend customerContractController: admin / kế toán / sale phụ trách lớp
  const canManageClass = isAdmin || roles.includes(5) || canNote;
  const canCreateContract = canManageClass && (isAdmin || CONTRACT_STATUSES.includes(status));
  const showLinks = !!customer.contract?.url || !!customer.driveFolderUrl || status !== 'lost';
  const patchCustomer = (updated: Customer) => setCustomer(updated);
  const feedbackUrl = `${window.location.origin}/feedback/${customer._id}`;

  const submitNote = async () => {
    if (!noteText.trim()) {
      toast.error('Vui lòng nhập ghi chú.');
      return;
    }
    setNoteSaving(true);
    try {
      await customerService.addNote(customer._id, noteText.trim());
      toast.success('Đã thêm ghi chú.');
      setNoteOpen(false);
      setNoteText('');
      loadActivities();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Thêm ghi chú thất bại, vui lòng thử lại.'));
    } finally {
      setNoteSaving(false);
    }
  };

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  const profit = totalIncome - totalExpense;
  const seasonName = seasons.find((se) => se._id === customer.season)?.name;
  /** Prefill for SchedulesPage's create modal (label matches its class Combobox options). */
  const createScheduleState = {
    openCreate: true,
    customer: {
      _id: customer._id,
      label: classLabel(customer),
      season: customer.season ?? null,
      expectedShootDate: customer.expectedShootDate ?? null,
    },
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex items-center gap-3 max-md:order-none">
        <Link
          to="/customers"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Danh sách lớp
        </Link>
      </div>

      <div className="max-md:contents md:grid md:gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="rounded-[14px] shadow-none max-md:order-1">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start gap-3.5 md:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-primary-100 font-display text-sm font-bold text-primary-700 dark:bg-primary/15 dark:text-primary md:h-14 md:w-14 md:rounded-[14px] md:text-base">
                {customer.className}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-[21px] font-bold tracking-tight md:text-2xl">
                    Lớp {customer.className}
                  </h2>
                  <StatusBadge status={status} className="max-md:hidden" />
                </div>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <School className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {getSchoolName(customer)}
                    {seasonName ? ` · ${seasonName}` : ''}
                  </span>
                </p>
                <StatusBadge status={status} className="mt-2 md:hidden" />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-auto hidden shrink-0 md:inline-flex"
                onClick={() => setEditOpen(true)}
              >
                <Pencil /> Sửa
              </Button>
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
              <Fact icon={<UserCheck className="h-3.5 w-3.5" />} label="Sale phụ trách">
                {saleName ?? <span className="font-normal text-muted-foreground">Chưa có</span>}
              </Fact>
              <Fact icon={<Sparkles className="h-3.5 w-3.5" />} label="Nguồn khách">
                {customer.source || <span className="font-normal text-muted-foreground">—</span>}
              </Fact>
              <Fact icon={<CalendarClock className="h-3.5 w-3.5" />} label="Ngày dự kiến chụp">
                {customer.expectedShootDate ? (
                  <span className="tabular">{formatDate(customer.expectedShootDate)}</span>
                ) : (
                  <span className="font-normal text-muted-foreground">—</span>
                )}
              </Fact>
              {customer.deposit && customer.deposit.amount > 0 && (
                <Fact icon={<Wallet className="h-3.5 w-3.5" />} label="Tiền cọc">
                  <span className="tabular">
                    {formatCurrency(customer.deposit.amount)}
                    {customer.deposit.date ? ` · ${formatDate(customer.deposit.date)}` : ''}
                  </span>
                </Fact>
              )}
            </div>
            {customer.notes && (
              <p className="mt-4 flex items-start gap-2 rounded-[10px] bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                <StickyNote className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{customer.notes}</span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Mobile quick actions */}
        <div className="grid grid-cols-2 gap-3 max-md:order-2 md:hidden">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil /> Sửa
          </Button>
          <Button asChild>
            <Link to="/schedules" state={createScheduleState}>
              <CalendarPlus /> Thêm lịch
            </Link>
          </Button>
        </div>

        {/* Finance summary */}
        <div className="grid gap-3 max-md:order-5 sm:grid-cols-3 lg:grid-cols-1">
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

      {/* Pipeline */}
      <div className="max-md:contents md:grid md:gap-4 lg:grid-cols-[1fr_380px]">
        <Card className="rounded-[14px] shadow-none max-md:order-3">
          <CardContent className="space-y-4 p-4 md:space-y-5 md:p-6">
            <div className="flex items-start justify-between gap-2 md:flex-wrap md:items-center">
              <div className="min-w-0 md:contents">
                <h3 className="font-display text-base font-bold tracking-tight md:text-lg">
                  Quy trình chăm sóc
                </h3>
                {customer.statusChangedAt && (
                  <span className="text-xs text-muted-foreground max-md:mt-0.5 max-md:block">
                    Cập nhật {formatDateTime(customer.statusChangedAt)}
                  </span>
                )}
              </div>
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-muted-foreground shadow-none md:hidden"
                      aria-label="Đặt trạng thái (admin)"
                      title="Đặt trạng thái (admin)"
                    >
                      <SlidersHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {CUSTOMER_STATUSES.filter((st) => st !== status).map((st) => (
                      <DropdownMenuItem key={st} onSelect={() => setStatusTarget(st)}>
                        {CUSTOMER_STATUS_LABELS[st]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <div className="max-md:hidden">
              <StatusProgress status={status} />
            </div>
            <div className="md:hidden">
              <StatusSegments status={status} />
            </div>

            {status === 'lost' && (
              <div className="flex items-start gap-2.5 rounded-[12px] border border-rose-500/30 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-800 dark:text-rose-200">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold">Không chốt</p>
                  {customer.lostReason && (
                    <p className="mt-0.5 whitespace-pre-wrap break-words opacity-90">
                      Lý do: {customer.lostReason}
                    </p>
                  )}
                </div>
              </div>
            )}

            {status === 'deposited' && !mainSchedule && (
              <div className="flex flex-col gap-3 rounded-[12px] border border-amber-500/30 bg-amber-500/10 px-4 py-3.5 sm:flex-row sm:items-center">
                <p className="min-w-0 flex-1 text-sm text-amber-900 dark:text-amber-200">
                  Lớp chưa có lịch chụp — tạo lịch chụp cho lớp này.
                </p>
                <Button variant="outline" asChild>
                  <Link to="/schedules" state={createScheduleState}>
                    <CalendarPlus /> Tạo lịch chụp
                  </Link>
                </Button>
              </div>
            )}

            {status === 'done' && (
              <div className="rounded-[12px] border bg-muted/40 px-4 py-3.5">
                <p className="text-sm font-semibold text-foreground">Link form feedback của lớp</p>
                <div className="mt-2 flex items-center gap-2">
                  <a
                    href={feedbackUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 truncate text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                    title={feedbackUrl}
                  >
                    {feedbackUrl}
                  </a>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(feedbackUrl);
                      toast.success('Đã copy link feedback!');
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </Button>
                </div>
              </div>
            )}

            {showLinks && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <DriveCard
                  customer={customer}
                  canCreate={canManageClass}
                  onCreated={patchCustomer}
                />
                <ContractCard
                  customer={customer}
                  canCreate={canCreateContract}
                  createHint={
                    status === 'deposited'
                      ? `Tạo hợp đồng xong lớp tự chuyển “${CUSTOMER_STATUS_LABELS.scheduled}”`
                      : 'Tạo được ngay từ thông tin lớp'
                  }
                  onCreate={() => setContractMode('create')}
                  canRegenerate={isAdmin}
                  onRegenerate={() => setRegenerateConfirm(true)}
                  canSync={canManageClass}
                  onSynced={patchCustomer}
                  onUpdate={() => setUpdateConfirm(true)}
                />
              </div>
            )}
            {showLinks &&
              canManageClass &&
              customer.contract?.docId &&
              contractStale.length > 0 && (
                <div className="flex flex-col gap-2.5 rounded-[12px] border border-amber-500/40 bg-amber-500/10 px-3.5 py-2.5 text-sm sm:flex-row sm:items-center">
                  <AlertTriangle className="hidden h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300 sm:block" />
                  <span className="min-w-0 flex-1 text-amber-800 dark:text-amber-200">
                    <span className="font-semibold">Hợp đồng chưa khớp thông tin lớp</span>
                    <span className="text-amber-700/90 dark:text-amber-300/90">
                      {' · '}
                      {contractStale.join(', ')} đã thay đổi
                    </span>
                  </span>
                  <Button size="sm" className="h-8 shrink-0" onClick={() => setUpdateConfirm(true)}>
                    <RefreshCw /> Cập nhật hợp đồng
                  </Button>
                </div>
              )}

            {(canAdvance || canLose || canNote || isAdmin) && (
              <div
                className={cn(
                  'grid grid-cols-2 gap-2 border-t pt-4 md:flex md:flex-wrap md:items-center',
                  !(canAdvance || canLose || canNote) && 'max-md:hidden',
                )}
              >
                {canAdvance && nextStatus && (
                  <Button
                    className="col-span-2 max-md:h-11 max-md:whitespace-normal"
                    onClick={() => setStatusTarget(nextStatus)}
                  >
                    {`${canClaim && !isAdmin ? 'Nhận lớp & chuyển sang' : 'Chuyển sang'}: ${CUSTOMER_STATUS_LABELS[nextStatus]}`}
                    <ArrowRight />
                  </Button>
                )}
                {canLose && (
                  <Button
                    variant="outline"
                    className={cn(
                      'text-rose-600 hover:border-rose-500/40 hover:bg-rose-500/10 dark:text-rose-400',
                      !canNote && 'max-md:col-span-2',
                    )}
                    onClick={() => setStatusTarget('lost')}
                  >
                    <CircleSlash /> Không chốt
                  </Button>
                )}
                {canNote && (
                  <Button
                    variant="outline"
                    className={cn(!canLose && 'max-md:col-span-2')}
                    onClick={() => setNoteOpen(true)}
                  >
                    <MessageSquarePlus /> Thêm ghi chú
                  </Button>
                )}
                {isAdmin && (
                  <Select value="" onValueChange={(v) => setStatusTarget(v as CustomerStatus)}>
                    <SelectTrigger className="h-[38px] w-auto min-w-[200px] gap-2 rounded-[10px] border-border bg-card shadow-none max-md:hidden sm:ml-auto">
                      <Settings2 className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Đặt trạng thái (admin)" />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOMER_STATUSES.filter((st) => st !== status).map((st) => (
                        <SelectItem key={st} value={st}>
                          {CUSTOMER_STATUS_LABELS[st]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity timeline */}
        <Card className="rounded-[14px] shadow-none max-md:order-4">
          <CardContent className="p-4 md:p-6">
            <h3 className="mb-4 flex items-center gap-2 font-display text-base font-bold tracking-tight md:text-lg">
              <History className="h-4 w-4 text-muted-foreground" />
              Nhật ký
            </h3>
            <div className="md:max-h-[520px] md:overflow-y-auto md:pr-1">
              <ActivityTimeline activities={activities} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedules — mobile card list */}
      <section className="space-y-2.5 max-md:order-6 md:hidden">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold text-foreground">Lịch chụp</h3>
          <span className="text-[12.5px] text-muted-foreground">{schedules.length} buổi</span>
        </div>
        {schedules.length === 0 ? (
          <Card className="rounded-[14px] shadow-none">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Chưa có lịch
            </CardContent>
          </Card>
        ) : (
          schedules.map((s) => {
            const d = new Date(s.shootDate);
            return (
              <Card
                key={s._id}
                className={cn('rounded-[14px] shadow-none', isScheduleCancelled(s) && 'opacity-60')}
              >
                <CardContent className="flex gap-3.5 p-3.5">
                  <div className="flex h-[52px] w-12 shrink-0 flex-col items-center justify-center rounded-[10px] border bg-muted">
                    <span className="text-[10px] font-bold leading-tight text-primary-700 dark:text-primary">
                      TH{String(d.getMonth() + 1).padStart(2, '0')}
                    </span>
                    <span className="font-display text-[19px] font-bold leading-tight tabular text-foreground">
                      {String(d.getDate()).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 space-y-[5px]">
                    <p className="truncate">
                      <span className="text-sm font-semibold text-foreground">
                        {s.package?.name ?? 'Chưa chọn gói'}
                      </span>
                      {s.package && (
                        <span className="ml-1.5 text-xs text-muted-foreground tabular">
                          · {formatCurrency(s.package.pricePerMember)}/thành viên
                        </span>
                      )}
                    </p>
                    <p className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-muted-foreground">
                      <Clock className="h-[13px] w-[13px] shrink-0" />
                      <span className="shrink-0 tabular">
                        {s.startTime}
                        {s.endTime ? ` – ${s.endTime}` : ''}
                      </span>
                      {s.location && (
                        <>
                          <span className="shrink-0">·</span>
                          <MapPin className="h-[13px] w-[13px] shrink-0" />
                          <span className="truncate">{s.location}</span>
                        </>
                      )}
                    </p>
                    {/* Class status is already shown in the page header — only flag cancelled */}
                    {isScheduleCancelled(s) && (
                      <Badge variant="danger" dot>
                        {SCHEDULE_CANCELLED_LABEL}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </section>

      {/* Schedules */}
      <div className="max-md:hidden">
        <DataTable<ScheduleResponse>
          title="Lịch chụp"
          data={schedules}
          keyExtractor={(s) => s._id}
          emptyTitle="Chưa có lịch"
          rowClassName={(s) => (isScheduleCancelled(s) ? 'opacity-60' : '')}
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
                  {s.leadPhotographer?.name ??
                    s.leadPhotographer?.username ??
                    (s.externalCrew ?? []).find((entry) => entry.role === 'lead')?.photographer
                      ?.name ??
                    '—'}
                  {!s.leadPhotographer &&
                    (s.externalCrew ?? []).some((entry) => entry.role === 'lead') && (
                      <span className="ml-1 text-xs text-sky-600 dark:text-sky-300">Ngoài</span>
                    )}
                  {s.supportPhotographers.length +
                    (s.externalCrew ?? []).filter((entry) => entry.role === 'support').length >
                    0 && (
                    <span className="ml-1 text-xs text-muted-foreground/70">
                      (+
                      {s.supportPhotographers.length +
                        (s.externalCrew ?? []).filter((entry) => entry.role === 'support').length}
                      )
                    </span>
                  )}
                  {(s.videographer ||
                    (s.externalCrew ?? []).some(
                      (entry) => entry.role === 'video' && entry.photographer,
                    )) && (
                    <span className="ml-1.5 inline-flex items-center gap-1 text-xs">
                      <Video className="h-3 w-3 text-primary" />
                      {s.videographer?.name ??
                        s.videographer?.username ??
                        (s.externalCrew ?? []).find((entry) => entry.role === 'video')?.photographer
                          ?.name}
                    </span>
                  )}
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Trạng thái',
              render: (s) =>
                isScheduleCancelled(s) ? (
                  <Badge variant="danger" dot>
                    {SCHEDULE_CANCELLED_LABEL}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                ),
            } satisfies Column<ScheduleResponse>,
          ]}
        />
      </div>

      {/* Transactions — mobile list */}
      <section className="space-y-2.5 max-md:order-7 md:hidden">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold text-foreground">Giao dịch</h3>
          <span className="text-[12.5px] text-muted-foreground">
            {transactions.length} giao dịch
          </span>
        </div>
        <Card className="rounded-[14px] shadow-none">
          {transactions.length === 0 ? (
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Chưa có giao dịch
            </CardContent>
          ) : (
            <ul className="divide-y px-3.5 py-0.5">
              {transactions.map((t) => {
                const income = t.type === 'income';
                return (
                  <li key={t._id} className="flex items-center gap-3 py-3">
                    <span
                      className={cn(
                        'flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px]',
                        income
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
                      )}
                    >
                      {income ? (
                        <ArrowDownLeft className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1 space-y-[3px]">
                      <p className="truncate text-[13.5px] font-semibold text-foreground">
                        {t.description || '—'}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDate(t.date)}
                        {t.categoryId?.name ? ` · ${t.categoryId.name}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={cn(
                          'text-[13.5px] font-bold tabular',
                          income
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400',
                        )}
                      >
                        {income ? '+' : '−'}
                        {formatCurrency(t.amount)}
                      </span>
                      <Badge variant={income ? 'success' : 'danger'}>
                        {income ? 'Thu' : 'Chi'}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>

      {/* Transactions */}
      <div className="max-md:hidden">
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

      <CustomerStatusDialog
        customer={customer}
        target={statusTarget}
        hasSchedule={activeSchedules.length > 0}
        isAdmin={isAdmin}
        onClose={() => setStatusTarget(null)}
        onChanged={() => {
          load();
          if (statusTarget === 'deposited') {
            clearTimeout(refetchTimerRef.current);
            refetchTimerRef.current = setTimeout(load, 4000);
          }
        }}
      />

      <CustomerFormDialog
        customer={customer}
        open={editOpen}
        isAdmin={isAdmin}
        onOpenChange={setEditOpen}
        onSaved={load}
      />

      <ContractDialog
        customer={contractMode ? customer : null}
        schedule={mainSchedule}
        packages={packages}
        seasonName={seasons.find((se) => se._id === customer.season)?.name}
        regenerate={contractMode === 'regenerate'}
        update={contractMode === 'update'}
        onClose={() => setContractMode(null)}
        onSaved={(updated) => {
          setCustomer(updated);
          loadActivities();
        }}
      />

      <ConfirmDialog
        open={updateConfirm}
        onOpenChange={setUpdateConfirm}
        title="Cập nhật hợp đồng?"
        message="File hợp đồng hiện tại (giữ nguyên link) sẽ được điền lại từ mẫu theo thông tin lớp mới nhất. Chỉnh sửa tay trong file sẽ bị thay thế — Google Docs vẫn lưu lịch sử phiên bản."
        confirmLabel="Tiếp tục"
        onConfirm={() => {
          setUpdateConfirm(false);
          setContractMode('update');
        }}
      />

      <ConfirmDialog
        open={regenerateConfirm}
        onOpenChange={setRegenerateConfirm}
        title="Tạo lại hợp đồng?"
        message="Hợp đồng mới sẽ thay thế hợp đồng hiện tại của lớp. Link hợp đồng cũ được lưu trong nhật ký lớp."
        confirmLabel="Tạo lại"
        onConfirm={() => {
          setRegenerateConfirm(false);
          setContractMode('regenerate');
        }}
      />

      <Dialog
        open={noteOpen}
        onOpenChange={(o) => {
          if (!o) setNoteOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <div>
            <DialogTitle>Thêm ghi chú</DialogTitle>
            <DialogDescription className="mt-1">
              Lớp {customer.className}
              {getSchoolName(customer) ? ` — ${getSchoolName(customer)}` : ''}
            </DialogDescription>
          </div>
          <Textarea
            rows={4}
            autoFocus
            placeholder="Nội dung trao đổi, lưu ý…"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setNoteOpen(false)}>
              Huỷ
            </Button>
            <Button type="button" onClick={submitNote} disabled={noteSaving || !noteText.trim()}>
              {noteSaving ? 'Đang lưu...' : 'Lưu ghi chú'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerDetailPage;
