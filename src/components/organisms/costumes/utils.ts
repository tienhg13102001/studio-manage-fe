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

/** Bảng màu tile loại trang phục theo design (light: nền -100 / icon -600·700; dark: nền -500/15 / icon -400) */
const TYPE_TILES: { icon: LucideIcon; classes: string }[] = [
  {
    icon: GraduationCap,
    classes: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  },
  { icon: Shirt, classes: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400' },
  { icon: Gem, classes: 'bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-400' },
  {
    icon: Sparkles,
    classes: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400',
  },
];

/** Tile cố định cho một loại (seed = type._id; fallback tên trang phục) — giống nhau ở mọi nơi */
export const getTypeTile = (seed: string): { icon: LucideIcon; classes: string } =>
  TYPE_TILES[[...seed].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % TYPE_TILES.length];
