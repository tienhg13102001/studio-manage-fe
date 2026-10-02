import { getSchoolName, type Customer } from '../types';

export const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

export const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN');
};

export const formatDateTime = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleString('vi-VN');
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
