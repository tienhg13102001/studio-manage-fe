import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import dayjs from 'dayjs';
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
    setValue,
  } = useForm<FormValues>({
    defaultValues: { name: '', gender: 'male', height: '', weight: '', notes: '', costumes: [] },
  });

  const visibleCostumes = schedule?.package?.costumes ?? [];

  // Default: tick all costumes once schedule/package data is loaded.
  useEffect(() => {
    setValue(
      'costumes',
      visibleCostumes.map((c) => c._id),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule]);

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <p className="text-gray-600 font-medium">Không tìm thấy lớp học</p>
          <p className="text-sm text-gray-400 mt-1">Link có thể không còn hợp lệ</p>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <PageLoader />
      </div>
    );
  }

  if (submitStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Đã ghi nhận!</h2>
          <p className="text-gray-500 text-sm mb-6">Thông tin của bạn đã được lưu thành công.</p>
          <button
            onClick={() => setSubmitStatus('idle')}
            className="w-full py-2.5 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
          >
            Nhập thêm học sinh khác
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-10 px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md">
        {/* Header */}
        <div className="px-6 py-5 border-b">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
            Nhập thông tin học sinh
          </p>
          <h1 className="text-xl font-bold text-gray-900">{schedule.customer.className}</h1>
          {schedule.customer.school && (
            <p className="text-sm text-gray-500 mt-0.5">🏫 {schedule.customer.school}</p>
          )}
          {schedule && (
            <p className="text-sm text-primary-600 mt-1.5 font-medium">
              📅 Ngày chụp: {dayjs(schedule.shootDate).format('DD/MM/YYYY')}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <input
              {...register('name', { required: 'Vui lòng nhập họ tên' })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Nguyễn Văn A"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Giới tính <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              {(['male', 'female'] as const).map((g) => (
                <label
                  key={g}
                  className="flex-1 flex items-center justify-center gap-2 border rounded-lg py-2.5 cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 transition-colors"
                >
                  <input
                    type="radio"
                    value={g}
                    {...register('gender', { required: true })}
                    className="accent-primary-600"
                  />
                  <span className="text-sm">{g === 'male' ? '👦 Nam' : '👧 Nữ'}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="165"
              />
              {errors.height && (
                <p className="text-red-500 text-xs mt-1">{errors.height.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="55"
              />
              {errors.weight && (
                <p className="text-red-500 text-xs mt-1">{errors.weight.message}</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trang phục</label>
            <div className="flex flex-wrap gap-3">
              {visibleCostumes.map((c) => (
                <label
                  key={c._id}
                  className="flex items-center gap-2 border rounded-lg py-2.5 px-3 cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 transition-colors"
                >
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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
            <textarea
              {...register('notes')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
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
            className="w-full py-3 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-60 transition-colors"
          >
            {isSubmitting ? 'Đang gửi…' : 'Gửi thông tin'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StudentFormPage;
