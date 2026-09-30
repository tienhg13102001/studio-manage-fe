import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Lightbulb, Link2, Phone, Star } from 'lucide-react';
import { toast } from 'react-toastify';
import { feedbackService } from '../services/feedbackService';
import type { Customer, FeedbackItem, FeedbackResponse } from '../types';
import { formatDateTime } from '../utils/format';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  Spinner,
  Stars,
} from '@/components/ui';
import { cn } from '@/lib/utils';

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
    'bg-blue-500/20 text-blue-600 dark:text-blue-300',
    'bg-amber-500/20 text-amber-600 dark:text-amber-300',
    'bg-pink-500/20 text-pink-600 dark:text-pink-300',
    'bg-teal-500/20 text-teal-600 dark:text-teal-300',
    'bg-violet-500/20 text-violet-600 dark:text-violet-300',
    'bg-sky-500/20 text-sky-600 dark:text-sky-300',
    'bg-rose-500/20 text-rose-600 dark:text-rose-300',
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
};

const ratingColor = (r: number) => {
  if (r >= 4) return 'text-emerald-600 dark:text-emerald-400';
  if (r >= 3) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
};

const RatingPanel = ({ label, item }: { label: string; item: FeedbackItem }) => (
  <div className="rounded-xl bg-muted/60 px-4 py-3">
    <div className="flex items-center justify-between gap-2 mb-1.5">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <Stars value={item.rating} />
        <span className={cn('text-xs font-bold', ratingColor(item.rating))}>{item.rating}/5</span>
      </div>
    </div>
    {item.description && (
      <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">
        {item.description}
      </p>
    )}
  </div>
);

const average = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

const fmtAvg = (n: number) => n.toFixed(1).replace('.', ',');

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

  const stats = useMemo(() => {
    const crew = list.map((f) => f.crewFeedback.rating);
    const album = list.map((f) => f.albumFeedback.rating);
    const dist = [5, 4, 3, 2, 1].map((star) => {
      const n = crew.filter((r) => r === star).length;
      return { star, pct: crew.length ? Math.round((n / crew.length) * 100) : 0 };
    });
    return { count: list.length, crew: average(crew), album: average(album), dist };
  }, [list]);

  const toggleRead = async (fb: FeedbackResponse) => {
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
      <PageHeader
        kicker="Feedback"
        title="Phản hồi khách hàng"
        description="Xem và quản lý các đánh giá từ khách hàng của bạn."
        action={
          <Button variant={linkCopied ? 'gradient' : 'outline'} onClick={copyLink}>
            {linkCopied ? <Copy /> : <Link2 />}
            {linkCopied ? 'Đã sao chép' : 'Sao chép link gửi phản hồi'}
          </Button>
        }
      />

      {/* Summary (computed from the loaded page) */}
      {stats.count > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {(
            [
              { label: 'Ekip chụp ảnh', value: stats.crew },
              { label: 'Album ảnh', value: stats.album },
            ] as const
          ).map((c) => (
            <div key={c.label} className="rounded-[14px] border bg-card p-5">
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="font-display text-3xl font-bold">{fmtAvg(c.value)}</span>
                <Stars value={Math.round(c.value)} size="md" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                trung bình · {stats.count} đánh giá trên trang hiện tại
              </p>
            </div>
          ))}
          <div className="rounded-[14px] border bg-card p-5">
            <p className="text-sm text-muted-foreground mb-2">
              Phân bố điểm ekip
              <span className="block text-xs">
                trên trang hiện tại
                {filter !== 'all' && ` · ${filter === 'unread' ? 'Chưa đọc' : 'Đã đọc'}`}
              </span>
            </p>
            <div className="space-y-1.5">
              {stats.dist.map((d) => (
                <div key={d.star} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex w-6 items-center gap-0.5">
                    {d.star}
                    <Star className="h-3 w-3" />
                  </span>
                  <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${d.pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right tabular">{d.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="inline-flex max-w-full gap-1 mb-4 overflow-x-auto rounded-xl p-1 bg-muted">
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
              className={cn(
                'shrink-0 inline-flex items-center gap-2 h-9 px-3 rounded-[9px] text-sm font-medium transition-colors',
                active
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="leading-none">{opt.label}</span>
              <span
                className={cn(
                  'inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full text-xs font-semibold leading-none',
                  opt.v === 'unread' && opt.count > 0
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted-foreground/15 text-muted-foreground',
                )}
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
                className={cn(
                  'rounded-[14px] border bg-card p-5 transition-shadow',
                  !fb.isRead && 'border-primary shadow-[0_0_0_3px_rgba(245,158,11,0.15)]',
                )}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className={cn(
                      'w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold text-sm',
                      avatarColor(seed),
                    )}
                  >
                    {getInitials(fb.customer, fb.phone)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate">
                        {classLabel ?? 'Khách hàng ẩn danh'}
                      </span>
                      {!fb.isRead && (
                        <Badge
                          variant="outline"
                          className="border-transparent bg-primary px-2 text-[11px] text-primary-foreground"
                        >
                          Mới
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs mt-0.5 flex-wrap text-muted-foreground">
                      {fb.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-emerald-500" />
                          <span>{fb.phone}</span>
                        </span>
                      )}
                      <span>{formatDateTime(fb.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  <RatingPanel label="Ekip chụp ảnh" item={fb.crewFeedback} />
                  <RatingPanel label="Album" item={fb.albumFeedback} />
                </div>

                {fb.content && (
                  <div className="mb-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-1 text-muted-foreground">
                      Cảm nhận chung
                    </p>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{fb.content}</p>
                  </div>
                )}

                {fb.suggestion && (
                  <div className="mt-3 rounded-xl p-3 px-4 bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                    <p className="text-xs font-semibold mb-0.5 inline-flex items-center gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5" />
                      <span>Đề xuất cải thiện</span>
                    </p>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{fb.suggestion}</p>
                  </div>
                )}

                <div className="flex justify-end gap-4 pt-3 mt-3">
                  <button
                    type="button"
                    className="text-xs font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => toggleRead(fb)}
                  >
                    {fb.isRead ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'}
                  </button>
                  <button
                    type="button"
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400"
                    onClick={() => setConfirmId(fb._id)}
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
          <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ‹ Trước
          </Button>
          <span className="text-sm px-2 text-muted-foreground">
            Trang <span className="font-semibold text-foreground">{page}</span> / {totalPages}
          </span>
          <Button
            variant="ghost"
            className="text-primary-700 dark:text-primary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau ›
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Xác nhận xoá"
        message="Bạn có chắc muốn xoá phản hồi này?"
        onConfirm={doDelete}
      />
    </div>
  );
};

export default FeedbackPage;
