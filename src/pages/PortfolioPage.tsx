import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
  type Variants,
} from 'framer-motion';
import { toast } from 'react-toastify';
import tnv07899 from '../assets/images/TNV07899.webp';
import tnv00048 from '../assets/images/TNV00048.webp';
import tnv00817 from '../assets/images/TNV00817.webp';
import tnv03816 from '../assets/images/TNV03816.webp';
import tnv05927 from '../assets/images/TNV05927.webp';
import tnv06047 from '../assets/images/TNV06047.webp';
import hdz07441 from '../assets/images/HDZ07441.webp';
import may01381 from '../assets/images/MAY01381.webp';
import pbi00061 from '../assets/images/PBI00061.webp';
import pbi01583 from '../assets/images/PBI01583.webp';
import pbi01850 from '../assets/images/PBI01850.webp';
import tnv00451 from '../assets/images/TNV00451.webp';
import tnv06242 from '../assets/images/TNV06242.webp';
import statementVideo from '../assets/images/video-bg.webm';
import { useTheme } from '../context/ThemeContext';
import { customerService } from '../services/customerService';
import { feedbackService } from '../services/feedbackService';
import { packageService } from '../services/packageService';
import type { Package } from '../types';

/* ── Design tokens ───────────────────────────────
   Playful editorial palette from design/untitled.pen.
   Dark mode piggybacks on the app-wide `.dark` class. */
const T = {
  bg: 'bg-[#FBFAF8] dark:bg-[#100E0C]',
  fg: 'text-[#12100E] dark:text-[#F3EFE9]',
  sec: 'text-[#8A8680] dark:text-[#9A958D]',
  muted: 'text-[#B8B4AD] dark:text-[#6B675F]',
  border: 'border-[#EAE7E1] dark:border-[#2A2723]',
};
const ACCENTS = ['#FF5A3C', '#2E5BFF', '#16C784', '#FFC93C', '#9B5DE5', '#FF6FB5'];

/* ── Static content (from the design file) ───────── */

const NAV_LINKS = [
  { href: '#about', label: 'Thông tin' },
  { href: '#work', label: 'Dịch vụ' },
  { href: '#packages', label: 'Báo giá' },
  { href: '#contact', label: 'Liên hệ' },
];

// Full-screen mobile menu (design frame "Yume — Mobile · Menu").
const MOBILE_MENU_LINKS = [
  { num: '01', label: 'Trang chủ', href: '#top', color: '#FF5A3C' },
  { num: '02', label: 'Về Yume', href: '#about', color: '#2E5BFF' },
  { num: '03', label: 'Dịch vụ', href: '#about', color: '#16C784' },
  { num: '04', label: 'Concept', href: '#work', color: '#FFC93C' },
  { num: '05', label: 'Báo giá', href: '#packages', color: '#9B5DE5' },
  { num: '06', label: 'Cảm nhận', href: '#feedback', color: '#FF6FB5' },
  { num: '07', label: 'Liên hệ', href: '#contact', color: '#FF5A3C' },
];

const SERVICE_TAGS = [
  { label: 'Chụp ảnh kỷ yếu', color: '#FF5A3C' },
  { label: 'Quay phim 4K', color: '#2E5BFF' },
  { label: 'Hậu kỳ & in ấn', color: '#16C784' },
  { label: '200+ trang phục', color: '#9B5DE5' },
  { label: 'Đạo cụ & concept', color: '#FFC93C' },
  { label: 'Tư vấn ý tưởng', color: '#FF6FB5' },
];

// Scattered hero thumbnails — real studio photos. Positions in % of the
// hero box; `push` is the repel direction when hovering the wordmark.
const HERO_THUMBS = [
  { img: tnv03816, left: '10%', top: '15%', rot: -8, w: 168, push: [-1, -1] },
  { img: tnv05927, left: '73%', top: '12%', rot: 7, w: 178, push: [1, -1] },
  { img: tnv00817, left: '14%', top: '60%', rot: 6, w: 188, push: [-1, 1] },
  { img: hdz07441, left: '71%', top: '60%', rot: -9, w: 196, push: [1, 1] },
  { img: tnv06047, left: '5%', top: '38%', rot: 5, w: 150, push: [-1, 0] },
  { img: pbi00061, left: '81%', top: '40%', rot: -6, w: 156, push: [1, 0] },
] as const;

// Mobile hero thumbnails — 4 photos tucked into the corners (design A4TTw).
const MOBILE_HERO_THUMBS = [
  { img: tnv03816, left: '4%', top: '17%', rot: -7 },
  { img: tnv05927, left: '73%', top: '22%', rot: 6 },
  { img: tnv00817, left: '5%', top: '68%', rot: 5 },
  { img: hdz07441, left: '72%', top: '64%', rot: -6 },
] as const;

const WORK = [
  { img: pbi01583, title: 'Lớp 12A1 Kỷ Yếu', h: 300, rot: -2, color: '#FF5A3C' },
  { img: may01381, title: 'Concept Áo Dài', h: 380, rot: 0, color: '#2E5BFF' },
  { img: tnv07899, title: 'Cinematic Outdoor', h: 460, rot: 2, color: '#16C784' },
  { img: tnv00048, title: 'K65 Bách Khoa', h: 340, rot: 0, color: '#FFC93C' },
  { img: pbi01850, title: 'Concept Cử Nhân', h: 420, rot: -3, color: '#9B5DE5' },
  { img: tnv00451, title: 'Học Đường', h: 300, rot: 0, color: '#FF6FB5' },
  { img: tnv06242, title: 'Golden Hour', h: 400, rot: 3, color: '#FF5A3C' },
  { img: tnv03816, title: 'Chu Văn An', h: 360, rot: 0, color: '#2E5BFF' },
  { img: tnv05927, title: 'Ngoại Cảnh', h: 440, rot: -2, color: '#16C784' },
];
// Split into 3 masonry columns (round-robin keeps heights balanced).
const WORK_COLUMNS = [0, 1, 2].map((c) => WORK.filter((_, i) => i % 3 === c));

