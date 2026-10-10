import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import {
  AlertTriangle,
  ArrowUpRight,
  Calculator,
  Camera,
  Copy,
  FilePen,
  FileText,
  Info,
  Lock,
  MapPin,
  Minus,
  Plus,
  Sparkles,
  Users,
  Video,
  Wallet,
  X,
} from 'lucide-react';
import {
  Button,
  Combobox,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  FormField,
  Input,
  Label,
  Textarea,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { customerService } from '../../services/customerService';
import { scheduleService } from '../../services/scheduleService';
import type { Customer, ExtraService, Package, ScheduleResponse } from '../../types';
import { getSchoolName } from '../../types';
import { calcCrewCount } from '../../utils/crewCount';
import { formatDate } from '../../utils/format';

const formatNum = (n: number) => Math.round(n).toLocaleString('vi-VN');
const formatVnd = (n: number) => `${formatNum(n)} ₫`;

const CONTRACT_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzgl6HRhrlbo_nf_ZgmIXxeWRGgd7OlGMdMm2JQ0QISTQ0Z_ZHTb0E6W-DS1LRFSmw/exec';

interface ExtraServiceRow {
  name: string;
  quantity: number;
  unitPrice: number;
  note: string;
}

interface ContractFormValues {
  package: string;
  /** Giá / thành viên in trên hợp đồng — mặc định theo gói, có thể chỉnh. */
  pricePerMember: number;
  shootDate: string;
  location: string;
  total: number;
  totalMale: number;
  totalFemale: number;
  extraServices: ExtraServiceRow[];
  /** Số thợ cuối cùng — mặc định theo số hệ thống tính, có thể chỉnh tay. */
  crewCount: number;
  /** Bắt buộc khi `crewCount` khác số hệ thống tính. */
  crewCountReason: string;
}

const formFieldCls = 'h-10 rounded-[10px]';

const toSafeNumber = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** A service row the user actually filled in (blank rows are ignored, like on submit). */
const rowHasValue = (sv: ExtraServiceRow | undefined) =>
  !!sv && (!!sv.name?.trim() || toSafeNumber(sv.unitPrice) > 0 || !!sv.note?.trim());

const isNonNegative = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

const getApiErrorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

const packageLabel = (p: Package) =>
  `${p.name} · ${formatVnd(p.pricePerMember)}/HS · ${
    p.studentsPerCrew ? `${p.studentsPerCrew} HS/thợ` : 'chưa cài HS/thợ'
  }`;

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

const SectionLabel = ({
  icon,
  children,
  className,
}: {
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5',
      className,
    )}
  >
    {icon}
    {children}
  </div>
);

/** Read-only box with a lock icon (system value / locked amount). */
const LockedBox = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div
    className={cn(
      'flex h-10 items-center gap-2 rounded-[10px] border bg-muted/50 px-3 text-sm',
      className,
    )}
  >
    <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    {children}
  </div>
);

interface ContractDialogProps {
  /** Class to build the contract for; `null` closes the dialog. */
  customer: Customer | null;
  /** Main active schedule of the class (prefills package / date / location / services). */
  schedule?: ScheduleResponse | null;
  packages: Package[];
  /** Season name shown in the header (optional). */
  seasonName?: string;
  /** Admin "Tạo lại": overwrite the class's existing contract (prefilled from it). */
  regenerate?: boolean;
  onClose: () => void;
  /** Called with the updated class after the contract was saved on it. */
  onSaved?: (customer: Customer) => void;
}

type ContractFormProps = Omit<ContractDialogProps, 'customer'> & { customer: Customer };

/** Where the prefilled shoot date came from (helper under "Ngày chụp"). */
type DateSource = 'contract' | 'schedule' | 'expected' | null;

