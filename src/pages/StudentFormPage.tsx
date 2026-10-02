import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { formatDate } from '../utils/format';
import {
  AlertCircle,
  Building2,
  CalendarCheck,
  Check,
  Gift,
  Mars,
  Send,
  UserPlus,
  Venus,
} from 'lucide-react';
import Logo from '../components/atoms/Logo';
import { studentService } from '../services/studentService';
import { scheduleService } from '../services/scheduleService';
import type { PublicScheduleResponse } from '../types';
import { getSchoolName } from '../types';
import { Button, FormField, Input, Label, PageLoader, Textarea } from '@/components/ui';
import { cn } from '@/lib/utils';

interface FormValues {
  name: string;
  gender: 'male' | 'female';
  height: number | '';
  weight: number | '';
  notes: string;
  costumes: string[];
}

type Status = 'idle' | 'loading' | 'success' | 'error';

interface Summary {
  name: string;
  height: number | undefined;
  weight: number | undefined;
  costumes: string[];
}

const PageShell = ({ children, sheet }: { children: React.ReactNode; sheet?: boolean }) => (
  <div className="min-h-screen bg-[#FBFAF7] dark:bg-background">
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      <div className="flex items-center gap-2.5 px-5 pb-3 pt-5">
        <Logo size={32} />
        <span className="font-display text-[15px] font-bold">Yume Studio</span>
      </div>
      {sheet ? (
        children
      ) : (
        <div className="flex flex-1 flex-col justify-center px-5 pb-20">{children}</div>
      )}
    </div>
  </div>
);

const inputCls = 'h-[46px] rounded-xl bg-card px-3.5';

