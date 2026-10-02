import { useEffect, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { ArrowRight, CalendarPlus, Wallet } from 'lucide-react';
import {
  Badge,
  Button,
  Checkbox,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  TimePicker,
} from '@/components/ui';
import { useAuth } from '../../context/AuthContext';
import { customerService } from '../../services/customerService';
import { useAppSelector } from '../../store';
import { CREW_EDITOR_HINT, canEditCrew } from '../../utils/permissions';
import type { ChangeCustomerStatusBody, Customer, CustomerStatus } from '../../types';
import {
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_STATUS_VARIANT,
  getCustomerStatus,
  getUserRefId,
  getSchoolName,
} from '../../types';
import { formatCurrency } from '../../utils/format';

const NONE = '__none__';
const fieldCls = 'h-10 rounded-[10px]';

interface FormValues {
  note: string;
  lostReason: string;
  depositAmount: number | '';
  depositDate: string;
  createSchedule: boolean;
  package: string;
  shootDate: string;
  startTime: string;
  endTime: string;
  location: string;
  leadPhotographer: string;
  assignedSale: string;
}

const today = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const SectionLabel = ({ children }: { children: ReactNode }) => (
  <div className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5">
    {children}
  </div>
);

const getApiErrorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

interface CustomerStatusDialogProps {
  customer: Customer;
  /** Target status; `null` closes the dialog. */
  target: CustomerStatus | null;
  /** Whether the class already has a schedule (Lịch chụp). */
  hasSchedule: boolean;
  /** Admins may also (re)assign the sale in charge. */
  isAdmin?: boolean;
  onClose: () => void;
  onChanged: () => void;
}

/** Dialog to move a class to another pipeline status (note required; deposit + schedule when `deposited`). */
const CustomerStatusDialog = ({
  customer,
  target,
  hasSchedule,
  isAdmin = false,
  onClose,
  onChanged,
}: CustomerStatusDialogProps) => {
  const packages = useAppSelector((s) => s.packages.list);
  const photographers = useAppSelector((s) => s.users.photographers);
  const { user } = useAuth();
  const crewEditor = canEditCrew(user);
  const sales = useAppSelector((s) => s.users.sales);
  const currentSaleId = getUserRefId(customer.assignedSale) ?? '';
  const current = getCustomerStatus(customer);
  const isDeposit = target === 'deposited';
  const isLost = target === 'lost';
  const askSchedule = isDeposit && !hasSchedule;

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>();

  useEffect(() => {
    if (!target) return;
    reset({
      note: '',
      lostReason: '',
      depositAmount: customer.deposit?.amount ?? '',
      depositDate: customer.deposit?.date?.slice(0, 10) ?? today(),
      createSchedule: true,
      package: '',
      shootDate: customer.expectedShootDate?.slice(0, 10) ?? '',
      startTime: '',
      endTime: '',
      location: '',
      leadPhotographer: '',
      assignedSale: currentSaleId,
    });
  }, [target, customer, currentSaleId, reset]);

  const depositAmount = watch('depositAmount');
  const createSchedule = watch('createSchedule');

  const onSubmit = async (v: FormValues) => {
    if (!target) return;
    const body: ChangeCustomerStatusBody = { status: target, note: v.note.trim() };
    if (isLost) body.lostReason = v.lostReason.trim();
    if (isAdmin && v.assignedSale && v.assignedSale !== currentSaleId) {
      body.assignedSale = v.assignedSale;
    }
    if (isDeposit) {
      body.deposit = { amount: Number(v.depositAmount), date: v.depositDate };
      if (askSchedule && v.createSchedule) {
        body.schedule = {
          package: v.package,
          shootDate: v.shootDate,
          startTime: v.startTime || undefined,
          endTime: v.endTime || undefined,
          location: v.location || undefined,
          leadPhotographer: (crewEditor && v.leadPhotographer) || undefined,
        };
      }
    }
    try {
      const res = await customerService.changeStatus(customer._id, body);
      toast.success(`Đã chuyển sang "${CUSTOMER_STATUS_LABELS[target]}"`);
      if (res.schedule) toast.success('Đã tạo lịch chụp cho lớp.');
      (res.warnings ?? []).forEach((w) => toast.warn(w));
      onClose();
      onChanged();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Đổi trạng thái thất bại, vui lòng thử lại.'));
      // 409 = status changed meanwhile (or claimed by another sale) → refresh the page data.
      if ((err as { response?: { status?: number } })?.response?.status === 409) {
        onClose();
        onChanged();
      }
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[640px]">
        <div className="shrink-0 border-b px-5 py-4 pr-12 sm:px-6">
          <DialogTitle>{isLost ? 'Đánh dấu không chốt' : 'Chuyển trạng thái'}</DialogTitle>
          <DialogDescription asChild>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">
              <Badge variant={CUSTOMER_STATUS_VARIANT[current]} dot>
                {CUSTOMER_STATUS_LABELS[current]}
              </Badge>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              {target && (
                <Badge variant={CUSTOMER_STATUS_VARIANT[target]} dot>
                  {CUSTOMER_STATUS_LABELS[target]}
                </Badge>
              )}
              <span className="truncate text-muted-foreground">
                · Lớp {customer.className}
                {getSchoolName(customer) ? ` — ${getSchoolName(customer)}` : ''}
              </span>
            </div>
          </DialogDescription>
        </div>

        {target && (
          <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
              {isLost && (
                <FormField
                  label="Lý do không chốt"
                  required
                  htmlFor="lostReason"
                  error={errors.lostReason?.message}
                >
                  <Input
                    id="lostReason"
                    placeholder="VD: chọn studio khác, giá cao…"
                    {...register('lostReason', {
                      validate: (v) => !!v.trim() || 'Vui lòng nhập lý do',
                    })}
                  />
                </FormField>
              )}

              {isDeposit && (
                <section>
                  <SectionLabel>
                    <Wallet /> Tiền cọc
                  </SectionLabel>
                  <div className="grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2">
                    <FormField
                      label="Số tiền cọc (VNĐ)"
                      required
                      htmlFor="depositAmount"
                      error={errors.depositAmount?.message}
                      hint={
                        Number(depositAmount) > 0
                          ? formatCurrency(Number(depositAmount))
                          : undefined
                      }
                    >
                      <Input
                        id="depositAmount"
                        type="number"
                        min={0}
                        step="any"
                        className="tabular"
                        {...register('depositAmount', {
                          valueAsNumber: true,
                          validate: (v) => (Number(v) > 0 ? true : 'Số tiền cọc phải lớn hơn 0'),
                        })}
                      />
                    </FormField>
                    <FormField label="Ngày cọc" required error={errors.depositDate?.message}>
                      <Controller
                        name="depositDate"
                        control={control}
                        rules={{ required: 'Vui lòng chọn ngày cọc' }}
                        render={({ field }) => (
                          <DatePicker
                            value={field.value}
                            onChange={(val) => field.onChange(val ?? '')}
                            placeholder="Chọn ngày cọc"
                            className={fieldCls}
                          />
                        )}
                      />
                    </FormField>
                  </div>
                </section>
              )}

              {askSchedule && (
                <section className="rounded-[12px] border border-dashed p-4">
                  <label className="flex cursor-pointer items-start gap-2.5">
                    <Controller
                      name="createSchedule"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          className="mt-0.5"
                          checked={field.value}
                          onCheckedChange={(c) => field.onChange(c === true)}
                        />
                      )}
                    />
                    <span>
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <CalendarPlus className="h-4 w-4 text-primary-700 dark:text-primary" />
                        Tạo lịch chụp luôn
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Lớp chưa có lịch chụp. Tạo lịch để hệ thống tạo folder Drive cho lớp.
                      </span>
                    </span>
                  </label>

                  {createSchedule && (
                    <div className="mt-4 grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2">
                      <FormField label="Gói chụp" required error={errors.package?.message}>
                        <Controller
                          name="package"
                          control={control}
                          rules={{ required: 'Vui lòng chọn gói chụp' }}
                          render={({ field }) => (
                            <Select value={field.value || undefined} onValueChange={field.onChange}>
                              <SelectTrigger className={`${fieldCls} bg-card`}>
                                <SelectValue placeholder="Chọn gói chụp" />
                              </SelectTrigger>
                              <SelectContent>
                                {packages.map((p) => (
                                  <SelectItem key={p._id} value={p._id}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </FormField>
                      <FormField label="Ngày chụp" required error={errors.shootDate?.message}>
                        <Controller
                          name="shootDate"
                          control={control}
                          rules={{ required: 'Vui lòng chọn ngày chụp' }}
                          render={({ field }) => (
                            <DatePicker
                              value={field.value}
                              onChange={(val) => field.onChange(val ?? '')}
                              placeholder="Chọn ngày chụp"
                              className={fieldCls}
                            />
                          )}
                        />
                      </FormField>
                      <FormField label="Giờ bắt đầu">
                        <Controller
                          name="startTime"
                          control={control}
                          render={({ field }) => (
                            <TimePicker
                              value={field.value}
                              onChange={(val) => field.onChange(val ?? '')}
                              placeholder="Chọn giờ bắt đầu"
                              className={fieldCls}
                            />
                          )}
                        />
                      </FormField>
                      <FormField label="Giờ kết thúc">
                        <Controller
                          name="endTime"
                          control={control}
                          render={({ field }) => (
                            <TimePicker
                              value={field.value}
                              onChange={(val) => field.onChange(val ?? '')}
                              placeholder="Chọn giờ kết thúc"
                              className={fieldCls}
                            />
                          )}
                        />
                      </FormField>
                      <FormField label="Địa điểm" htmlFor="location">
                        <Input
                          id="location"
                          placeholder="Địa điểm chụp"
                          {...register('location')}
                        />
                      </FormField>
                      <FormField label="Thợ chụp chính">
                        <Controller
                          name="leadPhotographer"
                          control={control}
                          render={({ field }) => (
                            <Select
                              value={field.value || NONE}
                              onValueChange={(val) => field.onChange(val === NONE ? '' : val)}
                              disabled={!crewEditor}
                            >
                              <SelectTrigger className={`${fieldCls} bg-card`}>
                                <SelectValue placeholder="Chưa phân công" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={NONE}>Chưa phân công</SelectItem>
                                {photographers.map((u) => (
                                  <SelectItem key={u._id} value={u._id}>
                                    {u.name || u.username}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {!crewEditor && (
                          <p className="mt-1 text-xs text-muted-foreground">{CREW_EDITOR_HINT}</p>
                        )}
                      </FormField>
                    </div>
                  )}
                </section>
              )}

              {isAdmin && (
                <FormField label="Sale phụ trách">
                  <Controller
                    name="assignedSale"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value || undefined} onValueChange={field.onChange}>
                        <SelectTrigger className={`${fieldCls} bg-card`}>
                          <SelectValue placeholder="Chưa có sale phụ trách" />
                        </SelectTrigger>
                        <SelectContent>
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

              <FormField label="Ghi chú" required htmlFor="note" error={errors.note?.message}>
                <Textarea
                  id="note"
                  rows={3}
                  placeholder="Ghi chú lý do / nội dung trao đổi…"
                  {...register('note', {
                    validate: (v) => !!v.trim() || 'Cần ghi chú khi đổi trạng thái',
                  })}
                />
              </FormField>
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t bg-muted/40 px-5 py-3.5 sm:px-6">
              <Button type="button" variant="outline" onClick={onClose}>
                Huỷ
              </Button>
              <Button
                type="submit"
                variant={isLost ? 'destructive' : 'default'}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Đang lưu...' : 'Xác nhận'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CustomerStatusDialog;
