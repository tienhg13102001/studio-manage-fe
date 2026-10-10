import { getSchoolName, type Customer, type ScheduleResponse } from '../types';

const day = (iso?: string | null) => (iso ? iso.slice(0, 10) : '');
const norm = (v?: string | null) => (v ?? '').trim();

/**
 * Class info that changed since the contract was printed (labels for the UI), e.g.
 * ["Sĩ số", "Ngày chụp"]. Contracts made before snapshots only compare date / location.
 */
export const contractChanges = (
  customer: Customer,
  schedule?: ScheduleResponse | null,
): string[] => {
  const contract = customer.contract;
  if (!contract?.url) return [];
  const changes: string[] = [];
  const p = contract.printed;
  if (p) {
    if (p.className !== undefined && norm(p.className) !== norm(customer.className))
      changes.push('Tên lớp');
    if (p.school !== undefined && norm(p.school) !== norm(getSchoolName(customer)))
      changes.push('Trường');
    if (p.contactName !== undefined && norm(p.contactName) !== norm(customer.contactName))
      changes.push('Người liên hệ');
    if (p.contactPhone !== undefined && norm(p.contactPhone) !== norm(customer.contactPhone))
      changes.push('SĐT');
    if (p.contactAddress !== undefined && norm(p.contactAddress) !== norm(customer.contactAddress))
      changes.push('Địa chỉ');
    if (
      (p.total !== undefined && p.total !== (customer.total ?? 0)) ||
      (p.totalMale !== undefined && p.totalMale !== (customer.totalMale ?? 0)) ||
      (p.totalFemale !== undefined && p.totalFemale !== (customer.totalFemale ?? 0))
    )
      changes.push('Sĩ số');
  }
  if (
    schedule?.shootDate &&
    contract.shootDate &&
    day(schedule.shootDate) !== day(contract.shootDate)
  )
    changes.push('Ngày chụp');
  if (norm(schedule?.location) && norm(schedule?.location) !== norm(contract.location))
    changes.push('Địa điểm');
  return changes;
};
