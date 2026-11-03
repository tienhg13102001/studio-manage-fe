import type { ProfitCostItem, ProfitScenario, ProfitScenarioInput } from '../types';

export interface ProfitBreakdown {
  revenue: number;
  crew: number;
  video: number;
  print: number;
  costume: number;
  postProduction: number;
  accessory: number;
  travel: number;
  other: number;
  totalCost: number;
  profit: number;
  /** Lợi nhuận / doanh thu (0–1), `null` khi chưa có doanh thu. */
  margin: number | null;
  /** Lợi nhuận mỗi học sinh, `null` khi sĩ số = 0. */
  profitPerStudent: number | null;
}

type Costs = Omit<
  ProfitScenarioInput,
  'name' | 'package' | 'leadCount' | 'leadRate' | 'postProductionItems' | 'accessoryItems'
> &
  Partial<
    Pick<ProfitScenarioInput, 'leadCount' | 'leadRate' | 'postProductionItems' | 'accessoryItems'>
  >;

/** Mẫu và đơn giá từ Chi_phi_ky_yeu.xlsx (44 học sinh, 539.000đ/hs). */
export const createWorkbookProfitForm = (): Omit<ProfitScenarioInput, 'name'> => ({
  package: null,
  schedule: null,
  pricePerMember: 539_000,
  students: 44,
  crewCount: 3,
  leadCount: 1,
  leadRate: 1_800_000,
  crewRate: 1_600_000,
  videoCrewCount: 0,
  // Bảng đơn giá không có giá thợ quay; ô Excel đang trỏ nhầm sang giá ăn uống.
  videoCrewRate: 0,
  costumeItems: [
    { label: 'Cử nhân', unitPrice: 20_000, quantity: 1, unit: 'student' },
    { label: 'Áo dài', unitPrice: 40_000, quantity: 18, unit: 'class' },
    { label: 'Vest', unitPrice: 40_000, quantity: 26, unit: 'class' },
    { label: 'Concept Basic', unitPrice: 50_000, quantity: 1, unit: 'student' },
    { label: 'Concept Luxury', unitPrice: 60_000, quantity: 0, unit: 'class' },
  ],
  postProductionItems: [{ label: 'Hậu kỳ (máy)', unitPrice: 200_000, quantity: 4, unit: 'class' }],
  printItems: [
    { label: 'Ảnh 13×18', unitPrice: 9_000, quantity: 2, unit: 'student' },
    { label: 'Ảnh 40×60', unitPrice: 120_000, quantity: 1, unit: 'class' },
  ],
  accessoryItems: [
    { label: 'Sash', unitPrice: 0, quantity: 1, unit: 'student' },
    { label: 'Giấy màu', unitPrice: 100_000, quantity: 1, unit: 'class' },
    { label: 'Phụ kiện (pháo, súng bắn bóng)', unitPrice: 1_000_000, quantity: 1, unit: 'class' },
  ],
  // Trong mẫu, 8 lượt đi lại và 4 suất ăn là số lượng nhập tay (4 người giả định).
  travelItems: [
    { label: 'Di chuyển 1 chiều', unitPrice: 400_000, quantity: 8, unit: 'class' },
    { label: 'Ăn uống', unitPrice: 200_000, quantity: 4, unit: 'class' },
  ],
  otherCosts: [{ label: 'Dự phòng', amount: 1_000_000 }],
});

/** Đọc kịch bản cũ mà không tự thêm chi phí từ mẫu Excel vào số lãi đã lưu. */
export const fromProfitScenario = (s: ProfitScenario): Omit<ProfitScenarioInput, 'name'> => ({
  package: s.package?._id ?? null,
  schedule: s.schedule?._id ?? null,
  pricePerMember: s.pricePerMember,
  students: s.students,
  crewCount: s.crewCount,
  leadCount: s.leadCount ?? 0,
  leadRate: s.leadRate ?? 0,
  crewRate: s.crewRate,
  videoCrewCount: s.videoCrewCount ?? 0,
  videoCrewRate: s.videoCrewRate ?? 0,
  printItems: s.printItems?.length
    ? s.printItems
    : s.printCostPerStudent
      ? [{ label: 'In ấn', unitPrice: s.printCostPerStudent, quantity: 1, unit: 'student' }]
      : [],
  costumeItems: s.costumeItems?.length
    ? s.costumeItems
    : s.costumeCost
      ? [{ label: 'Trang phục', unitPrice: s.costumeCost, quantity: 1, unit: 'class' }]
      : [],
  postProductionItems: s.postProductionItems ?? [],
  accessoryItems: s.accessoryItems ?? [],
  travelItems: s.travelItems ?? [],
  otherCosts: s.otherCosts?.length ? s.otherCosts : [{ label: '', amount: 0 }],
});

/** Chỉ dùng kịch bản theo cấu trúc bảng giá mới để điền giá cho lớp khác. */
export const findWorkbookCostTemplate = (scenarios: ProfitScenario[], packageId: string) =>
  scenarios.find(
    (s) =>
      s.package?._id === packageId &&
      typeof s.leadCount === 'number' &&
      typeof s.leadRate === 'number' &&
      Array.isArray(s.postProductionItems) &&
      Array.isArray(s.accessoryItems),
  );

/** Hệ số nhân theo đơn vị: sĩ số (/hs), số người ekip (/người) hoặc 1 (/lớp). */
export interface CostBasis {
  students: number;
  crew: number;
}

/** Thành tiền một dòng: đơn giá × SL × hệ số đơn vị. */
export const costItemAmount = (item: ProfitCostItem, basis: CostBasis) =>
  (item.unitPrice || 0) *
  (item.quantity || 0) *
  (item.unit === 'student' ? basis.students : item.unit === 'crew' ? basis.crew : 1);

const sumItems = (items: ProfitCostItem[] = [], basis: CostBasis) =>
  items.reduce((sum, it) => sum + costItemAmount(it, basis), 0);

export const calcProfit = (s: Costs): ProfitBreakdown => {
  const revenue = s.pricePerMember * s.students;
  const leadCount = Math.min(s.leadCount ?? 0, s.crewCount);
  const crew = leadCount * (s.leadRate ?? 0) + (s.crewCount - leadCount) * s.crewRate;
  const video = s.videoCrewCount * s.videoCrewRate;
  const basis = { students: s.students, crew: s.crewCount + s.videoCrewCount };
  const print = sumItems(s.printItems, basis);
  const costume = sumItems(s.costumeItems, basis);
  const postProduction = sumItems(s.postProductionItems, basis);
  const accessory = sumItems(s.accessoryItems, basis);
  const travel = sumItems(s.travelItems, basis);
  const other = s.otherCosts.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalCost = crew + video + print + costume + postProduction + accessory + travel + other;
  const profit = revenue - totalCost;
  return {
    revenue,
    crew,
    video,
    print,
    costume,
    postProduction,
    accessory,
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

export const formatVnd = (n: number) => `${new Intl.NumberFormat('vi-VN').format(Math.round(n))} ₫`;

export const formatPercent = (ratio: number) =>
  `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(ratio * 100)}%`;
