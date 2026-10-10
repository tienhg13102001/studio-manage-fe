/**
 * Số thợ hệ thống tính cho một lớp: n học sinh, k = số học sinh / 1 thợ.
 * crew = floor(n / k); phần dư r = n % k, nếu r > k / 2 (hơn 50%) thì cộng thêm 1 thợ.
 * Lớp có học sinh luôn cần ít nhất 1 thợ. Gói chưa cài k (thiếu hoặc 0) → `null`.
 *
 * Giữ đồng bộ với `calcCrewCount` trong backend/google-apps-script/Code_create_HD.gs.
 */
export const calcCrewCount = (
  total: number | null | undefined,
  studentsPerCrew: number | null | undefined,
): number | null => {
  const k = Number(studentsPerCrew);
  if (!Number.isFinite(k) || k <= 0) return null;
  const n = Number(total);
  if (!Number.isFinite(n) || n <= 0) return 0;
  let crew = Math.floor(n / k);
  if (n % k > k / 2) crew += 1;
  return Math.max(crew, 1);
};

/**
 * Số thợ cần cho lớp: ưu tiên số thợ đã chốt trong hợp đồng (có thể khác số hệ thống tính),
 * không có thì tự tính theo sĩ số và gói.
 */
export const neededCrewCount = (
  customer:
    | { total?: number | null; contract?: { crewCount?: number | null } | null }
    | null
    | undefined,
  studentsPerCrew: number | null | undefined,
): number | null =>
  customer?.contract?.crewCount ?? calcCrewCount(customer?.total, studentsPerCrew);
