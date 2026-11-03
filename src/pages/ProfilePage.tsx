import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { Check, ExternalLink, Eye, EyeOff, Link2Off, Lock, Send, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { telegramService, type TelegramStatus } from '../services/telegramService';
import { ROLE_LABELS } from '../types';
import { Badge, Button, FormField, Input, Skeleton, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils';

const apiMessage = (err: unknown) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message;

const invalidCls =
  'aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/20';

const formatJoined = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `Tham gia tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
};

// ── Layout primitives ────────────────────────────────────────────────────────

/** Một nhóm cài đặt: mô tả bên trái, nội dung bên phải (xếp chồng trên mobile). */
function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="grid gap-4 border-t py-7 first:border-t-0 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-10 md:py-9"
    >
      <div className="space-y-1">
        <h2 id={id} className="text-[15px] font-semibold text-foreground">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground text-pretty">{description}</p>
      </div>
      <div className="min-w-0 max-w-xl">{children}</div>
    </section>
  );
}

function FormActions({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-end gap-2 pt-1">{children}</div>;
}

const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<typeof Input>, 'type'>
>(({ className, ...props }, ref) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={cn('pr-10', invalidCls, className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-[10px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
});
PasswordInput.displayName = 'PasswordInput';

// ── Identity header ──────────────────────────────────────────────────────────

function IdentityHeader() {
  const { user } = useAuth();
  const displayName = user?.name?.trim() || user?.username || '';
  const initial = (displayName || '?').charAt(0).toUpperCase();
  const joined = formatJoined(user?.createdAt);

  return (
    <header className="flex items-start gap-4 sm:items-center pb-7 sm:gap-5 md:pb-9">
      <div
        aria-hidden
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary font-display text-2xl font-bold text-primary-foreground sm:h-16 sm:w-16 sm:text-[28px]"
      >
        {initial}
      </div>
      <div className="min-w-0 space-y-1.5">
        <h1 className="truncate font-display text-2xl font-bold tracking-tight text-foreground md:text-[28px]">
          {displayName}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
          <span className="truncate">@{user?.username}</span>
          {user?.roles?.map((r) => (
            <Badge key={r} variant="outline" className="bg-card font-medium">
              {ROLE_LABELS[r]}
            </Badge>
          ))}
          {joined && <span className="max-sm:hidden">{joined}</span>}
        </div>
      </div>
    </header>
  );
}

// ── Personal info ────────────────────────────────────────────────────────────

interface ProfileFormValues {
  name: string;
}

function PersonalInfoForm() {
  const { user, updateUser } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty, errors },
  } = useForm<ProfileFormValues>({ defaultValues: { name: user?.name ?? '' } });

  const onSubmit = async ({ name }: ProfileFormValues) => {
    try {
      const updated = await authService.updateProfile({ name: name.trim() });
      updateUser({ name: updated.name });
      reset({ name: updated.name ?? '' });
      toast.success('Đã lưu tên hiển thị');
    } catch (err) {
      toast.error(apiMessage(err) ?? 'Không lưu được, vui lòng thử lại');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <span className="text-sm font-medium leading-none text-foreground">Tên đăng nhập</span>
        <div className="flex h-10 items-center gap-2 rounded-md border border-dashed px-3 text-sm text-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">{user?.username}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Dùng để đăng nhập, không đổi được. Cần đổi thì liên hệ admin.
        </p>
      </div>

      <FormField
        label="Tên hiển thị"
        htmlFor="name"
        hint="Tên hiển thị trong hệ thống và trong thông báo."
        error={errors.name?.message}
      >
        <Input
          id="name"
          className={invalidCls}
          autoComplete="name"
          placeholder="VD: Nguyễn Minh Anh"
          aria-invalid={!!errors.name}
          {...register('name', {
            validate: (v) => v.trim().length > 0 || 'Nhập tên hiển thị',
            maxLength: { value: 60, message: 'Tối đa 60 ký tự' },
          })}
        />
      </FormField>

      <FormActions>
        {isDirty && (
          <Button type="button" variant="ghost" onClick={() => reset()} disabled={isSubmitting}>
            Huỷ
          </Button>
        )}
        <Button type="submit" disabled={!isDirty || isSubmitting}>
          {isSubmitting ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          Lưu thay đổi
        </Button>
      </FormActions>
    </form>
  );
}

// ── Telegram ─────────────────────────────────────────────────────────────────

const POLL_MS = 3000;
const POLL_MAX = 20; // ~60 giây

function TelegramPanel() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState<'link' | 'unlink' | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    setPendingUrl(null);
  }, []);

  const load = useCallback(async () => {
    setLoadFailed(false);
    try {
      setStatus(await telegramService.getStatus());
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  const handleLink = async () => {
    setBusy('link');
    try {
      const res = await telegramService.generateLinkToken();
      window.open(res.url, '_blank', 'noopener,noreferrer');
      setPendingUrl(res.url);
      let attempts = 0;
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        attempts++;
        try {
          const next = await telegramService.getStatus();
          if (next.linked) {
            setStatus(next);
            stopPolling();
            toast.success('Đã liên kết Telegram');
            return;
          }
        } catch {
          /* thử lại ở lượt sau */
        }
        if (attempts >= POLL_MAX) {
          stopPolling();
          toast.info('Chưa thấy xác nhận từ Telegram. Bấm "Liên kết Telegram" để thử lại.');
        }
      }, POLL_MS);
    } catch {
      toast.error('Không tạo được liên kết, vui lòng thử lại');
    } finally {
      setBusy(null);
    }
  };

  const handleUnlink = async () => {
    setBusy('unlink');
    try {
      await telegramService.unlink();
      setStatus({ linked: false, telegramUsername: null });
      toast.success('Đã huỷ liên kết Telegram');
    } catch {
      toast.error('Không huỷ được liên kết, vui lòng thử lại');
    } finally {
      setBusy(null);
    }
  };

  if (loadFailed) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Không tải được trạng thái Telegram.</p>
        <Button size="sm" variant="outline" onClick={() => void load()}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (!status) {
    return (
      <div
        className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3.5"
        aria-busy="true"
      >
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
    );
  }

  const linked = status.linked;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-3.5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            aria-hidden
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
              linked
                ? 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-300'
                : 'bg-muted text-muted-foreground',
            )}
          >
            <Send className="h-4 w-4 -translate-x-px translate-y-px" />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              {linked ? 'Đã liên kết' : 'Chưa liên kết'}
              {linked && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {linked
                ? status.telegramUsername
                  ? `@${status.telegramUsername}`
                  : 'Tài khoản Telegram của bạn'
                : 'Chưa nhận thông báo qua Telegram'}
            </p>
          </div>
        </div>

        {linked ? (
          <Button
            variant="outline"
            onClick={handleUnlink}
            disabled={busy !== null}
            className="w-full sm:w-auto"
          >
            {busy === 'unlink' ? <Spinner className="h-4 w-4" /> : <Link2Off className="h-4 w-4" />}
            Huỷ liên kết
          </Button>
        ) : (
          !pendingUrl && (
            <Button onClick={handleLink} disabled={busy !== null} className="w-full sm:w-auto">
              {busy === 'link' ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Liên kết Telegram
            </Button>
          )
        )}
      </div>

      {pendingUrl && !linked && (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-lg border border-dashed bg-muted/60 px-4 py-3.5 text-sm text-foreground sm:flex-row sm:items-center"
        >
          <div className="flex flex-1 items-start gap-2.5">
            <Spinner className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-pretty">
              Đang chờ xác nhận. Trong Telegram, bấm{' '}
              <strong className="font-semibold">Start</strong> để hoàn tất. Mã liên kết có hiệu lực
              15 phút.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button asChild size="sm" variant="outline" className="flex-1 sm:flex-none">
              <a href={pendingUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Mở Telegram
              </a>
            </Button>
            <Button size="sm" variant="ghost" onClick={stopPolling} aria-label="Dừng chờ xác nhận">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Password ─────────────────────────────────────────────────────────────────

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function PasswordForm() {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { isSubmitting, isDirty, errors },
  } = useForm<PasswordFormValues>({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const newPassword = watch('newPassword');

  const onSubmit = async (data: PasswordFormValues) => {
    try {
      await authService.changePassword(data.currentPassword, data.newPassword);
      toast.success('Đã đổi mật khẩu');
      reset();
    } catch (err) {
      const msg = apiMessage(err);
      if (msg && /hiện tại/i.test(msg)) {
        setError('currentPassword', { message: msg }, { shouldFocus: true });
      } else {
        toast.error(msg ?? 'Không đổi được mật khẩu, vui lòng thử lại');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <FormField
        label="Mật khẩu hiện tại"
        htmlFor="currentPassword"
        error={errors.currentPassword?.message}
      >
        <PasswordInput
          id="currentPassword"
          autoComplete="current-password"
          aria-invalid={!!errors.currentPassword}
          {...register('currentPassword', { required: 'Nhập mật khẩu hiện tại' })}
        />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
        <FormField
          label="Mật khẩu mới"
          htmlFor="newPassword"
          hint="Ít nhất 6 ký tự."
          error={errors.newPassword?.message}
        >
          <PasswordInput
            id="newPassword"
            autoComplete="new-password"
            aria-invalid={!!errors.newPassword}
            {...register('newPassword', {
              required: 'Nhập mật khẩu mới',
              minLength: { value: 6, message: 'Cần ít nhất 6 ký tự' },
            })}
          />
        </FormField>
        <FormField
          label="Nhập lại mật khẩu mới"
          htmlFor="confirmPassword"
          error={errors.confirmPassword?.message}
        >
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            {...register('confirmPassword', {
              required: 'Nhập lại mật khẩu mới',
              validate: (v) => v === newPassword || 'Hai mật khẩu chưa khớp',
            })}
          />
        </FormField>
      </div>

      <FormActions>
        {isDirty && (
          <Button type="button" variant="ghost" onClick={() => reset()} disabled={isSubmitting}>
            Huỷ
          </Button>
        )}
        <Button type="submit" variant="outline" disabled={!isDirty || isSubmitting}>
          {isSubmitting && <Spinner className="h-4 w-4" />}
          Đổi mật khẩu
        </Button>
      </FormActions>
    </form>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const ProfilePage = () => (
  <div className="mx-auto w-full max-w-5xl">
    <IdentityHeader />
    <div className="border-t">
      <SettingsSection
        id="profile-info"
        title="Thông tin cá nhân"
        description="Tên đăng nhập và tên hiển thị của bạn trong hệ thống."
      >
        <PersonalInfoForm />
      </SettingsSection>
      <SettingsSection
        id="profile-telegram"
        title="Thông báo Telegram"
        description="Nhận thông báo lịch chụp mới, cập nhật trạng thái và giao dịch ngay trên điện thoại."
      >
        <TelegramPanel />
      </SettingsSection>
      <SettingsSection
        id="profile-password"
        title="Mật khẩu"
        description="Cần nhập mật khẩu hiện tại để đặt mật khẩu mới."
      >
        <PasswordForm />
      </SettingsSection>
    </div>
  </div>
);

export default ProfilePage;
