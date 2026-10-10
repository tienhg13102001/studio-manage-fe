import type { ProfitCostItem, ProfitScenarioInput } from '../types';

export interface ProfitBreakdown {
  revenue: number;
  crew: number;
  video: number;
  print: number;
  costume: number;
  travel: number;
  other: number;
  totalCost: number;
  profit: number;
  /** Lợi nhuận / doanh thu (0–1), `null` khi chưa có doanh thu. */
  margin: number | null;
  /** Lợi nhuận mỗi học sinh, `null` khi sĩ số = 0. */
  profitPerStudent: number | null;
}

type Costs = Omit<ProfitScenarioInput, 'name' | 'package'>;

/** Số lượng tự động: theo sĩ số (`student`) hoặc số người ekip (`crew`). */
export interface CostBasis {
  students: number;
  crew: number;
}

/** SL thực tế: sĩ số / số người ekip, hoặc số nhập tay (`class`). */
export const costItemQuantity = (item: ProfitCostItem, basis: CostBasis) =>
  item.unit === 'student' ? basis.students : item.unit === 'crew' ? basis.crew : item.quantity || 0;

/** Thành tiền một dòng: đơn giá × SL. */
export const costItemAmount = (item: ProfitCostItem, basis: CostBasis) =>
  (item.unitPrice || 0) * costItemQuantity(item, basis);

const sumItems = (items: ProfitCostItem[] = [], basis: CostBasis) =>
  items.reduce((sum, it) => sum + costItemAmount(it, basis), 0);

export const calcProfit = (s: Costs): ProfitBreakdown => {
  const revenue = s.pricePerMember * s.students;
  const crew = s.crewCount * s.crewRate;
  const video = s.videoCrewCount * s.videoCrewRate;
  const basis = { students: s.students, crew: s.crewCount + s.videoCrewCount };
  const print = sumItems(s.printItems, basis);
  const costume = sumItems(s.costumeItems, basis);
  const travel = sumItems(s.travelItems, basis);
  const other = s.otherCosts.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalCost = crew + video + print + costume + travel + other;
  const profit = revenue - totalCost;
  return {
    revenue,
    crew,
    video,
    print,
    costume,
    travel,
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