const initialValues = ({
  customer,
  schedule,
  packages,
  regenerate,
}: ContractFormProps): { values: ContractFormValues; dateSource: DateSource } => {
  const prev = regenerate ? customer.contract : null;
  const packageId = prev?.package ?? schedule?.package?._id ?? '';
  const pkg = packages.find((p) => p._id === packageId);
  const services = prev?.extraServices ?? schedule?.extraServices ?? [];
  const dateSource: DateSource = prev?.shootDate
    ? 'contract'
    : schedule?.shootDate
      ? 'schedule'
      : customer.expectedShootDate
        ? 'expected'
        : null;
  return {
    dateSource,
    values: {
      package: pkg ? packageId : '',
      pricePerMember: prev?.pricePerMember ?? pkg?.pricePerMember ?? NaN,
      shootDate: (prev?.shootDate ?? schedule?.shootDate ?? customer.expectedShootDate ?? '').slice(
        0,
        10,
      ),
      location: prev?.location ?? schedule?.location ?? '',
      total: customer.total ?? 0,
      totalMale: customer.totalMale ?? 0,
      totalFemale: customer.totalFemale ?? 0,
      extraServices: services.map((sv) => ({
        name: sv.name,
        quantity: sv.quantity,
        unitPrice: sv.unitPrice,
        note: sv.note ?? '',
      })),
      crewCount: prev?.crewCount ?? calcCrewCount(customer.total ?? 0, pkg?.studentsPerCrew) ?? NaN,
      crewCountReason: '',
    },
  };
};

const DATE_SOURCE_HINT: Record<Exclude<DateSource, null>, string> = {
  contract: 'Lấy từ hợp đồng hiện tại',
  schedule: 'Lấy từ lịch chụp của lớp',
  expected: 'Lấy từ ngày dự kiến chụp',
};

/**
 * Form body — mounted fresh (keyed by class id) each time the dialog opens, so values are
 * initialised synchronously from the class (+ main schedule / existing contract).
 */
