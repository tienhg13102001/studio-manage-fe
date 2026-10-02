import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Camera,
  Check,
  Heart,
  Images,
  Lightbulb,
  Phone,
  Send,
  ShieldCheck,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import Logo from '../components/atoms/Logo';
import { Button, Combobox, Input, PageLoader, Textarea } from '@/components/ui';
import { cn } from '@/lib/utils';
import { getSchoolName, type SchoolRef } from '../types';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

interface ClassInfo {
  _id: string;
  className: string;
  schoolId?: SchoolRef | null;
}

interface FormValues {
  customer: string;
  phone: string;
  crewRating: number;
  crewDescription: string;
  albumRating: number;
  albumDescription: string;
  content: string;
  suggestion: string;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

const RATING_LABELS = ['', 'Tệ', 'Chưa tốt', 'Ổn', 'Tốt', 'Tuyệt vời'];

const BrandBar = () => (
  <div className="flex items-center gap-2.5 px-5 pb-3 pt-5">
    <Logo size={32} />
    <span className="font-display text-[15px] font-bold">Yume Studio</span>
  </div>
);

const PageShell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-[#FBFAF7] dark:bg-background">
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      <BrandBar />
      {children}
    </div>
  </div>
);

const SectionCard = ({
  icon: Icon,
  tone,
  title,
  hint,
  required,
  children,
}: {
  icon: LucideIcon;
  tone: string;
  title: string;
  hint: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <section className="rounded-2xl border bg-card p-4">
    <div className="mb-3.5 flex items-start gap-3">
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]', tone)}>
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-[15px] font-bold">
          {title}
          {required && <span className="ml-1 text-rose-500">*</span>}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
    {children}
  </section>
);

const RatingTiles = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="flex items-center gap-2">
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          type="button"
          key={n}
          aria-label={`${n} sao`}
          onClick={() => onChange(n)}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            n <= value ? 'bg-primary-100 dark:bg-primary/15' : 'bg-muted',
          )}
        >
          <Star
            className={cn(
              'h-5 w-5',
              n <= value ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground/40',
            )}
          />
        </button>
      ))}
    </div>
    {value > 0 && (
      <span className="ml-auto text-sm font-semibold text-primary-700 dark:text-primary">
        {RATING_LABELS[value]}
      </span>
    )}
  </div>
);

const textareaCls = 'resize-none rounded-xl bg-muted/60 px-3.5 py-3 text-sm';

