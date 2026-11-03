import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Lightbulb,
  Link2,
  Mail,
  MailOpen,
  Phone,
  RotateCw,
  Star,
  Trash2,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { feedbackService } from '../services/feedbackService';
import type { FeedbackItem, FeedbackResponse, FeedbackStats } from '../types';
import { getSchoolName } from '../types';
import { formatDateTime } from '../utils/format';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  RowActions,
  SegmentedControl,
  Skeleton,
  Stars,
} from '@/components/ui';
import { cn } from '@/lib/utils';

type FilterValue = 'all' | 'unread' | 'read';

const LIMIT = 20;

const ratingColor = (r: number) => {
  if (r >= 4) return 'text-emerald-700 dark:text-emerald-400';
  if (r >= 3) return 'text-amber-800 dark:text-amber-300';
  return 'text-red-700 dark:text-red-400';
};

const RatingPanel = ({ label, item }: { label: string; item: FeedbackItem }) => (
  <div className="rounded-md border px-3 py-2">
    <div className="mb-1 flex items-center justify-between gap-2">
      <span className="text-[13px] font-semibold text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <Stars value={item.rating} />
        <span className={cn('tabular text-[13px] font-bold', ratingColor(item.rating))}>
          {item.rating}/5
        </span>
      </div>
    </div>
    {item.description && (
      <p className="text-sm whitespace-pre-wrap leading-snug text-foreground">{item.description}</p>
    )}
  </div>
);

const fmtAvg = (n: number) => n.toFixed(1).replace('.', ',');

const buildPublicLink = () => `${window.location.origin}/feedback`;

