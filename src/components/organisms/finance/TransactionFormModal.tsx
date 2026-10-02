import { useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import {
  Button,
  Checkbox,
  Combobox,
  DatePicker,
  FormField,
  Input,
  Label,
  Modal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/components/ui';
import { transactionService } from '../../../services/transactionService';
import type {
  Category,
  Customer,
  Season,
  Transaction,
  TransactionResponse,
  User,
} from '../../../types';
import { classLabel } from '../../../utils/format';

interface TransactionFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Transaction being edited; `null` → create. */
  editing: TransactionResponse | null;
  /** Bumped on every open so the form re-initialises. */
  sessionKey: number;
  customers: Customer[];
  categories: Category[];
  users: User[];
  seasons: Season[];
  selectedSeasonId: string;
  isAdmin: boolean;
  canRefund: boolean;
  onSaved: () => void;
  /** Mobile rows have no inline actions — deleting happens from the edit modal. */
  onDelete?: (tx: TransactionResponse) => void;
}

/** Create / edit transaction modal (unchanged fields & permissions from the old page). */
const TransactionFormModal = ({
  open,
  onOpenChange,
  editing,
  sessionKey,
  customers,
  categories,
  users,
  seasons,
  selectedSeasonId,
  isAdmin,
  canRefund,
  onSaved,
  onDelete,
}: TransactionFormModalProps) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { isSubmitting },
  } = useForm<Partial<Transaction>>();

  const selectedType = watch('type');

  useEffect(() => {
    if (!open) return;
    if (editing) {
      reset({
        ...editing,
        customer: editing.customer?._id ?? '',
        categoryId: editing.categoryId._id,
        date: editing.date.slice(0, 10),
        createdBy: editing.createdBy?._id ?? '',
      });
    } else {
      reset({
        type: 'income',
        date: new Date().toISOString().slice(0, 10),
        season: selectedSeasonId || undefined,
      });
    }
    // Re-initialise only when a new form session starts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sessionKey]);

  const onSubmit = async (data: Partial<Transaction>) => {
    const payload = { ...data, customer: data.customer || null };
    try {
      if (editing) {
        await transactionService.update(editing._id, payload);
        toast.success('Cập nhật giao dịch thành công!');
      } else {
        await transactionService.create(payload);
        toast.success('Thêm giao dịch thành công!');
      }
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const filteredCategories = categories.filter((c) => !selectedType || c.type === selectedType);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? 'Sửa giao dịch' : 'Thêm giao dịch'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Loại" required>
            <Controller
              name="type"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Select value={field.value ?? 'income'} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Thu</SelectItem>
                    <SelectItem value="expense">Chi</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label="Danh mục" required>
            <Controller
              name="categoryId"
              control={control}
              rules={{ required: true }}
              render={({ field }) => {
                const value =
                  typeof field.value === 'object' && field.value !== null
                    ? (field.value as { _id: string })._id
                    : ((field.value as string | undefined) ?? '');
                return (
                  <Combobox
                    options={filteredCategories.map((c) => ({ value: c._id, label: c.name }))}
                    value={value}
                    onChange={field.onChange}
                    placeholder="-- Chọn danh mục --"
                  />
                );
              }}
            />
          </FormField>
          <FormField label="Số tiền" required htmlFor="amount">
            <Input
              id="amount"
              type="number"
              {...register('amount', { required: true, valueAsNumber: true, min: 0 })}
            />
          </FormField>
          <FormField label="Ngày" required htmlFor="date">
            <Controller
              name="date"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <DatePicker value={field.value} onChange={field.onChange} placeholder="Chọn ngày" />
              )}
            />
          </FormField>
          <FormField label="Lớp (tuỳ chọn)" className="sm:col-span-2">
            <Controller
              name="customer"
              control={control}
              render={({ field }) => {
                const value =
                  typeof field.value === 'object' && field.value !== null
                    ? (field.value as { _id: string })._id
                    : ((field.value as string | undefined) ?? '');
                return (
                  <Combobox
                    options={customers.map((c) => ({
                      value: c._id,
                      label: classLabel(c),
                    }))}
                    value={value}
                    onChange={(v) => field.onChange(v || undefined)}
                    placeholder="-- Không có lớp --"
                  />
                );
              }}
            />
          </FormField>
          {isAdmin && (
            <FormField label="Người thực hiện" className="sm:col-span-2">
              <Controller
                name="createdBy"
                control={control}
                render={({ field }) => {
                  const value =
                    typeof field.value === 'object' && field.value !== null
                      ? (field.value as { _id: string })._id
                      : ((field.value as string | undefined) ?? '');
                  return (
                    <Combobox
                      options={users.map((u) => ({
                        value: u._id,
                        label: u.name ?? u.username,
                      }))}
                      value={value}
                      onChange={(v) => field.onChange(v || undefined)}
                      placeholder="-- Mặc định (tôi) --"
                    />
                  );
                }}
              />
            </FormField>
          )}
          <FormField label="Mùa chụp">
            <Controller
              name="season"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || null)}>
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
          <FormField label="Mô tả" htmlFor="description" className="sm:col-span-2">
            <Textarea id="description" rows={2} {...register('description')} />
          </FormField>
          {canRefund && (
            <div className="sm:col-span-2">
              <Controller
                name="accountantRefunded"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={!!field.value}
                      onCheckedChange={(c) => field.onChange(!!c)}
                    />
                    <Label className="cursor-pointer">Kế toán đã hoàn tiền</Label>
                  </label>
                )}
              />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          {editing && onDelete && (
            <Button
              type="button"
              variant="ghost"
              className="mr-auto px-2 text-rose-600 hover:bg-rose-500/10 hover:text-rose-600"
              onClick={() => onDelete(editing)}
            >
              <Trash2 /> Xoá
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button type="submit" variant="gradient" disabled={isSubmitting}>
            Lưu
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TransactionFormModal;
