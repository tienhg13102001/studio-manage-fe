import type { ReactNode } from 'react';
import {
  Calendar,
  Clock,
  ExternalLink,
  FolderOpen,
  Gift,
  MapPin,
  Pencil,
  StickyNote,
  Trash2,
  Users,
} from 'lucide-react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { getSchoolName, type ScheduleResponse } from '../../../types';
import { formatDate } from '../../../utils/format';
import {
  SCHEDULE_CANCELLED_LABEL,
  SHOOT_STATUS_LABELS,
  SHOOT_STATUS_VARIANT,
  getShootStatus,
  isScheduleCancelled,
} from '../../../utils/scheduleConstants';
import { CrewAvatar } from './CrewAvatar';
import { getInitial } from './scheduleHelpers';

/** Soft tinted square icon tile. */
const IconTile = ({ className, children }: { className?: string; children: ReactNode }) => (
  <span
    className={cn(
      'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] [&_svg]:h-4 [&_svg]:w-4',
      className,
    )}
  >
    {children}
  </span>
);

const SectionLabel = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div
    className={cn(
      'text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground',
      className,
    )}
  >
    {children}
  </div>
);

const DOW_LONG = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

const formatDateWithDow = (iso: string) => {
  const d = new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  return Number.isNaN(d.getTime())
    ? formatDate(iso)
    : `${DOW_LONG[d.getDay()]}, ${formatDate(iso)}`;
};

const InfoRow = ({
  icon,
  tone,
  label,
  children,
}: {
  icon: ReactNode;
  tone: string;
  label: string;
  children?: ReactNode;
}) => (
  <div className="flex items-center gap-3">
    <IconTile className={tone}>{icon}</IconTile>
    <div className="min-w-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="break-words text-sm font-medium text-foreground">
        {children || <span className="font-normal italic text-muted-foreground">Chưa có</span>}
      </div>
    </div>
  </div>
);

const DetailStatusBadge = ({ schedule }: { schedule: ScheduleResponse }) => {
  if (isScheduleCancelled(schedule)) {
    return (
      <Badge variant="neutral" dot>
        {SCHEDULE_CANCELLED_LABEL}
      </Badge>
    );
  }
  const status = getShootStatus(schedule);
  return (
    <Badge variant={SHOOT_STATUS_VARIANT[status]} dot>
      {SHOOT_STATUS_LABELS[status]}
    </Badge>
  );
};

interface ScheduleDetailDialogProps {
  detail: ScheduleResponse | null;
  onClose: () => void;
  onEdit: (s: ScheduleResponse) => void;
  onEditCrew?: (s: ScheduleResponse) => void;
  onDelete: (s: ScheduleResponse) => void;
}

