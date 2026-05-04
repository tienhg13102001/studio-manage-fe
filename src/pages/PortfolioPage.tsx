import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import Logo from '../components/atoms/Logo';
import { useTheme } from '../context/ThemeContext';
import { customerService } from '../services/customerService';
import { feedbackService } from '../services/feedbackService';
import { packageService } from '../services/packageService';
import type { Package } from '../types';

/* ── Static content ──────────────────────────── */

const services = [
  {
    icon: '📷',
    title: 'Chụp ảnh kỷ yếu',
    desc: 'Lưu giữ trọn vẹn năm cuối cấp với những khung hình điện ảnh, concept đa dạng phù hợp từng lớp.',
  },
  {
    icon: '🎬',
    title: 'Quay phim & Hậu kỳ',
    desc: 'Video kỷ yếu chuẩn điện ảnh 4K, dựng theo phong cách MV cùng âm nhạc và màu phim chuyên nghiệp.',
  },
  {
    icon: '📖',
    title: 'Thiết kế album',
    desc: 'Album in cao cấp, layout riêng cho từng lớp. Tặng kèm bản digital chia sẻ cho cả tập thể.',
  },
  {
    icon: '💄',
    title: 'Makeup & Stylist',
    desc: 'Đội ngũ makeup, làm tóc đồng hành xuyên suốt buổi chụp giúp các bạn luôn rạng rỡ trên sân khấu.',
  },
  {
    icon: '👔',
    title: 'Trang phục biểu diễn',
    desc: 'Hơn 200 mẫu trang phục: cử nhân, áo dài, học sinh, vintage, cosplay… phù hợp đa dạng concept.',
  },
  {
    icon: '🚐',
    title: 'Tour ngoại cảnh',
    desc: 'Đưa lớp đi chụp tại các điểm hot: Đà Lạt, Mộc Châu, biển, làng cổ… trọn gói di chuyển – ăn ở.',
  },
];

const concepts = [
  { tag: 'Cử nhân', tone: 'from-amber-400 to-orange-500', icon: '🎓' },
  { tag: 'Áo dài Việt', tone: 'from-rose-400 to-pink-500', icon: '👘' },
  { tag: 'Vintage', tone: 'from-yellow-400 to-amber-600', icon: '📻' },
  { tag: 'Cinematic', tone: 'from-cyan-400 to-blue-500', icon: '🎬' },
  { tag: 'Cổ phục', tone: 'from-fuchsia-400 to-purple-500', icon: '🏯' },
  { tag: 'Học đường', tone: 'from-emerald-400 to-teal-500', icon: '🏫' },
  { tag: 'Y2K', tone: 'from-pink-400 to-fuchsia-500', icon: '💿' },
  { tag: 'Outdoor', tone: 'from-lime-400 to-green-500', icon: '🌿' },
];

const steps = [
  {
    n: '01',
    title: 'Tư vấn & chốt concept',
    desc: 'Lắng nghe ý tưởng của lớp, đề xuất concept – địa điểm – trang phục phù hợp ngân sách.',
  },
  {
    n: '02',
    title: 'Lên lịch & chuẩn bị',
    desc: 'Khảo sát địa điểm, chuẩn bị trang phục, đạo cụ, ekip. Phụ huynh có thể theo dõi lịch chụp online.',
  },
  {
    n: '03',
    title: 'Buổi chụp & quay',
    desc: 'Ekip 5–8 người (photographer, quay phim, makeup, stylist) đồng hành cùng lớp xuyên suốt.',
  },
  {
    n: '04',
    title: 'Hậu kỳ & bàn giao',
    desc: 'Trả ảnh thô trong 3 ngày, ảnh blend & video hoàn chỉnh trong 14 ngày. Album in 30 ngày.',
  },
];

