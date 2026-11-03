import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pencil, Phone, Plus, Search, UserCheck, UserX, X } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  Badge,
  Button,
  DataTable,
  FormField,
  Input,
  Modal,
  PageHeader,
  RowActions,
  SegmentedControl,
  Textarea,
  type Column,
} from '@/components/ui';
import { externalPhotographerService } from '../services/externalPhotographerService';
import { formatCurrency } from '../utils/format';
import type { ExternalPhotographer } from '../types';

interface FormValues {
  name: string;
  phone: string;
  defaultFee: string;
  notes: string;
  isActive: boolean;
}

type StatusFilter = 'active' | 'inactive' | 'all';

const feeLabel = (fee: number | null | undefined) =>
  fee == null ? 'Chưa đặt' : `${formatCurrency(fee)}/buổi`;

const StatusBadge = ({ active }: { active: boolean }) => (
  <Badge variant={active ? 'success' : 'neutral'} dot>
    {active ? 'Đang hợp tác' : 'Ngừng hợp tác'}
  </Badge>
);

const ExternalPhotographersPage = () => {
  const [people, setPeople] = useState<ExternalPhotographer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('active');
  const [editing, setEditing] = useState<ExternalPhotographer | null>(null);
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors, isDirty },
  } = useForm<FormValues>();

  const reload = useCallback(() => {
    setLoadError(false);
    return externalPhotographerService
      .getAll()
      .then(setPeople)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const showForm = (person: ExternalPhotographer | null) => {
    setEditing(person);
    reset({
      name: person?.name ?? '',
      phone: person?.phone ?? '',
      defaultFee: person?.defaultFee == null ? '' : String(person.defaultFee),
      notes: person?.notes ?? '',
      isActive: person?.isActive ?? true,
    });
    setOpen(true);
  };

  const toPayload = (p: ExternalPhotographer, isActive: boolean) => ({
    name: p.name,
    phone: p.phone ?? '',
    defaultFee: p.defaultFee ?? null,
    notes: p.notes ?? '',
    isActive,
  });

  const toggleActive = async (person: ExternalPhotographer) => {
    try {
      await externalPhotographerService.update(person._id, toPayload(person, !person.isActive));
      toast.success(
        person.isActive
          ? `Đã chuyển ${person.name} sang ngừng hợp tác.`
          : `${person.name} đã hợp tác trở lại.`,
      );
      reload();
    } catch {
      toast.error('Không cập nhật được trạng thái.');
    }
  };

  const save = async (values: FormValues) => {
    try {
      const data = {
        name: values.name.trim(),
        phone: values.phone.trim(),
        defaultFee: values.defaultFee === '' ? null : Number(values.defaultFee),
        notes: values.notes.trim(),
        isActive: values.isActive,
      };
      if (editing) await externalPhotographerService.update(editing._id, data);
      else await externalPhotographerService.create(data);
      toast.success(editing ? 'Đã cập nhật thợ ngoài.' : 'Đã thêm thợ ngoài.');
      setOpen(false);
      reload();
    } catch {
      toast.error('Không lưu được thợ ngoài. Kiểm tra kết nối rồi thử lại.');
    }
  };

  const counts = useMemo(() => {
    const active = people.filter((p) => p.isActive).length;
    return { active, inactive: people.length - active, all: people.length };
  }, [people]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people
      .filter((p) => (status === 'all' ? true : status === 'active' ? p.isActive : !p.isActive))
      .filter((p) => !q || `${p.name} ${p.phone ?? ''}`.toLowerCase().includes(q))
      .sort(
        (a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name, 'vi'),
      );
  }, [people, query, status]);

  const actionsFor = (person: ExternalPhotographer) => (
    <RowActions
      subject={person.name}
      primary={{
        label: 'Sửa',
        icon: <Pencil className="h-4 w-4" />,
        onSelect: () => showForm(person),
      }}
      actions={[
        {
          label: 'Gọi điện',
          icon: <Phone className="h-4 w-4" />,
          onSelect: () => {
            window.location.href = `tel:${person.phone}`;
          },
          hidden: !person.phone,
        },
        person.isActive
          ? {
              label: 'Ngừng hợp tác',
              icon: <UserX className="h-4 w-4" />,
              onSelect: () => toggleActive(person),
              destructive: true,
            }
          : {
              label: 'Hợp tác lại',
              icon: <UserCheck className="h-4 w-4" />,
              onSelect: () => toggleActive(person),
            },
      ]}
    />
  );

  const columns: Column<ExternalPhotographer>[] = [
    {
      key: 'name',
      header: 'Họ tên',
      render: (p) => (
        <div className={p.isActive ? '' : 'text-muted-foreground'}>
          <div className="font-semibold text-foreground">{p.name}</div>
          {p.notes && (
            <div className="max-w-sm truncate text-[13px] text-muted-foreground" title={p.notes}>
              {p.notes}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Điện thoại',
      className: 'whitespace-nowrap',
      render: (p) =>
        p.phone ? (
          <a
            href={`tel:${p.phone}`}
            className="tabular underline decoration-border underline-offset-4 hover:decoration-foreground"
          >
            {p.phone}
          </a>
        ) : (
          <span className="text-muted-foreground">Chưa có</span>
        ),
    },
    {
      key: 'fee',
      header: 'Chi phí mặc định',
      align: 'right',
      className: 'whitespace-nowrap',
      render: (p) => (
        <span className={p.defaultFee == null ? 'text-muted-foreground' : 'tabular'}>
          {feeLabel(p.defaultFee)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (p) => <StatusBadge active={p.isActive} />,
    },
    {
      key: 'actions',
      header: <span className="sr-only">Thao tác</span>,
      align: 'right',
      className: 'w-24',
      render: actionsFor,
    },
  ];

  const noCounts = loading || loadError;
  const description = noCounts
    ? 'Thợ cộng tác để phân công vào lịch chụp, không cần tài khoản.'
    : `${counts.active} đang hợp tác · ${counts.inactive} đã ngừng. Phân công vào lịch chụp mà không cần tài khoản.`;

  const emptyTitle = query.trim()
    ? `Không có ai khớp "${query.trim()}"`
    : status === 'inactive'
      ? 'Chưa có ai ngừng hợp tác'
      : 'Chưa có thợ ngoài';

  return (
    <div className="flex flex-col md:min-h-0 md:flex-1">
      <PageHeader
        title="Thợ ngoài"
        description={description}
        action={
          <Button onClick={() => showForm(null)} className="max-md:w-full">
            <Plus /> Thêm thợ ngoài
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên hoặc số điện thoại"
            aria-label="Tìm thợ ngoài"
            className="pl-9 pr-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Xoá tìm kiếm"
              className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <SegmentedControl<StatusFilter>
          value={status}
          onChange={setStatus}
          className="self-start"
          items={[
            { value: 'active', label: `Đang hợp tác${noCounts ? '' : ` · ${counts.active}`}` },
            { value: 'inactive', label: `Đã ngừng${noCounts ? '' : ` · ${counts.inactive}`}` },
            { value: 'all', label: 'Tất cả' },
          ]}
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={(p) => p._id}
        loading={loading}
        error={loadError ? 'Kiểm tra kết nối mạng rồi thử lại.' : undefined}
        onRetry={() => {
          setLoading(true);
          reload();
        }}
        emptyTitle={emptyTitle}
        emptyDescription={
          query || status !== 'active'
            ? undefined
            : 'Thêm thợ cộng tác để phân công họ vào lịch chụp.'
        }
        emptyAction={
          query ? (
            <Button variant="outline" size="sm" onClick={() => setQuery('')}>
              Xoá tìm kiếm
            </Button>
          ) : status === 'active' ? (
            <Button size="sm" onClick={() => showForm(null)}>
              <Plus /> Thêm thợ ngoài
            </Button>
          ) : undefined
        }
        onRowClick={(p) => showForm(p)}
        mobileCard={(p) => (
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-semibold text-foreground">{p.name}</span>
                {!p.isActive && <StatusBadge active={false} />}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 text-[13px] text-muted-foreground">
                {p.phone ? (
                  <a
                    href={`tel:${p.phone}`}
                    className="tabular inline-flex items-center gap-1 text-foreground"
                  >
                    <Phone className="h-3.5 w-3.5" aria-hidden />
                    {p.phone}
                  </a>
                ) : (
                  <span>Chưa có số</span>
                )}
                <span className={p.defaultFee == null ? '' : 'tabular text-foreground'}>
                  {feeLabel(p.defaultFee)}
                </span>
              </div>
              {p.notes && (
                <p className="line-clamp-2 text-[13px] text-muted-foreground">{p.notes}</p>
              )}
            </div>
            {actionsFor(p)}
          </div>
        )}
      />

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={editing ? `Sửa ${editing.name}` : 'Thêm thợ ngoài'}
        description="Thợ ngoài không đăng nhập được; chỉ dùng để phân công và tính chi phí."
        size="sm"
      >
        <form onSubmit={handleSubmit(save)} className="space-y-4" noValidate>
          <FormField label="Họ tên" required error={errors.name?.message} htmlFor="external-name">
            <Input
              id="external-name"
              autoComplete="off"
              aria-invalid={!!errors.name}
              {...register('name', {
                validate: (v) => v.trim() !== '' || 'Vui lòng nhập họ tên',
              })}
            />
          </FormField>
          <FormField label="Số điện thoại" htmlFor="external-phone">
            <Input id="external-phone" type="tel" inputMode="tel" {...register('phone')} />
          </FormField>
          <FormField
            label="Chi phí mặc định mỗi buổi (₫)"
            htmlFor="external-fee"
            error={errors.defaultFee?.message}
          >
            <Input
              id="external-fee"
              type="number"
              inputMode="numeric"
              min={0}
              step={1000}
              placeholder="Bỏ trống nếu tuỳ buổi"
              aria-invalid={!!errors.defaultFee}
              {...register('defaultFee', {
                validate: (v) => v === '' || Number(v) >= 0 || 'Chi phí không được âm',
              })}
            />
          </FormField>
          <FormField label="Ghi chú" htmlFor="external-notes">
            <Textarea
              id="external-notes"
              rows={3}
              placeholder="Thế mạnh, khu vực, lưu ý khi phân công…"
              {...register('notes')}
            />
          </FormField>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
            <input
              type="checkbox"
              {...register('isActive')}
              className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
            />
            <span>
              <span className="block text-sm font-medium text-foreground">Đang hợp tác</span>
              <span className="block text-[13px] text-muted-foreground">
                Bỏ chọn thì vẫn hiện trong lịch cũ, nhưng không phân công được vào lịch mới.
              </span>
            </span>
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit" disabled={isSubmitting || (!!editing && !isDirty)}>
              {editing ? 'Lưu thay đổi' : 'Thêm thợ'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ExternalPhotographersPage;
