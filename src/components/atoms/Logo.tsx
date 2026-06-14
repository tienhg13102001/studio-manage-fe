// Ảnh phục vụ tĩnh từ public/ (Vite copy nguyên trạng, không qua bước transform/hash)
const logoSrc = '/images/logo.webp';

interface LogoProps {
  size?: number;
  className?: string;
}

const Logo = ({ size = 36, className = '' }: LogoProps) => (
  <div className="rounded-md overflow-hidden">
    <img
      src={logoSrc}
      alt="Yume Studio"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  </div>
);

export default Logo;
