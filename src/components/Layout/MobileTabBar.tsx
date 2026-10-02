import { Calendar, Grid2x2, LayoutDashboard, Users, Wallet, type LucideIcon } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';
import { navItems, adminItems, type NavItem } from '../../config/navItems';
import { cn } from '@/lib/utils';

interface MobileTabBarProps {
  onOpenMenu: () => void;
}

interface Tab {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Role gates from navItems config (parent group + child), mirrors Sidebar/App route guards. */
  roleGates: Array<UserRole[] | undefined>;
  isActive: (pathname: string) => boolean;
}

const findItem = (items: NavItem[], to: string) => items.find((i) => i.to === to);
const findChild = (items: NavItem[], parentTo: string, childTo: string) =>
  findItem(items, parentTo)?.children?.find((c) => c.to === childTo);

const TABS: Tab[] = [
  {
    to: '/',
    label: 'Tổng quan',
    icon: LayoutDashboard,
    roleGates: [findItem(navItems, '/')?.allowedRoles],
    isActive: (p) => p === '/',
  },
  {
    to: '/customers',
    label: 'Lớp học',
    icon: Users,
    roleGates: [
      findItem(navItems, '/customers')?.allowedRoles,
      findChild(navItems, '/customers', '')?.allowedRoles,
    ],
    isActive: (p) => p === '/customers' || p.startsWith('/customers/'),
  },
  {
    to: '/schedules',
    label: 'Lịch chụp',
    icon: Calendar,
    roleGates: [findItem(navItems, '/schedules')?.allowedRoles],
    isActive: (p) => p === '/schedules' || p.startsWith('/schedules/'),
  },
  {
    to: '/manage/finance',
    label: 'Tài chính',
    icon: Wallet,
    roleGates: [
      findItem(adminItems, '/manage')?.allowedRoles,
      findChild(adminItems, '/manage', '/finance')?.allowedRoles,
    ],
    isActive: (p) => p.startsWith('/manage/finance'),
  },
];

const TAB_CLS = 'flex flex-1 min-w-0 flex-col items-center justify-center gap-[3px] py-0.5';
const LABEL_CLS = 'text-[11px] leading-[14px] truncate max-w-full';

const MobileTabBar = ({ onOpenMenu }: MobileTabBarProps) => {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const canAccess = (tab: Tab) =>
    tab.roleGates.every((roles) => !roles || user?.roles?.some((r) => roles.includes(r)));

  return (
    <nav
      aria-label="Điều hướng chính"
      className="md:hidden fixed inset-x-0 bottom-0 z-20 flex border-t bg-card px-2 pt-2 pb-[max(16px,env(safe-area-inset-bottom))]"
    >
      {TABS.filter(canAccess).map((tab) => {
        const active = tab.isActive(pathname);
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={cn(
              TAB_CLS,
              active ? 'text-primary-700 dark:text-primary' : 'text-[color:var(--text-faint)]',
            )}
          >
            <Icon className="h-[22px] w-[22px]" />
            <span className={cn(LABEL_CLS, active ? 'font-semibold' : 'font-medium')}>
              {tab.label}
            </span>
          </NavLink>
        );
      })}
      <button
        type="button"
        onClick={onOpenMenu}
        className={cn(TAB_CLS, 'text-[color:var(--text-faint)]')}
        aria-label="Mở menu"
      >
        <Grid2x2 className="h-[22px] w-[22px]" />
        <span className={cn(LABEL_CLS, 'font-medium')}>Thêm</span>
      </button>
    </nav>
  );
};

export default MobileTabBar;