const FEEDBACK_ROWS = [
  {
    sep: '★',
    dir: 'left' as const,
    items: [
      'Ảnh đẹp xuất sắc, đúng concept',
      'Ekip siêu nhiệt tình',
      'Video xem hoài không chán',
      'Album in cực chất lượng',
      'Cả lớp đều mê tít',
    ],
  },
  {
    sep: '✳',
    dir: 'right' as const,
    items: [
      'Màu phim đẹp mê ly',
      'Đáng đồng tiền bát gạo',
      'Chốt Yume là chuẩn bài',
      'Makeup xinh, pose có tâm',
      'Giao ảnh đúng hẹn',
    ],
  },
  {
    sep: '◆',
    dir: 'left' as const,
    items: [
      'Concept áo dài tuyệt vời',
      '10/10 sẽ giới thiệu bạn bè',
      'Chụp vui như đi hội',
      'Hậu kỳ tỉ mỉ từng tấm',
      'Kỷ niệm để đời',
    ],
  },
];
const SCHOOLS = [
  'Phan Đình Phùng',
  'Bách Khoa',
  'Chu Văn An',
  'Kim Liên',
  'Yên Hòa',
  'Việt Đức',
  'Amsterdam',
  'Kinh tế Quốc dân',
  'Ngoại Thương',
  'Thăng Long',
  'Nguyễn Trãi',
  'Lê Quý Đôn',
];

/* ── Packages ────────────────────────────────────── */

const durationLabel: Record<NonNullable<Package['duration']>, string> = {
  full_day: 'Buổi chụp full day (1 ngày)',
  half_day: 'Buổi chụp 1/2 ngày',
  two_thirds_day: 'Buổi chụp 2/3 ngày',
};
const editingScopeLabel: Record<NonNullable<Package['editingScope']>, string> = {
  full: 'Hậu kỳ blend màu toàn bộ ảnh',
  partial: 'Hậu kỳ blend màu ảnh chọn lọc',
};
const formatVnd = (n: number) => `${n.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ`;

interface PackageDisplay {
  id: string;
  name: string;
  price: string;
  unit?: string;
  items: string[];
  featured: boolean;
}

const toDisplay = (list: Package[]): PackageDisplay[] => {
  if (!list.length) return [];
  const featuredId = list.find((p) => p.isPopular)?._id;
  return list.map((p) => {
    const items: string[] = [];
    if (p.duration) items.push(durationLabel[p.duration]);
    if (p.crewRatio) items.push(`Ekip: ${p.crewRatio}`);
    if (p.studentsPerCrew) items.push(`${p.studentsPerCrew} bạn / ekip`);
    if (p.editingScope) items.push(editingScopeLabel[p.editingScope]);
    if (p.deliveryDays) items.push(`Bàn giao trong ${p.deliveryDays} ngày`);
    if (p.costumes && p.costumes.length) {
      const names = p.costumes.map((c) => c?.name?.trim()).filter((n): n is string => Boolean(n));
      items.push(
        names.length ? `Trang phục: ${names.join(', ')}` : `${p.costumes.length} loại trang phục`,
      );
    }
    if (!items.length) items.push('Liên hệ Yume để biết thêm chi tiết');
    return {
      id: p._id,
      name: p.name,
      price: p.pricePerMember > 0 ? formatVnd(p.pricePerMember) : 'Liên hệ',
      unit: p.pricePerMember > 0 ? '/ bạn' : undefined,
      items,
      featured: p._id === featuredId,
    };
  });
};

// Shown when the public API has no packages yet, so the section never looks empty.
const FALLBACK_PACKAGES: PackageDisplay[] = [
  {
    id: 'basic',
    name: 'CƠ BẢN',
    price: '199K',
    unit: '/ bạn',
    featured: false,
    items: [
      'Buổi chụp 1/2 ngày',
      '1 photographer',
      '35 bạn / ekip',
      'Blend màu ảnh chọn lọc',
      'Giao ảnh trong 14 ngày',
    ],
  },
  {
    id: 'popular',
    name: 'PHỔ BIẾN',
    price: '359K',
    unit: '/ bạn',
    featured: true,
    items: [
      'Buổi chụp 2/3 ngày',
      '2 photographer + 1 quay phim',
      '25 bạn / ekip',
      'Blend màu toàn bộ ảnh',
      'Video recap 4K',
      'Giao ảnh trong 10 ngày',
    ],
  },
  {
    id: 'premium',
    name: 'PREMIUM',
    price: '499K',
    unit: '/ bạn',
    featured: false,
    items: [
      'Buổi chụp full day',
      'Ekip 3–4 người',
      '20 bạn / ekip',
      'Blend màu toàn bộ ảnh',
      'Video kỷ yếu điện ảnh',
      'Album in cao cấp',
    ],
  },
];

/* ── Motion helpers ──────────────────────────────── */