const FeedbackFormPage = () => {
  const { customer: paramCustomerId } = useParams<{ customer: string }>();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [fixedClass, setFixedClass] = useState<ClassInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<Status>('idle');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      customer: paramCustomerId || '',
      phone: '',
      crewRating: 0,
      crewDescription: '',
      albumRating: 0,
      albumDescription: '',
      content: '',
      suggestion: '',
    },
  });

  const crewRating = watch('crewRating');
  const albumRating = watch('albumRating');
  const crewDescription = watch('crewDescription');
  const albumDescription = watch('albumDescription');
  const selectedCustomerId = watch('customer');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (paramCustomerId) {
          const { data } = await api.get<{ data: ClassInfo }>(
            `/public/customers/${paramCustomerId}`,
          );
          if (!cancelled) {
            setFixedClass(data.data);
            setValue('customer', data.data._id);
          }
        } else {
          const { data } = await api.get<{ data: ClassInfo[] }>('/public/customers');
          if (!cancelled) setClasses(data.data);
        }
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [paramCustomerId, setValue]);

  const onSubmit = async (data: FormValues) => {
    setSubmitStatus('loading');
    try {
      await api.post('/public/feedback', {
        customer: data.customer || undefined,
        phone: data.phone || undefined,
        crewFeedback: {
          rating: Number(data.crewRating),
          description: data.crewDescription.trim(),
        },
        albumFeedback: {
          rating: Number(data.albumRating),
          description: data.albumDescription.trim(),
        },
        content: data.content || undefined,
        suggestion: data.suggestion || undefined,
      });
      setSubmitStatus('success');
      reset({
        customer: paramCustomerId || '',
        phone: '',
        crewRating: 0,
        crewDescription: '',
        albumRating: 0,
        albumDescription: '',
        content: '',
        suggestion: '',
      });
    } catch {
      setSubmitStatus('error');
    }
  };

  const canSubmit = useMemo(
    () =>
      (fixedClass || selectedCustomerId) &&
      crewRating > 0 &&
      albumRating > 0 &&
      crewDescription.trim().length > 0 &&
      albumDescription.trim().length > 0 &&
      !isSubmitting,
    [
      fixedClass,
      selectedCustomerId,
      crewRating,
      albumRating,
      crewDescription,
      albumDescription,
      isSubmitting,
    ],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FBFAF7] dark:bg-background">
        <PageLoader />
      </div>
    );
  }

  if (loadError) {
    return (
      <PageShell>
        <div className="flex flex-1 flex-col items-center justify-center px-5 pb-20 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15">
            <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="font-display text-xl font-bold">Không tìm thấy thông tin</p>
          <p className="mt-1.5 text-sm text-muted-foreground">Link có thể không còn hợp lệ</p>
        </div>
      </PageShell>
    );
  }

  if (submitStatus === 'success') {
    return (
      <PageShell>
        <div className="flex flex-1 flex-col items-center justify-center px-5 pb-20 text-center">
          <div className="mb-6 flex h-[88px] w-[88px] items-center justify-center rounded-full bg-emerald-500/15">
            <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-emerald-600 text-white">
              <Check className="h-7 w-7" strokeWidth={2.5} />
            </div>
          </div>
          <h2 className="font-display text-2xl font-bold">Cảm ơn bạn rất nhiều!</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            Phản hồi của bạn đã được ghi nhận. Chúng tôi sẽ dùng ý kiến này để phục vụ bạn tốt hơn
            trong tương lai.
          </p>
          <Button
            variant="outline"
            className="mt-6 h-12 w-full rounded-xl font-semibold"
            onClick={() => setSubmitStatus('idle')}
          >
            Gửi phản hồi khác
          </Button>
        </div>
      </PageShell>
    );
  }

  const totalSteps = 5;
  const completionCount =
    (selectedCustomerId || fixedClass ? 1 : 0) +
    (crewRating > 0 ? 1 : 0) +
    (albumRating > 0 ? 1 : 0) +
    (crewDescription.trim().length > 0 ? 1 : 0) +
    (albumDescription.trim().length > 0 ? 1 : 0);
  const progress = Math.round((completionCount / totalSteps) * 100);

  return (
    <PageShell>
      <div className="px-5 pb-4 pt-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary-700 dark:text-primary">
          Đánh giá trải nghiệm của bạn
        </p>
        <h1 className="mt-1.5 font-display text-2xl font-bold leading-tight">
          {fixedClass
            ? [fixedClass.className, getSchoolName(fixedClass)].filter(Boolean).join(' · ')
            : 'Gửi phản hồi'}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Ý kiến của bạn giúp studio phục vụ tốt hơn
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 space-y-3.5 px-4 pb-44">
        {fixedClass ? (
          <input type="hidden" {...register('customer')} />
        ) : (
          <section className="rounded-2xl border bg-card p-4">
            <label className="mb-2 block font-display text-[15px] font-bold">
              Lớp của bạn <span className="text-rose-500">*</span>
            </label>
            <Combobox
              options={classes.map((c) => ({
                value: c._id,
                label: getSchoolName(c) ? `${c.className} — ${getSchoolName(c)}` : c.className,
              }))}
              value={selectedCustomerId}
              onChange={(v) => setValue('customer', v, { shouldValidate: true })}
              placeholder="Chọn lớp…"
            />
            {errors.customer && (
              <p className="mt-2 text-xs text-rose-500">{errors.customer.message}</p>
            )}
          </section>
        )}

        <SectionCard
          icon={Camera}
          tone="bg-blue-500/15 text-blue-600 dark:text-blue-400"
          title="Ekip chụp ảnh"
          hint="Thái độ, sự chuyên nghiệp và kỹ năng"
          required
        >
          <input type="hidden" {...register('crewRating', { required: true, min: 1 })} />
          <RatingTiles
            value={crewRating}
            onChange={(v) => setValue('crewRating', v, { shouldValidate: true })}
          />
          <Textarea
            rows={2}
            placeholder="Chia sẻ thêm về ekip…"
            className={cn('mt-3.5', textareaCls, errors.crewDescription && 'border-destructive')}
            {...register('crewDescription', {
              required: true,
              validate: (v) => v.trim().length > 0,
            })}
          />
          {errors.crewDescription && (
            <p className="mt-1 text-xs text-destructive">Vui lòng chia sẻ thêm về ekip</p>
          )}
        </SectionCard>

        <SectionCard
          icon={Images}
          tone="bg-violet-500/15 text-violet-600 dark:text-violet-400"
          title="Album ảnh"
          hint="Chất lượng, bố cục và màu sắc"
          required
        >
          <input type="hidden" {...register('albumRating', { required: true, min: 1 })} />
          <RatingTiles
            value={albumRating}
            onChange={(v) => setValue('albumRating', v, { shouldValidate: true })}
          />
          <Textarea
            rows={2}
            placeholder="Chia sẻ thêm về album…"
            className={cn('mt-3.5', textareaCls, errors.albumDescription && 'border-destructive')}
            {...register('albumDescription', {
              required: true,
              validate: (v) => v.trim().length > 0,
            })}
          />
          {errors.albumDescription && (
            <p className="mt-1 text-xs text-destructive">Vui lòng chia sẻ thêm về album</p>
          )}
        </SectionCard>

        <SectionCard
          icon={Heart}
          tone="bg-teal-500/15 text-teal-600 dark:text-teal-400"
          title="Cảm nhận chung"
          hint="Trải nghiệm tổng thể của bạn"
        >
          <Textarea
            rows={3}
            className={textareaCls}
            placeholder="Hãy chia sẻ cảm nhận của bạn…"
            {...register('content')}
          />
        </SectionCard>

        <SectionCard
          icon={Lightbulb}
          tone="bg-amber-500/15 text-amber-600 dark:text-amber-400"
          title="Đề xuất cải thiện"
          hint="Studio có thể làm gì tốt hơn?"
        >
          <Textarea
            rows={3}
            className={textareaCls}
            placeholder="Góp ý để studio phục vụ bạn tốt hơn…"
            {...register('suggestion')}
          />
        </SectionCard>

        <SectionCard
          icon={Phone}
          tone="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          title="Số điện thoại · tuỳ chọn"
          hint="Để chúng tôi có thể liên hệ lại nếu cần"
        >
          <Input
            type="tel"
            placeholder="Để chúng tôi có thể liên hệ lại nếu cần"
            className="h-[46px] rounded-xl bg-muted/60 px-3.5 text-sm"
            {...register('phone')}
          />
          <p className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Phản hồi hoàn toàn ẩn danh trừ khi bạn để lại SĐT
          </p>
        </SectionCard>

        {submitStatus === 'error' && (
          <div className="inline-flex w-full items-center gap-1.5 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>Có lỗi xảy ra, vui lòng thử lại.</span>
          </div>
        )}
      </form>

      {/* Sticky submit bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 backdrop-blur">
        <div className="mx-auto w-full max-w-md px-4 pb-4 pt-3">
          <div className="mb-3 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs font-semibold">
              {completionCount === totalSteps
                ? 'Sẵn sàng gửi'
                : `Hoàn thành ${completionCount}/${totalSteps} mục bắt buộc`}
            </p>
          </div>
          <Button
            type="submit"
            variant="gradient"
            disabled={!canSubmit}
            onClick={handleSubmit(onSubmit)}
            className="h-[50px] w-full rounded-xl text-[15px] font-semibold"
          >
            <Send className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Đang gửi…' : 'Gửi phản hồi'}
          </Button>
        </div>
      </div>
    </PageShell>
  );
};

export default FeedbackFormPage;
