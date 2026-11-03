import { Gem, GraduationCap, Shirt, Sparkles, type LucideIcon } from 'lucide-react';

/** Chuẩn hoá tên loại để so trùng: bỏ khoảng trắng thừa, không phân biệt hoa/thường và dấu (giống backend) */
export const normalizeTypeName = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ');

export const errMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

/** Tile loại trang phục: chỉ khác biểu tượng, nền trung tính (DESIGN.md: không tô màu phân loại). */
const TYPE_TILES: { icon: LucideIcon; classes: string }[] = [
  {
    icon: GraduationCap,
    classes: 'bg-muted text-foreground/70',
  },
  { icon: Shirt, classes: 'bg-muted text-foreground/70' },
  { icon: Gem, classes: 'bg-muted text-foreground/70' },
  {
    icon: Sparkles,
    classes: 'bg-muted text-foreground/70',
  },
];

/** Tile cố định cho một loại (seed = type._id; fallback tên trang phục) — giống nhau ở mọi nơi */
export const getTypeTile = (seed: string): { icon: LucideIcon; classes: string } =>
  TYPE_TILES[[...seed].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % TYPE_TILES.length];