const EASE = [0.22, 1, 0.36, 1] as const;
const revealItem: Variants = {
  hidden: { opacity: 0, y: 34 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};
const staggerParent = (stagger = 0.08, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

const viewportOnce = { once: true, amount: 0.2 } as const;

/** Fades + slides a block up the first time it scrolls into view. */
const Reveal = ({
  children,
  className,
  delay = 0,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section' | 'span';
}) => {
  const MotionTag = motion[as];
  return (
    <MotionTag
      className={className}
      variants={revealItem}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </MotionTag>
  );
};

/* ── Form ────────────────────────────────────────── */

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

/* ── Page ────────────────────────────────────────── */

const PortfolioPage = () => {
  const { isDark, setThemeMode, toggleTheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const [schoolCount, setSchoolCount] = useState<number | null>(null);
  const [classCount, setClassCount] = useState<number | null>(null);
  const [pkgList, setPkgList] = useState<Package[] | null>(null);
  const [form, setForm] = useState<FeedbackForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { scrollYProgress } = useScroll();
  const progressScale = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  useEffect(() => {
    customerService
      .listPublic()
      .then((list) => {
        setClassCount(list.length);
        setSchoolCount(new Set(list.map((c) => (c.school || '').trim()).filter(Boolean)).size);
      })
      .catch(() => {
        setClassCount(0);
        setSchoolCount(0);
      });
  }, []);

  useEffect(() => {
    packageService
      .listPublic()
      .then(setPkgList)
      .catch(() => setPkgList([]));
  }, []);

  const packages = useMemo<PackageDisplay[]>(() => {
    const mapped = pkgList ? toDisplay(pkgList) : [];
    return mapped.length ? mapped : FALLBACK_PACKAGES;
  }, [pkgList]);

  const eyebrowStat = useMemo(() => {
    if (classCount === null) return 'STUDIO CHỤP ẢNH KỶ YẾU · HÀ NỘI · EST. 2019';
    return `${classCount}+ LỚP · ${schoolCount}+ TRƯỜNG · HÀ NỘI · EST. 2019`;
  }, [classCount, schoolCount]);

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
    <div
      className={`yume-v2 min-h-screen overflow-x-hidden font-body ${T.bg} ${T.fg} transition-colors`}
    >
      {/* Scroll progress */}
      <motion.div
        style={{ scaleX: progressScale }}
        className="fixed top-0 inset-x-0 h-[3px] origin-left z-[70] bg-[#12100E] dark:bg-[#F3EFE9]"
      />

      {/* ── Nav ── */}
      <header
        className={`fixed top-0 inset-x-0 z-[60] border-b ${T.border} bg-[#FBFAF8]/85 dark:bg-[#100E0C]/85 backdrop-blur-md`}
      >
        <div className="max-w-[1440px] mx-auto h-16 px-5 sm:px-8 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-1.5" onClick={() => setMenuOpen(false)}>
            <span className="font-display font-bold text-base tracking-[-0.3px]">Yume Studio</span>
            <span className={`text-xs font-medium ${T.sec}`}>®</span>
          </a>
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Theme toggle — segmented pill (desktop) */}
            <div
              className={`hidden sm:flex items-center gap-0.5 rounded-full border ${T.border} p-1`}
            >
              {(['light', 'dark'] as const).map((mode) => {
                const active = mode === 'dark' ? isDark : !isDark;
                return (
                  <button
                    key={mode}
                    type="button"
                    aria-label={mode === 'light' ? 'Giao diện sáng' : 'Giao diện tối'}
                    onClick={() => setThemeMode(mode)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition ${
                      active
                        ? 'bg-[#12100E] text-[#FBFAF8] dark:bg-[#F3EFE9] dark:text-[#100E0C]'
                        : T.sec
                    }`}
                  >
                    {mode === 'light' ? '☀' : '☾'}
                  </button>
                );
              })}
            </div>
            {/* Desktop nav */}
            <nav className={`hidden sm:flex items-center gap-6 text-sm font-medium ${T.sec}`}>
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="hover:text-[#12100E] dark:hover:text-[#F3EFE9] transition"
                >
                  {l.label}
                </a>
              ))}
            </nav>
            {/* Theme toggle — single circular button (mobile) */}
            <button
              type="button"
              aria-label="Đổi giao diện"
              onClick={toggleTheme}
              className={`sm:hidden w-9 h-9 rounded-full border ${T.border} flex items-center justify-center text-sm`}
            >
              {isDark ? '☀' : '☾'}
            </button>
            {/* Mobile hamburger */}
            <button
              type="button"
              aria-label="Menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
              className={`sm:hidden w-9 h-9 rounded-full border ${T.border} flex flex-col items-center justify-center gap-1`}
            >
              <motion.span
                className="block w-[18px] h-[2px] rounded-full bg-[#12100E] dark:bg-[#F3EFE9]"
                animate={menuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.2 }}
              />
              <motion.span
                className="block w-[18px] h-[2px] rounded-full bg-[#12100E] dark:bg-[#F3EFE9]"
                animate={menuOpen ? { opacity: 0 } : { opacity: 1 }}
                transition={{ duration: 0.2 }}
              />
              <motion.span
                className="block w-[18px] h-[2px] rounded-full bg-[#12100E] dark:bg-[#F3EFE9]"
                animate={menuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.2 }}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Full-screen mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <MobileMenu
            isDark={isDark}
            onSetTheme={setThemeMode}
            onClose={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      <main id="top">
        <HeroSection eyebrow={eyebrowStat} reduceMotion={!!reduceMotion} />

        {/* ── Statement (video background, both mobile & desktop) ──
            Mobile: portrait 620px box. Desktop (sm+): locked to 16:9. */}
        <section
          id="about"
          className="relative overflow-hidden border-t border-white/10 px-5 sm:px-8 lg:px-20 min-h-[620px] sm:min-h-0 sm:aspect-[16/9] py-16 sm:py-0 flex items-center"
        >
          {/* Ambient showreel — muted, looping, non-interactive */}
          <div className="yume-video-cover" aria-hidden>
            <video
              src={statementVideo}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              tabIndex={-1}
            />
          </div>
          {/* Scrim (vertical gradient) for legibility */}
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden
            style={{
              background:
                'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.72) 100%)',
            }}
          />

          <motion.div
            className="relative z-10 w-full max-w-[1100px] mx-auto flex flex-col items-center text-center gap-7 sm:gap-10"
            variants={staggerParent(0.12)}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
          >
            <motion.span
              variants={revealItem}
              className="text-[13px] font-medium tracking-[2px] text-white/70"
            >
              VỀ YUME
            </motion.span>
            <motion.h2
              variants={revealItem}
              className="font-display font-medium text-3xl sm:text-4xl lg:text-[46px] leading-[1.3] text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.5)]"
            >
              Chúng tôi biến ngày kỷ yếu thành một thước phim để đời
              <span className="hidden sm:inline">
                {' '}
                — bằng ánh sáng, màu sắc và những khoảnh khắc thật nhất
              </span>
              .
            </motion.h2>
            <motion.div
              variants={staggerParent(0.06)}
              className="flex flex-wrap justify-center gap-2.5 sm:gap-3"
            >
              {SERVICE_TAGS.map((tag) => (
                <motion.div
                  key={tag.label}
                  variants={revealItem}
                  whileHover={{ y: -4, scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  className="flex items-center gap-2 rounded-full border border-white/25 bg-white/5 backdrop-blur-sm pl-4 pr-5 py-2.5 cursor-default"
                >
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: tag.color }} />
                  <span className="text-[15px] font-medium text-white">{tag.label}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* ── Selected Work ── */}
        <section id="work" className={`border-t ${T.border} px-5 sm:px-8 lg:px-20 py-16 sm:py-20`}>
          <div className="max-w-[1440px] mx-auto">
            <Reveal
              className={`flex items-end justify-between text-xs tracking-[2px] ${T.sec} mb-10`}
            >
              <span>TUYỂN TẬP · 2024–2026</span>
              <span className="hidden sm:block">CUỘN ĐỂ XEM THÊM ↓</span>
            </Reveal>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
              {WORK_COLUMNS.map((col, ci) => (
                <div
                  key={ci}
                  className={`flex flex-col gap-4 sm:gap-6 ${ci === 2 ? 'hidden lg:flex' : ''}`}
                >
                  {col.map((card) => (
                    <WorkCard key={card.title} card={card} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Feedback marquee strip ── */}
        <section className="bg-[#12100E] dark:bg-[#0A0806] overflow-hidden py-14 sm:py-16">
          <div className="px-5 sm:px-20 mb-8">
            <span className="text-[11px] sm:text-xs tracking-[2px] text-[#FBFAF8]/60">
              CẢM NHẬN TỪ CÁC LỚP · ĐƯỢC TIN CHỌN BỞI HÀNG TRĂM TẬP THỂ
            </span>
          </div>
          <div className="flex flex-col gap-4 sm:gap-5">
            {FEEDBACK_ROWS.map((row, i) => (
              <MarqueeRow
                key={i}
                items={row.items}
                sep={row.sep}
                dir={row.dir}
                duration={`${46 + i * 6}s`}
                className="text-2xl sm:text-3xl font-medium text-[#FBFAF8]"
              />
            ))}
            <MarqueeRow
              items={SCHOOLS}
              sep="·"
              dir="right"
              duration="60s"
              className="text-lg sm:text-[22px] font-medium text-[#FBFAF8]/70 pt-1"
            />
          </div>
        </section>

        {/* ── Packages ── */}
        <section
          id="packages"
          className={`border-t ${T.border} px-5 sm:px-8 lg:px-20 py-20 sm:py-28`}
        >
          <div className="max-w-[1440px] mx-auto">
            <motion.div
              className="max-w-[760px] mx-auto flex flex-col items-center text-center gap-4 mb-14"
              variants={staggerParent(0.1)}
              initial="hidden"
              whileInView="show"
              viewport={viewportOnce}
            >
              <motion.span
                variants={revealItem}
                className={`text-[13px] font-medium tracking-[2px] ${T.sec}`}
              >
                BẢNG GIÁ · GÓI CHỤP
              </motion.span>
              <motion.h2
                variants={revealItem}
                className="font-display font-bold text-4xl sm:text-5xl lg:text-[56px] tracking-[-1.5px]"
              >
                Chọn gói cho lớp mình
              </motion.h2>
              <motion.p
                variants={revealItem}
                className={`text-base leading-relaxed ${T.sec} max-w-[480px]`}
              >
                Báo giá tham khảo. Yume tư vấn riêng theo concept và quy mô từng lớp.
              </motion.p>
            </motion.div>
            {/* Desktop: 3-column grid */}
            <motion.div
              className="hidden md:grid md:grid-cols-3 gap-6 items-stretch"
              variants={staggerParent(0.12)}
              initial="hidden"
              whileInView="show"
              viewport={viewportOnce}
            >
              {packages.map((pkg, i) => (
                <PackageCard key={pkg.id} pkg={pkg} accent={ACCENTS[i % ACCENTS.length]} />
              ))}
            </motion.div>
            {/* Mobile: swipeable card deck */}
            <PackagesDeck packages={packages} />
          </div>
        </section>

        {/* ── Feedback form (keeps the real /public/feedback API) ── */}
        <section
          id="feedback"
          className={`border-t ${T.border} px-5 sm:px-8 lg:px-20 py-20 sm:py-24`}
        >
          <div className="max-w-[720px] mx-auto">
            <Reveal className="text-center flex flex-col items-center gap-3 mb-10">
              <span className={`text-[13px] font-medium tracking-[2px] ${T.sec}`}>
                CHIA SẺ CẢM NHẬN
              </span>
              <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-[-1px]">
                Đã chụp cùng Yume? Kể tụi mình nghe nhé
              </h2>
            </Reveal>

            {submitted ? (
              <Reveal
                className={`rounded-3xl border ${T.border} p-10 text-center flex flex-col items-center gap-3`}
              >
                <div className="text-5xl">🎉</div>
                <h3 className="font-display text-xl font-bold">Đã nhận cảm nhận của bạn!</h3>
                <p className={`text-sm ${T.sec} max-w-sm`}>
                  Cảm ơn bạn rất nhiều. Yume sẽ tiếp tục nỗ lực để mang đến trải nghiệm tốt hơn.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className={`mt-3 rounded-full border ${T.border} px-5 py-2.5 text-sm font-semibold hover:opacity-70 transition`}
                >
                  Gửi cảm nhận khác
                </button>
              </Reveal>
            ) : (
              <Reveal as="div" className={`rounded-3xl border ${T.border} p-6 sm:p-8`}>
                <form onSubmit={handleSubmitFeedback} className="flex flex-col gap-6">
                  <FieldWrap label="Số điện thoại (tuỳ chọn)">
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="VD: 098 765 4321"
                      className={inputClass}
                    />
                  </FieldWrap>
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
                  <FieldWrap label="Cảm nhận về ekip *">
                    <textarea
                      rows={3}
                      value={form.crewDesc}
                      onChange={(e) => setForm({ ...form, crewDesc: e.target.value })}
                      placeholder="Photographer, makeup, stylist… đã hỗ trợ bạn ra sao?"
                      className={`${inputClass} resize-none`}
                      required
                    />
                  </FieldWrap>
                  <FieldWrap label="Cảm nhận về album / video *">
                    <textarea
                      rows={3}
                      value={form.albumDesc}
                      onChange={(e) => setForm({ ...form, albumDesc: e.target.value })}
                      placeholder="Chất lượng ảnh, màu sắc, layout, video…"
                      className={`${inputClass} resize-none`}
                      required
                    />
                  </FieldWrap>
                  <FieldWrap label="Góp ý thêm cho Yume">
                    <textarea
                      rows={2}
                      value={form.suggestion}
                      onChange={(e) => setForm({ ...form, suggestion: e.target.value })}
                      placeholder="Yume cần cải thiện điều gì?"
                      className={`${inputClass} resize-none`}
                    />
                  </FieldWrap>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                      to="/feedback"
                      className="text-sm font-semibold underline underline-offset-4 hover:opacity-70 transition"
                    >
                      Mở trang phản hồi đầy đủ →
                    </Link>
                    <motion.button
                      type="submit"
                      disabled={submitting}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      className="rounded-full bg-[#12100E] text-[#FBFAF8] dark:bg-[#F3EFE9] dark:text-[#100E0C] px-7 py-3 text-sm font-semibold disabled:opacity-60"
                    >
                      {submitting ? 'Đang gửi...' : 'Gửi cảm nhận'}
                    </motion.button>
                  </div>
                </form>
              </Reveal>
            )}
          </div>
        </section>

        {/* ── Contact ── */}
        <section
          id="contact"
          className={`border-t ${T.border} px-5 sm:px-8 lg:px-20 py-24 sm:py-32`}
        >
          <motion.div
            className="max-w-[1100px] mx-auto flex flex-col items-center text-center gap-8"
            variants={staggerParent(0.1)}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
          >
            <motion.span
              variants={revealItem}
              className={`text-[13px] font-medium tracking-[2px] ${T.sec}`}
            >
              SẴN SÀNG CHỤP CÙNG NHAU?
            </motion.span>
            <motion.h2
              variants={revealItem}
              className="font-display font-bold text-5xl sm:text-7xl lg:text-[108px] leading-none tracking-[-3px] flex items-baseline justify-center flex-wrap gap-x-2"
            >
              Nói chuyện nhé
              <WaveHand reduceMotion={!!reduceMotion} />
            </motion.h2>
            <motion.a
              href="mailto:yumest23@gmail.com"
              variants={revealItem}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 14 }}
              className="inline-flex items-center gap-2.5 rounded-full bg-[#12100E] text-[#FBFAF8] dark:bg-[#F3EFE9] dark:text-[#100E0C] px-7 py-4 text-[17px] font-medium"
            >
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#FFC93C' }} />
              yumest23@gmail.com
            </motion.a>
            <motion.div
              variants={staggerParent(0.08)}
              className="flex flex-wrap justify-center gap-x-12 gap-y-6 pt-4"
            >
              {[
                { k: 'ĐIỆN THOẠI / ZALO', v: '0818 321 871', href: 'tel:0818321871' },
                {
                  k: 'FACEBOOK',
                  v: 'fb.com/yumestudioyearbook',
                  href: 'https://www.facebook.com/yumestudioyearbook/',
                },
                { k: 'ĐỊA CHỈ', v: '168 Vũ Trọng Phụng, Hà Nội' },
              ].map((ch) => (
                <motion.div
                  key={ch.k}
                  variants={revealItem}
                  className="flex flex-col items-center gap-1"
                >
                  <span className={`text-xs font-medium tracking-[1px] ${T.muted}`}>{ch.k}</span>
                  {ch.href ? (
                    <a
                      href={ch.href}
                      target={ch.href.startsWith('http') ? '_blank' : undefined}
                      rel="noreferrer"
                      className="text-[15px] font-medium hover:opacity-70 transition"
                    >
                      {ch.v}
                    </a>
                  ) : (
                    <span className="text-[15px] font-medium">{ch.v}</span>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* ── Footer ── */}
        <footer
          className={`border-t ${T.border} px-5 sm:px-8 py-7 flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px] ${T.sec}`}
        >
          <span className="font-display font-bold tracking-[-0.2px] text-[#12100E] dark:text-[#F3EFE9]">
            Yume Studio®
          </span>
          <span>© {new Date().getFullYear()} — Lưu giữ thanh xuân qua từng khung hình</span>
          <Link to="/login" className="font-medium hover:opacity-70 transition">
            Đăng nhập quản trị ↗
          </Link>
        </footer>
      </main>
    </div>
  );
};

/* ── Sub-components ──────────────────────────────── */

// Full-screen mobile menu overlay (design: "Yume — Mobile · Menu").
const MobileMenu = ({
  isDark,
  onSetTheme,
  onClose,
}: {
  isDark: boolean;
  onSetTheme: (mode: 'light' | 'dark') => void;
  onClose: () => void;
}) => {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const segments = [
    { mode: 'light' as const, icon: '☀', label: 'Sáng', active: !isDark },
    { mode: 'dark' as const, icon: '☾', label: 'Tối', active: isDark },
  ];

  return (
    <motion.div
      className={`sm:hidden fixed inset-0 z-[80] flex flex-col ${T.bg} ${T.fg}`}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.28, ease: EASE }}
    >
      {/* Top bar */}
      <div className={`h-14 shrink-0 px-5 flex items-center justify-between border-b ${T.border}`}>
        <a href="#top" onClick={onClose} className="flex items-center gap-1.5">
          <span className="font-display font-bold text-base tracking-[-0.3px]">Yume Studio</span>
          <span className={`text-xs font-medium ${T.sec}`}>®</span>
        </a>
        <button
          type="button"
          aria-label="Đóng menu"
          onClick={onClose}
          className={`w-9 h-9 rounded-full border ${T.border} flex items-center justify-center text-lg`}
        >
          ✕
        </button>
      </div>

      {/* Links */}
      <motion.nav
        className="flex-1 overflow-y-auto px-5 pt-6 pb-2"
        variants={staggerParent(0.05, 0.06)}
        initial="hidden"
        animate="show"
      >
        {MOBILE_MENU_LINKS.map((l, i) => (
          <motion.a
            key={l.num}
            href={l.href}
            onClick={onClose}
            variants={revealItem}
            className={`flex items-center justify-between py-4 ${
              i < MOBILE_MENU_LINKS.length - 1 ? `border-b ${T.border}` : ''
            }`}
          >
            <span className="flex items-center gap-3.5">
              <span className={`text-xs font-medium tracking-[1px] ${T.muted}`}>{l.num}</span>
              <span className="font-display text-3xl font-medium tracking-[-0.5px]">{l.label}</span>
            </span>
            <span className="w-[9px] h-[9px] rounded-[5px]" style={{ backgroundColor: l.color }} />
          </motion.a>
        ))}
      </motion.nav>

      {/* Theme row */}
      <div className={`shrink-0 px-5 py-5 flex items-center justify-between border-t ${T.border}`}>
        <span className={`text-[13px] font-medium tracking-[2px] ${T.sec}`}>GIAO DIỆN</span>
        <div className={`flex items-center gap-0.5 rounded-full border ${T.border} p-1`}>
          {segments.map((seg) => (
            <button
              key={seg.mode}
              type="button"
              onClick={() => onSetTheme(seg.mode)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${
                seg.active
                  ? 'bg-[#12100E] text-[#FBFAF8] dark:bg-[#F3EFE9] dark:text-[#100E0C]'
                  : T.sec
              }`}
            >
              <span>{seg.icon}</span>
              {seg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className={`shrink-0 px-5 pt-5 pb-7 border-t ${T.border} flex flex-col gap-1.5`}>
        <span className={`text-[11px] font-medium tracking-[2px] ${T.muted}`}>LIÊN HỆ</span>
        <a href="mailto:yumest23@gmail.com" className="font-display text-xl font-medium">
          yumest23@gmail.com
        </a>
        <span className={`text-sm ${T.sec}`}>0818 321 871 · fb.com/yumestudioyearbook</span>
      </div>
    </motion.div>
  );
};

// One scattered hero thumbnail: parallax-translates and tilts toward the
// cursor (driven by the shared spring motion values), while an inner layer
// keeps a perpetual idle float independent of the cursor.
const HeroThumb = ({
  thumb,
  i,
  sx,
  sy,
  reduceMotion,
}: {
  thumb: (typeof HERO_THUMBS)[number];
  i: number;
  sx: MotionValue<number>;
  sy: MotionValue<number>;
  reduceMotion: boolean;
}) => {
  const depth = 16 + (i % 3) * 10;
  const x = useTransform(sx, (v) => v * depth);
  const y = useTransform(sy, (v) => v * depth);
  const rotateY = useTransform(sx, (v) => v * 14);
  const rotateX = useTransform(sy, (v) => -v * 14);

  return (
    <motion.div
      className="hidden lg:block absolute rounded-xl overflow-hidden shadow-lg pointer-events-none"
      style={
        reduceMotion
          ? { left: thumb.left, top: thumb.top, width: thumb.w, aspectRatio: '4 / 5' }
          : {
              left: thumb.left,
              top: thumb.top,
              width: thumb.w,
              aspectRatio: '4 / 5',
              x,
              y,
              rotate: thumb.rot,
              rotateX,
              rotateY,
              transformPerspective: 800,
            }
      }
      initial={reduceMotion ? false : { opacity: 0, scale: 0.5 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
      transition={{
        opacity: { duration: 0.5, delay: 0.15 + i * 0.09 },
        scale: { type: 'spring', stiffness: 260, damping: 14, delay: 0.15 + i * 0.09 },
      }}
    >
      <motion.div
        className="w-full h-full"
        // Oversized slightly so the idle float never exposes the card edge.
        style={{ scale: 1.1 }}
        animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
        transition={{ duration: 5 + i, repeat: Infinity, ease: 'easeInOut' }}
      >
        <img src={thumb.img} alt="" decoding="async" className="w-full h-full object-cover" />
      </motion.div>
    </motion.div>
  );
};

const HeroSection = ({ eyebrow, reduceMotion }: { eyebrow: string; reduceMotion: boolean }) => {
  // Normalized cursor position (-1..1 from hero centre), spring-smoothed.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 120, damping: 20, mass: 0.4 });
  const sy = useSpring(my, { stiffness: 120, damping: 20, mass: 0.4 });

  const handleMove = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 2);
    my.set(((e.clientY - r.top) / r.height - 0.5) * 2);
  };
  const handleLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <section
      onMouseMove={reduceMotion ? undefined : handleMove}
      onMouseLeave={reduceMotion ? undefined : handleLeave}
      className="relative overflow-hidden min-h-[86vh] lg:min-h-[840px] flex flex-col items-center justify-center px-5 sm:px-8 lg:px-20 pt-16 pb-10"
    >
      {/* Scattered thumbnails — tilt/parallax toward the cursor (desktop). */}
      {HERO_THUMBS.map((thumb, i) => (
        <HeroThumb key={i} thumb={thumb} i={i} sx={sx} sy={sy} reduceMotion={reduceMotion} />
      ))}

      {/* Mobile/tablet scattered thumbnails (4 corners) */}
      {MOBILE_HERO_THUMBS.map((thumb, i) => (
        <motion.div
          key={`m-${i}`}
          className="lg:hidden absolute w-[96px] sm:w-32 rounded-xl overflow-hidden shadow-lg pointer-events-none"
          style={{ left: thumb.left, top: thumb.top, aspectRatio: '4 / 5' }}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.5, rotate: thumb.rot }}
          animate={
            reduceMotion
              ? { opacity: 1 }
              : { opacity: 1, scale: 1, rotate: thumb.rot, y: [0, -10, 0] }
          }
          transition={{
            opacity: { duration: 0.5, delay: 0.15 + i * 0.1 },
            scale: { type: 'spring', stiffness: 260, damping: 14, delay: 0.15 + i * 0.1 },
            y: { duration: 5 + i, repeat: Infinity, ease: 'easeInOut' },
          }}
        >
          <img src={thumb.img} alt="" decoding="async" className="w-full h-full object-cover" />
        </motion.div>
      ))}

      <motion.div
        className="relative z-10 flex flex-col items-center text-center gap-6"
        variants={staggerParent(0.14, 0.1)}
        initial="hidden"
        animate="show"
      >
        <motion.span
          variants={revealItem}
          className={`text-[13px] font-medium tracking-[2px] ${T.sec}`}
        >
          {eyebrow}
        </motion.span>
        <motion.h1
          variants={revealItem}
          className="font-display font-bold leading-[0.95] tracking-[-2px] sm:tracking-[-4px] text-6xl sm:text-8xl lg:text-[150px] cursor-default select-none"
        >
          Yume Studio
        </motion.h1>
        <motion.p variants={revealItem} className={`text-lg sm:text-xl ${T.sec}`}>
          The art of dream - Nghệ thuật của giấc mơ.
        </motion.p>
        <motion.div
          variants={revealItem}
          className={`flex items-center gap-2 rounded-full border ${T.border} pl-4 pr-5 py-2.5`}
        >
          <motion.span
            className="w-2 h-2 rounded-sm bg-[#16C784]"
            animate={reduceMotion ? undefined : { opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="text-sm font-medium">Đang nhận lịch</span>
        </motion.div>
      </motion.div>
    </section>
  );
};

const WorkCard = ({ card }: { card: (typeof WORK)[number] }) => (
  <motion.div variants={revealItem} className="flex flex-col gap-3">
    <motion.div
      className="rounded-2xl overflow-hidden"
      style={{ height: card.h }}
      initial={{ rotate: card.rot }}
      whileHover={{ scale: 1.04, rotate: card.rot + (card.rot >= 0 ? 1.5 : -1.5) }}
      transition={{ type: 'spring', stiffness: 300, damping: 16 }}
    >
      <img
        src={card.img}
        alt={card.title}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover"
      />
    </motion.div>
    <div className="flex items-center justify-between">
      <span className="font-display text-[15px] sm:text-[17px]">{card.title}</span>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: card.color }} />
    </div>
  </motion.div>
);

const MarqueeRow = ({
  items,
  sep,
  dir,
  duration,
  className,
}: {
  items: string[];
  sep: string;
  dir: 'left' | 'right';
  duration: string;
  className?: string;
}) => {
  const group = (
    <div className="flex items-center shrink-0 font-display">
      {items.map((item, i) => (
        <span key={i} className="flex items-center whitespace-nowrap">
          <span className={`px-4 ${className ?? ''}`}>{item}</span>
          <span className="font-bold px-1" style={{ color: ACCENTS[i % ACCENTS.length] }}>
            {sep}
          </span>
        </span>
      ))}
    </div>
  );
  return (
    <div className="yume-marquee-track overflow-hidden">
      <div
        className="yume-marquee"
        data-dir={dir}
        style={{ '--marquee-duration': duration } as CSSProperties}
      >
        {group}
        <div aria-hidden className="flex">
          {group}
        </div>
      </div>
    </div>
  );
};

// Visual card (no motion) so it can be reused in the desktop grid and the
// mobile swipe deck.
const PackageCardBody = ({ pkg, accent }: { pkg: PackageDisplay; accent: string }) => {
  const featured = pkg.featured;
  return (
    <div
      className={`h-full flex flex-col rounded-[20px] p-8 sm:p-9 border ${
        featured ? 'bg-[#12100E] dark:bg-[#F3EFE9] border-transparent' : `${T.bg} ${T.border}`
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: accent }} />
          <span
            className={`text-[13px] font-semibold tracking-[2px] ${
              featured ? 'text-[#FBFAF8] dark:text-[#100E0C]' : ''
            }`}
          >
            {pkg.name}
          </span>
        </div>
        {featured && (
          <span
            className="rounded-[14px] px-3 py-1 text-[11px] font-bold tracking-[1px] text-[#12100E]"
            style={{ backgroundColor: '#FFC93C' }}
          >
            ĐƯỢC CHỌN NHIỀU
          </span>
        )}
      </div>

      <div className="flex items-end gap-1.5 pt-6">
        <span
          className={`font-display font-bold text-5xl sm:text-6xl tracking-[-2px] ${
            featured ? 'text-[#FBFAF8] dark:text-[#100E0C]' : ''
          }`}
        >
          {pkg.price}
        </span>
        {pkg.unit && (
          <span
            className={`text-[15px] pb-1.5 ${featured ? 'text-[#FBFAF8]/70 dark:text-[#100E0C]/70' : T.sec}`}
          >
            {pkg.unit}
          </span>
        )}
      </div>

      <div className="flex flex-col mt-7">
        {pkg.items.map((item, i) => (
          <div
            key={item}
            className={`flex items-center gap-3 py-3.5 ${
              i > 0
                ? `border-t ${featured ? 'border-white/10 dark:border-black/10' : T.border}`
                : ''
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-sm shrink-0" style={{ backgroundColor: accent }} />
            <span className={`text-sm ${featured ? 'text-[#FBFAF8] dark:text-[#100E0C]' : ''}`}>
              {item}
            </span>
          </div>
        ))}
      </div>

      <a href="#contact" className="mt-auto pt-8">
        <span
          className={`flex items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-semibold transition-transform active:scale-[0.97] hover:scale-[1.02] ${
            featured
              ? 'bg-[#FBFAF8] text-[#12100E] dark:bg-[#100E0C] dark:text-[#F3EFE9]'
              : 'bg-[#12100E] text-[#FBFAF8] dark:bg-[#F3EFE9] dark:text-[#100E0C]'
          }`}
        >
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: accent }} />
          Tư vấn ngay
        </span>
      </a>
    </div>
  );
};

