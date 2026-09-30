import { useEffect, useMemo, useState } from 'react';
import { CalendarRange, Pencil, Plus, Sun, Trash2 } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import { seasonService } from '../services/seasonService';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchSeasons } from '../store/slices/seasonsSlice';
import type { Season } from '../types';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  DatePicker,
  FormField,
  Input,
  Modal,
  PageHeader,
  TableSkeleton,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import { cn } from '@/lib/utils';

interface SeasonFormValues {
  name: string;
  startDate: string;
  endDate: string;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const toInputDate = (iso: string) => iso.slice(0, 10);

type SeasonStatus = 'current' | 'ended' | 'upcoming';

const getStatus = (s: Season, now: number): SeasonStatus => {
  const start = new Date(s.startDate).getTime();
  const end = new Date(s.endDate).getTime() + 24 * 3600 * 1000 - 1;
  if (now < start) return 'upcoming';
  if (now > end) return 'ended';
  return 'current';
};

const STATUS_BADGE: Record<
  SeasonStatus,
  { label: string; variant: 'success' | 'neutral' | 'info' }
> = {
  current: { label: 'Đang diễn ra', variant: 'success' },
  ended: { label: 'Đã kết thúc', variant: 'neutral' },
  upcoming: { label: 'Sắp tới', variant: 'info' },
};

const BAR_COLORS = [
  'bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-200',
  'bg-violet-100 text-violet-900 dark:bg-violet-500/20 dark:text-violet-200',
  'bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-200',
  'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200',
];

const CURRENT_BAR =
  'bg-primary-100 text-amber-900 ring-2 ring-primary dark:bg-primary/20 dark:text-amber-200';

const formatMonth = (t: number) => {
  const d = new Date(t);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const SeasonIcon = ({ status }: { status: SeasonStatus }) =>
  status === 'current' ? (
    <Sun className="h-4 w-4 shrink-0 text-primary-700 dark:text-primary" />
  ) : (
    <CalendarRange className="h-4 w-4 shrink-0 text-muted-foreground" />
  );

const SeasonTimeline = ({ seasons, now }: { seasons: Season[]; now: number }) => {
  const layout = useMemo(() => {
    if (seasons.length === 0) return null;
    const items = seasons
      .map((s) => ({
        s,
        start: new Date(s.startDate).getTime(),
        end: new Date(s.endDate).getTime(),
      }))
      .filter((i) => !Number.isNaN(i.start) && !Number.isNaN(i.end))
      .sort((a, b) => a.start - b.start);
    if (items.length === 0) return null;
    const min = Math.min(...items.map((i) => i.start));
    const max = Math.max(...items.map((i) => i.end));
    const span = Math.max(max - min, 1);
    // assign overlapping seasons to separate lanes
    const laneEnds: number[] = [];
    const placed = items.map((i, idx) => {
      let lane = laneEnds.findIndex((e) => e < i.start);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = i.end;
      return {
        ...i,
        idx,
        lane,
        left: ((i.start - min) / span) * 100,
        width: Math.max(((i.end - i.start) / span) * 100, 1.5),
      };
    });
    const ticks = Array.from({ length: 6 }, (_, k) => min + (span * k) / 5);
    return { placed, lanes: laneEnds.length, ticks, min, max, span };
  }, [seasons]);

  if (!layout) return null;
  const { placed, lanes, ticks, min, max, span } = layout;
  const yearFrom = new Date(min).getFullYear();
  const yearTo = new Date(max).getFullYear();

  return (
    <div className="mb-5 rounded-[14px] border bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-[15px] font-bold">
          Dòng thời gian {yearFrom === yearTo ? yearFrom : `${yearFrom} – ${yearTo}`}
        </h3>
        <span className="text-xs font-semibold text-primary-700 dark:text-primary">
          Hôm nay{' '}
          {new Date(now).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </span>
      </div>
      <div className="relative" style={{ height: lanes * 48 - 4 }}>
        {now >= min && now <= max && (
          <span
            aria-hidden
            className="absolute -bottom-1 -top-1 w-px bg-primary/60"
            style={{ left: `${((now - min) / span) * 100}%` }}
          />
        )}
        {placed.map((p) => (
          <div
            key={p.s._id}
            title={`${p.s.name}: ${formatDate(p.s.startDate)} – ${formatDate(p.s.endDate)}`}
            className={cn(
              'absolute flex h-11 items-center overflow-hidden rounded-[10px] px-3 text-[13px] font-semibold',
              getStatus(p.s, now) === 'current'
                ? CURRENT_BAR
                : BAR_COLORS[p.idx % BAR_COLORS.length],
            )}
            style={{
              left: `${p.left}%`,
              width: `calc(${p.width}% - 4px)`,
              top: p.lane * 48,
            }}
          >
            <span className="truncate">{p.s.name}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between text-[11px] text-muted-foreground tabular">
        {ticks.map((t, k) => (
          <span key={k}>{formatMonth(t)}</span>
        ))}
      </div>
    </div>
  );
};

const SeasonPage = () => {
  const dispatch = useAppDispatch();
  const { list: seasons, loading } = useAppSelector((s) => s.seasons);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Season | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const sorted = useMemo(
    () => [...seasons].sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [seasons],
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting, errors },
  } = useForm<SeasonFormValues>();

  useEffect(() => {
    dispatch(fetchSeasons());
  }, [dispatch]);

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', startDate: '', endDate: '' });
    setModalOpen(true);
  };

  const openEdit = (s: Season) => {
    setEditing(s);
    reset({
      name: s.name,
      startDate: toInputDate(s.startDate),
      endDate: toInputDate(s.endDate),
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: SeasonFormValues) => {
    try {
      if (editing) {
        await seasonService.update(editing._id, data);
        toast.success('Cập nhật mùa chụp thành công!');
      } else {
        await seasonService.create(data);
        toast.success('Thêm mùa chụp thành công!');
      }
      setModalOpen(false);
      dispatch(fetchSeasons());
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await seasonService.remove(confirmId);
      toast.success('Đã xoá mùa chụp.');
      dispatch(fetchSeasons());
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  const columns: Column<Season>[] = [
    {
      key: 'name',
      header: 'Tên mùa',
      render: (s) => (
        <span className="inline-flex items-center gap-3 font-semibold">
          <SeasonIcon status={getStatus(s, now)} />
          {s.name}
        </span>
      ),
    },
    {
      key: 'startDate',
      header: 'Ngày bắt đầu',
      render: (s) => <span className="text-muted-foreground">{formatDate(s.startDate)}</span>,
    },
    {
      key: 'endDate',
      header: 'Ngày kết thúc',
      render: (s) => <span className="text-muted-foreground">{formatDate(s.endDate)}</span>,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (s) => {
        const st = STATUS_BADGE[getStatus(s, now)];
        return (
          <Badge variant={st.variant} dot>
            {st.label}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      className: 'whitespace-nowrap',
      render: (s) => (
        <span className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-[30px] w-[30px] text-muted-foreground hover:text-foreground"
            onClick={() => openEdit(s)}
            title="Sửa"
            aria-label="Sửa"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-[30px] w-[30px] text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
            onClick={() => setConfirmId(s._id)}
            title="Xoá"
            aria-label="Xoá"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        kicker="Settings"
        title="Mùa chụp"
        description="Quản lý các mùa chụp ảnh trong năm."
        action={
          <Button variant="gradient" onClick={openCreate}>
            <Plus />
            Thêm mùa
          </Button>
        }
      />

      {loading ? (
        <TableSkeleton cols={4} />
      ) : (
        <>
          <SeasonTimeline seasons={seasons} now={now} />

          {/* Desktop table */}
          <div className="hidden md:block">
            <DataTable<Season>
              data={sorted}
              keyExtractor={(s) => s._id}
              rowClassName={(s) =>
                getStatus(s, now) === 'current' ? 'bg-amber-50 dark:bg-amber-500/10' : ''
              }
              emptyTitle="Chưa có mùa chụp nào"
              columns={columns}
            />
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {seasons.length === 0 && (
              <p className="text-center text-muted-foreground py-10">Chưa có mùa chụp nào</p>
            )}
            {sorted.map((s) => {
              const status = getStatus(s, now);
              const st = STATUS_BADGE[status];
              return (
                <div
                  key={s._id}
                  className={cn(
                    'rounded-[14px] border bg-card p-4',
                    status === 'current' && 'border-primary/60 bg-amber-50 dark:bg-amber-500/10',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 font-semibold">
                        <SeasonIcon status={status} />
                        <span className="truncate">{s.name}</span>
                      </div>
                      <div className="mt-1.5 flex flex-col gap-0.5 text-sm text-muted-foreground">
                        <span>Từ: {formatDate(s.startDate)}</span>
                        <span>Đến: {formatDate(s.endDate)}</span>
                      </div>
                      <Badge variant={st.variant} dot className="mt-2">
                        {st.label}
                      </Badge>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-[30px] w-[30px] text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(s)}
                        title="Sửa"
                        aria-label="Sửa"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-[30px] w-[30px] text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                        onClick={() => setConfirmId(s._id)}
                        title="Xoá"
                        aria-label="Xoá"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Chỉnh sửa mùa chụp' : 'Thêm mùa chụp mới'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Tên mùa" error={errors.name?.message}>
            <Input
              placeholder="VD: Mùa hè 2025"
              {...register('name', { required: 'Vui lòng nhập tên mùa' })}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Ngày bắt đầu" error={errors.startDate?.message}>
              <Controller
                name="startDate"
                control={control}
                rules={{ required: 'Vui lòng chọn ngày bắt đầu' }}
                render={({ field }) => (
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Chọn ngày bắt đầu"
                  />
                )}
              />
            </FormField>
            <FormField label="Ngày kết thúc" error={errors.endDate?.message}>
              <Controller
                name="endDate"
                control={control}
                rules={{ required: 'Vui lòng chọn ngày kết thúc' }}
                render={({ field }) => (
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Chọn ngày kết thúc"
                  />
                )}
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit" variant="gradient" disabled={isSubmitting}>
              {editing ? 'Lưu thay đổi' : 'Thêm mùa'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(open) => {
          if (!open) setConfirmId(null);
        }}
        title="Xoá mùa chụp?"
        message="Hành động này không thể hoàn tác. Bạn có chắc muốn xoá mùa chụp này?"
        confirmLabel="Xoá"
        onConfirm={doDelete}
      />
    </div>
  );
};

export default SeasonPage;
