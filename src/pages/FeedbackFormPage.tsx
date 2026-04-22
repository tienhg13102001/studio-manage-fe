import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { PageLoader, Select, StarRating } from '../components/atoms';

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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <PageLoader />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">😕</div>
          <p className="text-slate-800 font-semibold" style={{ fontSize: '18px' }}>
            Không tìm thấy thông tin
          </p>
          <p className="text-slate-500 mt-1" style={{ fontSize: '14px' }}>
            Link có thể không còn hợp lệ
          </p>
        </div>
      </div>
    );
  }

  if (submitStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center border border-slate-100">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200">
            <svg
              className="w-10 h-10 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="font-bold text-slate-900 mb-2" style={{ fontSize: '24px' }}>
            Cảm ơn bạn rất nhiều!
          </h2>
          <p className="text-slate-500 leading-relaxed mb-8" style={{ fontSize: '15px' }}>
            Phản hồi của bạn đã được ghi nhận. Chúng tôi sẽ dùng ý kiến này để phục vụ bạn tốt hơn
            trong tương lai.
          </p>
          <button
            onClick={() => setSubmitStatus('idle')}
            className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors"
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
  const inputCls =
    'w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition placeholder:text-slate-300';

  const totalSteps = 5;
  const completionCount =
    (selectedCustomerId || fixedClass ? 1 : 0) +
    (crewRating > 0 ? 1 : 0) +
    (albumRating > 0 ? 1 : 0) +
    (crewDescription.trim().length > 0 ? 1 : 0) +
    (albumDescription.trim().length > 0 ? 1 : 0);
  const progress = Math.round((completionCount / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar with progress */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200/70">
        <div className="max-w-xl mx-auto px-5 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm">
            <span style={{ fontSize: '18px' }}>📸</span>
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="font-bold text-slate-900 leading-tight truncate"
              style={{ fontSize: '15px' }}
            >
              Yume Studio
            </p>
            <p className="text-slate-500 leading-tight" style={helperStyle}>
              Đánh giá trải nghiệm của bạn
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-slate-500 tabular-nums" style={helperStyle}>
              {progress}%
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-5 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="font-bold text-slate-900 leading-tight" style={{ fontSize: '28px' }}>
            {fixedClass ? fixedClass.className : 'Gửi phản hồi'}
          </h1>
          {fixedClass?.school ? (
            <p className="text-slate-500 mt-1" style={{ fontSize: '15px' }}>
              🏫 {fixedClass.school}
            </p>
          ) : (
            <p className="text-slate-500 mt-1" style={{ fontSize: '15px' }}>
              Ý kiến của bạn giúp studio phục vụ tốt hơn ✨
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Class selector */}
          {fixedClass ? (
            <input type="hidden" {...register('customer')} />
          ) : (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <label
                className="block font-semibold text-slate-800 mb-2"
                style={{ fontSize: '14px' }}
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
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <span style={{ fontSize: '20px' }}>🎬</span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-900" style={{ fontSize: '15px' }}>
                  Ekip chụp ảnh <span className="text-rose-500">*</span>
                </h3>
                <p className="text-slate-500 mt-0.5" style={labelStyle}>
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
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                <span style={{ fontSize: '20px' }}>🖼️</span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-900" style={{ fontSize: '15px' }}>
                  Album ảnh <span className="text-rose-500">*</span>
                </h3>
                <p className="text-slate-500 mt-0.5" style={labelStyle}>
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
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                <span style={{ fontSize: '20px' }}>💬</span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-900" style={{ fontSize: '15px' }}>
                  Cảm nhận chung
                </h3>
                <p className="text-slate-500 mt-0.5" style={labelStyle}>
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
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <span style={{ fontSize: '20px' }}>💡</span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-900" style={{ fontSize: '15px' }}>
                  Đề xuất cải thiện
                </h3>
                <p className="text-slate-500 mt-0.5" style={labelStyle}>
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
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <label
              className="flex items-center gap-2 font-semibold text-slate-800 mb-2"
              style={{ fontSize: '14px' }}
            >
              <span>📞 Số điện thoại</span>
              <span className="text-slate-400 font-normal" style={helperStyle}>
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
            <p className="text-slate-400 mt-2" style={helperStyle}>
              Phản hồi hoàn toàn ẩn danh trừ khi bạn để lại SĐT
            </p>
          </div>

          {submitStatus === 'error' && (
            <div
              className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700"
              style={{ fontSize: '14px' }}
            >
              ⚠️ Có lỗi xảy ra, vui lòng thử lại.
            </div>
          )}

          <div className="h-20" />
        </form>
      </div>

      {/* Sticky submit bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 z-20">
        <div className="max-w-xl mx-auto px-5 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-700" style={{ fontSize: '13px' }}>
              {completionCount === totalSteps
                ? '✓ Sẵn sàng gửi'
                : `Hoàn thành ${completionCount}/${totalSteps} mục bắt buộc`}
            </p>
          </div>
          <button
            type="submit"
            disabled={!canSubmit}
            onClick={handleSubmit(onSubmit)}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold shadow-md shadow-primary-200 hover:shadow-lg hover:shadow-primary-300 disabled:from-slate-300 disabled:to-slate-400 disabled:shadow-none disabled:cursor-not-allowed transition-all"
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
