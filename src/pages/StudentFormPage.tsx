import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

interface ClassInfo {
  _id: string;
  className: string;
  school?: string;
}

interface FormValues {
  name: string;
  gender: 'male' | 'female';
  height: number | '';
  weight: number | '';
  notes: string;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

const StudentFormPage = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<Status>('idle');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { name: '', gender: 'male', height: '', weight: '', notes: '' },
  });

  useEffect(() => {
    if (!customerId) return;
    api
      .get<ClassInfo>(`/public/customers/${customerId}`)
      .then((r) => setClassInfo(r.data))
      .catch(() => setLoadError(true));
  }, [customerId]);

  const onSubmit = async (data: FormValues) => {
    setSubmitStatus('loading');
    try {
      await api.post('/public/students', {
        customerId,
        name: data.name,
        gender: data.gender,
        height: data.height !== '' ? Number(data.height) : undefined,
        weight: data.weight !== '' ? Number(data.weight) : undefined,
        notes: data.notes || undefined,
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

  if (!classInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">Đang tải…</p>
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
          <h1 className="text-xl font-bold text-gray-900">{classInfo.className}</h1>
          {classInfo.school && (
            <p className="text-sm text-gray-500 mt-0.5">🏫 {classInfo.school}</p>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Chiều cao (cm)</label>
              <input
                {...register('height')}
                type="number"
                step="0.1"
                min="50"
                max="250"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="165"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cân nặng (kg)</label>
              <input
                {...register('weight')}
                type="number"
                step="0.1"
                min="10"
                max="200"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="55"
              />
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
