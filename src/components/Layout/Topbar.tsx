import { useEffect } from 'react';
import { BookOpen, ChevronRight, Menu, Sun } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { navItems, adminItems } from '../../config/navItems';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchSeasons, setSelectedSeason } from '../../store/slices/seasonsSlice';
import { Logo } from '../atoms';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

const ALL_SEASONS = '__all__';
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
    <header className="sticky top-0 z-20 flex items-center gap-3 h-14 md:h-16 px-4 md:px-8 border-b bg-card/95 backdrop-blur">
      <button
        onClick={onOpenMenu}
        className="md:hidden -ml-1 p-1.5 rounded-lg text-muted-foreground hover:bg-muted"
        aria-label="Mở menu"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="md:hidden">
        <Logo size={26} />
      </div>

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

      <div className="flex-1" />

      {pathname.startsWith('/customers') && (
        <a
          href={CUSTOMER_GUIDE_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Hướng dẫn quy trình chăm sóc lớp (mở tab mới)"
          className="inline-flex h-[38px] shrink-0 items-center gap-2 rounded-[10px] border border-border bg-card px-3 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BookOpen className="h-[15px] w-[15px] text-primary-700 dark:text-primary" />
          <span className="hidden sm:inline">Hướng dẫn</span>
        </a>
      )}

      <Select
        value={selectedSeasonId || ALL_SEASONS}
        onValueChange={(v) => dispatch(setSelectedSeason(v === ALL_SEASONS ? '' : v))}
      >
        <SelectTrigger
          aria-label="Mùa chụp"
          className="h-[38px] w-auto max-w-[240px] gap-2 rounded-[10px] border-0 bg-primary-100 px-3 text-[13px] font-semibold text-primary-700 shadow-none dark:bg-primary/15 dark:text-primary [&>svg]:opacity-80"
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
