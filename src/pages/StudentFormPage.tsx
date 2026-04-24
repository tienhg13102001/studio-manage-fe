import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import dayjs from 'dayjs';
import { FaCalendarCheck, FaGift, FaMars, FaSchool, FaVenus } from 'react-icons/fa';
import { FiAlertCircle } from 'react-icons/fi';
import { IoCheckmarkCircle } from 'react-icons/io5';
import { PageLoader } from '../components/atoms';
import { studentService } from '../services/studentService';
import { scheduleService } from '../services/scheduleService';
import type { PublicScheduleResponse } from '../types';

interface FormValues {
  name: string;
  gender: 'male' | 'female';
  height: number | '';
  weight: number | '';
  notes: string;
  costumes: string[];
}

type Status = 'idle' | 'loading' | 'success' | 'error';

const StudentFormPage = () => {
  const { customer } = useParams<{ customer: string }>();
  const [schedule, setSchedule] = useState<PublicScheduleResponse | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<Status>('idle');

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

  // Default: tick all visible costumes whenever schedule loads or gender changes.
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
    try {
      await studentService.createPublic({
        customer,
        name: data.name,
        gender: data.gender,
        height: data.height !== '' ? Number(data.height) : undefined,
        weight: data.weight !== '' ? Number(data.weight) : undefined,
        notes: data.notes || undefined,
        costumes: data.costumes,
      });
      setSubmitStatus('success');
      reset();
    } catch {
      setSubmitStatus('error');
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 theme-page">
        <div className="text-center card max-w-sm w-full py-10">
          <div className="mb-4 flex justify-center">
            <FiAlertCircle className="text-5xl text-amber-500" />
          </div>
          <p className="font-medium theme-text-primary">Không tìm thấy lớp học</p>
          <p className="text-sm mt-1 theme-text-muted">Link có thể không còn hợp lệ</p>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="min-h-screen flex items-center justify-center theme-page">
        <PageLoader />
      </div>
    );
  }

  if (submitStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 theme-page">
        <div className="card p-8 max-w-sm w-full text-center">
          <div className="mb-4 flex justify-center">
            <IoCheckmarkCircle className="text-5xl text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold mb-2 theme-text-primary">Đã ghi nhận!</h2>
          <p className="text-sm mb-6 theme-text-muted">
            Thông tin của bạn đã được lưu thành công.
          </p>
          <button
            onClick={() => setSubmitStatus('idle')}
            className="btn-primary w-full py-2.5"
          >
            Nhập thêm học sinh khác
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-start justify-center py-10 px-4 theme-page">
      <div className="card w-full max-w-md p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b theme-card-border">
          <p className="text-xs uppercase tracking-wider mb-1 theme-text-faint">
            Nhập thông tin học sinh
          </p>
          <h1 className="text-xl font-bold flex items-center gap-2 theme-text-primary">
            <span>{schedule.customer.className}</span>{' '}
            {schedule.customer.school && (
              <span className="text-sm mt-0.5 h-full font-light theme-text-muted">
                <span className="inline-flex items-center gap-1">
                  <FaSchool className="text-sky-500" />
                  <span>{schedule.customer.school}</span>
                </span>
              </span>
            )}
          </h1>

          <div className='flex flex-col'>
            {schedule && (
              <p className="text-sm text-primary-600 mt-1.5 font-medium inline-flex items-center gap-1.5">
                <FaCalendarCheck className="text-primary-500" />
                <span>Ngày chụp: {dayjs(schedule.shootDate).format('DD/MM/YYYY')}</span>
              </p>
            )}
            {schedule.package && (
              <p className="text-sm text-green-600 mt-1.5 font-medium inline-flex items-center gap-1.5">
                <FaGift className="text-green-500" />
                <span>Gói chụp: {schedule.package.name}</span>
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <div>
            <label className="label">
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <input
              {...register('name', { required: 'Vui lòng nhập họ tên' })}
              className="input"
              placeholder="Nguyễn Văn A"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label">
              Giới tính <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              {(['male', 'female'] as const).map((g) => (
                <label
                  key={g}
                  className="costume-option flex-1 justify-center py-2.5"
                >
                  <input
                    type="radio"
                    value={g}
                    {...register('gender', { required: true })}
                    className="accent-primary-600"
                  />
                  <span className="text-sm inline-flex items-center gap-1.5">
                    {g === 'male' ? (
                      <>
                        <FaMars className="text-sky-600" />
                        <span>Nam</span>
                      </>
                    ) : (
                      <>
                        <FaVenus className="text-pink-500" />
                        <span>Nữ</span>
                      </>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">
                Chiều cao (cm) <span className="text-red-500">*</span>
              </label>
              <input
                {...register('height', {
                  required: 'Vui lòng nhập chiều cao',
                  validate: (v) => (v !== '' && Number(v) > 0) || 'Chiều cao không hợp lệ',
                })}
                type="number"
                step="0.1"
                min="50"
                max="250"
                className="input"
                placeholder="165"
              />
              {errors.height && (
                <p className="text-red-500 text-xs mt-1">{errors.height.message}</p>
              )}
            </div>
            <div>
              <label className="label">
                Cân nặng (kg) <span className="text-red-500">*</span>
              </label>
              <input
                {...register('weight', {
                  required: 'Vui lòng nhập cân nặng',
                  validate: (v) => (v !== '' && Number(v) > 0) || 'Cân nặng không hợp lệ',
                })}
                type="number"
                step="0.1"
                min="10"
                max="200"
                className="input"
                placeholder="55"
              />
              {errors.weight && (
                <p className="text-red-500 text-xs mt-1">{errors.weight.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <label className="label">Trang phục</label>
            <div className="flex flex-wrap gap-3">
              {visibleCostumes.map((c) => (
                <label key={c._id} className="costume-option py-2.5">
                  <input
                    type="checkbox"
                    value={c._id}
                    {...register('costumes')}
                    className="accent-primary-600"
                  />
                  <span className="text-sm">{c.name}</span>
                </label>
              ))}
            </div>
            <p className="text-xs ml-1 theme-text-muted">
              đây là trang phục trong gói chụp của lớp, nếu không dùng có thể bỏ chọn.
            </p>
          </div>

          <div>
            <label className="label">Ghi chú</label>
            <textarea
              {...register('notes')}
              className="input resize-none"
              rows={2}
              placeholder="Tuỳ chọn…"
            />
          </div>

          {submitStatus === 'error' && (
            <p className="text-red-500 text-sm">Có lỗi xảy ra, vui lòng thử lại.</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full py-3"
          >
            {isSubmitting ? 'Đang gửi…' : 'Gửi thông tin'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StudentFormPage;
