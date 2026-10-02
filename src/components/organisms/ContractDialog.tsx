import type { ReactNode } from 'react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { Copy, FileText } from 'lucide-react';
import {
  Button,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  FormField,
  Input,
  Textarea,
  TimePicker,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { customerService } from '../../services/customerService';
import { scheduleService } from '../../services/scheduleService';
import type { ScheduleResponse } from '../../types';
import { getSchoolName } from '../../types';
import { calcCrewCount } from '../../utils/crewCount';

const CONTRACT_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzgl6HRhrlbo_nf_ZgmIXxeWRGgd7OlGMdMm2JQ0QISTQ0Z_ZHTb0E6W-DS1LRFSmw/exec';

interface ContractFormValues {
  shootDate: string;
  startTime: string;
  endTime: string;
  location: string;
  contactName: string;
  contactPhone: string;
  contactAddress: string;
  total: number;
  totalMale: number;
  totalFemale: number;
  /** Số thợ cuối cùng — mặc định theo số hệ thống tính, có thể chỉnh tay. */
  crewCount: number;
  /** Bắt buộc khi `crewCount` khác số hệ thống tính. */
  crewCountReason: string;
  notes: string;
}

const formFieldCls = 'h-10 rounded-[10px]';

/** Soft tinted square icon tile. */
const IconTile = ({ className, children }: { className?: string; children: ReactNode }) => (
  <span
    className={cn(
      'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] [&_svg]:h-4 [&_svg]:w-4',
      className,
    )}
  >
    {children}
  </span>
);

const SectionLabel = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div
    className={cn(
      'text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground',
      className,
    )}
  >
    {children}
  </div>
);

interface ContractDialogProps {
  /** Schedule to build the contract for; `null` closes the dialog. */
  schedule: ScheduleResponse | null;
  onClose: () => void;
  /** Called after the contract doc was created and `contractUrl` saved on the schedule. */
  onCreated?: (documentUrl: string) => void;
}

const toFormValues = (schedule: ScheduleResponse): ContractFormValues => ({
  shootDate: schedule.shootDate ? schedule.shootDate.slice(0, 10) : '',
  startTime: schedule.startTime ?? '',
  endTime: schedule.endTime ?? '',
  location: schedule.location ?? '',
  contactName: schedule.customer?.contactName ?? '',
  contactPhone: schedule.customer?.contactPhone ?? '',
  contactAddress: schedule.customer?.contactAddress ?? '',
  total: schedule.customer?.total ?? 0,
  totalMale: schedule.customer?.totalMale ?? 0,
  totalFemale: schedule.customer?.totalFemale ?? 0,
  crewCount: calcCrewCount(schedule.customer?.total ?? 0, schedule.package?.studentsPerCrew) ?? NaN,
  crewCountReason: '',
  notes: schedule.notes ?? '',
});

/**
 * Form body — mounted fresh (keyed by schedule id) each time the dialog opens, so
 * values and the contract link are initialised synchronously from the schedule.
 */
