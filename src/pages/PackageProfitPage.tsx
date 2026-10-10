import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Camera,
  Car,
  Package as PackageIcon,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Shirt,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { packageService } from '../services/packageService';
import { profitScenarioService } from '../services/profitScenarioService';
import type { Package, ProfitScenario, ProfitScenarioInput } from '../types';
import { calcProfit, formatPercent, formatVnd, suggestCrewCount } from '../utils/packageProfit';
import { cn } from '@/lib/utils';
import {
  Button,
  Combobox,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  PageHeader,
  Spinner,
} from '@/components/ui';

type Form = Omit<ProfitScenarioInput, 'name'>;

const EMPTY_FORM: Form = {
  package: null,
  pricePerMember: 0,
  students: 0,
  crewCount: 0,
  crewRate: 0,
  printCostPerStudent: 0,
  costumeCost: 0,
  otherCosts: [{ label: '', amount: 0 }],
};

const getApiErrorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

const fromScenario = (s: ProfitScenario): Form => ({
  package: s.package?._id ?? null,
  pricePerMember: s.pricePerMember,
  students: s.students,
  crewCount: s.crewCount,
  crewRate: s.crewRate,
  printCostPerStudent: s.printCostPerStudent,
  costumeCost: s.costumeCost,
  otherCosts: s.otherCosts.length ? s.otherCosts : [{ label: '', amount: 0 }],
});

/** Number input showing thousands separators ("250.000"); empty = 0. */
const AmountInput = ({
  id,
  value,
  onChange,
  suffix,
  className,
  'aria-label': ariaLabel,
}: {
  id?: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  className?: string;
  'aria-label'?: string;
}) => (
  <div className={cn('relative', className)}>
    <Input
      id={id}
      inputMode="numeric"
      aria-label={ariaLabel}
      className={cn('h-10 tabular', suffix && 'pr-12')}
      value={value ? new Intl.NumberFormat('vi-VN').format(value) : ''}
      placeholder="0"
      onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '').slice(0, 13)) || 0)}
    />
    {suffix && (
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12.5px] text-muted-foreground">
        {suffix}
      </span>
    )}
  </div>
);

const Field = ({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) => (
  <div className={cn('min-w-0 space-y-1.5', className)}>
    <label htmlFor={htmlFor} className="block text-[12.5px] font-semibold text-muted-foreground">
      {label}
    </label>
    {children}
    {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
  </div>
);

const SectionCard = ({
  title,
  icon,
  tone,
  subtotal,
  className,
  children,
}: {
  title: string;
  icon: ReactNode;
  tone: string;
  subtotal: number;
  className?: string;
  children: ReactNode;
}) => (
  <section className={cn('space-y-3.5 rounded-[14px] border bg-card p-4 md:px-[18px]', className)}>
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg [&_svg]:size-[15px]',
          tone,
        )}
      >
        {icon}
      </span>
      <h3 className="flex-1 text-[14.5px] font-bold text-foreground">{title}</h3>
      <span className="text-[13px] font-semibold text-muted-foreground tabular">
        {formatVnd(subtotal)}
      </span>
    </div>
    {children}
  </section>
);

const COST_TONES = {
  crew: { bar: 'bg-blue-500', icon: 'bg-blue-500/15 text-blue-700 dark:text-blue-300' },
  print: { bar: 'bg-violet-500', icon: 'bg-violet-500/15 text-violet-700 dark:text-violet-300' },
  costume: { bar: 'bg-pink-500', icon: 'bg-pink-500/15 text-pink-700 dark:text-pink-300' },
  other: { bar: 'bg-teal-500', icon: 'bg-teal-500/15 text-teal-700 dark:text-teal-300' },
};

