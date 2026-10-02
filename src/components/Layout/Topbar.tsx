import { useEffect } from 'react';
import { BookOpen, ChevronRight, Menu, Sun } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { navItems, adminItems } from '../../config/navItems';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchSeasons, setSelectedSeason } from '../../store/slices/seasonsSlice';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

const ALL_SEASONS = '__all__';
/** Tiêu đề gọn hơn cho topbar mobile (key = label trong navItems). */
const MOBILE_TITLE_OVERRIDES: Record<string, string> = {
  'Danh sách lớp học': 'Danh sách lớp',
  'Chi tiết khách hàng': 'Chi tiết lớp',
};
/** Trang hướng dẫn tĩnh trong frontend/public/huong-dan */
const CUSTOMER_GUIDE_URL = '/huong-dan/quy-trinh-cham-soc-lop.html';

/** Resolve ["Group", "Page"] labels for the current path from the nav config. */
const useBreadcrumb = (): string[] => {
  const { pathname } = useLocation();
  if (pathname === '/profile') return ['Tài khoản', 'Hồ sơ cá nhân'];
  for (const item of [...navItems, ...adminItems]) {
    if (!item.children) {
      if (item.to === pathname) return item.to === '/' ? ['Tổng quan', item.label] : [item.label];
      continue;
    }
    if (!pathname.startsWith(item.to)) continue;
    const rest = pathname.slice(item.to.length);
    const exact = item.children.find((c) => !c.to.includes(':') && c.to === rest);
    if (exact) return [item.label, exact.label];
    const dynamic = item.children.find((c) => c.to.includes(':'));
    if (dynamic && rest.length > 1) return [item.label, dynamic.label];
  }
  return ['Yume Studio'];
};

interface TopbarProps {
  onOpenMenu: () => void;
}

const Topbar = ({ onOpenMenu }: TopbarProps) => {
  const dispatch = useAppDispatch();
  const { list: seasons, selectedSeasonId } = useAppSelector((s) => s.seasons);
  const crumbs = useBreadcrumb();
  const { pathname } = useLocation();
  const pageTitle = crumbs[crumbs.length - 1];
  const mobileTitle = MOBILE_TITLE_OVERRIDES[pageTitle] ?? pageTitle;

  useEffect(() => {
    dispatch(fetchSeasons());
  }, [dispatch]);

  useEffect(() => {
    if (
      selectedSeasonId &&
      seasons.length > 0 &&
      !seasons.some((s) => s._id === selectedSeasonId)
    ) {
      dispatch(setSelectedSeason(''));
    }
  }, [dispatch, seasons, selectedSeasonId]);

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 h-[52px] md:h-16 px-4 md:px-8 border-b bg-card/95 backdrop-blur">
      <button
        onClick={onOpenMenu}
        className="md:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-border text-muted-foreground hover:bg-muted"
        aria-label="Mở menu"
      >
        <Menu className="w-5 h-5" />
      </button>
      <h1 className="md:hidden flex-1 min-w-0 truncate font-display text-[17px] font-bold text-foreground">
        {mobileTitle}
      </h1>

      <nav className="hidden md:flex items-center gap-2 text-[13px] min-w-0">
        {crumbs.map((c, i) => (
          <span key={c} className="flex items-center gap-2 min-w-0">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />}
            <span
              className={
                i === crumbs.length - 1
                  ? 'font-semibold text-foreground truncate'
                  : 'text-muted-foreground/80'
              }
            >
              {c}
            </span>
          </span>
        ))}
      </nav>

      <div className="hidden md:block flex-1" />

      {pathname.startsWith('/customers') && (
        <a
          href={CUSTOMER_GUIDE_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Hướng dẫn quy trình chăm sóc lớp (mở tab mới)"
          aria-label="Hướng dẫn"
          className="inline-flex h-9 w-9 justify-center md:h-[38px] md:w-auto md:justify-start shrink-0 items-center gap-2 rounded-[10px] border border-border bg-card md:px-3 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BookOpen className="h-[15px] w-[15px] text-primary-700 dark:text-primary" />
          <span className="hidden md:inline">Hướng dẫn</span>
        </a>
      )}

      <Select
        value={selectedSeasonId || ALL_SEASONS}
        onValueChange={(v) => dispatch(setSelectedSeason(v === ALL_SEASONS ? '' : v))}
      >
        <SelectTrigger
          aria-label="Mùa chụp"
          className="h-[30px] w-auto min-w-0 max-w-[min(140px,36vw)] gap-1.5 rounded-full px-2.5 text-xs md:h-[38px] md:max-w-[240px] md:gap-2 md:rounded-[10px] md:px-3 md:text-[13px] border-0 bg-primary-100 font-semibold text-primary-700 shadow-none dark:bg-primary/15 dark:text-primary [&>svg]:opacity-80"
        >
          <Sun className="w-[15px] h-[15px] shrink-0" />
          <SelectValue placeholder="Tất cả mùa" />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value={ALL_SEASONS}>Tất cả mùa</SelectItem>
          {seasons.map((s) => (
            <SelectItem key={s._id} value={s._id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </header>
  );
};

export default Topbar;
