import { useState, type KeyboardEvent } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, CircleAlert, Eye, EyeOff } from 'lucide-react';
import Logo from '../components/atoms/Logo';
import { useAuth } from '../context/AuthContext';
import { Button, FormField, Input, Spinner } from '@/components/ui';

interface FormValues {
  username: string;
  password: string;
}

/** Lỗi đăng nhập theo nguyên nhân: sai thông tin, mất mạng, hay máy chủ lỗi. */
const loginErrorMessage = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 401 || status === 400) {
      return 'Sai tên đăng nhập hoặc mật khẩu. Nếu tài khoản đã bị khoá, hãy liên hệ admin.';
    }
    if (!err.response) return 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.';
    if (status && status >= 500) return 'Máy chủ đang gặp sự cố. Thử lại sau ít phút.';
  }
  return 'Đăng nhập không thành công. Thử lại sau ít phút.';
};

/** Bìa sách kỷ yếu: nền xanh bìa, khung ép chìm hai nét. */
const CoverPanel = () => (
  <div className="relative hidden w-[44%] max-w-[620px] shrink-0 flex-col justify-between overflow-hidden bg-book p-12 text-book-foreground lg:flex xl:p-14">
    <div
      aria-hidden
      className="pointer-events-none absolute inset-6 rounded-sm border border-foil/35"
    />
    <div
      aria-hidden
      className="pointer-events-none absolute inset-[30px] rounded-sm border border-foil/20"
    />

    <div className="relative flex items-center gap-3">
      <Logo size={44} className="rounded-lg" />
      <span className="font-display text-xl font-bold text-foil">Yume Studio</span>
    </div>

    <div className="relative max-w-[460px]">
      <span aria-hidden className="mb-7 block h-px w-16 bg-foil" />
      <p className="text-balance font-display text-[40px] font-bold leading-[1.12] tracking-tight xl:text-[44px]">
        Mọi buổi chụp kỷ yếu, gọn gàng trong một nơi.
      </p>
      <p className="mt-5 max-w-[400px] text-base leading-relaxed text-book-muted">
        Lớp, lịch chụp, ekip, trang phục, thu chi và phản hồi của khách, cho cả ekip Yume.
      </p>
    </div>

    <p className="relative text-[13px] text-book-muted">
      © {new Date().getFullYear()} Yume Studio · Studio chụp kỷ yếu
    </p>
  </div>
);

const LoginPage = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>();

  const onSubmit = async (data: FormValues) => {
    setError('');
    try {
      await login(data.username.trim(), data.password);
      navigate('/');
    } catch (err) {
      setError(loginErrorMessage(err));
    }
  };

  if (isAuthenticated && !isSubmitting) return <Navigate to="/" replace />;

  const trackCapsLock = (e: KeyboardEvent<HTMLInputElement>) =>
    setCapsLock(e.getModifierState?.('CapsLock') ?? false);

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <CoverPanel />

      {/* Mobile: dải bìa ngắn mang logo, form nằm trên nền giấy. */}
      <header className="flex items-center gap-3 bg-book px-6 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))] text-book-foreground lg:hidden">
        <Logo size={40} className="rounded-lg" />
        <div className="leading-tight">
          <p className="font-display text-lg font-bold text-foil">Yume Studio</p>
          <p className="text-[13px] text-book-muted">Studio chụp kỷ yếu</p>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-6 pb-10 pt-10 lg:items-center lg:py-10">
        <div className="w-full max-w-[380px]">
          <h1 className="font-display text-[30px] font-bold leading-tight tracking-tight">
            Đăng nhập
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Dùng tài khoản admin đã cấp cho bạn.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
            <FormField
              label="Tên đăng nhập"
              htmlFor="username"
              error={errors.username ? 'Nhập tên đăng nhập' : undefined}
            >
              <Input
                id="username"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
                aria-invalid={!!errors.username}
                aria-describedby={errors.username ? 'username-error' : undefined}
                className="h-11 max-sm:text-base"
                {...register('username', {
                  validate: (v) => v.trim() !== '',
                  onChange: () => setError(''),
                })}
              />
            </FormField>

            <FormField
              label="Mật khẩu"
              htmlFor="password"
              error={errors.password ? 'Nhập mật khẩu' : undefined}
            >
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    [errors.password && 'password-error', capsLock && 'caps-lock-hint']
                      .filter(Boolean)
                      .join(' ') || undefined
                  }
                  className="h-11 pr-11 max-sm:text-base"
                  onKeyUp={trackCapsLock}
                  onKeyDown={trackCapsLock}
                  {...register('password', {
                    required: true,
                    onChange: () => setError(''),
                    onBlur: () => setCapsLock(false),
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {capsLock && (
                <p id="caps-lock-hint" className="mt-1.5 text-xs font-medium text-foreground">
                  Caps Lock đang bật
                </p>
              )}
            </FormField>

            <div role="alert" className="empty:!mt-0">
              {error && (
                <p className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-red-700 dark:text-red-300">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {error}
                </p>
              )}
            </div>

            <Button type="submit" disabled={isSubmitting} className="h-11 w-full text-[15px]">
              {isSubmitting ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Đang đăng nhập…
                </>
              ) : (
                <>
                  Đăng nhập
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-[13px] text-muted-foreground">
            Quên mật khẩu? Nhờ admin đặt lại trong mục Người dùng.
          </p>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
