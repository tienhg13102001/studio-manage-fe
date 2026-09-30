import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ArrowRight, CircleAlert, Lock, User } from 'lucide-react';
import Logo from '../components/atoms/Logo';
import { useAuth } from '../context/AuthContext';
import { Button, FormField, Input } from '@/components/ui';

interface FormValues {
  username: string;
  password: string;
}

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>();

  const onSubmit = async (data: FormValues) => {
    setError('');
    try {
      await login(data.username, data.password);
      navigate('/');
    } catch {
      setError('Tên đăng nhập hoặc mật khẩu không đúng.');
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Brand panel */}
      <div className="hidden lg:flex relative w-[620px] shrink-0 flex-col justify-between overflow-hidden bg-[#12112A] p-14 text-white">
        <div className="absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full pointer-events-none bg-amber-500/30 blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 h-[380px] w-[380px] rounded-full pointer-events-none bg-cyan-500/25 blur-[100px]" />

        <div className="relative flex items-center gap-3">
          <div className="rounded-xl overflow-hidden shadow-[0_0_24px_rgba(245,158,11,0.45)]">
            <Logo size={44} />
          </div>
          <span className="font-display text-xl font-bold">Yume Studio</span>
        </div>

        <div className="relative max-w-[480px]">
          <h2 className="font-display text-[40px] font-bold leading-[1.15]">
            Mọi buổi chụp kỷ yếu, gọn gàng trong một nơi.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-white/60">
            Quản lý lớp, lịch chụp, trang phục, thu chi và phản hồi khách hàng — cho cả ekip Yume.
          </p>
        </div>

        <div className="relative" />
      </div>

      {/* Form */}
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-[380px]">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="rounded-xl overflow-hidden shadow-[0_0_24px_rgba(245,158,11,0.45)]">
              <Logo size={40} />
            </div>
            <span className="font-display text-xl font-bold">Yume Studio</span>
          </div>

          <h1 className="font-display text-[28px] font-bold leading-tight">Đăng nhập</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Chào mừng trở lại! Đăng nhập để tiếp tục.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            <FormField label="Tên đăng nhập" htmlFor="username">
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  className="pl-10"
                  placeholder="superadmin"
                  autoComplete="username"
                  {...register('username', { required: true })}
                />
              </div>
            </FormField>
            <FormField label="Mật khẩu" htmlFor="password">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  className="pl-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password', { required: true })}
                />
              </div>
            </FormField>

            {error && (
              <p className="flex items-center gap-2 text-sm rounded-[10px] px-3 py-2.5 text-rose-700 dark:text-rose-300 bg-rose-500/10">
                <CircleAlert className="h-4 w-4 shrink-0" />
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant="gradient"
              disabled={isSubmitting}
              className="w-full h-11"
            >
              {isSubmitting ? (
                'Đang đăng nhập…'
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  Đăng nhập
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-xs text-muted-foreground">
            © {new Date().getFullYear()} Yume Studio · Quản lý chụp ảnh
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
