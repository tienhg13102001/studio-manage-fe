import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { EmptyState, Spinner } from '../components/atoms';
import { ConfirmModal } from '../components/organisms';
import { feedbackService } from '../services/feedbackService';
import type { Customer, Feedback, FeedbackItem } from '../types';
import { formatDateTime } from '../utils/format';

type FilterValue = 'all' | 'unread' | 'read';

const LIMIT = 20;

const Stars = ({ value }: { value: number }) => (
  <span className="tracking-tight">
    {Array.from({ length: 5 }).map((_, i) => (
      <span key={i} className={i < value ? '' : 'grayscale opacity-30'}>
        ⭐
      </span>
    ))}
  </span>
);

const RatingBlock = ({ label, item }: { label: string; item: FeedbackItem }) => (
  <div className="text-sm">
    <div className="flex items-center gap-2">
      <span className="text-gray-500 w-20 shrink-0">{label}:</span>
      <Stars value={item.rating} />
      <span className="text-xs text-gray-400">({item.rating}/5)</span>
    </div>
    {item.description && (
      <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1 ml-20">{item.description}</p>
    )}
  </div>
);

const getClassLabel = (customer: Feedback['customerId']): string | null => {
  if (!customer || typeof customer === 'string') return null;
  const c = customer as Customer;
  return c.school ? `${c.className} — ${c.school}` : c.className;
};

const buildPublicLink = () => `${window.location.origin}/feedback`;

const FeedbackPage = () => {
  const [list, setList] = useState<Feedback[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
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
      setUnreadCount(res.unreadCount);
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

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / LIMIT)), [total]);

  const toggleRead = async (fb: Feedback) => {
    try {
      const updated = await feedbackService.markRead(fb._id, !fb.isRead);
      setList((prev) => prev.map((f) => (f._id === fb._id ? { ...f, isRead: updated.isRead } : f)));
      setUnreadCount((n) => n + (updated.isRead ? -1 : 1));
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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Phản hồi khách hàng</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Tổng: {total} · Chưa đọc:{' '}
            <span className="font-semibold text-primary-600">{unreadCount}</span>
          </p>
        </div>
        <button onClick={copyLink} className="btn-secondary">
          {linkCopied ? '✓ Đã sao chép' : '🔗 Sao chép link gửi phản hồi'}
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {(
          [
            { v: 'all', label: 'Tất cả' },
            { v: 'unread', label: `Chưa đọc${unreadCount ? ` (${unreadCount})` : ''}` },
            { v: 'read', label: 'Đã đọc' },
          ] as { v: FilterValue; label: string }[]
        ).map((opt) => (
          <button
            key={opt.v}
            onClick={() => setFilter(opt.v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === opt.v
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
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
            const classLabel = getClassLabel(fb.customerId);
            return (
              <div
                key={fb._id}
                className={`card p-4 border-l-4 ${
                  fb.isRead ? 'border-l-gray-200' : 'border-l-primary-500 bg-primary-50/30'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {!fb.isRead && (
                        <span className="text-xs font-semibold uppercase text-primary-600">
                          Mới
                        </span>
                      )}
                      {classLabel && (
                        <span className="text-sm font-semibold text-gray-800">🏫 {classLabel}</span>
                      )}
                    </div>
                    {fb.phone && <div className="text-sm text-gray-500">📞 {fb.phone}</div>}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {formatDateTime(fb.createdAt)}
                  </span>
                </div>

                <div className="space-y-2 mb-3">
                  <RatingBlock label="Ekip" item={fb.crewFeedback} />
                  <RatingBlock label="Album" item={fb.albumFeedback} />
                </div>

                {fb.content && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Cảm nhận chung
                    </p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{fb.content}</p>
                  </div>
                )}

                {fb.suggestion && (
                  <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-amber-700 uppercase mb-1">
                      💡 Đề xuất cải thiện
                    </p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{fb.suggestion}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => toggleRead(fb)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {fb.isRead ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'}
                  </button>
                  <button
                    onClick={() => setConfirmId(fb._id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Xoá
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
            ‹
          </button>
          <span className="text-sm text-gray-600">
            Trang {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="btn-secondary disabled:opacity-50"
          >
            ›
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