const fallbackPackages: PackageDisplay[] = [
  {
    id: 'fallback-small',
    name: 'Lớp nhỏ',
    price: 'Liên hệ',
    note: 'Phù hợp lớp ≤ 25 bạn',
    items: ['1 buổi chụp', '1 concept', 'Ảnh đã blend', 'Album digital chia sẻ'],
    featured: false,
  },
  {
    id: 'fallback-full',
    name: 'Trọn gói Yume',
    price: 'Liên hệ',
    note: 'Lựa chọn được yêu thích nhất',
    items: ['Full day', 'Nhiều concept', 'Video kỷ yếu 4K', 'Album in cao cấp'],
    featured: true,
  },
  {
    id: 'fallback-tour',
    name: 'Tour ngoại cảnh',
    price: 'Liên hệ',
    note: 'Đà Lạt – Mộc Châu – Biển',
    items: ['2 ngày 1 đêm', 'Trọn gói di chuyển', 'Ekip mở rộng', 'Video MV cinematic'],
    featured: false,
  },
];

const durationLabel: Record<NonNullable<Package['duration']>, string> = {
  full_day: 'Buổi chụp full day (1 ngày)',
  half_day: 'Buổi chụp 1/2 ngày',
  two_thirds_day: 'Buổi chụp 2/3 ngày',
};

const editingScopeLabel: Record<NonNullable<Package['editingScope']>, string> = {
  full: 'Hậu kỳ blend màu toàn bộ ảnh',
  partial: 'Hậu kỳ blend màu ảnh chọn lọc',
};

const formatVnd = (n: number) =>
  `${n.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ / bạn`;

interface PackageDisplay {
  id: string;
  name: string;
  price: string;
  note: string;
  items: string[];
  featured: boolean;
}

const toDisplay = (list: Package[]): PackageDisplay[] => {
  if (!list.length) return [];
  // Featured = first package explicitly marked isPopular by admin
  const featuredId = list.find((p) => p.isPopular)?._id;
  return list.map((p) => {
    const items: string[] = [];
    if (p.duration) items.push(durationLabel[p.duration]);
    if (p.crewRatio) items.push(`Ekip: ${p.crewRatio}`);
    if (p.studentsPerCrew) items.push(`${p.studentsPerCrew} bạn / ekip`);
    if (p.editingScope) items.push(editingScopeLabel[p.editingScope]);
    if (p.deliveryDays) items.push(`Bàn giao trong ${p.deliveryDays} ngày`);
    if (p.costumes && p.costumes.length) {
      const names = p.costumes
        .map((c) => c?.name?.trim())
        .filter((n): n is string => Boolean(n));
      if (names.length) {
        items.push(`Trang phục: ${names.join(', ')}`);
      } else {
        items.push(`${p.costumes.length} loại trang phục đi kèm`);
      }
    }
    if (!items.length) items.push('Liên hệ Yume để biết thêm chi tiết');
    return {
      id: p._id,
      name: p.name,
      price: p.pricePerMember > 0 ? formatVnd(p.pricePerMember) : 'Liên hệ',
      note: p.description?.trim() || 'Báo giá tham khảo, tư vấn riêng theo lớp',
      items,
      featured: p._id === featuredId,
    };
  });
};

const testimonials = [
  {
    name: 'Lớp 12A1 – THPT Phan Đình Phùng',
    role: 'Hà Nội',
    rating: 5,
    quote:
      'Ekip cực kỳ chuyên nghiệp, ảnh ra siêu đẹp và đúng concept tụi mình mong muốn. Cả lớp đều thích!',
  },
  {
    name: 'Lớp K65 – ĐH Bách Khoa',
    role: 'Hà Nội',
    rating: 5,
    quote:
      'Bọn mình book gói trọn gói, video kỷ yếu xem đi xem lại không chán. Cảm ơn Yume rất nhiều!',
  },
  {
    name: 'Lớp 12A5 – THPT Chu Văn An',
    role: 'Hà Nội',
    rating: 5,
    quote:
      'Makeup xinh, ekip nhiệt tình hỗ trợ pose dáng. Album in chất lượng giấy đẹp, đáng đồng tiền.',
  },
];

/* ── Helpers ─────────────────────────────────── */

interface FeedbackForm {
  phone: string;
  crewRating: number;
  albumRating: number;
  crewDesc: string;
  albumDesc: string;
  suggestion: string;
}

const initialForm: FeedbackForm = {
  phone: '',
  crewRating: 5,
  albumRating: 5,
  crewDesc: '',
  albumDesc: '',
  suggestion: '',
};