const FeedbackPage = () => {
  const [list, setList] = useState<FeedbackResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [totalRead, setTotalRead] = useState(0);
  const [totalUnread, setTotalUnread] = useState(0);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const params: Record<string, string | number> = { page, limit: LIMIT };
      if (filter === 'unread') params.isRead = 'false';
      else if (filter === 'read') params.isRead = 'true';
      const res = await feedbackService.getAll(params);
      setList(res.data);
      setTotal(res.total);
      setTotalRead(res.totalRead);
      setTotalUnread(res.totalUnread);
      setStats(res.stats);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = useMemo(() => {
    const count = filter === 'unread' ? totalUnread : filter === 'read' ? totalRead : total;
    return Math.max(1, Math.ceil(count / LIMIT));
  }, [filter, total, totalRead, totalUnread]);

  // Xoá mục cuối của trang cuối: lùi về trang còn dữ liệu.
  useEffect(() => {
    if (!loading && page > totalPages) setPage(totalPages);
  }, [loading, page, totalPages]);

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

  const counts = { all: total, unread: totalUnread, read: totalRead };
  const firstLoad = loading && list.length === 0 && !stats;

  return (
    <div>
      <PageHeader
        title="Phản hồi"
        description={
          firstLoad || loadError
            ? 'Đánh giá của các lớp sau buổi chụp.'
            : `${total} phản hồi · ${totalUnread} chưa đọc`
        }
        action={
          <Button variant="outline" onClick={copyLink} className="max-md:w-full">
            {linkCopied ? <Check /> : <Link2 />}
            {linkCopied ? 'Đã sao chép link' : 'Sao chép link gửi phản hồi'}
          </Button>
        }
      />

      {/* Tổng hợp (mọi phản hồi) */}
      {stats && stats.count > 0 && (
        <div className="mb-5 grid grid-cols-2 divide-x rounded-lg border bg-card">
          {(
            [
              { label: 'Ekip chụp ảnh', avg: stats.crewAvg, dist: stats.crewDist },
              { label: 'Album ảnh', avg: stats.albumAvg, dist: stats.albumDist },
            ] as const
          ).map((c) => (
            <div
              key={c.label}
              className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:gap-6 lg:px-5"
            >
              <div className="shrink-0">
                <p className="text-[13px] font-medium text-muted-foreground">{c.label}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="tabular text-3xl font-bold text-foreground">
                    {fmtAvg(c.avg)}
                  </span>
                  <Stars value={Math.round(c.avg)} size="md" />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{stats.count} đánh giá</p>
              </div>
              <div className="min-w-0 flex-1 space-y-1 max-md:hidden" aria-label="Phân bố số sao">
                {[5, 4, 3, 2, 1].map((star) => {
                  const pct = Math.round((c.dist[star - 1] / stats.count) * 100);
                  return (
                    <div
                      key={star}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <span className="inline-flex w-6 items-center gap-0.5">
                        {star}
                        <Star className="h-3 w-3" aria-hidden />
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-foreground/70"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="tabular w-9 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <SegmentedControl<FilterValue>
        value={filter}
        onChange={(v) => {
          setFilter(v);
          setPage(1);
        }}
        className="mb-4"
        items={[
          { value: 'all', label: `Tất cả · ${counts.all}` },
          { value: 'unread', label: `Chưa đọc · ${counts.unread}` },
          { value: 'read', label: `Đã đọc · ${counts.read}` },
        ]}
      />

      {loadError ? (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-lg border bg-card px-6 py-12 text-center"
        >
          <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden />
          <p className="text-sm font-semibold text-foreground">Không tải được phản hồi</p>
          <p className="text-sm text-muted-foreground">Kiểm tra kết nối mạng rồi thử lại.</p>
          <Button variant="outline" size="sm" onClick={load}>
            <RotateCw /> Thử lại
          </Button>
        </div>
      ) : loading && list.length === 0 ? (
        <div role="status" className="space-y-3">
          <span className="sr-only">Đang tải…</span>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 rounded-lg border bg-card p-4">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-14 w-full" />
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          className="rounded-lg border bg-card"
          title={filter === 'unread' ? 'Không còn phản hồi chưa đọc' : 'Chưa có phản hồi nào'}
          description={
            filter === 'all'
              ? 'Gửi link phản hồi cho lớp sau buổi chụp; đánh giá sẽ hiện ở đây.'
              : undefined
          }
        />
      ) : (
        <ul className={cn('space-y-3', loading && 'opacity-60')} aria-busy={loading}>
          {list.map((fb) => {
            const school = fb.customer ? getSchoolName(fb.customer) : null;
            return (
              <li key={fb._id} className="rounded-lg border bg-card p-4">
                <div className="mb-3 flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {!fb.isRead && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-primary"
                          aria-label="Chưa đọc"
                        />
                      )}
                      <span
                        className={cn(
                          'min-w-0 truncate font-display text-[17px] font-bold text-foreground',
                          fb.isRead && 'font-semibold',
                        )}
                      >
                        {fb.customer?.className ?? 'Khách ẩn danh'}
                      </span>
                    </div>
                    {school && (
                      <p className="mt-0.5 truncate text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground">
                        {school}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[13px] text-muted-foreground">
                      {fb.phone && (
                        <a
                          href={`tel:${fb.phone}`}
                          className="tabular inline-flex items-center gap-1 whitespace-nowrap text-foreground underline decoration-border underline-offset-4"
                        >
                          <Phone className="h-3.5 w-3.5" aria-hidden />
                          {fb.phone}
                        </a>
                      )}
                      <span className="tabular whitespace-nowrap">
                        {formatDateTime(fb.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="-mr-2 -mt-1">
                    <RowActions
                      subject={`phản hồi ${fb.customer?.className ?? 'khách ẩn danh'}`}
                      primary={{
                        label: fb.isRead ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc',
                        icon: fb.isRead ? (
                          <Mail className="h-4 w-4" />
                        ) : (
                          <MailOpen className="h-4 w-4" />
                        ),
                        onSelect: () => toggleRead(fb),
                      }}
                      actions={[
                        {
                          label: 'Xoá phản hồi',
                          icon: <Trash2 className="h-4 w-4" />,
                          onSelect: () => setConfirmId(fb._id),
                          destructive: true,
                        },
                      ]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <RatingPanel label="Ekip chụp ảnh" item={fb.crewFeedback} />
                  <RatingPanel label="Album ảnh" item={fb.albumFeedback} />
                </div>

                {fb.content && (
                  <div className="mt-3">
                    <p className="mb-0.5 text-[13px] font-semibold text-muted-foreground">
                      Cảm nhận chung
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-snug text-foreground">
                      {fb.content}
                    </p>
                  </div>
                )}

                {fb.suggestion && (
                  <div className="mt-3 rounded-md bg-muted px-3 py-2">
                    <p className="mb-0.5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                      <Lightbulb className="h-3.5 w-3.5" aria-hidden />
                      Đề xuất cải thiện
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-snug text-foreground">
                      {fb.suggestion}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!loadError && totalPages > 1 && (
        <nav aria-label="Phân trang" className="mt-6 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ‹ Trước
          </Button>
          <span className="tabular px-2 text-sm text-muted-foreground">
            Trang <span className="font-semibold text-foreground">{page}</span> / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau ›
          </Button>
        </nav>
      )}

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Xoá phản hồi này?"
        message="Phản hồi sẽ bị xoá khỏi danh sách và không tính vào điểm trung bình nữa."
        onConfirm={doDelete}
      />
    </div>
  );
};

export default FeedbackPage;
