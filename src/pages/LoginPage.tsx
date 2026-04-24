import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/atoms/Logo';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

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
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{background:'var(--login-bg)'}}
    >
      {/* Ambient glow blobs */}
      <div
        className="absolute top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{background:`radial-gradient(circle, var(--login-blob1) 0%, transparent 70%)`, filter:'blur(40px)'}}
      />
      <div
        className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{background:`radial-gradient(circle, var(--login-blob2) 0%, transparent 70%)`, filter:'blur(40px)'}}
      />

      {/* Glass card */}
      <div
        className="relative w-full max-w-sm mx-4 rounded-2xl p-8"
        style={{
          background: 'var(--login-card-bg)',
          border: '1px solid var(--login-card-border)',
          backdropFilter: 'blur(24px)',
          boxShadow: 'var(--login-card-shadow)',
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4 rounded-2xl overflow-hidden" style={{boxShadow:'0 0 24px rgba(124,58,237,0.6)'}}>
            <Logo size={56} />
          </div>
          <h1 className="text-2xl font-bold text-gradient">Yume Studio</h1>
          <p className="text-sm mt-1" style={{color:'#475569'}}>Đăng nhập để tiếp tục</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Tên đăng nhập</label>
            <input
              {...register('username', { required: true })}
              className="input"
              placeholder="superadmin"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="label">Mật khẩu</label>
            <input
              {...register('password', { required: true })}
              type="password"
              className="input"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p
              className="text-sm rounded-xl px-3 py-2"
              style={{color:'#fca5a5', background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.2)'}}
            >
              {error}
            </p>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-2 py-3">
            {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