/* ── Page ────────────────────────────────────── */

const PortfolioPage = () => {
  const { isDark, toggleTheme } = useTheme();
  const [classCount, setClassCount] = useState<number | null>(null);
  const [schoolCount, setSchoolCount] = useState<number | null>(null);
  const [pkgList, setPkgList] = useState<Package[] | null>(null);
  const [form, setForm] = useState<FeedbackForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Fetch real stats from public API
  useEffect(() => {
    customerService
      .listPublic()
      .then((list) => {
        setClassCount(list.length);
        const schools = new Set(list.map((c) => (c.school || '').trim()).filter(Boolean));
        setSchoolCount(schools.size);
      })
      .catch(() => {
        setClassCount(0);
        setSchoolCount(0);
      });
  }, []);

  // Fetch real pricing packages from public API
  useEffect(() => {
    packageService
      .listPublic()
      .then((list) => setPkgList(list))
      .catch(() => setPkgList([]));
  }, []);

  const displayPackages = useMemo<PackageDisplay[]>(() => {
    if (pkgList === null) return fallbackPackages;
    const mapped = toDisplay(pkgList);
    return mapped.length ? mapped : fallbackPackages;
  }, [pkgList]);

  const stats = useMemo(
    () => [
      { num: classCount !== null ? `${classCount}+` : '—', label: 'Lớp đã đồng hành' },
      { num: schoolCount !== null ? `${schoolCount}+` : '—', label: 'Trường đối tác' },
      { num: '50K+', label: 'Khung hình đã chụp' },
      { num: '5+', label: 'Năm kinh nghiệm' },
    ],
    [classCount, schoolCount],
  );

  const handleSubmitFeedback = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.crewDesc.trim() || !form.albumDesc.trim()) {
      toast.warn('Vui lòng chia sẻ cảm nhận về ekip và album.');
      return;
    }
    setSubmitting(true);
    try {
      await feedbackService.submit({
        phone: form.phone || undefined,
        crewFeedback: { rating: form.crewRating, description: form.crewDesc.trim() },
        albumFeedback: { rating: form.albumRating, description: form.albumDesc.trim() },
        suggestion: form.suggestion || undefined,
      });
      setSubmitted(true);
      setForm(initialForm);
      toast.success('Cảm ơn bạn đã gửi cảm nhận tới Yume!');
    } catch {
      toast.error('Không gửi được cảm nhận, vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-800 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      {/* ── Navigation ───────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-white/70 dark:bg-slate-950/70 border-b border-slate-200/60 dark:border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-2">
            <Logo size={36} />
            <span className="font-bold text-lg text-gradient">Yume Studio</span>
          </a>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#about" className="hover:text-amber-500 transition">
              Về Yume
            </a>
            <a href="#services" className="hover:text-amber-500 transition">
              Dịch vụ
            </a>
            <a href="#gallery" className="hover:text-amber-500 transition">
              Concept
            </a>
            <a href="#process" className="hover:text-amber-500 transition">
              Quy trình
            </a>
            <a href="#packages" className="hover:text-amber-500 transition">
              Báo giá
            </a>
            <a href="#feedback" className="hover:text-amber-500 transition">
              Cảm nhận
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Đổi giao diện"
              className="w-10 h-10 rounded-full flex items-center justify-center border border-slate-200 dark:border-white/10 hover:border-amber-300 hover:text-amber-500 transition text-slate-600 dark:text-slate-300"
            >
              {isDark ? '☀️' : '🌙'}
            </button>
            <a
              href="#contact"
              className="hidden sm:inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold text-white shadow-md hover:shadow-lg transition"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #22d3ee 100%)' }}
            >
              Đặt lịch
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────── */}
      <section id="top" className="relative pt-28 pb-20 sm:pt-36 sm:pb-28 overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: isDark
              ? 'radial-gradient(circle at 20% 20%, rgba(245,158,11,0.18), transparent 60%), radial-gradient(circle at 80% 80%, rgba(34,211,238,0.18), transparent 60%), linear-gradient(180deg, #0a0a12 0%, #0c1a2e 100%)'
              : 'radial-gradient(circle at 20% 20%, rgba(245,158,11,0.18), transparent 60%), radial-gradient(circle at 80% 80%, rgba(34,211,238,0.18), transparent 60%), linear-gradient(180deg, #fff7ed 0%, #ecfeff 100%)',
          }}
        />
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-amber-200/40 dark:bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-cyan-200/40 dark:bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: text */}
          <div className="text-center lg:text-left">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase text-amber-700 bg-amber-100/80 border border-amber-200 dark:text-amber-300 dark:bg-amber-400/10 dark:border-amber-400/30">
              Studio chụp ảnh kỷ yếu chuyên nghiệp
            </span>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1]">
              <span className="text-gradient">Lưu giữ thanh xuân</span>
              <br />
              <span className="text-slate-800 dark:text-white">qua từng khung hình</span>
            </h1>
            <p className="mt-6 max-w-xl mx-auto lg:mx-0 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
              Yume Studio đồng hành cùng các lớp 12, sinh viên năm cuối tạo nên những bộ ảnh và
              video kỷ yếu chuẩn điện ảnh – nơi mỗi nụ cười, mỗi cái ôm đều trở thành kỷ niệm không
              bao giờ phai.
            </p>
            <div className="mt-10 flex flex-wrap justify-center lg:justify-start gap-4">
              <a
                href="#contact"
                className="inline-flex items-center px-6 py-3 rounded-full text-sm sm:text-base font-semibold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition"
                style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #22d3ee 100%)' }}
              >
                📅 Đặt lịch chụp
              </a>
              <a
                href="#gallery"
                className="inline-flex items-center px-6 py-3 rounded-full text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-100 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-amber-300 hover:text-amber-600 transition"
              >
                Xem concept
              </a>
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {stats.map((f) => (
                <div
                  key={f.label}
                  className="rounded-2xl bg-white/80 dark:bg-white/5 backdrop-blur border border-white dark:border-white/10 shadow-sm py-4"
                >
                  <div className="text-xl sm:text-2xl font-extrabold text-gradient px-2">
                    {f.num}
                  </div>
                  <div className="mt-1 text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 px-2">
                    {f.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: photo collage */}
          <div className="relative h-[480px] hidden lg:block">
            <div
              className="absolute top-0 right-0 w-56 h-72 rounded-3xl shadow-2xl rotate-3 overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}
            >
              <div className="w-full h-full flex flex-col items-center justify-center text-white">
                <div className="text-6xl">🎓</div>
                <div className="mt-3 text-sm font-bold tracking-widest">CỬ NHÂN</div>
              </div>
            </div>
            <div
              className="absolute top-16 left-4 w-52 h-64 rounded-3xl shadow-2xl -rotate-6 overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #f472b6, #ec4899)' }}
            >
              <div className="w-full h-full flex flex-col items-center justify-center text-white">
                <div className="text-6xl">👘</div>
                <div className="mt-3 text-sm font-bold tracking-widest">ÁO DÀI</div>
              </div>
            </div>
            <div
              className="absolute bottom-0 right-12 w-60 h-72 rounded-3xl shadow-2xl rotate-6 overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #22d3ee, #6366f1)' }}
            >
              <div className="w-full h-full flex flex-col items-center justify-center text-white">
                <div className="text-6xl">🎬</div>
                <div className="mt-3 text-sm font-bold tracking-widest">CINEMATIC</div>
              </div>
            </div>
            <div className="absolute -bottom-2 left-12 bg-white dark:bg-slate-900 rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 border border-slate-100 dark:border-white/10">
              <div className="text-2xl">⭐</div>
              <div>
                <div className="text-sm font-bold">4.9 / 5</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Trên 500+ đánh giá</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── About ────────────────────────────────── */}
      <section id="about" className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Về Yume Studio
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold">Mỗi bộ ảnh là một câu chuyện</h2>
            <p className="mt-5 text-slate-600 dark:text-slate-300 leading-relaxed">
              Chúng tôi không chỉ chụp ảnh – chúng tôi kể lại tuổi 18 của bạn bằng ngôn ngữ điện
              ảnh. Từ ánh sáng, màu sắc đến từng khoảnh khắc tự nhiên nhất, Yume Studio biến buổi
              chụp kỷ yếu thành một ngày đáng nhớ trong đời.
            </p>
            <p className="mt-4 text-slate-600 dark:text-slate-300 leading-relaxed">
              Hơn 5 năm đồng hành cùng các lớp 12 và sinh viên trên khắp Hà Nội, chúng tôi tự hào là
              studio được nhiều trường lựa chọn nhờ sự chỉn chu trong từng tiểu tiết.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Ekip 5–8 người, tận tâm trong từng buổi chụp',
                'Concept đa dạng, cập nhật xu hướng mới mỗi mùa',
                'Trả ảnh đúng hẹn, chỉnh sửa theo yêu cầu',
                'Hệ thống quản lý lịch & trang phục online minh bạch',
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-slate-700 dark:text-slate-300"
                >
                  <span className="mt-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300 text-xs font-bold flex-shrink-0">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div
              className="aspect-[4/5] rounded-3xl shadow-xl overflow-hidden flex items-center justify-center relative"
              style={{
                background:
                  'linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(34,211,238,0.18) 100%)',
              }}
            >
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-4 gap-2 p-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-lg"
                    style={{
                      background: `linear-gradient(135deg, hsl(${(i * 30) % 360}, 70%, 70%), hsl(${
                        (i * 30 + 60) % 360
                      }, 70%, 60%))`,
                      opacity: 0.7,
                    }}
                  />
                ))}
              </div>
              <div className="relative z-10">
                <Logo size={120} />
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-5 max-w-[200px] hidden sm:block border border-slate-100 dark:border-white/10">
              <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Khách hàng hài lòng
              </div>
              <div className="mt-1 text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                98%
              </div>
            </div>
            <div className="absolute -top-6 -right-6 bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-5 hidden sm:block border border-slate-100 dark:border-white/10">
              <div className="flex -space-x-2">
                <div className="w-9 h-9 rounded-full bg-amber-200 dark:bg-amber-400/40 border-2 border-white dark:border-slate-900" />
                <div className="w-9 h-9 rounded-full bg-cyan-200 dark:bg-cyan-400/40 border-2 border-white dark:border-slate-900" />
                <div className="w-9 h-9 rounded-full bg-pink-200 dark:bg-pink-400/40 border-2 border-white dark:border-slate-900" />
              </div>
              <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                Hàng trăm lớp đã chọn
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Services ─────────────────────────────── */}
      <section id="services" className="py-20 sm:py-28 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-sm font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Dịch vụ
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold">
              Trọn gói cho ngày kỷ yếu hoàn hảo
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-300">
              Từ ý tưởng, trang phục, makeup cho tới video & album — Yume lo trọn để bạn chỉ việc
              tận hưởng.
            </p>
          </div>
          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s) => (
              <div
                key={s.title}
                className="group rounded-2xl bg-white dark:bg-slate-900 p-7 border border-slate-100 dark:border-white/5 hover:border-amber-200 dark:hover:border-amber-400/40 shadow-sm hover:shadow-lg hover:-translate-y-1 transition"
              >
                <div className="text-4xl">{s.icon}</div>
                <h3 className="mt-4 text-lg font-semibold group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Concepts / Gallery ───────────────────── */}
      <section id="gallery" className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-sm font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Concept nổi bật
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold">
              Đa dạng phong cách – chọn “chất” riêng cho lớp
            </h2>
          </div>
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {concepts.map((c) => (
              <div
                key={c.tag}
                className={`group relative aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-br ${c.tone} shadow-md hover:shadow-2xl hover:-translate-y-1 transition cursor-pointer`}
              >
                <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-80">
                  {c.icon}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="text-white font-bold text-lg drop-shadow">{c.tag}</div>
                  <div className="text-white/80 text-xs mt-0.5">Xem bộ ảnh →</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <a
              href="#contact"
              className="inline-flex items-center text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline"
            >
              Inbox để xem trọn bộ portfolio →
            </a>
          </div>
        </div>
      </section>

      {/* ── Process ──────────────────────────────── */}
      <section id="process" className="py-20 sm:py-28 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-sm font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Quy trình
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold">4 bước – nhẹ nhàng, minh bạch</h2>
          </div>
          <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s) => (
              <div
                key={s.n}
                className="relative rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 hover:shadow-lg transition"
              >
                <div className="text-4xl font-extrabold text-gradient">{s.n}</div>
                <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Packages ─────────────────────────────── */}
      <section id="packages" className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-sm font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Báo giá
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold">Gói dịch vụ phù hợp mọi lớp</h2>
            <p className="mt-4 text-slate-600 dark:text-slate-300">
              Báo giá tham khảo. Yume sẽ tư vấn riêng cho từng lớp dựa trên concept và quy mô.
            </p>
          </div>
          <div className="mt-14 grid md:grid-cols-3 gap-6">
            {displayPackages.map((p) => (
              <div
                key={p.id}
                className={`relative h-full flex flex-col rounded-3xl p-8 border transition ${
                  p.featured
                    ? 'border-transparent text-white shadow-2xl md:scale-[1.03]'
                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5 shadow-sm hover:shadow-lg'
                }`}
                style={
                  p.featured
                    ? { background: 'linear-gradient(135deg, #f59e0b 0%, #22d3ee 100%)' }
                    : undefined
                }
              >
                {p.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white text-amber-700 text-xs font-bold shadow">
                    PHỔ BIẾN
                  </span>
                )}
                <div className="text-sm font-semibold uppercase tracking-wider opacity-80">
                  {p.name}
                </div>
                <div className="mt-3 text-3xl sm:text-4xl font-extrabold">{p.price}</div>
                <div
                  className={`mt-1 text-sm ${
                    p.featured ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {p.note}
                </div>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {p.items.map((it) => (
                    <li key={it} className="flex items-start gap-2">
                      <span className={p.featured ? 'text-white' : 'text-amber-500'}>✓</span>
                      <span
                        className={
                          p.featured ? 'text-white/95' : 'text-slate-700 dark:text-slate-300'
                        }
                      >
                        {it}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-8">
                  <a
                    href="#contact"
                    className={`inline-flex w-full justify-center items-center px-5 py-3 rounded-full text-sm font-semibold transition ${
                      p.featured
                        ? 'bg-white text-amber-700 hover:bg-amber-50'
                        : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90'
                    }`}
                  >
                    Tư vấn ngay
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────── */}
      <section className="py-20 sm:py-28 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-sm font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Cảm nhận khách hàng
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold">Lớp đã chụp cùng Yume nói gì?</h2>
          </div>
          <div className="mt-14 grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <figure
                key={t.name}
                className="rounded-2xl bg-white dark:bg-slate-900 p-7 border border-slate-100 dark:border-white/5 shadow-sm flex flex-col"
              >
                <div className="text-amber-500 text-xl">
                  {'★'.repeat(t.rating)}
                  <span className="text-slate-200 dark:text-white/10">
                    {'★'.repeat(5 - t.rating)}
                  </span>
                </div>
                <blockquote className="mt-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed flex-1">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full"
                    style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #22d3ee 100%)' }}
                  />
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{t.role}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mini feedback form (uses real /public/feedback API) ────── */}
      <section id="feedback" className="py-20 sm:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Chia sẻ cảm nhận
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold">
              Đã chụp cùng Yume? Hãy cho chúng mình biết!
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-300">
              Cảm nhận của bạn là động lực để Yume hoàn thiện mỗi ngày.
            </p>
          </div>

          {submitted ? (
            <div className="mt-10 rounded-3xl p-10 text-center border border-amber-200 dark:border-amber-400/30 bg-amber-50 dark:bg-amber-400/10">
              <div className="text-5xl">🎉</div>
              <h3 className="mt-3 text-xl font-bold">Đã nhận cảm nhận của bạn!</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Cảm ơn bạn rất nhiều. Yume sẽ tiếp tục nỗ lực để mang đến những trải nghiệm tốt hơn.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-6 inline-flex items-center px-5 py-2.5 rounded-full text-sm font-semibold border border-amber-300 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-400/10 transition"
              >
                Gửi cảm nhận khác
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmitFeedback}
              className="mt-10 rounded-3xl p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 shadow-lg space-y-6"
            >
              <div>
                <label className="block text-sm font-semibold mb-2">Số điện thoại (tuỳ chọn)</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="VD: 098 765 4321"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <RatingField
                  label="Đánh giá ekip chụp"
                  value={form.crewRating}
                  onChange={(v) => setForm({ ...form, crewRating: v })}
                />
                <RatingField
                  label="Đánh giá album / video"
                  value={form.albumRating}
                  onChange={(v) => setForm({ ...form, albumRating: v })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Cảm nhận về ekip <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={form.crewDesc}
                  onChange={(e) => setForm({ ...form, crewDesc: e.target.value })}
                  placeholder="Photographer, makeup, stylist… đã hỗ trợ bạn ra sao?"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-400 transition resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Cảm nhận về album / video <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={form.albumDesc}
                  onChange={(e) => setForm({ ...form, albumDesc: e.target.value })}
                  placeholder="Chất lượng ảnh, màu sắc, layout, video…"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-400 transition resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Góp ý thêm cho Yume</label>
                <textarea
                  rows={2}
                  value={form.suggestion}
                  onChange={(e) => setForm({ ...form, suggestion: e.target.value })}
                  placeholder="Yume cần cải thiện điều gì?"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-400 transition resize-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Link
                  to="/feedback"
                  className="text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Mở trang phản hồi đầy đủ →
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center px-7 py-3 rounded-full text-sm font-semibold text-white shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed transition"
                  style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #22d3ee 100%)' }}
                >
                  {submitting ? 'Đang gửi...' : 'Gửi cảm nhận'}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* ── Contact CTA ──────────────────────────── */}
      <section id="contact" className="py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div
            className="relative rounded-3xl p-10 sm:p-14 text-center text-white overflow-hidden shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #22d3ee 100%)' }}
          >
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="absolute top-0 left-1/4 w-64 h-64 rounded-full bg-white blur-3xl" />
              <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full bg-white blur-3xl" />
            </div>
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-extrabold">
                Sẵn sàng có một bộ kỷ yếu để đời?
              </h2>
              <p className="mt-4 text-base sm:text-lg text-white/90 max-w-2xl mx-auto">
                Inbox Yume Studio để được tư vấn miễn phí concept, nhận báo giá chi tiết và giữ lịch
                chụp.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <a
                  href="tel:0987654321"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm sm:text-base font-semibold text-amber-700 bg-white hover:bg-amber-50 shadow-md transition"
                >
                  📞 0987 654 321
                </a>
                <a
                  href="mailto:hello@yumestudio.vn"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm sm:text-base font-semibold text-white bg-white/15 hover:bg-white/25 border border-white/40 backdrop-blur transition"
                >
                  ✉️ hello@yumestudio.vn
                </a>
                <a
                  href="https://www.facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm sm:text-base font-semibold text-white bg-white/15 hover:bg-white/25 border border-white/40 backdrop-blur transition"
                >
                  💬 Facebook / Zalo
                </a>
              </div>
              <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-white/90">
                <span>📍 Hà Nội, Việt Nam</span>
                <span>🕒 T2 – CN: 8:00 – 20:00</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────── */}
      <footer className="border-t border-slate-200 dark:border-white/5 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Logo size={28} />
            <span className="font-semibold text-slate-700 dark:text-slate-200">Yume Studio</span>
          </div>
          <div>© {new Date().getFullYear()} Yume Studio. Mọi quyền được bảo lưu.</div>
          <Link to="/login" className="hover:text-amber-500 transition">
            Đăng nhập quản trị
          </Link>
        </div>
      </footer>
    </div>
  );
};

/* ── Sub-components ──────────────────────────── */

const RatingField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) => (
  <div>
    <label className="block text-sm font-semibold mb-2">{label}</label>
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-3xl transition hover:scale-110 ${
            n <= value ? 'text-amber-500' : 'text-slate-300 dark:text-white/15'
          }`}
          aria-label={`${n} sao`}
        >
          ★
        </button>
      ))}
    </div>
  </div>
);

export default PortfolioPage;
