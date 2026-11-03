import { getSchoolName, type Customer } from '../types';

export const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

/** "03/11/2026" — luôn 2 chữ số ngày/tháng. */
export const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/** "14:30 · 03/11/2026" — không hiện giây. */
export const formatDateTime = (dateStr: string): string => {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  const time = d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return `${time} · ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
};

/** Số tiền gọn cho KPI: 1,2 tr ₫ / 3,4 tỷ ₫. */
export const formatCompactCurrency = (amount: number): string => {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '−' : '';
  const round1 = (n: number) => Math.round(n * 10) / 10;
  const fmt = (n: number) => n.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  // Chọn đơn vị sau khi làm tròn: 999,95 tr → "1 tỷ", không phải "1.000 tr".
  if (round1(abs / 1e9) >= 1) return `${sign}${fmt(round1(abs / 1e9))} tỷ ₫`;
  if (round1(abs / 1e6) >= 1) return `${sign}${fmt(round1(abs / 1e6))} tr ₫`;
  return `${sign}${formatCurrency(abs)}`;
};

/** "Lớp<sep>Trường" — chỉ thêm dấu phân cách khi lớp có trường. */
export const classLabel = (
  c: (Pick<Customer, 'schoolId'> & { className?: string }) | null | undefined,
  sep = ' – ',
): string => {
  const school = getSchoolName(c);
  const className = c?.className ?? '';
  return school ? `${className}${sep}${school}` : className;
};
