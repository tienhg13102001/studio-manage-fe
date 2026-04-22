import { useState } from 'react';

export interface FinanceFilterState {
  type: string;
  customer: string;
  categoryId: string;
  dateFrom: string;
  dateTo: string;
}

const DEFAULT_FILTER: FinanceFilterState = {
  type: '',
  customer: '',
  categoryId: '',
  dateFrom: '',
  dateTo: '',
};

function toParams(f: FinanceFilterState): Record<string, string> {
  const params: Record<string, string> = {};
  if (f.type) params.type = f.type;
  if (f.customer) params.customer = f.customer;
  if (f.categoryId) params.categoryId = f.categoryId;
  if (f.dateFrom) params.dateFrom = f.dateFrom;
  if (f.dateTo) params.dateTo = f.dateTo;
  return params;
}

/**
 * Manages filter + tab state for FinancePage.
 */
export function useFinanceFilter() {
  const [filter, setFilter] = useState<FinanceFilterState>(DEFAULT_FILTER);
  const [tab, setTab] = useState<'list' | 'summary'>('list');

  const resetFilter = () => setFilter(DEFAULT_FILTER);

  return {
    filter,
    setFilter,
    tab,
    setTab,
    currentParams: toParams(filter),
    toParams,
    resetFilter,
  };
}
