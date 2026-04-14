import { useState } from 'react';

export interface ScheduleFilterState {
  status: string;
  dateFrom: string;
  dateTo: string;
  customerId: string;
}

const DEFAULT_FILTER: ScheduleFilterState = {
  status: '',
  dateFrom: '',
  dateTo: '',
  customerId: '',
};

function toParams(f: ScheduleFilterState): Record<string, string> {
  const params: Record<string, string> = {};
  if (f.status) params.status = f.status;
  if (f.dateFrom) params.dateFrom = f.dateFrom;
  if (f.dateTo) params.dateTo = f.dateTo;
  if (f.customerId) params.customerId = f.customerId;
  return params;
}

/**
 * Manages filter state for SchedulesPage.
 * Returns the current filter, a setter, and helpers to build query params / reset.
 */
export function useScheduleFilter() {
  const [filter, setFilter] = useState<ScheduleFilterState>(DEFAULT_FILTER);

  const resetFilter = () => setFilter(DEFAULT_FILTER);

  return {
    filter,
    setFilter,
    /** Build query params from current filter */
    currentParams: toParams(filter),
    /** Build query params from any filter snapshot (e.g. before state updates flush) */
    toParams,
    resetFilter,
  };
}
