import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { mountScrollWorld } from '../lib/scrubEngine';
import './worldTheme.css';

// Scene stills — real studio photos, used as scene posters / lazy fallbacks.
import tnv03816 from '../assets/images/TNV03816.webp';
import may01381 from '../assets/images/MAY01381.webp';
import tnv07899 from '../assets/images/TNV07899.webp';
import pbi01850 from '../assets/images/PBI01850.webp';
import tnv06242 from '../assets/images/TNV06242.webp';
import pbi01583 from '../assets/images/PBI01583.webp';
// Placeholder scrub clip — the studio showreel. Every section that wants a
// scroll-scrubbed "fly-in" reuses it for now. When the Higgsfield account is
// active, swap each section's `clip` for its own generated dive .mp4 and fill
// `connectors` (see the scroll-world skill, Steps 4–5). Nothing else changes.
import showreel from '../assets/images/video-bg.webm';
import logo from '../assets/images/logo.webp';

// Yume brand kit (mirrors design/untitled.pen + PortfolioPage tokens).
const BRAND_BG = '#FBFAF8';
const BRAND_INK = '#12100E';
const BRAND_INK_SOFT = '#8A8680';

/**
 * The journey the camera flies through — the arc of a Yume yearbook shoot,
 * from first idea to the finished film. Copy is Vietnamese to match the site.
 * `clip` present ⇒ that scene scroll-scrubs the showreel; `clip` absent ⇒ the
 * still gets a gentle scroll-driven Ken Burns zoom (both handled by the engine).
 */
const SECTIONS = [
  {
    id: 'intro',
    label: 'Mở đầu',
    still: tnv03816,
    accent: '#FF5A3C',
    scroll: 1.4,
    linger: 0.45,
    eyebrow: 'Yume Studio · Hà Nội',
    title: 'Bước vào thế giới của Yume',
    body: 'Cuộn xuống để bay qua hành trình một buổi kỷ yếu — từ ý tưởng đầu tiên đến thước phim để đời.',
    tags: ['Kỷ yếu', 'Cinematic', 'Est. 2019'],
  },
  {
    id: 'concept',
    label: 'Ý tưởng',
    still: may01381,
    accent: '#2E5BFF',
    scroll: 1.3,
    linger: 0.4,
    eyebrow: 'Chương 01',
    title: 'Mọi thứ bắt đầu từ một concept',
    body: 'Áo dài, học đường hay điện ảnh — Yume ngồi lại cùng lớp để phác nên câu chuyện của riêng các bạn.',
    tags: ['Tư vấn concept', '200+ trang phục', 'Đạo cụ'],
  },
  {
    id: 'shoot',
    label: 'Ngày chụp',
    still: tnv07899,
    clip: showreel,
    accent: '#16C784',
    scroll: 1.7,
    linger: 0.5,
    eyebrow: 'Chương 02',
    title: 'Ngày chụp — vui như đi hội',
    body: 'Ekip nhiệt tình, ánh sáng vàng và những khoảnh khắc thật nhất được giữ lại từng khung hình.',
    tags: ['Ảnh 4K', 'Quay phim', 'Golden hour'],
  },
  {
    id: 'moments',
    label: 'Khoảnh khắc',
    still: tnv06242,
    clip: showreel,
    accent: '#9B5DE5',
    scroll: 1.6,
    linger: 0.5,
    eyebrow: 'Chương 03',
    title: 'Những khoảnh khắc để đời',
    body: 'Tiếng cười, cái ôm, ánh mắt — chất liệu làm nên một cuốn kỷ yếu mà cả lớp mê tít.',
    tags: ['Tự nhiên', 'Cảm xúc thật'],
  },
  {
    id: 'post',
    label: 'Hậu kỳ',
    still: pbi01850,
    accent: '#FFC93C',
    scroll: 1.4,
    linger: 0.45,
    eyebrow: 'Chương 04',
    title: 'Blend màu & dựng phim',
    body: 'Hậu kỳ tỉ mỉ từng tấm, màu phim đẹp mê ly, video xem hoài không chán — giao đúng hẹn.',
    tags: ['Blend toàn bộ', 'Album in', 'Video recap'],
  },
  {
    id: 'contact',
    label: 'Liên hệ',
    still: pbi01583,
    // The pair sits in the lower half of this square photo; bias the crop down
    // so their faces land mid-frame instead of at the bottom edge.
    focus: 'center 72%',
    accent: '#FF6FB5',
    scroll: 1.5,
    linger: 0.35,
    eyebrow: 'Sẵn sàng chụp cùng nhau?',
    title: 'Đặt lịch cho lớp mình',
    body: 'Yume đang nhận lịch. Nhắn tụi mình để cùng lên concept cho tập thể của bạn nhé!',
    cta: {
      primary: { label: 'Nhắn Yume', href: 'https://www.facebook.com/yumestudioyearbook' },
      secondary: { label: 'Xem portfolio', href: '/portfolio' },
    },
  },
];

const WorldPage = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // Land at the top so the intro copy greets on arrival.
    window.scrollTo(0, 0);
    const instance = mountScrollWorld(node, {
      brand: { name: 'Yume Studio', href: '/portfolio', logo },
      hint: 'cuộn để bay vào',
      diveScroll: 1.4,
      connScroll: 0.9,
      sections: SECTIONS,
      // No connectors in the placeholder build — sections crossfade directly.
      // The real build fills these with generated fly-over clips (skill Step 5).
      connectors: [],
    });
    return () => instance.destroy();
  }, []);

  // Yume brand tokens override the engine's @layer sw defaults (inline styles
  // are unlayered, so they win cleanly).
  const themeVars = {
    '--sw-bg': BRAND_BG,
    '--sw-ink': BRAND_INK,
    '--sw-ink-soft': BRAND_INK_SOFT,
    '--sw-accent': '#FF5A3C',
    '--sw-font-display': "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
    '--sw-font-body': "'Inter', ui-sans-serif, system-ui, sans-serif",
  } as CSSProperties;

  return <div ref={ref} style={themeVars} />;
};

export default WorldPage;
