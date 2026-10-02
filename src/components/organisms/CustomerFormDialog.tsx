import { useEffect, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Check,
  Info,
  MapPin,
  Phone,
  School,
  Share2,
  Sun,
  UserCog,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { customerService } from '../../services/customerService';
import type { Customer, SchoolRef } from '../../types';
import { getSchoolId, getUserRefId } from '../../types';
import { useAppSelector } from '../../store';
import {
  Button,
  DatePicker,
  FormField,
  Input,
  LoadingButton,
  Modal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/components/ui';
import SchoolCombobox from './SchoolCombobox';

type FormValues = Omit<Customer, '_id' | 'createdAt' | 'schoolId'> & {
  /** Full ref kept in the form so the combobox can show the name; sent as an id. */
  schoolId: SchoolRef | null;
};

const NONE = '__none__';

/** Pipeline fields are changed only through the status endpoint — never sent by the form. */
const PIPELINE_FIELDS = [
  'status',
  'assignedSale',
  'lostReason',
  'statusChangedAt',
  'deposit',
] as const;

/* Mobile (< md) styling — desktop keeps the regular centered modal + grid untouched. */
const sheetCls =
  'max-md:inset-0 max-md:left-0 max-md:top-0 max-md:translate-x-0 max-md:translate-y-0 max-md:!max-w-none max-md:h-[100dvh] max-md:max-h-none max-md:flex max-md:flex-col max-md:gap-0 max-md:overflow-hidden max-md:!rounded-none max-md:border-0 max-md:p-0 max-md:shadow-none max-md:bg-[var(--page-bg)] max-md:data-[state=open]:slide-in-from-left-0 max-md:data-[state=open]:slide-in-from-top-0 max-md:data-[state=open]:slide-in-from-bottom-8 max-md:data-[state=open]:zoom-in-100 max-md:data-[state=closed]:slide-out-to-left-0 max-md:data-[state=closed]:slide-out-to-top-0 max-md:data-[state=closed]:slide-out-to-bottom-8 max-md:data-[state=closed]:zoom-out-100 max-md:[&>button]:hidden';
const fieldCls =
  'max-md:space-y-[7px] max-md:[&>label]:text-[12.5px] max-md:[&>label]:font-semibold max-md:[&>label]:text-[var(--text-muted)]';
const sectionCls =
  'col-span-3 md:hidden text-[11px] font-bold uppercase tracking-[0.8px] text-[var(--text-faint)]';
const iconInputCls = 'max-md:pl-9';
const triggerCls = 'max-md:h-10 max-md:rounded-[10px] max-md:bg-card max-md:pl-9 max-md:text-base';
const dateCls = 'max-md:h-10 max-md:rounded-[10px] max-md:bg-card max-md:text-base';

/** Leading icon shown inside an input on mobile only. */
const WithIcon = ({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) => (
  <div className="relative">
    <Icon
      aria-hidden
      className="pointer-events-none absolute left-3 top-1/2 z-[1] h-[15px] w-[15px] -translate-y-1/2 text-[var(--text-faint)] md:hidden"
    />
    {children}
  </div>
);

/**
 * Create / edit form for a class. Desktop: centered modal; mobile: full-screen sheet with
 * sticky header and bottom action bar.
 */
const CustomerFormDialog = ({
  open,
  onOpenChange,
  customer,
  isAdmin,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The class being edited; null/undefined = create. */
  customer?: Customer | null;
  isAdmin: boolean;
  onSaved: (saved: Customer) => void;
}) => {
  const seasons = useAppSelector((s) => s.seasons.list);
  const selectedSeasonId = useAppSelector((s) => s.seasons.selectedSeasonId);
  const sales = useAppSelector((s) => s.users.sales);
  const isEdit = !!customer;
  const title = isEdit ? 'Sửa lớp' : 'Thêm lớp mới';
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>();

  useEffect(() => {
    if (!open) return;
    if (customer) {
      reset({
        ...customer,
        assignedSale: getUserRefId(customer.assignedSale),
        expectedShootDate: customer.expectedShootDate?.slice(0, 10) ?? null,
        schoolId:
          customer.schoolId && typeof customer.schoolId === 'object' ? customer.schoolId : null,
      });
    } else {
      reset({
        className: '',
        schoolId: null,
        contactName: '',
        contactPhone: '',
        contactAddress: '',
        total: 0,
        totalMale: 0,
        totalFemale: 0,
        notes: '',
        source: '',
        expectedShootDate: null,
        season: selectedSeasonId || undefined,
      });
    }
  }, [open, customer, selectedSeasonId, reset]);

  const onSubmit = async (values: FormValues) => {
    const data: Partial<Customer> = {
      ...values,
      schoolId: getSchoolId(values),
      expectedShootDate: values.expectedShootDate || null,
    };
    PIPELINE_FIELDS.forEach((k) => delete data[k]);
    // Only admins may (re)assign the sale in charge through the form.
    if (isAdmin) data.assignedSale = getUserRefId(values.assignedSale);
    try {
      let saved: Customer;
      if (customer) {
        saved = await customerService.update(customer._id, data);
        toast.success('Cập nhật lớp thành công!');
      } else {
        saved = await customerService.create(data);
        toast.success('Thêm lớp thành công!');
      }
      onOpenChange(false);
      onSaved(saved);
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      headerClassName="max-md:hidden"
      contentClassName={sheetCls}
      className="max-md:flex max-md:min-h-0 max-md:flex-1 max-md:flex-col"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col max-md:min-h-0 max-md:flex-1 md:gap-3"
      >
        {/* Mobile header */}
        <div className="shrink-0 border-b bg-card pt-[env(safe-area-inset-top)] md:hidden">
          <div className="flex h-[52px] items-center gap-3 px-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border text-foreground"
            >
              <X className="h-[18px] w-[18px]" />
              <span className="sr-only">Đóng</span>
            </button>
            <div className="min-w-0 flex-1 truncate font-display text-[17px] font-bold">
              {title}
            </div>
          </div>
        </div>

        <div className="max-md:min-h-0 max-md:flex-1 max-md:overflow-y-auto max-md:px-4 max-md:pb-6 max-md:pt-[18px]">
          <div className="grid grid-cols-3 gap-x-3 gap-y-3.5 md:gap-3">
            <div className={sectionCls}>Thông tin lớp</div>
            <FormField
              label="Tên lớp"
              required
              htmlFor="cf-className"
              error={errors.className?.message}
              className={`col-span-3 md:col-span-1 ${fieldCls}`}
            >
              <WithIcon icon={Users}>
                <Input
                  id="cf-className"
                  className={iconInputCls}
                  {...register('className', { required: 'Vui lòng nhập tên lớp' })}
                />
              </WithIcon>
            </FormField>
            <FormField
              label="Trường"
              required
              htmlFor="cf-school"
              error={errors.schoolId?.message}
              className={`col-span-3 md:col-span-2 ${fieldCls}`}
            >
              <Controller
                name="schoolId"
                control={control}
                rules={{ required: 'Vui lòng chọn trường' }}
                render={({ field }) => (
                  <WithIcon icon={School}>
                    <SchoolCombobox
                      id="cf-school"
                      allowCreate
                      value={field.value}
                      onChange={field.onChange}
                      invalid={!!errors.schoolId}
                      className={triggerCls}
                    />
                  </WithIcon>
                )}
              />
            </FormField>
            <FormField
              label="Sĩ số"
              required
              htmlFor="cf-total"
              error={errors.total?.message}
              className={fieldCls}
            >
              <div className="relative">
                <Input
                  id="cf-total"
                  type="number"
                  className="max-md:pr-8"
                  {...register('total', { valueAsNumber: true, required: 'Vui lòng nhập sĩ số' })}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12.5px] text-[var(--text-faint)] md:hidden">
                  hs
                </span>
              </div>
            </FormField>
            <FormField
              label="Số nam"
              required
              htmlFor="cf-totalMale"
              error={errors.totalMale?.message}
              className={fieldCls}
            >
              <Input
                id="cf-totalMale"
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
              htmlFor="cf-totalFemale"
              error={errors.totalFemale?.message}
              className={fieldCls}
            >
              <Input
                id="cf-totalFemale"
                type="number"
                min={0}
                {...register('totalFemale', {
                  valueAsNumber: true,
                  required: 'Vui lòng nhập số nữ',
                })}
              />
            </FormField>

            <div className={sectionCls}>Người liên hệ</div>
            <FormField
              label="Người liên hệ"
              required
              htmlFor="cf-contactName"
              error={errors.contactName?.message}
              className={`col-span-3 md:col-span-2 ${fieldCls}`}
            >
              <WithIcon icon={UserRound}>
                <Input
                  id="cf-contactName"
                  className={iconInputCls}
                  {...register('contactName', { required: 'Vui lòng nhập người liên hệ' })}
                />
              </WithIcon>
            </FormField>
            <FormField
              label="Số điện thoại (người liên hệ)"
              required
              htmlFor="cf-contactPhone"
              error={errors.contactPhone?.message}
              className={`col-span-3 md:col-span-1 ${fieldCls}`}
            >
              <WithIcon icon={Phone}>
                <Input
                  id="cf-contactPhone"
                  className={iconInputCls}
                  {...register('contactPhone', {
                    required: 'Vui lòng nhập số điện thoại',
                    pattern: {
                      value: /^[0-9+\-\s()]{8,}$/,
                      message: 'Số điện thoại không hợp lệ',
                    },
                  })}
                />
              </WithIcon>
            </FormField>
            <FormField
              label="Địa chỉ (người liên hệ)"
              required
              htmlFor="cf-contactAddress"
              error={errors.contactAddress?.message}
              className={`col-span-3 ${fieldCls}`}
            >
              <WithIcon icon={MapPin}>
                <Input
                  id="cf-contactAddress"
                  className={iconInputCls}
                  {...register('contactAddress', { required: 'Vui lòng nhập địa chỉ' })}
                />
              </WithIcon>
            </FormField>

            <div className={sectionCls}>Quản lý</div>
            <FormField
              label="Nguồn khách"
              htmlFor="cf-source"
              className={`col-span-3 md:col-span-2 ${fieldCls}`}
            >
              <WithIcon icon={Share2}>
                <Input
                  id="cf-source"
                  className={iconInputCls}
                  placeholder="VD: Facebook, giới thiệu, khách cũ…"
                  {...register('source')}
                />
              </WithIcon>
            </FormField>
            {isAdmin && (
              <FormField label="Sale phụ trách" className={`col-span-3 md:col-span-1 ${fieldCls}`}>
                <Controller
                  name="assignedSale"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={getUserRefId(field.value) ?? NONE}
                      onValueChange={(v) => field.onChange(v === NONE ? null : v)}
                    >
                      <WithIcon icon={UserCog}>
                        <SelectTrigger className={triggerCls}>
                          <SelectValue placeholder="Chưa có" />
                        </SelectTrigger>
                      </WithIcon>
                      <SelectContent>
                        <SelectItem value={NONE}>Chưa có</SelectItem>
                        {sales.map((u) => (
                          <SelectItem key={u._id} value={u._id}>
                            {u.name || u.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            )}
            <FormField
              label="Mùa chụp"
              htmlFor="cf-season"
              className={`col-span-3 md:col-span-1 ${fieldCls}`}
            >
              <Controller
                name="season"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <WithIcon icon={Sun}>
                      <SelectTrigger id="cf-season" className={triggerCls}>
                        <SelectValue placeholder="-- Chọn mùa --" />
                      </SelectTrigger>
                    </WithIcon>
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
            <FormField label="Ngày dự kiến chụp" className={`col-span-3 md:col-span-1 ${fieldCls}`}>
              <Controller
                name="expectedShootDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    value={field.value ?? undefined}
                    onChange={(val) => field.onChange(val ?? null)}
                    placeholder="Chọn ngày dự kiến chụp"
                    className={dateCls}
                  />
                )}
              />
            </FormField>
            <FormField label="Ghi chú" htmlFor="cf-notes" className={`col-span-3 ${fieldCls}`}>
              <Textarea
                id="cf-notes"
                rows={2}
                className="max-md:min-h-[72px] max-md:bg-card"
                {...register('notes')}
              />
            </FormField>

            {/* "new" is the schema default status for a created class (backend Customer model). */}
            {!isEdit && (
              <div className="col-span-3 flex items-start gap-2 rounded-[10px] bg-blue-100 px-3 py-2.5 text-xs text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 md:hidden">
                <Info className="mt-px h-[15px] w-[15px] shrink-0" />
                <span>Lớp mới sẽ bắt đầu ở bước “Chưa làm việc” trong quy trình chăm sóc.</span>
              </div>
            )}
          </div>
        </div>

        {/* Desktop actions */}
        <div className="hidden justify-end gap-2 pt-2 md:flex">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button type="submit" variant="gradient" disabled={isSubmitting}>
            Lưu
          </Button>
        </div>

        {/* Mobile bottom bar */}
        <div className="grid shrink-0 grid-cols-2 gap-2.5 border-t bg-card px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 md:hidden">
          <Button
            type="button"
            variant="outline"
            className="font-semibold"
            onClick={() => onOpenChange(false)}
          >
            Huỷ
          </Button>
          <LoadingButton type="submit" className="font-semibold" loading={isSubmitting}>
            {!isSubmitting && <Check />}
            Lưu lớp
          </LoadingButton>
        </div>
      </form>
    </Modal>
  );
};

export default CustomerFormDialog;