const ContractForm = (props: ContractFormProps) => {
  const { customer, schedule, packages, regenerate, onClose, onSaved } = props;
  const [{ values: defaults, dateSource }] = useState(() => initialValues(props));
  // Link of the doc created in this session (shown even if saving it on the class failed)
  const [contractDocUrl, setContractDocUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // Số thợ đi theo số hệ thống tính cho tới khi người dùng tự sửa ô "Số thợ"
  const [crewEdited, setCrewEdited] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getValues,
    formState: { isSubmitting, errors, dirtyFields },
  } = useForm<ContractFormValues>({ defaultValues: defaults });
  const {
    fields: serviceFields,
    append: appendService,
    remove: removeService,
  } = useFieldArray({ control, name: 'extraServices' });

  const selectedPackage = packages.find((p) => p._id === watch('package'));
  const studentsPerCrew = selectedPackage?.studentsPerCrew;
  const totalStudents = Number(watch('total')) || 0;
  const crewSystem = calcCrewCount(totalStudents, studentsPerCrew);
  const crewCountValue = watch('crewCount');
  const crewDiff =
    crewSystem != null && Number.isFinite(crewCountValue) ? crewCountValue - crewSystem : 0;
  const crewAdjusted = crewDiff !== 0;

  const syncCrew = (total: number, perCrew: number | undefined) => {
    if (crewEdited) return;
    const next = calcCrewCount(total, perCrew);
    if (next != null) setValue('crewCount', next);
  };
  const stepCrew = (delta: number) => {
    const current = Number(getValues('crewCount'));
    const base = Number.isFinite(current) ? current : (crewSystem ?? 0);
    setCrewEdited(true);
    setValue('crewCount', Math.max(0, base + delta), { shouldValidate: true });
  };

  // Same formula as Code_create_HD.gs: students × price per member + extra services
  const pricePerMember = toSafeNumber(watch('pricePerMember'));
  const watchedServices = watch('extraServices');
  // Same rows as the payload: only named services count
  const extraTotal = watchedServices
    .filter((sv) => sv.name?.trim())
    .reduce((sum, sv) => sum + toSafeNumber(sv.quantity) * toSafeNumber(sv.unitPrice), 0);
  const totalPayment = totalStudents * pricePerMember + extraTotal;
  const deposit = customer.deposit;
  const depositAmount = deposit?.amount && deposit.amount > 0 ? deposit.amount : null;

  const onSubmit = async (formData: ContractFormValues) => {
    const pkg = packages.find((p) => p._id === formData.package);
    if (!pkg) return;
    const price = toSafeNumber(formData.pricePerMember);
    const system = calcCrewCount(formData.total, pkg.studentsPerCrew);
    const crewCount = formData.crewCount;
    const adjusted = system != null && crewCount !== system;
    const crewCountReason = adjusted ? formData.crewCountReason.trim() : '';
    const extraServices: ExtraService[] = formData.extraServices
      .filter((sv) => sv.name.trim())
      .map((sv) => {
        const quantity = toSafeNumber(sv.quantity);
        const unitPrice = toSafeNumber(sv.unitPrice);
        const note = sv.note.trim();
        return {
          name: sv.name.trim(),
          quantity,
          unitPrice,
          amount: quantity * unitPrice,
          ...(note ? { note } : {}),
        };
      });
    const totalWithServices =
      (Number(formData.total) || 0) * price + extraServices.reduce((s, sv) => s + sv.amount, 0);
    const location = formData.location.trim();
    // Apps Script (Code_create_HD.gs) vẫn đọc `customer.school` dạng chuỗi
    const payload = {
      shootDate: formData.shootDate,
      location,
      contactName: customer.contactName,
      contactPhone: customer.contactPhone,
      total: formData.total,
      totalMale: formData.totalMale,
      totalFemale: formData.totalFemale,
      // Giá / thành viên đã chỉnh trong form thay cho giá gói
      package: { ...pkg, pricePerMember: price },
      extraServices,
      crewCount,
      crewCountSystem: system,
      crewCountReason,
      videoCrewCount: pkg.hasMv ? 1 : 0,
      // null → hợp đồng để trống "………" ở Tiền cọc & Đợt 2 (tự cập nhật khi ghi nhận cọc)
      depositAmount,
      customer: { ...customer, school: getSchoolName(customer) },
    };
    let json: {
      document_url?: string;
      documentId?: string;
      totalPayment?: number;
      depositAmount?: number | null;
      message?: string;
    };
    try {
      const res = await fetch(CONTRACT_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      });
      json = await res.json();
    } catch {
      toast.error('Tạo hợp đồng thất bại, vui lòng thử lại.');
      return;
    }
    const docUrl = json.document_url;
    if (!docUrl) {
      toast.error(json.message ?? 'Không nhận được link hợp đồng.');
      return;
    }
    setContractDocUrl(docUrl);
    const printedDeposit: number | null =
      json.depositAmount === undefined ? depositAmount : (json.depositAmount ?? null);
    try {
      const updated = await customerService.saveContract(customer._id, {
        expectedUrl: customer.contract?.url ?? null,
        url: docUrl,
        docId: json.documentId ?? null,
        total: Number(json.totalPayment ?? totalWithServices),
        package: pkg._id,
        pricePerMember: price,
        shootDate: formData.shootDate,
        location,
        extraServices,
        crewCount: Number.isInteger(crewCount) ? crewCount : null,
        crewCountSystem: system,
        videoCrewCount: pkg.hasMv ? 1 : 0,
        depositAmount: printedDeposit,
        depositSyncedAt: printedDeposit !== null ? new Date().toISOString() : null,
      });
      setSaved(true);
      onSaved?.(updated);
      toast.success(json.message ?? 'Tạo hợp đồng thành công!');
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          'Đã tạo hợp đồng nhưng không lưu được vào lớp — copy link bên dưới và thử lại.',
        ),
      );
      return;
    }
    // Dịch vụ thêm của lịch chụp đang áp dụng theo đúng hợp đồng (để 2 nơi không lệch nhau)
    if (schedule) {
      try {
        await scheduleService.update(schedule._id, { extraServices });
      } catch {
        toast.warn('Đã tạo hợp đồng nhưng không cập nhật được dịch vụ thêm của lịch chụp.');
      }
    }
    // Ghi nhật ký lớp khi số thợ khác số hệ thống tính — lỗi ở đây không làm hỏng hợp đồng
    if (adjusted) {
      try {
        await customerService.addNote(
          customer._id,
          `Hợp đồng: số thợ ${crewCount} (hệ thống tính ${system}) — Lý do: ${crewCountReason}`,
        );
      } catch {
        toast.warn('Đã tạo hợp đồng nhưng không ghi được nhật ký điều chỉnh số thợ.');
      }
    }
  };

  const countRules = {
    valueAsNumber: true as const,
    validate: (v: number) => (Number.isInteger(v) && v >= 0) || 'Nhập số nguyên ≥ 0',
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
        <section>
          <SectionLabel icon={<Camera />} className="mb-3">
            Buổi chụp
          </SectionLabel>
          <div className="grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-[minmax(0,1fr)_200px]">
            <FormField label="Gói chụp" required>
              <Controller
                name="package"
                control={control}
                rules={{ required: true }}
                render={({ field, fieldState }) => (
                  <>
                    <Combobox
                      options={packages.map((p) => ({ value: p._id, label: packageLabel(p) }))}
                      value={field.value}
                      onChange={(v) => {
                        field.onChange(v ?? '');
                        const pkg = packages.find((p) => p._id === v);
                        if (pkg) setValue('pricePerMember', pkg.pricePerMember);
                        syncCrew(getValues('total'), pkg?.studentsPerCrew);
                      }}
                      placeholder="-- Chọn gói chụp --"
                      className={formFieldCls}
                    />
                    {fieldState.error && (
                      <p className="mt-1 text-xs text-destructive">Vui lòng chọn gói chụp.</p>
                    )}
                  </>
                )}
              />
            </FormField>
            <FormField
              label="Giá / thành viên"
              required
              error={errors.pricePerMember ? 'Nhập giá ≥ 0' : undefined}
            >
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  className="pr-8 tabular"
                  {...register('pricePerMember', {
                    valueAsNumber: true,
                    validate: (v) => (Number.isFinite(v) && v >= 0) || false,
                  })}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  ₫
                </span>
              </div>
            </FormField>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2">
            <FormField
              label="Ngày chụp"
              required
              hint={dateSource && !dirtyFields.shootDate ? DATE_SOURCE_HINT[dateSource] : undefined}
            >
              <Controller
                name="shootDate"
                control={control}
                rules={{ required: true }}
                render={({ field, fieldState }) => (
                  <>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="DD/MM/YYYY"
                      className={formFieldCls}
                    />
                    {fieldState.error && (
                      <p className="mt-1 text-xs text-destructive">Vui lòng chọn ngày chụp.</p>
                    )}
                  </>
                )}
              />
            </FormField>
            <div className="space-y-1.5">
              <Label htmlFor="contract-location">
                Địa điểm{' '}
                <span className="ml-1 font-normal text-muted-foreground">Không bắt buộc</span>
              </Label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="contract-location"
                  placeholder="VD: Hồ Tây, sân trường…"
                  className="pl-9"
                  {...register('location')}
                />
              </div>
            </div>
          </div>
        </section>

        <section>
          <SectionLabel icon={<Users />} className="mb-3">
            Sĩ số
          </SectionLabel>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Tổng sĩ số" required error={errors.total?.message}>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  className="pr-10 tabular"
                  {...register('total', {
                    ...countRules,
                    onChange: (e) => syncCrew(Number(e.target.value), studentsPerCrew),
                  })}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  HS
                </span>
              </div>
            </FormField>
            <FormField label="Nam" required error={errors.totalMale?.message}>
              <Input
                type="number"
                min={0}
                className="tabular"
                {...register('totalMale', countRules)}
              />
            </FormField>
            <FormField label="Nữ" required error={errors.totalFemale?.message}>
              <Input
                type="number"
                min={0}
                className="tabular"
                {...register('totalFemale', countRules)}
              />
            </FormField>
          </div>
        </section>

        <section>
          <SectionLabel icon={<Sparkles />} className="mb-3">
            Dịch vụ thêm
          </SectionLabel>
          {serviceFields.length > 0 && (
            <div className="overflow-x-auto rounded-[12px] border">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/60 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                    <th className="px-3 py-2.5 text-left font-bold">Dịch vụ</th>
                    <th className="w-24 px-3 py-2.5 text-left font-bold">Số lượng</th>
                    <th className="w-32 px-3 py-2.5 text-left font-bold">Đơn giá</th>
                    <th className="w-28 px-3 py-2.5 text-right font-bold">Thành tiền</th>
                    <th className="w-10 px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {serviceFields.map((field, idx) => {
                    const sv = watchedServices[idx];
                    const amount = toSafeNumber(sv?.quantity) * toSafeNumber(sv?.unitPrice);
                    const rowErrors = errors.extraServices?.[idx];
                    return (
                      <tr key={field.id}>
                        <td className="px-3 py-2">
                          <Input
                            {...register(`extraServices.${idx}.name`, {
                              validate: (v, form) =>
                                !!v.trim() ||
                                !rowHasValue(form.extraServices[idx]) ||
                                'Nhập tên dịch vụ',
                            })}
                            placeholder="Tên dịch vụ"
                            aria-invalid={!!rowErrors?.name || undefined}
                            className={cn('h-9', rowErrors?.name && 'border-destructive')}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            {...register(`extraServices.${idx}.quantity`, {
                              valueAsNumber: true,
                              validate: (v, form) =>
                                !form.extraServices[idx]?.name?.trim() ||
                                isNonNegative(v) ||
                                'Số lượng ≥ 0',
                            })}
                            type="number"
                            min={0}
                            aria-invalid={!!rowErrors?.quantity || undefined}
                            className={cn(
                              'h-9 tabular',
                              rowErrors?.quantity && 'border-destructive',
                            )}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            {...register(`extraServices.${idx}.unitPrice`, {
                              valueAsNumber: true,
                              validate: (v, form) =>
                                !form.extraServices[idx]?.name?.trim() ||
                                isNonNegative(v) ||
                                'Đơn giá ≥ 0',
                            })}
                            type="number"
                            min={0}
                            aria-invalid={!!rowErrors?.unitPrice || undefined}
                            className={cn(
                              'h-9 tabular',
                              rowErrors?.unitPrice && 'border-destructive',
                            )}
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular">
                          {formatNum(amount)}
                        </td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() => removeService(idx)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"
                            title="Xoá"
                            aria-label="Xoá dịch vụ"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {errors.extraServices && (
            <p className="mt-1.5 text-xs text-destructive">
              Kiểm tra dịch vụ thêm: dòng có nội dung cần tên, số lượng và đơn giá ≥ 0.
            </p>
          )}
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary-700 hover:underline dark:text-primary',
              serviceFields.length > 0 && 'mt-3',
            )}
            onClick={() => appendService({ name: '', quantity: 1, unitPrice: 0, note: '' })}
          >
            <Plus className="h-4 w-4" /> Thêm dịch vụ
          </button>
        </section>

        <section>
          <SectionLabel icon={<Camera />} className="mb-3">
            Ekip
          </SectionLabel>
          <div className="space-y-4 rounded-[12px] border bg-muted/30 p-4">
            <div className="grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Số thợ (hệ thống tính)</Label>
                <LockedBox className="bg-card">
                  {crewSystem != null ? (
                    <>
                      <span className="font-semibold tabular">{crewSystem}</span>
                      <span className="text-muted-foreground">thợ</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">— Chưa tính được</span>
                  )}
                </LockedBox>
                {crewSystem != null && studentsPerCrew ? (
                  <p className="text-xs text-muted-foreground tabular">
                    {totalStudents} HS ÷ {studentsPerCrew} HS/thợ ={' '}
                    {Math.floor(totalStudents / studentsPerCrew)} (dư{' '}
                    {totalStudents % studentsPerCrew}) → {crewSystem} thợ
                  </p>
                ) : selectedPackage ? (
                  <div className="flex items-start gap-2 rounded-[10px] bg-amber-500/15 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <div>
                      <div className="font-semibold">Gói chưa cài số học sinh / 1 thợ</div>
                      <div>
                        Cài đặt trong{' '}
                        <Link
                          to="/packages"
                          target="_blank"
                          className="inline-flex items-center font-medium underline-offset-2 hover:underline"
                        >
                          Gói chụp <ArrowUpRight className="h-3 w-3" />
                        </Link>{' '}
                        · hoặc nhập số thợ thủ công
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
              <FormField label="Số thợ" required error={errors.crewCount?.message}>
                <div
                  className={cn(
                    'flex h-10 items-center rounded-[10px] border bg-card',
                    crewAdjusted && 'border-primary ring-1 ring-primary/40',
                  )}
                >
                  <button
                    type="button"
                    aria-label="Bớt 1 thợ"
                    onClick={() => stepCrew(-1)}
                    className="inline-flex h-full w-10 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    aria-label="Số thợ"
                    className="h-full min-w-0 flex-1 bg-transparent text-center text-base font-semibold tabular outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    {...register('crewCount', {
                      valueAsNumber: true,
                      onChange: () => setCrewEdited(true),
                      validate: (v) =>
                        (Number.isInteger(v) && v >= 0) || 'Vui lòng nhập số thợ (số nguyên ≥ 0).',
                    })}
                  />
                  <button
                    type="button"
                    aria-label="Thêm 1 thợ"
                    onClick={() => stepCrew(1)}
                    className="inline-flex h-full w-10 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {crewAdjusted ? (
                  <p className="flex items-center gap-1 text-xs font-semibold text-primary-700 dark:text-primary">
                    <AlertTriangle className="h-3.5 w-3.5" /> Khác số hệ thống tính (
                    {crewDiff > 0 ? `+${crewDiff}` : crewDiff})
                  </p>
                ) : crewSystem == null ? (
                  <p className="text-xs text-muted-foreground">Nhập thủ công · không cần lý do</p>
                ) : null}
              </FormField>
            </div>
            {selectedPackage?.hasMv && (
              <div className="flex items-start gap-2.5 rounded-[10px] bg-primary/10 px-3.5 py-3 text-[13px]">
                <Video className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <div className="font-semibold text-primary-700 dark:text-primary">
                    Thợ quay MV: 1 thợ
                  </div>
                  <p className="mt-0.5 text-muted-foreground">
                    Gói có quay MV kỷ yếu — mỗi lớp 1 thợ quay, in vào hợp đồng
                  </p>
                </div>
              </div>
            )}
            {crewAdjusted && (
              <FormField
                label="Lý do điều chỉnh số thợ"
                required
                error={errors.crewCountReason?.message}
                hint="Bắt buộc khi số thợ khác số hệ thống tính"
              >
                <Textarea
                  rows={2}
                  placeholder="Vì sao số thợ khác số hệ thống tính..."
                  className="bg-card"
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
          </div>
        </section>

        <section>
          <SectionLabel icon={<Wallet />} className="mb-3">
            Thanh toán
          </SectionLabel>
          {depositAmount === null && (
            <div className="mb-3 flex items-start gap-2.5 rounded-[12px] border border-primary/40 bg-primary-100 px-3.5 py-3 text-[13px] dark:bg-primary/15">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-700 dark:text-primary" />
              <div>
                <div className="font-semibold text-primary-700 dark:text-primary">
                  Lớp chưa có tiền cọc
                </div>
                <p className="mt-0.5 text-muted-foreground">
                  Hợp đồng sẽ để trống “………” ở Tiền cọc và Đợt 2. Khi ghi nhận cọc, hợp đồng tự cập
                  nhật 2 ô này.
                </p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <div className="text-sm font-medium">Tiền cọc (đợt 1)</div>
              <LockedBox>
                {depositAmount !== null ? (
                  <>
                    <span className="font-semibold tabular">{formatVnd(depositAmount)}</span>
                    {deposit?.date && (
                      <span className="ml-auto text-xs text-muted-foreground tabular">
                        {formatDate(deposit.date)}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground">……… ₫</span>
                    <span className="ml-auto text-xs text-muted-foreground">chờ cọc</span>
                  </>
                )}
              </LockedBox>
              {depositAmount !== null && (
                <p className="text-xs text-muted-foreground">Lấy từ giao dịch cọc của lớp</p>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="text-sm font-medium">Đợt 2 (còn lại)</div>
              {depositAmount !== null ? (
                <>
                  <div className="flex h-10 items-center gap-2 rounded-[10px] border border-primary/60 bg-primary-100 px-3 text-sm dark:bg-primary/15">
                    <Calculator className="h-3.5 w-3.5 shrink-0 text-primary-700 dark:text-primary" />
                    <span className="font-semibold text-primary-700 tabular dark:text-primary">
                      {formatVnd(Math.max(totalPayment - depositAmount, 0))}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">= Tổng − cọc</span>
                  </div>
                  <p className="text-xs text-muted-foreground tabular">
                    Tự tính · {formatNum(totalPayment)} − {formatNum(depositAmount)}
                  </p>
                </>
              ) : (
                <LockedBox>
                  <span className="text-muted-foreground">……… ₫</span>
                  <span className="ml-auto text-xs text-muted-foreground">chờ cọc</span>
                </LockedBox>
              )}
            </div>
          </div>
        </section>

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

      <div className="flex shrink-0 items-center justify-between gap-3 border-t px-5 py-2.5 text-sm sm:px-6">
        <span className="min-w-0 truncate text-xs text-muted-foreground tabular">
          {totalStudents} × {formatNum(pricePerMember)}
          {extraTotal > 0 ? ` + dịch vụ ${formatNum(extraTotal)}` : ''}
        </span>
        <span className="shrink-0">
          <span className="text-muted-foreground">Tổng cộng</span>{' '}
          <span className="text-base font-bold text-primary-700 tabular dark:text-primary">
            {formatVnd(totalPayment)}
          </span>
        </span>
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t bg-muted/40 px-5 py-3.5 sm:px-6">
        <Button type="button" variant="outline" onClick={onClose}>
          {saved ? 'Đóng' : 'Huỷ'}
        </Button>
        <Button type="submit" disabled={isSubmitting || saved}>
          <FileText />{' '}
          {isSubmitting ? 'Đang tạo...' : regenerate ? 'Tạo lại hợp đồng' : 'Tạo hợp đồng'}
        </Button>
      </div>
    </form>
  );
};

/**
 * "Tạo hợp đồng" dialog for a class — posts the class info + edited fields to the Apps Script
 * that renders the contract doc, then saves the result on the class (PUT /customers/:id/contract).
 * No schedule is required; the main schedule (if any) only prefills the form.
 */
const ContractDialog = ({ customer, ...rest }: ContractDialogProps) => (
  <Dialog open={!!customer} onOpenChange={(o) => !o && rest.onClose()}>
    <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[760px]">
      <div className="flex shrink-0 items-center gap-3 border-b px-5 py-4 pr-12 sm:px-6">
        <IconTile className="h-10 w-10 rounded-[10px] bg-primary-100 text-primary-700 dark:bg-primary/15 dark:text-primary">
          <FilePen />
        </IconTile>
        <div className="min-w-0 text-left">
          <DialogTitle>{rest.regenerate ? 'Tạo lại hợp đồng' : 'Tạo hợp đồng'}</DialogTitle>
          <DialogDescription className="mt-0.5 truncate text-[13px]">
            {[
              customer?.className ? `Lớp ${customer.className}` : '',
              getSchoolName(customer),
              rest.seasonName,
            ]
              .filter(Boolean)
              .join(' · ')}
          </DialogDescription>
        </div>
      </div>

      {customer && <ContractForm key={customer._id} customer={customer} {...rest} />}
    </DialogContent>
  </Dialog>
);

export default ContractDialog;