const PackageProfitPage = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [scenarios, setScenarios] = useState<ProfitScenario[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  /** Số thợ tự tính theo gói cho tới khi người dùng sửa tay. */
  const [crewAuto, setCrewAuto] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    packageService
      .getAll()
      .then(setPackages)
      .catch(() => setPackages([]));
    profitScenarioService
      .getAll()
      .then(setScenarios)
      .catch(() => toast.error('Không tải được kịch bản đã lưu.'))
      .finally(() => setLoadingList(false));
  }, []);

  const pkg = packages.find((p) => p._id === form.package) ?? null;
  const suggestedCrew = suggestCrewCount(form.students, pkg?.studentsPerCrew);
  const crewCount = crewAuto && suggestedCrew != null ? suggestedCrew : form.crewCount;
  const result = calcProfit({ ...form, crewCount });
  const active = scenarios.find((s) => s._id === activeId) ?? null;

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const packageOptions = useMemo(
    () => [
      { value: '', label: 'Không chọn gói (nhập giá tay)' },
      ...packages.map((p) => ({ value: p._id, label: p.name })),
    ],
    [packages],
  );

  const choosePackage = (id: string) => {
    const p = packages.find((x) => x._id === id);
    setForm((f) => ({
      ...f,
      package: p?._id ?? null,
      pricePerMember: p?.pricePerMember ?? f.pricePerMember,
      crewCount: 0,
    }));
    setCrewAuto(true);
  };

  const setOther = (i: number, patch: Partial<Form['otherCosts'][number]>) =>
    set(
      'otherCosts',
      form.otherCosts.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    );

  const reset = () => {
    setForm(EMPTY_FORM);
    setCrewAuto(true);
    setActiveId(null);
  };

  const load = (s: ProfitScenario) => {
    setForm(fromScenario(s));
    // Số thợ đã lưu khớp số tự tính → tiếp tục tự tính khi đổi sĩ số
    setCrewAuto(s.crewCount === suggestCrewCount(s.students, s.package?.studentsPerCrew));
    setActiveId(s._id);
  };

  const openSave = () => {
    setName(
      active?.name ??
        [pkg?.name, form.students ? `${form.students} hs` : ''].filter(Boolean).join(' · '),
    );
    setSaveOpen(true);
  };

  const save = async (asNew: boolean) => {
    const payload: ProfitScenarioInput = {
      ...form,
      crewCount,
      name: name.trim(),
      otherCosts: form.otherCosts.filter((c) => c.label.trim() || c.amount),
    };
    if (!payload.name) {
      toast.error('Vui lòng nhập tên kịch bản.');
      return;
    }
    setSaving(true);
    try {
      const saved =
        active && !asNew
          ? await profitScenarioService.update(active._id, payload)
          : await profitScenarioService.create(payload);
      setScenarios((list) => [saved, ...list.filter((s) => s._id !== saved._id)]);
      setActiveId(saved._id);
      setForm((f) => ({ ...f, crewCount }));
      setSaveOpen(false);
      toast.success(active && !asNew ? 'Đã cập nhật kịch bản.' : 'Đã lưu kịch bản.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Lưu thất bại, vui lòng thử lại.'));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!confirmId) return;
    try {
      await profitScenarioService.remove(confirmId);
      setScenarios((list) => list.filter((s) => s._id !== confirmId));
      if (activeId === confirmId) setActiveId(null);
      toast.success('Đã xoá kịch bản.');
    } catch {
      toast.error('Xoá thất bại, vui lòng thử lại.');
    }
    setConfirmId(null);
  };

  const costs = [
    { key: 'crew', label: `Ekip (${crewCount} thợ)`, value: result.crew },
    { key: 'print', label: 'In ấn', value: result.print },
    { key: 'costume', label: 'Trang phục', value: result.costume },
    { key: 'other', label: 'Đi lại, ăn uống & khác', value: result.other },
  ] as const;
  const losing = result.profit < 0;
  const marginTone =
    result.margin == null
      ? 'bg-muted text-muted-foreground'
      : losing || result.margin < 0.2
        ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
  const profitColor = losing
    ? 'text-rose-600 dark:text-rose-400'
    : 'text-emerald-600 dark:text-emerald-400';
  /** Thanh tỉ trọng chi phí trên doanh thu (hoặc trên tổng chi khi lỗ). */
  const barBase = Math.max(result.revenue, result.totalCost, 1);

  const actions = (
    <>
      <Button variant="outline" onClick={reset}>
        <RotateCcw />
        Làm mới
      </Button>
      <Button variant="gradient" onClick={openSave}>
        <Save />
        Lưu kịch bản
      </Button>
    </>
  );

  const resultCard = (
    <section className="space-y-3 rounded-2xl border bg-card p-4 md:space-y-4 md:rounded-[14px] md:p-5">
      <div className="flex items-center gap-2">
        <span className="flex-1 text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground md:text-[11px]">
          Lợi nhuận ước tính
        </span>
        {result.margin != null && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold tabular',
              marginTone,
            )}
          >
            {losing ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
            {formatPercent(result.margin)}
          </span>
        )}
      </div>
      <p
        className={cn(
          'font-display text-[30px] font-bold leading-none tracking-tight tabular md:text-[32px]',
          profitColor,
        )}
      >
        {formatVnd(result.profit)}
      </p>
      {result.profitPerStudent != null && (
        <p className="hidden text-[13px] text-muted-foreground md:block">
          ≈ {formatVnd(result.profitPerStudent)} {losing ? 'lỗ' : 'lãi'} mỗi học sinh
        </p>
      )}
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted md:h-2.5">
        {costs.map(
          (c) =>
            c.value > 0 && (
              <span
                key={c.key}
                className={COST_TONES[c.key].bar}
                style={{ width: `${(c.value / barBase) * 100}%` }}
              />
            ),
        )}
        {result.profit > 0 && <span className="flex-1 bg-emerald-500" />}
      </div>

      {/* Mobile: 3 stat tiles */}
      <div className="grid grid-cols-3 gap-2 md:hidden">
        {[
          ['Doanh thu', formatVnd(result.revenue), 'text-foreground'],
          ['Tổng chi', formatVnd(result.totalCost), 'text-foreground'],
          [
            'Lãi / hs',
            result.profitPerStudent != null ? formatVnd(result.profitPerStudent) : '—',
            profitColor,
          ],
        ].map(([label, value, color]) => (
          <div key={label} className="min-w-0 rounded-[10px] bg-muted px-2 py-2">
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <p className={cn('break-all text-[12.5px] font-bold tabular', color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Desktop: breakdown */}
      <div className="hidden space-y-2.5 md:block">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <span className="flex-1">
            Doanh thu ({form.students} hs × {formatVnd(form.pricePerMember)})
          </span>
          <span className="tabular">{formatVnd(result.revenue)}</span>
        </div>
        {costs.map((c) => (
          <div key={c.key} className="flex items-center gap-2 text-[13px]">
            <span className={cn('h-2 w-2 shrink-0 rounded-full', COST_TONES[c.key].bar)} />
            <span className="flex-1 text-muted-foreground">{c.label}</span>
            {result.revenue > 0 && (
              <span className="text-xs text-muted-foreground tabular">
                {formatPercent(c.value / result.revenue)}
              </span>
            )}
            <span className="font-semibold text-foreground tabular">{formatVnd(c.value)}</span>
          </div>
        ))}
        <div className="h-px bg-border" />
        <div className="flex items-center text-sm font-bold text-foreground">
          <span className="flex-1">Tổng chi phí</span>
          <span className="tabular">{formatVnd(result.totalCost)}</span>
        </div>
        <div className="flex items-center text-sm font-bold">
          <span className="flex-1 text-foreground">{losing ? 'Lỗ' : 'Lợi nhuận'}</span>
          <span className={cn('tabular', profitColor)}>{formatVnd(result.profit)}</span>
        </div>
      </div>
    </section>
  );

  const savedCard = (
    <section className="overflow-hidden rounded-2xl border bg-card md:rounded-[14px]">
      <div className="flex items-center gap-2 px-4 py-3.5 md:px-[18px]">
        <h3 className="flex-1 text-[14.5px] font-bold text-foreground">Kịch bản đã lưu</h3>
        <span className="text-[13px] font-semibold text-muted-foreground tabular">
          {scenarios.length}
        </span>
      </div>
      {loadingList ? (
        <div className="flex justify-center border-t py-6">
          <Spinner size="sm" />
        </div>
      ) : scenarios.length === 0 ? (
        <p className="border-t px-4 py-6 text-center text-sm text-muted-foreground">
          Chưa có kịch bản nào.
        </p>
      ) : (
        scenarios.map((s) => {
          const r = calcProfit(s);
          const low = r.profit < 0 || (r.margin != null && r.margin < 0.2);
          return (
            <div
              key={s._id}
              className={cn(
                'relative flex items-center gap-2.5 border-t px-4 py-3 transition-colors md:px-[18px]',
                s._id === activeId ? 'bg-primary/10' : 'hover:bg-muted/50',
              )}
            >
              <button
                type="button"
                onClick={() => load(s)}
                className="min-w-0 flex-1 text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
              >
                <span className="block truncate text-[13.5px] font-semibold text-foreground">
                  {s.name}
                </span>
                <span className="block truncate text-xs text-muted-foreground tabular">
                  {s.students} hs · {formatVnd(s.pricePerMember)}/hs
                </span>
              </button>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <span className="text-[13.5px] font-bold text-foreground tabular">
                  {formatVnd(r.profit)}
                </span>
                {r.margin != null && (
                  <span
                    className={cn(
                      'rounded-full px-2 py-px text-[11.5px] font-bold tabular',
                      low
                        ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
                    )}
                  >
                    {formatPercent(r.margin)}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="relative z-10 h-7 w-7 shrink-0 text-rose-600 hover:text-rose-700 dark:text-rose-400 [&_svg]:size-3.5"
                title="Xoá"
                aria-label={`Xoá kịch bản ${s.name}`}
                onClick={() => setConfirmId(s._id)}
              >
                <Trash2 />
              </Button>
            </div>
          );
        })
      )}
    </section>
  );

  return (
    <div>
      <PageHeader
        kicker="Tools"
        title="Tính lãi gói"
        description="Ước tính doanh thu, chi phí và lợi nhuận của một lớp theo gói chụp — lưu lại để so sánh."
        className="hidden md:flex"
        action={actions}
      />
      <p className="mb-3.5 text-[13.5px] leading-snug text-muted-foreground md:hidden">
        Ước tính doanh thu, chi phí và lợi nhuận của một lớp theo gói chụp.
      </p>

      <div className="grid gap-3.5 md:gap-4 xl:grid-cols-[minmax(0,1fr)_384px] xl:items-start xl:gap-6">
        <div className="xl:hidden">{resultCard}</div>

        <div className="space-y-3.5 md:space-y-4">
          <SectionCard
            title="Gói & sĩ số"
            icon={<PackageIcon />}
            tone="bg-primary/15 text-primary-700 dark:text-primary"
            subtotal={result.revenue}
          >
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_150px]">
              <Field
                label="Gói chụp"
                hint={
                  pkg &&
                  `${formatVnd(pkg.pricePerMember)}/hs${pkg.studentsPerCrew ? ` · ${pkg.studentsPerCrew} hs/thợ` : ''}`
                }
              >
                <Combobox
                  options={packageOptions}
                  value={form.package ?? ''}
                  onChange={choosePackage}
                  placeholder="Chọn gói…"
                  searchPlaceholder="Tìm gói…"
                  className="h-10 rounded-[10px] bg-card shadow-none"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3 md:contents">
                <Field label="Giá / học sinh" htmlFor="pp-price">
                  <AmountInput
                    id="pp-price"
                    value={form.pricePerMember}
                    onChange={(v) => set('pricePerMember', v)}
                    suffix="đ"
                  />
                </Field>
                <Field label="Sĩ số" htmlFor="pp-students">
                  <AmountInput
                    id="pp-students"
                    value={form.students}
                    onChange={(v) => set('students', v)}
                    suffix="hs"
                  />
                </Field>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Ekip chụp"
            icon={<Camera />}
            tone={COST_TONES.crew.icon}
            subtotal={result.crew}
          >
            <div className="grid grid-cols-2 gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
              <Field label="Số thợ" htmlFor="pp-crew">
                <AmountInput
                  id="pp-crew"
                  value={crewCount}
                  onChange={(v) => {
                    setCrewAuto(false);
                    set('crewCount', v);
                  }}
                  suffix="người"
                />
              </Field>
              <Field label="Tiền công / thợ" htmlFor="pp-rate">
                <AmountInput
                  id="pp-rate"
                  value={form.crewRate}
                  onChange={(v) => set('crewRate', v)}
                  suffix="đ"
                />
              </Field>
            </div>
            {suggestedCrew != null && pkg?.studentsPerCrew && (
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Tự tính: {form.students} hs ÷ {pkg.studentsPerCrew} hs/thợ = {suggestedCrew} thợ
                {!crewAuto && crewCount !== suggestedCrew && (
                  <>
                    {' · '}
                    <button
                      type="button"
                      className="font-semibold underline-offset-2 hover:underline"
                      onClick={() => setCrewAuto(true)}
                    >
                      Dùng số này
                    </button>
                  </>
                )}
              </p>
            )}
          </SectionCard>

          <div className="grid gap-3.5 md:grid-cols-2 md:gap-4">
            <SectionCard
              title="In ấn"
              icon={<Printer />}
              tone={COST_TONES.print.icon}
              subtotal={result.print}
            >
              <Field label="Chi phí in / học sinh" htmlFor="pp-print">
                <AmountInput
                  id="pp-print"
                  value={form.printCostPerStudent}
                  onChange={(v) => set('printCostPerStudent', v)}
                  suffix="đ"
                />
              </Field>
            </SectionCard>
            <SectionCard
              title="Trang phục & đạo cụ"
              icon={<Shirt />}
              tone={COST_TONES.costume.icon}
              subtotal={result.costume}
            >
              <Field label="Chi phí / lớp" htmlFor="pp-costume">
                <AmountInput
                  id="pp-costume"
                  value={form.costumeCost}
                  onChange={(v) => set('costumeCost', v)}
                  suffix="đ"
                />
              </Field>
            </SectionCard>
          </div>

          <SectionCard
            title="Đi lại, ăn uống & khác"
            icon={<Car />}
            tone={COST_TONES.other.icon}
            subtotal={result.other}
            className="space-y-2.5"
          >
            {form.otherCosts.map((c, i) => (
              <div key={i} className="flex items-center gap-2 md:gap-2.5">
                <Input
                  className="h-10 min-w-0 flex-1"
                  placeholder="Tên khoản chi"
                  aria-label="Tên khoản chi"
                  value={c.label}
                  onChange={(e) => setOther(i, { label: e.target.value })}
                />
                <AmountInput
                  className="w-[124px] shrink-0 md:w-[180px]"
                  aria-label="Số tiền"
                  value={c.amount}
                  onChange={(v) => setOther(i, { amount: v })}
                  suffix="đ"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground"
                  aria-label="Xoá khoản chi"
                  onClick={() =>
                    set(
                      'otherCosts',
                      form.otherCosts.filter((_, idx) => idx !== i),
                    )
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-0.5 py-1.5 text-[13px] font-semibold text-primary-700 hover:underline dark:text-primary"
              onClick={() => set('otherCosts', [...form.otherCosts, { label: '', amount: 0 }])}
            >
              <Plus className="h-3.5 w-3.5" />
              Thêm khoản chi
            </button>
          </SectionCard>

          {/* Mobile actions */}
          <div className="grid grid-cols-2 gap-2.5 md:hidden [&_button]:h-[42px]">{actions}</div>

          <div className="xl:hidden">{savedCard}</div>
        </div>

        <div className="hidden space-y-4 xl:block">
          {resultCard}
          {savedCard}
        </div>
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{active ? 'Lưu kịch bản' : 'Lưu kịch bản mới'}</DialogTitle>
          </DialogHeader>
          <Field label="Tên kịch bản" htmlFor="pp-name">
            <Input
              id="pp-name"
              autoFocus
              value={name}
              placeholder="VD: 12A7 · Gói Tiêu chuẩn"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !saving && save(false)}
            />
          </Field>
          <DialogFooter className="gap-2">
            {active && (
              <Button variant="outline" disabled={saving} onClick={() => save(true)}>
                Lưu thành bản mới
              </Button>
            )}
            <Button variant="gradient" disabled={saving} onClick={() => save(false)}>
              {saving ? <Spinner size="sm" /> : <Save />}
              {active ? 'Cập nhật' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Xác nhận xoá"
        message="Bạn có chắc muốn xoá kịch bản này?"
        onConfirm={doDelete}
      />
    </div>
  );
};

export default PackageProfitPage;
