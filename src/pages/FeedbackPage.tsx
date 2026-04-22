import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { EmptyState, Spinner } from '../components/atoms';
import { RatingBlock } from '../components/molecules';
import { ConfirmModal } from '../components/organisms';
import { feedbackService } from '../services/feedbackService';
import type { Customer, FeedbackResponse } from '../types';
import { formatDateTime } from '../utils/format';

type FilterValue = 'all' | 'unread' | 'read';

const LIMIT = 20;

const getClassLabel = (customer: Customer | null): string | null => {
  if (!customer) return null;
  return customer.school ? `${customer.className} — ${customer.school}` : customer.className;
};

const getInitials = (customer: Customer | null, phone?: string): string => {
  if (customer) {
    const src = customer.className || customer.school || '';
    const parts = src.trim().split(/\s+/).slice(0, 2);
    const initials = parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
    if (initials) return initials;
  }
  if (phone) return phone.slice(-2);
  return '?';
};

const avatarColor = (seed: string): string => {
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
    'bg-pink-100 text-pink-700',
    'bg-teal-100 text-teal-700',
    'bg-amber-100 text-amber-700',
    'bg-indigo-100 text-indigo-700',
    'bg-rose-100 text-rose-700',
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
};

const buildPublicLink = () => `${window.location.origin}/feedback`;

const FeedbackPage = () => {
  const [list, setList] = useState<FeedbackResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [totalRead, setTotalRead] = useState(0);
  const [totalUnread, setTotalUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [loading, setLoading] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: LIMIT };
      if (filter === 'unread') params.isRead = 'false';
      else if (filter === 'read') params.isRead = 'true';
      const res = await feedbackService.getAll(params);
      setList(res.data);
      setTotal(res.total);
      setTotalRead(res.totalRead);
      setTotalUnread(res.totalUnread);
    } catch {
      toast.error('Không thể tải phản hồi.');
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const totalPages = useMemo(() => {
    const count = filter === 'unread' ? totalUnread : filter === 'read' ? totalRead : total;
    return Math.max(1, Math.ceil(count / LIMIT));
  }, [filter, total, totalRead, totalUnread]);

  const toggleRead = async (fb: Feedback) => {
    try {
      const updated = await feedbackService.markRead(fb._id, !fb.isRead);
      setList((prev) => prev.map((f) => (f._id === fb._id ? { ...f, isRead: updated.isRead } : f)));
      setTotalUnread((n) => n + (updated.isRead ? -1 : 1));
      setTotalRead((n) => n + (updated.isRead ? 1 : -1));
    } catch {
      toast.error('Cập nhật thất bại.');
    }
  };

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await feedbackService.remove(confirmId);
      toast.success('Đã xoá phản hồi.');
      setConfirmId(null);
      load();
    } catch {
      toast.error('Xoá thất bại.');
      setConfirmId(null);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(buildPublicLink());
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error('Không thể sao chép.');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Phản hồi khách hàng</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Xem và quản lý các đánh giá từ khách hàng của bạn.
          </p>
        </div>
        <button onClick={copyLink} className={linkCopied ? 'btn-primary' : 'btn-secondary'}>
          {linkCopied ? '✓ Đã sao chép' : '🔗 Sao chép link gửi phản hồi'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {(
          [
            { v: 'all', label: 'Tất cả', count: total },
            { v: 'unread', label: 'Chưa đọc', count: totalUnread },
            { v: 'read', label: 'Đã đọc', count: totalRead },
          ] as { v: FilterValue; label: string; count: number }[]
        ).map((opt) => {
          const active = filter === opt.v;
          return (
            <button
              key={opt.v}
              onClick={() => setFilter(opt.v)}
              className={`shrink-0 inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="leading-none">{opt.label}</span>
              <span
                className={`inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full text-xs font-semibold leading-none ${
                  active ? 'bg-white/25 text-white' : 'bg-white text-gray-600'
                }`}
              >
                {opt.count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : list.length === 0 ? (
        <EmptyState title="Chưa có phản hồi nào" description="Phản hồi sẽ hiển thị ở đây." />
      ) : (
        <div className="space-y-3">
          {list.map((fb) => {
            const classLabel = getClassLabel(fb.customer);
            const seed = fb.customer?._id || fb.phone || fb._id;
            return (
              <div
                key={fb._id}
                className={`card p-4 transition-shadow hover:shadow-md ${
                  fb.isRead
                    ? ''
                    : 'ring-1 ring-primary-200 bg-gradient-to-r from-primary-50/60 to-transparent'
                }`}
              >
                {/* Header row */}
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-semibold text-sm ${avatarColor(
                      seed,
                    )}`}
                  >
                    {getInitials(fb.customer, fb.phone)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 truncate">
                        {classLabel ?? 'Khách hàng ẩn danh'}
                      </span>
                      {!fb.isRead && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 bg-primary-100 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
                          Mới
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
                      {fb.phone && <span>📞 {fb.phone}</span>}
                      <span>{formatDateTime(fb.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Ratings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  <RatingBlock label="Ekip chụp ảnh" item={fb.crewFeedback} />
                  <RatingBlock label="Album" item={fb.albumFeedback} />
                </div>

                {/* Content */}
                {fb.content && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Cảm nhận chung
                    </p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {fb.content}
                    </p>
                  </div>
                )}

                {fb.suggestion && (
                  <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
                      💡 Đề xuất cải thiện
                    </p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {fb.suggestion}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-3 mt-3 border-t border-gray-100">
                  <button
                    onClick={() => toggleRead(fb)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {fb.isRead ? '↺ Đánh dấu chưa đọc' : '✓ Đánh dấu đã đọc'}
                  </button>
                  <button
                    onClick={() => setConfirmId(fb._id)}
                    className="text-xs font-medium text-red-600 hover:text-red-800 hover:underline"
                  >
                    🗑 Xoá
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="btn-secondary disabled:opacity-50"
          >
            ‹ Trước
          </button>
          <span className="text-sm text-gray-600 px-2">
            Trang <span className="font-semibold">{page}</span> / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="btn-secondary disabled:opacity-50"
          >
            Sau ›
          </button>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmId}
        message="Bạn có chắc muốn xoá phản hồi này?"
        onConfirm={doDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
};

export default FeedbackPage;
