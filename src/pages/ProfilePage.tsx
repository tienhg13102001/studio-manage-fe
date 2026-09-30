import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import {
  AtSign,
  Check,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Link2,
  Link2Off,
  Lock,
  Send,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { telegramService, type TelegramStatus } from '../services/telegramService';
import { ROLE_LABELS } from '../types';
import { Badge, Button, FormField, Input, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils';

const IconInput = ({
  icon: Icon,
  className,
  ...props
}: React.ComponentProps<typeof Input> & { icon: React.ComponentType<{ className?: string }> }) => (
  <div className="relative">
    <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    <Input className={cn('pl-9', className)} {...props} />
  </div>
);

// ── Profile form ─────────────────────────────────────────────────────────────

interface ProfileFormValues {
  name: string;
}

function ProfileSection() {
  const { user, updateUser } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ProfileFormValues>({
    defaultValues: { name: user?.name ?? '' },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      const updated = await authService.updateProfile({ name: data.name });
      updateUser({ name: updated.name });
      toast.success('Cập nhật thông tin thành công');
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label="Tên đăng nhập" htmlFor="username">
        <IconInput icon={AtSign} id="username" value={user?.username ?? ''} disabled />
      </FormField>
      <FormField label="Họ tên hiển thị" htmlFor="name">
        <IconInput
          icon={UserIcon}
          id="name"
          placeholder="Nhập tên hiển thị"
          {...register('name')}
        />
      </FormField>
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Spinner className="mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4" />}
          Lưu thay đổi
        </Button>
      </div>
    </form>
  );
}

// ── Change password form ──────────────────────────────────────────────────────

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function PasswordSection() {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<PasswordFormValues>();

  const newPassword = watch('newPassword');

  const onSubmit = async (data: PasswordFormValues) => {
    try {
      await authService.changePassword(data.currentPassword, data.newPassword);
      toast.success('Đổi mật khẩu thành công');
      reset();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Có lỗi xảy ra';
      toast.error(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label="Mật khẩu hiện tại" htmlFor="currentPassword">
        <IconInput
          icon={Lock}
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          {...register('currentPassword', { required: 'Vui lòng nhập mật khẩu hiện tại' })}
        />
        {errors.currentPassword && (
          <p className="text-xs text-destructive mt-1">{errors.currentPassword.message}</p>
        )}
      </FormField>
      <FormField label="Mật khẩu mới" htmlFor="newPassword">
        <IconInput
          icon={Lock}
          id="newPassword"
          type="password"
          autoComplete="new-password"
          {...register('newPassword', {
            required: 'Vui lòng nhập mật khẩu mới',
            minLength: { value: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
          })}
        />
        {errors.newPassword && (
          <p className="text-xs text-destructive mt-1">{errors.newPassword.message}</p>
        )}
      </FormField>
      <FormField label="Xác nhận mật khẩu mới" htmlFor="confirmPassword">
        <IconInput
          icon={Lock}
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register('confirmPassword', {
            required: 'Vui lòng xác nhận mật khẩu',
            validate: (v) => v === newPassword || 'Mật khẩu không khớp',
          })}
        />
        {errors.confirmPassword && (
          <p className="text-xs text-destructive mt-1">{errors.confirmPassword.message}</p>
        )}
      </FormField>
      <div className="flex justify-end">
        <Button type="submit" variant="outline" disabled={isSubmitting}>
          {isSubmitting ? (
            <Spinner className="mr-2 h-4 w-4" />
          ) : (
            <KeyRound className="mr-2 h-4 w-4" />
          )}
          Đổi mật khẩu
        </Button>
      </div>
    </form>
  );
}

// ── Telegram section ──────────────────────────────────────────────────────────

function TelegramSection() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  const fetchStatus = async () => {
    try {
      const data = await telegramService.getStatus();
      setStatus(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStatus();
  }, []);

  const handleLink = async () => {
    setLinking(true);
    try {
      const res = await telegramService.generateLinkToken();
      // Open Telegram deeplink in new tab
      window.open(res.url, '_blank', 'noopener,noreferrer');
      toast.info(
        'Mở Telegram và bấm "Start" để hoàn tất liên kết. Token có hiệu lực trong 15 phút.',
      );
      // Poll for link completion every 3s for up to 60s
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const updated = await telegramService.getStatus();
          if (updated.linked) {
            setStatus(updated);
            clearInterval(poll);
            toast.success(`Đã liên kết Telegram thành công!`);
          }
        } catch {
          /* ignore */
        }
        if (attempts >= 20) clearInterval(poll);
      }, 3000);
    } catch {
      toast.error('Không thể tạo liên kết, vui lòng thử lại');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async () => {
    setUnlinking(true);
    try {
      await telegramService.unlink();
      setStatus({ linked: false, telegramUsername: null });
      toast.success('Đã huỷ liên kết Telegram');
    } catch {
      toast.error('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setUnlinking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="h-4 w-4" /> Đang tải...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {status?.linked ? (
        <div className="flex items-start gap-3 rounded-xl bg-emerald-500/15 px-4 py-3 text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">
              {status.telegramUsername
                ? `Đã liên kết: @${status.telegramUsername}`
                : 'Đã liên kết Telegram'}
            </p>
            <p className="mt-0.5">
              Bạn sẽ nhận thông báo Telegram khi có lịch chụp mới hoặc cập nhật trạng thái.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-muted/50 px-4 py-3 text-sm">
          <p className="flex items-center gap-2 font-semibold text-foreground">
            <Send className="h-4 w-4" />
            Chưa liên kết
          </p>
          <p className="mt-0.5 text-muted-foreground">
            Liên kết tài khoản Telegram để nhận thông báo lịch chụp và giao dịch trực tiếp trên điện
            thoại.
          </p>
        </div>
      )}

      {status?.linked ? (
        <div className="flex justify-end">
          <Button variant="outline" onClick={handleUnlink} disabled={unlinking}>
            {unlinking ? (
              <Spinner className="mr-2 h-4 w-4" />
            ) : (
              <Link2Off className="mr-2 w-4 h-4" />
            )}
            Huỷ liên kết
          </Button>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button onClick={handleLink} disabled={linking}>
            {linking ? (
              <Spinner className="mr-2 h-4 w-4" />
            ) : (
              <ExternalLink className="mr-2 w-4 h-4" />
            )}
            Liên kết Telegram
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] border bg-card p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-primary-100 text-primary-700 dark:bg-primary/15 dark:text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-display text-[15px] font-bold leading-tight">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const ProfilePage = () => {
  const { user } = useAuth();
  const initial = (user?.name || user?.username || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 rounded-[14px] border bg-gradient-to-r from-amber-50 via-card to-sky-50 p-5 dark:from-amber-500/10 dark:via-card dark:to-sky-500/10 sm:gap-5 sm:p-6">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-amber-400 via-emerald-400 to-sky-500 font-display text-3xl font-bold text-white shadow-sm sm:h-[72px] sm:w-[72px]">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-primary-700 dark:text-primary">
            @{user?.username}
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-[28px]">
            Hồ sơ cá nhân
          </h1>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {user?.roles?.map((r) => (
              <Badge key={r} variant="violet">
                {ROLE_LABELS[r]}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <SectionCard
            icon={UserIcon}
            title="Thông tin cá nhân"
            subtitle="Tên hiển thị trong hệ thống và thông báo"
          >
            <ProfileSection />
          </SectionCard>

          <SectionCard
            icon={Link2}
            title="Liên kết Telegram"
            subtitle="Nhận thông báo lịch chụp và giao dịch"
          >
            <TelegramSection />
          </SectionCard>
        </div>

        <SectionCard icon={KeyRound} title="Đổi mật khẩu" subtitle="Tối thiểu 6 ký tự">
          <PasswordSection />
        </SectionCard>
      </div>
    </div>
  );
};

export default ProfilePage;