const ContractForm = ({
  schedule,
  onClose,
  onCreated,
}: ContractDialogProps & { schedule: ScheduleResponse }) => {
  const [contractDocUrl, setContractDocUrl] = useState<string | null>(schedule.contractUrl ?? null);
  // Số thợ đi theo số hệ thống tính cho tới khi người dùng tự sửa ô "Số thợ"
  const [crewEdited, setCrewEdited] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getValues,
    formState: { isSubmitting, errors },
  } = useForm<ContractFormValues>({ defaultValues: toFormValues(schedule) });

  const studentsPerCrew = schedule.package?.studentsPerCrew;
  const crewSystem = calcCrewCount(watch('total'), studentsPerCrew);
  const crewCountValue = watch('crewCount');
  const crewAdjusted =
    crewSystem != null && Number.isFinite(crewCountValue) && crewCountValue !== crewSystem;

  const onSubmit = async (formData: ContractFormValues) => {
    const system = calcCrewCount(formData.total, studentsPerCrew);
    const crewCount = formData.crewCount;
    const adjusted = system != null && crewCount !== system;
    const crewCountReason = adjusted ? formData.crewCountReason.trim() : '';
    // Apps Script (Code_create_HD.gs) vẫn đọc `customer.school` dạng chuỗi
    const payload = {
      ...schedule,
      ...formData,
      crewCount,
      crewCountSystem: system,
      crewCountReason,
      customer: schedule.customer
        ? { ...schedule.customer, school: getSchoolName(schedule.customer) }
        : schedule.customer,
    };
    try {
      const res = await fetch(CONTRACT_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.document_url) {
        setContractDocUrl(json.document_url);
        // Ghi nhật ký lớp khi số thợ khác số hệ thống tính — lỗi ở đây không làm hỏng hợp đồng
        if (adjusted && schedule.customer?._id) {
          try {
            await customerService.addNote(
              schedule.customer._id,
              `Hợp đồng: số thợ ${crewCount} (hệ thống tính ${system}) — Lý do: ${crewCountReason}`,
            );
          } catch {
            toast.warn('Đã tạo hợp đồng nhưng không ghi được nhật ký điều chỉnh số thợ.');
          }
        }
        await scheduleService.update(schedule._id, { contractUrl: json.document_url });
        onCreated?.(json.document_url);
        toast.success(json.message ?? 'Tạo hợp đồng thành công!');
      } else {
        toast.error('Không nhận được link hợp đồng.');
      }
    } catch {
      toast.error('Tạo hợp đồng thất bại, vui lòng thử lại.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
        <section>
          <SectionLabel className="mb-3">Thông tin buổi chụp</SectionLabel>
          <div className="grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2">
            <FormField label="Ngày chụp" required>
              <Controller
                name="shootDate"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Chọn ngày chụp"
                    className={formFieldCls}
                  />
                )}
              />
            </FormField>
            <FormField label="Địa điểm">
              <Input placeholder="Địa điểm chụp" {...register('location')} />
            </FormField>
            <FormField label="Giờ bắt đầu">
              <Controller
                name="startTime"
                control={control}
                render={({ field }) => (
                  <TimePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Chọn giờ bắt đầu"
                    className={formFieldCls}
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
                    onChange={field.onChange}
                    placeholder="Chọn giờ kết thúc"
                    className={formFieldCls}
                  />
                )}
              />
            </FormField>
          </div>
        </section>

        <section>
          <SectionLabel className="mb-3">Liên hệ</SectionLabel>
          <div className="grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2">
            <FormField label="Người liên hệ" required>
              <Input placeholder="Họ tên" {...register('contactName')} />
            </FormField>
            <FormField label="Số điện thoại">
              <Input placeholder="SĐT" {...register('contactPhone')} />
            </FormField>
            <FormField label="Địa chỉ" className="sm:col-span-2">
              <Input placeholder="Địa chỉ liên hệ" {...register('contactAddress')} />
            </FormField>
          </div>
        </section>

        <section>
          <SectionLabel className="mb-3">Sĩ số</SectionLabel>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Tổng học sinh">
              <Input
                type="number"
                min={0}
                className="tabular"
                {...register('total', {
                  valueAsNumber: true,
                  onChange: (e) => {
                    if (crewEdited) return;
                    const next = calcCrewCount(Number(e.target.value), studentsPerCrew);
                    if (next != null) setValue('crewCount', next);
                  },
                })}
              />
            </FormField>
            <FormField label="Nam">
              <Input
                type="number"
                min={0}
                className="tabular"
                {...register('totalMale', { valueAsNumber: true })}
              />
            </FormField>
            <FormField label="Nữ">
              <Input
                type="number"
                min={0}
                className="tabular"
                {...register('totalFemale', { valueAsNumber: true })}
              />
            </FormField>
          </div>
        </section>

        <section>
          <SectionLabel className="mb-3">Ekip</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Số thợ (hệ thống tính)">
              <Input
                readOnly
                tabIndex={-1}
                className="tabular bg-muted/50"
                value={crewSystem ?? '—'}
              />
            </FormField>
            <FormField label="Số thợ" required error={errors.crewCount?.message}>
              <Input
                type="number"
                min={0}
                step={1}
                className="tabular"
                {...register('crewCount', {
                  valueAsNumber: true,
                  onChange: () => setCrewEdited(true),
                  validate: (v) =>
                    (Number.isInteger(v) && v >= 0) || 'Vui lòng nhập số thợ (số nguyên ≥ 0).',
                })}
              />
            </FormField>
          </div>
          {crewSystem == null && (
            <p className="mt-1.5 text-xs text-muted-foreground">Gói chưa cài số học sinh / 1 thợ</p>
          )}
          {crewAdjusted && (
            <FormField
              label="Lý do điều chỉnh số thợ"
              required
              error={errors.crewCountReason?.message}
              className="mt-4"
            >
              <Textarea
                rows={2}
                placeholder="Vì sao số thợ khác số hệ thống tính..."
                {...register('crewCountReason', {
                  validate: (v) => {
                    const system = calcCrewCount(getValues('total'), studentsPerCrew);
                    const crew = getValues('crewCount');
                    if (system == null || !Number.isFinite(crew) || crew === system) return true;
                    return !!v.trim() || 'Vui lòng nhập lý do điều chỉnh số thợ.';
                  },
                })}
              />
            </FormField>
          )}
        </section>

        <FormField label="Ghi chú">
          <Textarea rows={3} placeholder="Ghi chú hợp đồng..." {...register('notes')} />
        </FormField>

        {contractDocUrl && (
          <div>
            <SectionLabel className="mb-2">Hợp đồng</SectionLabel>
            <div className="flex items-center gap-3 overflow-hidden rounded-[12px] border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-sm">
              <IconTile className="h-8 w-8 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                <FileText />
              </IconTile>
              <a
                href={contractDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={contractDocUrl}
                className="min-w-0 flex-1 truncate font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                {(() => {
                  const idx = contractDocUrl.indexOf('/open');
                  return idx !== -1 ? contractDocUrl.slice(0, idx + 5) + '...' : contractDocUrl;
                })()}
              </a>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(contractDocUrl);
                  toast.success('Đã copy link hợp đồng!');
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t bg-muted/40 px-5 py-3.5 sm:px-6">
        <Button type="button" variant="outline" onClick={onClose}>
          Đóng
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          <FileText /> {isSubmitting ? 'Đang tạo...' : 'Tạo hợp đồng'}
        </Button>
      </div>
    </form>
  );
};

/**
 * "Xác nhận thông tin hợp đồng" dialog — posts the schedule + edited fields to the
 * Apps Script that renders the contract doc, then saves `contractUrl` on the schedule.
 * Shared by SchedulesPage and CustomerDetailPage.
 */
const ContractDialog = ({ schedule, onClose, onCreated }: ContractDialogProps) => (
  <Dialog open={!!schedule} onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[720px]">
      <div className="flex shrink-0 items-center gap-3 border-b px-5 py-4 pr-12 sm:px-6">
        <IconTile className="h-10 w-10 rounded-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
          <FileText />
        </IconTile>
        <div className="min-w-0 text-left">
          <DialogTitle>Xác nhận thông tin hợp đồng</DialogTitle>
          <DialogDescription className="mt-0.5 truncate text-[13px]">
            {schedule?.customer?.className}
            {getSchoolName(schedule?.customer) ? ` — ${getSchoolName(schedule?.customer)}` : ''}
          </DialogDescription>
        </div>
      </div>

      {schedule && (
        <ContractForm
          key={schedule._id}
          schedule={schedule}
          onClose={onClose}
          onCreated={onCreated}
        />
      )}
    </DialogContent>
  </Dialog>
);

export default ContractDialog;
