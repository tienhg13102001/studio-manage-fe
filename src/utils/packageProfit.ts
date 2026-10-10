import type { ProfitScenarioInput } from '../types';

export interface ProfitBreakdown {
  revenue: number;
  crew: number;
  print: number;
  costume: number;
  other: number;
  totalCost: number;
  profit: number;
  /** Lợi nhuận / doanh thu (0–1), `null` khi chưa có doanh thu. */
  margin: number | null;
  /** Lợi nhuận mỗi học sinh, `null` khi sĩ số = 0. */
  profitPerStudent: number | null;
}

type Costs = Omit<ProfitScenarioInput, 'name' | 'package'>;

export const calcProfit = (s: Costs): ProfitBreakdown => {
  const revenue = s.pricePerMember * s.students;
  const crew = s.crewCount * s.crewRate;
  const print = s.printCostPerStudent * s.students;
  const costume = s.costumeCost;
  const other = s.otherCosts.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalCost = crew + print + costume + other;
  const profit = revenue - totalCost;
  return {
    revenue,
    crew,
    print,
    costume,
    other,
    totalCost,
    profit,
    margin: revenue > 0 ? profit / revenue : null,
    profitPerStudent: s.students > 0 ? profit / s.students : null,
  };
};

/** Số thợ gợi ý theo "hs/thợ" của gói (làm tròn lên). */
export const suggestCrewCount = (students: number, studentsPerCrew?: number | null) =>
  studentsPerCrew && studentsPerCrew > 0 && students > 0
    ? Math.ceil(students / studentsPerCrew)
    : null;

export const formatVnd = (n: number) => `${new Intl.NumberFormat('vi-VN').format(Math.round(n))}đ`;

export const formatPercent = (ratio: number) =>
  `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(ratio * 100)}%`;
