import { useEffect, useState } from 'react';
import { Pencil, Phone, Plus, School, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import { customerService } from '../services/customerService';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchCustomers } from '../store/slices/customersSlice';
import type { Customer } from '../types';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  FormField,
  Input,
  Modal,
  PageHeader,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TableSkeleton,
  Textarea,
} from '@/components/ui';
import type { Column } from '@/components/ui';

type FormValues = Omit<Customer, '_id' | 'createdAt'>;

const CustomersPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list: customers, total, loading } = useAppSelector((s) => s.customers);
  const { list: seasons, selectedSeasonId } = useAppSelector((s) => s.seasons);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>();

  const buildParams = (s: string, p: number, l: number): Record<string, string | number> => {
    const params: Record<string, string | number> = { page: p, limit: l };
    if (s) params.search = s;
    if (selectedSeasonId) params.season = selectedSeasonId;
    return params;
  };

  useEffect(() => {
    dispatch(fetchCustomers(buildParams(appliedSearch, page, pageSize)));
  }, [dispatch, appliedSearch, page, pageSize, selectedSeasonId]);

  const openCreate = () => {
    setEditing(null);
    reset({
      className: '',
      school: '',
      contactName: '',
      contactPhone: '',
      contactAddress: '',
      total: 0,
      totalMale: 0,
      totalFemale: 0,
      notes: '',
      season: selectedSeasonId || undefined,
    });
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    reset(c);
    setModalOpen(true);
  };

  const onSubmit = async (data: FormValues) => {
    try {
      if (editing) {
        await customerService.update(editing._id, data);
        toast.success('Cập nhật lớp thành công!');
      } else {
        await customerService.create(data);
        toast.success('Thêm lớp thành công!');
      }
      setModalOpen(false);
      dispatch(fetchCustomers(buildParams(appliedSearch, page, pageSize)));
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await customerService.remove(confirmId);
      toast.success('Đã xoá lớp.');
      dispatch(fetchCustomers(buildParams(appliedSearch, page, pageSize)));
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  const runSearch = () => {
    setPage(1);
    setAppliedSearch(search);
  };

  return (
    <div>
      <PageHeader
        kicker="Customers"
        title="Khách hàng (Lớp)"
        description="Danh sách lớp học, trường và thông tin liên hệ."
        action={
          <Button variant="gradient" onClick={openCreate}>
            <Plus />
            Thêm lớp
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          className="flex-1 sm:max-w-md"
          placeholder="Tìm kiếm lớp, trường…"
          value={search}
          onChange={setSearch}
          onSearch={runSearch}
          onClear={() => {
            setSearch('');
            setAppliedSearch('');
            setPage(1);
          }}
        />
        <span className="ml-auto text-sm text-muted-foreground tabular">{total} lớp</span>
      </div>

      {loading ? (
        <TableSkeleton cols={6} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <DataTable<Customer>
              data={customers}
              keyExtractor={(c) => c._id}
              emptyTitle="Chưa có dữ liệu"
              onRowClick={(c) => navigate(`/customers/${c._id}`)}
              pagination={{
                serverSide: true,
                page,
                pageSize,
                total,
                onPageChange: setPage,
                onPageSizeChange: (size: number) => {
                  setPageSize(size);
                  setPage(1);
                },
              }}
              columns={[
                {
                  key: 'className',
                  header: 'Lớp',
                  render: (c) => (
                    <div className="min-w-0">
                      <Link
                        to={`/customers/${c._id}`}
                        className="block font-semibold text-foreground hover:text-primary-700 dark:hover:text-primary"
                      >
                        {c.className}
                      </Link>
                      {c.school && (
                        <span className="block text-xs text-muted-foreground">{c.school}</span>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'contact',
                  header: 'Liên hệ',
                  render: (c) => (
                    <div>
                      <span className="block font-semibold text-foreground">{c.contactName}</span>
                      <span className="block text-xs text-muted-foreground tabular">
                        {c.contactPhone}
                      </span>
                    </div>
                  ),
                },
                {
                  key: 'contactAddress',
                  header: 'Địa chỉ',
                  render: (c) => <span>{c.contactAddress}</span>,
                },
                {
                  key: 'total',
                  header: 'Sĩ số',
                  render: (c) => {
                    const male = c.totalMale ?? 0;
                    const female = c.totalFemale ?? 0;
                    const sum = male + female;
                    return (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground tabular">{c.total}</span>
                          {sum > 0 && (
                            <span className="flex h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                              <span
                                className="bg-blue-400"
                                style={{ width: `${(male / sum) * 100}%` }}
                              />
                              <span
                                className="bg-pink-400"
                                style={{ width: `${(female / sum) * 100}%` }}
                              />
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground tabular">
                          ♂ {male} · ♀ {female}
                        </span>
                      </div>
                    );
                  },
                },
                {
                  key: 'notes',
                  header: 'Ghi chú',
                  render: (c) => (
                    <span
                      className="block max-w-[240px] truncate text-muted-foreground"
                      title={c.notes || ''}
                    >
                      {c.notes || '—'}
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  header: '',
                  align: 'right',
                  className: 'whitespace-nowrap',
                  render: (c) => (
                    <span className="inline-flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-[30px] w-[30px] text-muted-foreground"
                        title="Sửa"
                        aria-label="Sửa"
                        onClick={() => openEdit(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-[30px] w-[30px] text-rose-600 hover:text-rose-700 dark:text-rose-400"
                        title="Xoá"
                        aria-label="Xoá"
                        onClick={() => setConfirmId(c._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </span>
                  ),
                } satisfies Column<Customer>,
              ]}
            />
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {customers.map((c) => (
              <div key={c._id} className="rounded-[14px] border bg-card p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <Link
                      to={`/customers/${c._id}`}
                      className="font-display font-bold text-foreground hover:text-primary-700 dark:hover:text-primary text-base block truncate"
                    >
                      {c.className}
                    </Link>
                    {c.school && (
                      <div className="text-sm text-muted-foreground inline-flex items-center gap-1.5 mt-0.5">
                        <School className="h-4 w-4 text-sky-500 shrink-0" />
                        <span className="truncate">{c.school}</span>
                      </div>
                    )}
                  </div>
                  {c.total != null && (
                    <Badge
                      variant="outline"
                      className="border-transparent bg-primary-100 text-primary-700 dark:bg-primary/15 dark:text-primary"
                    >
                      {c.total} hs
                      {(c.totalMale != null || c.totalFemale != null) && (
                        <span className="font-normal opacity-70 ml-1">
                          (<span className="text-blue-500">{c.totalMale ?? 0}</span>/
                          <span className="text-pink-500">{c.totalFemale ?? 0}</span>)
                        </span>
                      )}
                    </Badge>
                  )}
                </div>

                {(c.contactName || c.contactPhone) && (
                  <div className="space-y-1 pt-2 border-t">
                    {c.contactName && (
                      <div className="text-sm text-foreground">{c.contactName}</div>
                    )}
                    {c.contactPhone && (
                      <a
                        href={`tel:${c.contactPhone}`}
                        className="text-sm text-muted-foreground inline-flex items-center gap-1.5 hover:text-emerald-500"
                      >
                        <Phone className="h-4 w-4 text-emerald-500" />
                        <span>{c.contactPhone}</span>
                      </a>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-1 mt-3 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-[30px] w-[30px] text-muted-foreground"
                    title="Sửa"
                    aria-label="Sửa"
                    onClick={() => openEdit(c)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-[30px] w-[30px] text-rose-600 hover:text-rose-700 dark:text-rose-400"
                    title="Xoá"
                    aria-label="Xoá"
                    onClick={() => setConfirmId(c._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {customers.length === 0 && (
              <div className="rounded-[14px] border bg-card py-10 text-center text-muted-foreground">
                Chưa có dữ liệu
              </div>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Xác nhận xoá"
        message="Bạn có chắc muốn xoá lớp này?"
        onConfirm={doDelete}
      />

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Sửa lớp' : 'Thêm lớp mới'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <FormField
              label="Tên lớp"
              required
              htmlFor="className"
              error={errors.className?.message}
              className="col-span-2 sm:col-span-1"
            >
              <Input
                id="className"
                {...register('className', { required: 'Vui lòng nhập tên lớp' })}
              />
            </FormField>
            <FormField
              label="Trường"
              required
              htmlFor="school"
              error={errors.school?.message}
              className="col-span-2"
            >
              <Input id="school" {...register('school', { required: 'Vui lòng nhập trường' })} />
            </FormField>
            <FormField
              label="Sĩ số"
              required
              htmlFor="total"
              error={errors.total?.message}
              className="col-span-2 sm:col-span-1"
            >
              <Input
                id="total"
                type="number"
                {...register('total', { valueAsNumber: true, required: 'Vui lòng nhập sĩ số' })}
              />
            </FormField>
            <FormField
              label="Số nam"
              required
              htmlFor="totalMale"
              error={errors.totalMale?.message}
            >
              <Input
                id="totalMale"
                type="number"
                min={0}
                {...register('totalMale', {
                  valueAsNumber: true,
                  required: 'Vui lòng nhập số nam',
                })}
              />
            </FormField>
            <FormField
              label="Số nữ"
              required
              htmlFor="totalFemale"
              error={errors.totalFemale?.message}
            >
              <Input
                id="totalFemale"
                type="number"
                min={0}
                {...register('totalFemale', {
                  valueAsNumber: true,
                  required: 'Vui lòng nhập số nữ',
                })}
              />
            </FormField>
            <FormField
              label="Người liên hệ"
              required
              htmlFor="contactName"
              error={errors.contactName?.message}
              className="sm:col-span-2"
            >
              <Input
                id="contactName"
                {...register('contactName', { required: 'Vui lòng nhập người liên hệ' })}
              />
            </FormField>
            <FormField
              label="Số điện thoại (người liên hệ)"
              required
              htmlFor="contactPhone"
              error={errors.contactPhone?.message}
            >
              <Input
                id="contactPhone"
                {...register('contactPhone', {
                  required: 'Vui lòng nhập số điện thoại',
                  pattern: {
                    value: /^[0-9+\-\s()]{8,}$/,
                    message: 'Số điện thoại không hợp lệ',
                  },
                })}
              />
            </FormField>
            <FormField
              label="Địa chỉ (người liên hệ)"
              required
              htmlFor="contactAddress"
              error={errors.contactAddress?.message}
              className="col-span-2 sm:col-span-3"
            >
              <Input
                id="contactAddress"
                {...register('contactAddress', { required: 'Vui lòng nhập địa chỉ' })}
              />
            </FormField>
            <FormField label="Mùa chụp" htmlFor="season" className="col-span-2 sm:col-span-1">
              <Controller
                name="season"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="-- Chọn mùa --" />
                    </SelectTrigger>
                    <SelectContent>
                      {seasons.map((s) => (
                        <SelectItem key={s._id} value={s._id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField label="Ghi chú" htmlFor="notes" className="col-span-2 sm:col-span-3">
              <Textarea id="notes" rows={2} {...register('notes')} />
            </FormField>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit" variant="gradient" disabled={isSubmitting}>
              Lưu
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CustomersPage;