const StudentFormPage = () => {
  const { customer } = useParams<{ customer: string }>();
  const [schedule, setSchedule] = useState<PublicScheduleResponse | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<Status>('idle');
  const [summary, setSummary] = useState<Summary | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<FormValues>({
    defaultValues: { name: '', gender: 'male', height: '', weight: '', notes: '', costumes: [] },
  });

  const gender = watch('gender');
  const visibleCostumes = (schedule?.costumes ?? []).filter(
    (c) => c.gender === gender || c.gender === 'unisex',
  );

  useEffect(() => {
    setValue(
      'costumes',
      visibleCostumes.map((c) => c._id),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, gender]);

  useEffect(() => {
    if (!customer) return;
    scheduleService
      .getPublicByCustomer(customer)
      .then((s) => {
        if (!s) {
          setLoadError(true);
          return;
        }
        setSchedule(s);
      })
      .catch(() => setLoadError(true));
  }, [customer]);

  const onSubmit = async (data: FormValues) => {
    setSubmitStatus('loading');
    const rawCostumes: unknown = data.costumes;
    const costumeIds: string[] = Array.isArray(rawCostumes)
      ? rawCostumes
      : rawCostumes
        ? [String(rawCostumes)]
        : [];
    try {
      await studentService.createPublic({
        customer,
        name: data.name,
        gender: data.gender,
        height: data.height !== '' ? Number(data.height) : undefined,
        weight: data.weight !== '' ? Number(data.weight) : undefined,
        notes: data.notes || undefined,
        costumes: costumeIds,
      });
      setSummary({
        name: data.name,
        height: data.height !== '' ? Number(data.height) : undefined,
        weight: data.weight !== '' ? Number(data.weight) : undefined,
        costumes: (schedule?.costumes ?? [])
          .filter((c) => costumeIds.includes(c._id))
          .map((c) => c.name),
      });
      setSubmitStatus('success');
      reset();
    } catch {
      setSubmitStatus('error');
    }
  };

  if (loadError) {
    return (
      <PageShell>
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15">
            <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="font-display text-xl font-bold">Không tìm thấy lớp học</p>
          <p className="mt-1.5 text-sm text-muted-foreground">Link có thể không còn hợp lệ</p>
        </div>
      </PageShell>
    );
  }

  if (!schedule) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FBFAF7] dark:bg-background">
        <PageLoader />
      </div>
    );
  }

  if (submitStatus === 'success') {
    const classLine = [schedule.customer.className, getSchoolName(schedule.customer)]
      .filter(Boolean)
      .join(' · ');
    const rows: [string, string][] = [];
    if (summary?.name) rows.push(['Học sinh', summary.name]);
    rows.push(['Lớp', classLine]);
    if (summary && (summary.height !== undefined || summary.weight !== undefined)) {
      rows.push([
        'Số đo',
        [
          summary.height !== undefined ? `${summary.height} cm` : null,
          summary.weight !== undefined ? `${summary.weight} kg` : null,
        ]
          .filter(Boolean)
          .join(' · '),
      ]);
    }
    if (summary && summary.costumes.length > 0)
      rows.push(['Trang phục', summary.costumes.join(', ')]);
    return (
      <PageShell>
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-[88px] w-[88px] items-center justify-center rounded-full bg-emerald-500/15">
            <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-emerald-600 text-white">
              <Check className="h-7 w-7" strokeWidth={2.5} />
            </div>
          </div>
          <h2 className="font-display text-2xl font-bold">Đã ghi nhận!</h2>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Thông tin của bạn đã được lưu thành công.
          </p>
        </div>
        {summary && (
          <div className="mt-6 space-y-2.5 rounded-2xl border bg-card p-4 text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <span className="text-muted-foreground">{k}</span>
                <span className="text-right font-semibold">{v}</span>
              </div>
            ))}
          </div>
        )}
        <Button
          variant="outline"
          className="mt-4 h-12 w-full rounded-xl font-semibold"
          onClick={() => setSubmitStatus('idle')}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Nhập thêm học sinh khác
        </Button>
      </PageShell>
    );
  }

  return (
    <PageShell sheet>
      <div className="px-5 pb-6 pt-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary-700 dark:text-primary">
          Nhập thông tin học sinh
        </p>
        <h1 className="mt-1.5 font-display text-[28px] font-bold leading-tight">
          {schedule.customer.className}
        </h1>
        {getSchoolName(schedule.customer) && (
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span>{getSchoolName(schedule.customer)}</span>
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-100 px-3 py-1.5 text-xs font-semibold text-primary-700 dark:bg-primary/15 dark:text-primary">
            <CalendarCheck className="h-3.5 w-3.5" />
            Ngày chụp: {formatDate(schedule.shootDate)}
          </span>
          {schedule.package && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <Gift className="h-3.5 w-3.5" />
              Gói chụp: {schedule.package.name}
            </span>
          )}
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex-1 space-y-5 rounded-t-[28px] border-t bg-card px-5 pb-10 pt-6 shadow-[0_-4px_24px_rgba(0,0,0,0.03)]"
      >
        <FormField label="Họ và tên" required htmlFor="name" error={errors.name?.message}>
          <Input
            id="name"
            placeholder="Nguyễn Văn A"
            className={inputCls}
            {...register('name', { required: 'Vui lòng nhập họ tên' })}
          />
        </FormField>

        <div className="space-y-1.5">
          <Label>
            Giới tính <span className="text-destructive">*</span>
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {(['male', 'female'] as const).map((g) => (
              <label
                key={g}
                className={cn(
                  'flex h-[52px] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring cursor-pointer items-center justify-center gap-2 rounded-xl border bg-card text-[15px] font-semibold transition-colors hover:bg-muted',
                  gender === g &&
                    'border-primary bg-primary-100 hover:bg-primary-100 dark:bg-primary/15',
                )}
              >
                <input
                  type="radio"
                  value={g}
                  {...register('gender', { required: true })}
                  className="peer sr-only"
                />
                {g === 'male' ? (
                  <>
                    <Mars className="h-[18px] w-[18px] text-sky-500" />
                    <span>Nam</span>
                  </>
                ) : (
                  <>
                    <Venus className="h-[18px] w-[18px] text-pink-500" />
                    <span>Nữ</span>
                  </>
                )}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Chiều cao" required htmlFor="height" error={errors.height?.message}>
            <div className="relative">
              <Input
                id="height"
                type="number"
                step="0.1"
                min="50"
                max="250"
                placeholder="165"
                className={cn(inputCls, 'pr-11')}
                {...register('height', {
                  required: 'Vui lòng nhập chiều cao',
                  validate: (v) => (v !== '' && Number(v) > 0) || 'Chiều cao không hợp lệ',
                })}
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                cm
              </span>
            </div>
          </FormField>
          <FormField label="Cân nặng" required htmlFor="weight" error={errors.weight?.message}>
            <div className="relative">
              <Input
                id="weight"
                type="number"
                step="0.1"
                min="10"
                max="200"
                placeholder="55"
                className={cn(inputCls, 'pr-10')}
                {...register('weight', {
                  required: 'Vui lòng nhập cân nặng',
                  validate: (v) => (v !== '' && Number(v) > 0) || 'Cân nặng không hợp lệ',
                })}
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                kg
              </span>
            </div>
          </FormField>
        </div>

        <div className="space-y-1.5">
          <Label>Trang phục</Label>
          <p className="text-xs text-muted-foreground">
            Đây là trang phục trong gói chụp của lớp, nếu không dùng có thể bỏ chọn.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {visibleCostumes.map((c) => (
              <label key={c._id} className="cursor-pointer">
                <input
                  type="checkbox"
                  value={c._id}
                  {...register('costumes')}
                  className="peer sr-only"
                />
                <span className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border bg-card px-3 text-sm font-medium peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-checked:border-primary peer-checked:bg-primary-100 peer-checked:text-primary-700 dark:peer-checked:bg-primary/15 dark:peer-checked:text-primary [&>svg]:hidden peer-checked:[&>svg]:block">
                  <Check className="h-3.5 w-3.5" />
                  {c.name}
                </span>
              </label>
            ))}
          </div>
        </div>

        <FormField label="Ghi chú" htmlFor="notes">
          <Textarea
            id="notes"
            rows={3}
            placeholder="Tuỳ chọn…"
            className="rounded-xl bg-card px-3.5 py-3"
            {...register('notes')}
          />
        </FormField>

        {submitStatus === 'error' && (
          <p className="text-sm text-destructive">Có lỗi xảy ra, vui lòng thử lại.</p>
        )}

        <Button
          type="submit"
          variant="gradient"
          disabled={isSubmitting}
          className="h-[50px] w-full rounded-xl text-[15px] font-semibold shadow-[0_6px_16px_rgba(245,158,11,0.3)]"
        >
          <Send className="mr-2 h-4 w-4" />
          {isSubmitting ? 'Đang gửi…' : 'Gửi thông tin'}
        </Button>
      </form>
    </PageShell>
  );
};

export default StudentFormPage;
