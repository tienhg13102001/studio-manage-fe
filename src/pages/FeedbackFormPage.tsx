import { useEffect, useMemo, useState } from 'react';
import { FaCamera, FaFilm, FaLightbulb, FaPhoneAlt, FaSchool } from 'react-icons/fa';
import { FiAlertCircle, FiMessageCircle } from 'react-icons/fi';
import { IoCheckmarkCircle } from 'react-icons/io5';
import { MdPhotoLibrary } from 'react-icons/md';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { Logo, PageLoader, Select, StarRating } from '../components/atoms';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

interface ClassInfo {
  _id: string;
  className: string;
  school?: string;
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
          const { data } = await api.get<ClassInfo>(`/public/customers/${paramCustomerId}`);
          if (!cancelled) {
            setFixedClass(data);
            setValue('customer', data._id);
          }
        } else {
          const { data } = await api.get<ClassInfo[]>('/public/customers');
          if (!cancelled) setClasses(data);
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
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--page-bg)' }}
      >
        <PageLoader />
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'var(--page-bg)' }}
      >
        <div className="text-center max-w-sm card w-full py-10">
          <div className="text-6xl mb-4 flex justify-center">
            <FiAlertCircle className="text-amber-500" />
          </div>
          <p className="font-semibold" style={{ fontSize: '18px', color: 'var(--text-primary)' }}>
            Không tìm thấy thông tin
          </p>
          <p className="mt-1" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Link có thể không còn hợp lệ
          </p>
        </div>
      </div>
    );
  }

  if (submitStatus === 'success') {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'var(--page-bg)' }}
      >
        <div className="card p-10 max-w-md w-full text-center rounded-3xl">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
            <Logo size={80} />
          </div>
          <h2 className="font-bold mb-2" style={{ fontSize: '24px', color: 'var(--text-primary)' }}>
            Cảm ơn bạn rất nhiều!
          </h2>
          <p
            className="leading-relaxed mb-8"
            style={{ fontSize: '15px', color: 'var(--text-muted)' }}
          >
            Phản hồi của bạn đã được ghi nhận. Chúng tôi sẽ dùng ý kiến này để phục vụ bạn tốt hơn
            trong tương lai.
          </p>
          <button
            onClick={() => setSubmitStatus('idle')}
            className="btn-primary w-full py-3"
            style={{ fontSize: '15px' }}
          >
            Gửi phản hồi khác
          </button>
        </div>
      </div>
    );
  }

  // Tailwind của app ép text-xs/sm thành 16px → dùng inline style cho chữ nhỏ thật sự
  const labelStyle = { fontSize: '13px' };
  const helperStyle = { fontSize: '12px' };
  const inputStyle = { fontSize: '15px' };
  const inputCls = 'input';

  const totalSteps = 5;
  const completionCount =
    (selectedCustomerId || fixedClass ? 1 : 0) +
    (crewRating > 0 ? 1 : 0) +
    (albumRating > 0 ? 1 : 0) +
    (crewDescription.trim().length > 0 ? 1 : 0) +
    (albumDescription.trim().length > 0 ? 1 : 0);
  const progress = Math.round((completionCount / totalSteps) * 100);

  return (
    <div className="min-h-screen" style={{ background: 'var(--page-bg)' }}>
      {/* Top bar with progress */}
      <header
        className="sticky top-0 z-10 backdrop-blur"
        style={{ background: 'var(--topbar-bg)', borderBottom: '1px solid var(--topbar-border)' }}
      >
        <div className="max-w-xl mx-auto px-5 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm">
            <Logo size={36} />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="font-bold leading-tight truncate"
              style={{ color: 'var(--text-primary)', fontSize: '15px' }}
            >
              Yume Studio
            </p>
            <p className="leading-tight" style={{ ...helperStyle, color: 'var(--text-muted)' }}>
              Đánh giá trải nghiệm của bạn
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-16 h-1.5 rounded-full overflow-hidden"
              style={{ background: 'var(--input-border)' }}
            >
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="tabular-nums" style={{ ...helperStyle, color: 'var(--text-muted)' }}>
              {progress}%
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-5 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h1
            className="font-bold leading-tight"
            style={{ fontSize: '28px', color: 'var(--text-primary)' }}
          >
            {fixedClass ? fixedClass.className : 'Gửi phản hồi'}
          </h1>
          {fixedClass?.school ? (
            <p className="mt-1" style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
              <span className="inline-flex items-center gap-1.5">
                <FaSchool className="text-sky-500" />
                <span>{fixedClass.school}</span>
              </span>
            </p>
          ) : (
            <p className="mt-1" style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
              Ý kiến của bạn giúp studio phục vụ tốt hơn
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Class selector */}
          {fixedClass ? (
            <input type="hidden" {...register('customer')} />
          ) : (
            <div className="card rounded-2xl p-5">
              <label
                className="block font-semibold mb-2"
                style={{ color: 'var(--text-primary)', fontSize: '14px' }}
              >
                Lớp của bạn <span className="text-rose-500">*</span>
              </label>
              <Select
                options={classes.map((c) => ({
                  value: c._id,
                  label: c.school ? `${c.className} — ${c.school}` : c.className,
                }))}
                value={selectedCustomerId}
                onChange={(v) => setValue('customer', v as string, { shouldValidate: true })}
                placeholder="Chọn lớp…"
                error={errors.customer?.message}
              />
              {errors.customer && (
                <p className="text-rose-500 mt-2" style={helperStyle}>
                  {errors.customer.message}
                </p>
              )}
            </div>
          )}

          {/* Crew rating card */}
          <div className="card rounded-2xl p-5">
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(59,130,246,0.12)' }}
              >
                <FaFilm className="text-blue-500 text-lg" />
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  className="font-semibold"
                  style={{ fontSize: '15px', color: 'var(--text-primary)' }}
                >
                  Ekip chụp ảnh <span className="text-rose-500">*</span>
                </h3>
                <p className="mt-0.5" style={{ ...labelStyle, color: 'var(--text-muted)' }}>
                  Thái độ, sự chuyên nghiệp và kỹ năng
                </p>
              </div>
            </div>
            <input type="hidden" {...register('crewRating', { required: true, min: 1 })} />
            <StarRating
              value={crewRating}
              onChange={(v) => setValue('crewRating', v, { shouldValidate: true })}
            />
            <textarea
              {...register('crewDescription', {
                required: true,
                validate: (v) => v.trim().length > 0,
              })}
              rows={2}
              className={`${inputCls} mt-4 resize-none ${errors.crewDescription ? 'border-red-400' : ''}`}
              style={inputStyle}
              placeholder="Chia sẻ thêm về ekip…"
            />
            {errors.crewDescription && (
              <p className="mt-1 text-xs text-red-500">Vui lòng chia sẻ thêm về ekip</p>
            )}
          </div>

          {/* Album rating card */}
          <div className="card rounded-2xl p-5">
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(168,85,247,0.14)' }}
              >
                <MdPhotoLibrary className="text-primary-500 text-lg" />
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  className="font-semibold"
                  style={{ fontSize: '15px', color: 'var(--text-primary)' }}
                >
                  Album ảnh <span className="text-rose-500">*</span>
                </h3>
                <p className="mt-0.5" style={{ ...labelStyle, color: 'var(--text-muted)' }}>
                  Chất lượng, bố cục và màu sắc
                </p>
              </div>
            </div>
            <input type="hidden" {...register('albumRating', { required: true, min: 1 })} />
            <StarRating
              value={albumRating}
              onChange={(v) => setValue('albumRating', v, { shouldValidate: true })}
            />
            <textarea
              {...register('albumDescription', {
                required: true,
                validate: (v) => v.trim().length > 0,
              })}
              rows={2}
              className={`${inputCls} mt-4 resize-none ${errors.albumDescription ? 'border-red-400' : ''}`}
              style={inputStyle}
              placeholder="Chia sẻ thêm về album…"
            />
            {errors.albumDescription && (
              <p className="mt-1 text-xs text-red-500">Vui lòng chia sẻ thêm về album</p>
            )}
          </div>

          {/* General feedback card */}
          <div className="card rounded-2xl p-5">
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(20,184,166,0.12)' }}
              >
                <FiMessageCircle className="text-teal-500 text-lg" />
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  className="font-semibold"
                  style={{ fontSize: '15px', color: 'var(--text-primary)' }}
                >
                  Cảm nhận chung
                </h3>
                <p className="mt-0.5" style={{ ...labelStyle, color: 'var(--text-muted)' }}>
                  Trải nghiệm tổng thể của bạn
                </p>
              </div>
            </div>
            <textarea
              {...register('content')}
              rows={3}
              className={`${inputCls} resize-none`}
              style={inputStyle}
              placeholder="Hãy chia sẻ cảm nhận của bạn…"
            />
          </div>

          {/* Suggestion card */}
          <div className="card rounded-2xl p-5">
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(245,158,11,0.14)' }}
              >
                <FaLightbulb className="text-amber-500 text-lg" />
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  className="font-semibold"
                  style={{ fontSize: '15px', color: 'var(--text-primary)' }}
                >
                  Đề xuất cải thiện
                </h3>
                <p className="mt-0.5" style={{ ...labelStyle, color: 'var(--text-muted)' }}>
                  Studio có thể làm gì tốt hơn?
                </p>
              </div>
            </div>
            <textarea
              {...register('suggestion')}
              rows={3}
              className={`${inputCls} resize-none`}
              style={inputStyle}
              placeholder="Góp ý để studio phục vụ bạn tốt hơn…"
            />
          </div>

          {/* Phone card */}
          <div className="card rounded-2xl p-5">
            <label
              className="flex items-center gap-2 font-semibold mb-2"
              style={{ color: 'var(--text-primary)', fontSize: '14px' }}
            >
              <span className="inline-flex items-center gap-1.5">
                <FaPhoneAlt className="text-emerald-500" />
                <span>Số điện thoại</span>
              </span>
              <span className="font-normal" style={{ ...helperStyle, color: 'var(--text-faint)' }}>
                · tuỳ chọn
              </span>
            </label>
            <input
              {...register('phone')}
              type="tel"
              className={inputCls}
              style={inputStyle}
              placeholder="Để chúng tôi có thể liên hệ lại nếu cần"
            />
            <p className="mt-2" style={{ ...helperStyle, color: 'var(--text-faint)' }}>
              Phản hồi hoàn toàn ẩn danh trừ khi bạn để lại SĐT
            </p>
          </div>

          {submitStatus === 'error' && (
            <div
              className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700"
              style={{ fontSize: '14px' }}
            >
              <span className="inline-flex items-center gap-1.5">
                <FiAlertCircle className="text-rose-500" />
                <span>Có lỗi xảy ra, vui lòng thử lại.</span>
              </span>
            </div>
          )}

          <div className="h-20" />
        </form>
      </div>

      {/* Sticky submit bar */}
      <div
        className="fixed bottom-0 left-0 right-0 backdrop-blur z-20"
        style={{ background: 'var(--topbar-bg)', borderTop: '1px solid var(--topbar-border)' }}
      >
        <div className="max-w-xl mx-auto px-5 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold" style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
              {completionCount === totalSteps ? (
                <span className="inline-flex items-center gap-1.5">
                  <IoCheckmarkCircle className="text-emerald-500" />
                  <span>Sẵn sàng gửi</span>
                </span>
              ) : (
                `Hoàn thành ${completionCount}/${totalSteps} mục bắt buộc`
              )}
            </p>
          </div>
          <button
            type="submit"
            disabled={!canSubmit}
            onClick={handleSubmit(onSubmit)}
            className="btn-primary px-6 py-3"
            style={{ fontSize: '15px' }}
          >
            {isSubmitting ? 'Đang gửi…' : 'Gửi phản hồi'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackFormPage;
