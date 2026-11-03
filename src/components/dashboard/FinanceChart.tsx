import { useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { DashboardStats } from '../../services/dashboardService';
import { formatCurrency } from '../../utils/format';
import { SegmentedControl } from '@/components/ui';

const LEGEND = [
  { label: 'Thu', cls: 'rounded-[3px] bg-emerald-600' },
  { label: 'Chi', cls: 'rounded-[3px] bg-red-600' },
  { label: 'Lợi nhuận', cls: 'rounded-full bg-foreground' },
  {
    label: 'Lợi nhuận dồn',
    cls: 'rounded-full border-2 border-dashed border-muted-foreground bg-transparent',
  },
];

export function FinanceChart({ daily }: { daily: DashboardStats['daily'] }) {
  const [chartView, setChartView] = useState<'day' | 'month'>('month');

  const chartBaseData =
    chartView === 'day'
      ? daily
      : (() => {
          const byMonth: Record<string, { income: number; expense: number }> = {};
          for (const d of daily) {
            const key = d.label.slice(0, 7); // YYYY-MM
            if (!byMonth[key]) byMonth[key] = { income: 0, expense: 0 };
            byMonth[key].income += d.income;
            byMonth[key].expense += d.expense;
          }
          return Object.entries(byMonth)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([label, v]) => ({ label: `${label}-01`, ...v }));
        })();

  const formatChartLabel = (label: string) => {
    const parts = label.split('-');
    if (chartView === 'month') return `${parts[1]}/${parts[0].slice(2)}`;
    return `${parts[2]}/${parts[1]}`;
  };

  const chartData = chartBaseData.reduce<
    Array<{ name: string; Thu: number; Chi: number; 'Lợi nhuận': number; 'Lợi nhuận dồn': number }>
  >((acc, d) => {
    const profit = d.income - d.expense;
    const cumulative = (acc[acc.length - 1]?.['Lợi nhuận dồn'] ?? 0) + profit;
    acc.push({
      name: formatChartLabel(d.label),
      Thu: d.income,
      Chi: d.expense,
      'Lợi nhuận': profit,
      'Lợi nhuận dồn': cumulative,
    });
    return acc;
  }, []);

  return (
    <section aria-labelledby="finance-chart-title" className="rounded-lg border bg-card p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="finance-chart-title" className="font-display text-lg font-bold">
          Thu chi
        </h2>
        <SegmentedControl
          value={chartView}
          onChange={setChartView}
          items={[
            { value: 'day', label: 'Ngày' },
            { value: 'month', label: 'Tháng' },
          ]}
        />
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {LEGEND.map((l) => (
          <span
            key={l.label}
            className="inline-flex items-center gap-2 text-xs text-muted-foreground"
          >
            <span className={`h-2.5 w-2.5 ${l.cls}`} />
            {l.label}
          </span>
        ))}
      </div>
      {chartData.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Không có dữ liệu tài chính trong khoảng thời gian này.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 6" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              tickMargin={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickCount={5}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v) => {
                const abs = Math.abs(v);
                const sign = v < 0 ? '-' : '';
                return abs >= 1_000_000
                  ? `${sign}${+(abs / 1_000_000).toFixed(1)}M`
                  : abs >= 1_000
                    ? `${sign}${(abs / 1_000).toFixed(0)}K`
                    : `${sign}${abs}`;
              }}
            />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground) / 0.5)" strokeWidth={1} />
            <Tooltip
              formatter={(value, name) => [formatCurrency(Number(value ?? 0)), name]}
              itemSorter={(item) =>
                (
                  ({ Thu: 0, Chi: 1, 'Lợi nhuận': 2, 'Lợi nhuận dồn': 3 }) as Record<string, number>
                )[String(item.name ?? '')] ?? 99
              }
              cursor={{ fill: 'hsl(var(--muted) / 0.6)' }}
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 8px 24px rgb(0 0 0 / 0.12)',
                fontVariantNumeric: 'tabular-nums',
              }}
              labelStyle={{ fontWeight: 700, color: 'hsl(var(--foreground))' }}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Bar dataKey="Thu" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={22} />
            <Bar dataKey="Chi" fill="#DC2626" radius={[4, 4, 0, 0]} maxBarSize={22} />
            <Line
              type="monotone"
              dataKey="Lợi nhuận"
              stroke="hsl(var(--foreground))"
              strokeWidth={2.5}
              dot={{
                r: 3,
                strokeWidth: 1.5,
                stroke: 'hsl(var(--foreground))',
                fill: 'hsl(var(--card))',
              }}
              activeDot={{
                r: 5,
                strokeWidth: 2,
                stroke: 'hsl(var(--foreground))',
                fill: 'hsl(var(--card))',
              }}
            />
            <Line
              type="monotone"
              dataKey="Lợi nhuận dồn"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2.5}
              strokeDasharray="5 3"
              dot={{
                r: 3,
                strokeWidth: 1.5,
                stroke: 'hsl(var(--muted-foreground))',
                fill: 'hsl(var(--card))',
              }}
              activeDot={{
                r: 5,
                strokeWidth: 2,
                stroke: 'hsl(var(--muted-foreground))',
                fill: 'hsl(var(--card))',
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}