/** Read-only schedule detail (row click). */
const ScheduleDetailDialog = ({
  detail,
  onClose,
  onEdit,
  onEditCrew,
  onDelete,
}: ScheduleDetailDialogProps) => (
  <Dialog open={!!detail} onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[640px]">
      {detail &&
        (() => {
          const customer = detail.customer;
          const pkg = detail.package;
          const externalLead = (detail.externalCrew ?? []).find((entry) => entry.role === 'lead');
          const leadName =
            detail.leadPhotographer?.name ??
            detail.leadPhotographer?.username ??
            (externalLead?.photographer
              ? `${externalLead.photographer.name} · Thợ ngoài (${externalLead.confirmation === 'confirmed' ? 'đã xác nhận' : externalLead.confirmation === 'declined' ? 'từ chối' : 'chờ xác nhận'})`
              : null);
          const bookedByName = detail.bookedBy?.name ?? detail.bookedBy?.username ?? null;
          const supportList = detail.supportPhotographers
            .map((u) => u.name ?? u.username)
            .filter(Boolean) as string[];
          supportList.push(
            ...(detail.externalCrew ?? [])
              .filter((entry) => entry.role === 'support' && entry.photographer)
              .map(
                (entry) =>
                  `${entry.photographer!.name} · Ngoài (${entry.confirmation === 'confirmed' ? 'đã xác nhận' : entry.confirmation === 'declined' ? 'từ chối' : 'chờ xác nhận'})`,
              ),
          );
          const servicesTotal = (detail.extraServices ?? []).reduce(
            (sum, es) => sum + es.amount,
            0,
          );

          return (
            <>
              <div className="shrink-0 border-b bg-gradient-to-b from-amber-50 to-card px-5 pb-5 pr-12 pt-5 dark:from-amber-500/10 sm:px-6">
                <DetailStatusBadge schedule={detail} />
                <DialogTitle className="mt-2.5 text-2xl sm:text-[26px]">
                  {customer?.className ?? '—'}
                  {getSchoolName(customer) && <span> · {getSchoolName(customer)}</span>}
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground/80">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-primary-700 dark:text-primary" />
                      <span className="font-medium">{formatDateWithDow(detail.shootDate)}</span>
                    </span>
                    {(detail.startTime || detail.endTime) && (
                      <span className="inline-flex items-center gap-1.5 tabular">
                        <Clock className="h-4 w-4 text-primary-700 dark:text-primary" />
                        <span className="font-medium">
                          {detail.startTime ?? ''}
                          {detail.endTime ? ` – ${detail.endTime}` : ''}
                        </span>
                      </span>
                    )}
                  </div>
                </DialogDescription>
              </div>

              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
                <section>
                  <SectionLabel className="mb-3">Thông tin buổi chụp</SectionLabel>
                  <div className="space-y-3">
                    <InfoRow
                      icon={<MapPin />}
                      tone="bg-rose-500/10 text-rose-600 dark:text-rose-300"
                      label="Địa điểm"
                    >
                      {detail.location}
                    </InfoRow>
                    <InfoRow
                      icon={<Gift />}
                      tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                      label="Gói chụp"
                    >
                      {pkg ? (
                        <>
                          {pkg.name}
                          {typeof pkg.pricePerMember === 'number' && (
                            <span className="font-normal text-muted-foreground">
                              {' '}
                              · {pkg.pricePerMember.toLocaleString('vi-VN')}₫/thành viên
                            </span>
                          )}
                        </>
                      ) : null}
                    </InfoRow>
                    <InfoRow
                      icon={<FolderOpen />}
                      tone="bg-sky-500/10 text-sky-600 dark:text-sky-300"
                      label="Folder ảnh"
                    >
                      {detail.customer?.driveFolderUrl ? (
                        <a
                          href={detail.customer.driveFolderUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Mở folder trên Google Drive <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <span className="font-normal italic text-muted-foreground">
                          Lớp chưa có folder
                        </span>
                      )}
                    </InfoRow>
                  </div>
                </section>

                <section>
                  <SectionLabel className="mb-3">Đội ngũ phụ trách</SectionLabel>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {[
                      { role: 'Sale', name: bookedByName },
                      { role: 'Thợ chính', name: leadName },
                    ].map(({ role, name }) => (
                      <div
                        key={role}
                        className="flex items-center gap-3 rounded-[12px] border px-3.5 py-3"
                      >
                        {name ? (
                          <CrewAvatar name={name} size={36} className="text-sm ring-0" />
                        ) : (
                          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            —
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="text-xs text-muted-foreground">{role}</div>
                          <div className="truncate text-sm font-semibold text-foreground">
                            {name ?? (
                              <span className="font-normal italic text-muted-foreground">
                                Chưa có
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-[13px] text-muted-foreground">
                      Thợ phụ{supportList.length ? ` · ${supportList.length} người` : ''}
                    </span>
                    {supportList.length > 0 ? (
                      supportList.map((n, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 py-0.5 pl-0.5 pr-2.5 text-[13px] font-medium text-violet-700 dark:text-violet-300"
                        >
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-bold">
                            {getInitial(n)}
                          </span>
                          {n}
                        </span>
                      ))
                    ) : (
                      <span className="text-[13px] italic text-muted-foreground">Chưa có</span>
                    )}
                  </div>
                </section>

                {detail.notes && (
                  <section>
                    <SectionLabel className="mb-3">Ghi chú</SectionLabel>
                    <div className="flex items-start gap-2.5 rounded-[10px] bg-amber-50 px-3.5 py-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                      <StickyNote className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="min-w-0 whitespace-pre-line break-words leading-relaxed">
                        {detail.notes}
                      </div>
                    </div>
                  </section>
                )}

                {detail.extraServices && detail.extraServices.length > 0 && (
                  <section>
                    <SectionLabel className="mb-3">Dịch vụ sử dụng thêm</SectionLabel>
                    <div className="space-y-2">
                      {detail.extraServices.map((es, idx) => (
                        <div key={idx} className="flex items-baseline gap-3 text-sm">
                          <div className="min-w-0 flex-1">
                            <div className="text-foreground">{es.name}</div>
                            {es.note && (
                              <div className="text-xs text-muted-foreground">{es.note}</div>
                            )}
                          </div>
                          <span className="whitespace-nowrap text-xs text-muted-foreground tabular">
                            {es.quantity} × {es.unitPrice.toLocaleString('vi-VN')}
                          </span>
                          <span className="w-28 whitespace-nowrap text-right font-semibold text-foreground tabular">
                            {es.amount.toLocaleString('vi-VN')} ₫
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between border-t pt-2.5">
                        <span className="text-sm font-semibold text-foreground">Tổng cộng</span>
                        <span className="font-display text-lg font-bold text-primary-700 tabular dark:text-primary">
                          {servicesTotal.toLocaleString('vi-VN')} ₫
                        </span>
                      </div>
                    </div>
                  </section>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t bg-muted/40 px-5 py-3.5 sm:px-6">
                <Button
                  variant="ghost"
                  className="px-2 text-rose-600 hover:bg-rose-500/10 hover:text-rose-600"
                  onClick={() => onDelete(detail)}
                >
                  <Trash2 /> Xoá lịch chụp
                </Button>
                <div className="flex gap-2">
                  {onEditCrew && !isScheduleCancelled(detail) && (
                    <Button variant="outline" onClick={() => onEditCrew(detail)}>
                      <Users /> Sửa ekip
                    </Button>
                  )}
                  <Button onClick={() => onEdit(detail)}>
                    <Pencil /> Sửa lịch
                  </Button>
                </div>
              </div>
            </>
          );
        })()}
    </DialogContent>
  </Dialog>
);

export default ScheduleDetailDialog;