// Desktop grid card: reveal + hover-lift wrapper around the visual body.
const PackageCard = ({ pkg, accent }: { pkg: PackageDisplay; accent: string }) => (
  <motion.div
    variants={revealItem}
    whileHover={{ y: -8 }}
    transition={{ type: 'spring', stiffness: 300, damping: 18 }}
    className="h-full"
  >
    <PackageCardBody pkg={pkg} accent={accent} />
  </motion.div>
);

// Mobile: stacked deck of package cards, swipe left/right to browse.
const PackagesDeck = ({ packages }: { packages: PackageDisplay[] }) => {
  const n = packages.length;
  const featuredIndex = Math.max(
    0,
    packages.findIndex((p) => p.featured),
  );
  const [index, setIndex] = useState(featuredIndex);
  const advance = (dir: number) => setIndex((i) => (((i + dir) % n) + n) % n);

  return (
    <div className="md:hidden">
      <div className="relative grid">
        {packages.map((pkg, i) => {
          const pos = (((i - index) % n) + n) % n; // 0 = front, 1, 2 behind
          const isFront = pos === 0;
          return (
            <motion.div
              key={pkg.id}
              className="col-start-1 row-start-1"
              style={{ zIndex: n - pos, pointerEvents: isFront ? 'auto' : 'none' }}
              animate={{
                scale: 1 - Math.min(pos, 2) * 0.05,
                y: Math.min(pos, 2) * 18,
                rotate: isFront ? 0 : pos % 2 === 1 ? 3 : -3,
                opacity: pos > 2 ? 0 : 1,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              drag={isFront ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              onDragEnd={(_, info) => {
                if (info.offset.x < -90 || info.velocity.x < -450) advance(1);
                else if (info.offset.x > 90 || info.velocity.x > 450) advance(-1);
              }}
              whileTap={{ cursor: 'grabbing' }}
            >
              <PackageCardBody pkg={pkg} accent={ACCENTS[i % ACCENTS.length]} />
            </motion.div>
          );
        })}
      </div>
      {/* Pagination dots */}
      <div className="flex justify-center items-center gap-2 mt-8">
        {packages.map((pkg, i) => (
          <button
            key={pkg.id}
            type="button"
            aria-label={`Xem gói ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-2 rounded-full transition-all ${
              i === index
                ? 'w-5 bg-[#12100E] dark:bg-[#F3EFE9]'
                : 'w-2 bg-[#D8D4CC] dark:bg-[#3A362F]'
            }`}
          />
        ))}
      </div>
      <p className={`text-center text-xs ${T.sec} mt-3`}>← Vuốt để xem các gói →</p>
    </div>
  );
};

const WaveHand = ({ reduceMotion }: { reduceMotion: boolean }) => (
  <motion.span
    className="inline-block origin-[70%_80%]"
    animate={reduceMotion ? undefined : { rotate: [0, 16, -8, 16, -4, 12, 0] }}
    transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1, ease: 'easeInOut' }}
  >
    👋
  </motion.span>
);

const inputClass =
  'w-full rounded-xl border border-[#EAE7E1] dark:border-[#2A2723] bg-transparent px-4 py-2.5 text-[15px] outline-none focus:border-[#12100E] dark:focus:border-[#F3EFE9] transition placeholder:text-[#B8B4AD] dark:placeholder:text-[#6B675F]';

const FieldWrap = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col gap-2">
    <label className="text-sm font-semibold">{label}</label>
    {children}
  </div>
);

const RatingField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) => (
  <div className="flex flex-col gap-2">
    <label className="text-sm font-semibold">{label}</label>
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <motion.button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          className={`text-3xl ${n <= value ? 'text-[#FFC93C]' : T.muted}`}
          aria-label={`${n} sao`}
        >
          ★
        </motion.button>
      ))}
    </div>
  </div>
);

export default PortfolioPage;
