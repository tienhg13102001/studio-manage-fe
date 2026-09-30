import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, Monitor, Moon, Sun } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme, type ThemeMode } from '../../context/ThemeContext';
import { ROLE_LABELS } from '../../types';
import { navItems, adminItems, type NavItem } from '../../config/navItems';
import { Logo } from '../atoms';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const ACTIVE_CLS =
  'bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-[#1a0f02] font-semibold shadow-[0_4px_14px_rgba(245,158,11,0.33)]';
const IDLE_CLS =
  'text-[#5b6275] hover:bg-[#f1f2f6] hover:text-[#141826] dark:text-[#9aa3b8] dark:hover:bg-white/[0.06] dark:hover:text-white';

const themeOptions: Array<{ mode: ThemeMode; label: string; Icon: typeof Sun }> = [
  { mode: 'light', label: 'Sáng', Icon: Sun },
  { mode: 'dark', label: 'Tối', Icon: Moon },
  { mode: 'system', label: 'Hệ thống', Icon: Monitor },
];

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { user, logout } = useAuth();
  const { themeMode, resolvedTheme, setThemeMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  const getInitialOpen = () => {
    const open: Record<string, boolean> = {};
    [...navItems, ...adminItems].forEach((item) => {
      if (item.children?.some((child) => location.pathname.startsWith(item.to + child.to)))
        open[item.to] = true;
    });
    return open;
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(getInitialOpen);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleGroup = (to: string) => {
    setOpenGroups((prev) => ({ ...prev, [to]: !prev[to] }));
  };

  const ThemeIcon = themeMode === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun;

  const isAllowed = (item: NavItem) =>
    !item.allowedRoles || user?.roles?.some((r) => item.allowedRoles!.includes(r));

  const renderNavItem = (item: NavItem) => {
    if (item.hidden || !isAllowed(item)) return null;

    if (item.children) {
      const visibleChildren = item.children.filter((c) => !c.hidden && isAllowed(c));
      if (visibleChildren.length === 0) return null;
      const groupOpen = openGroups[item.to];
      const groupActive = location.pathname.startsWith(item.to);
      const ParentIcon = item.icon;

      return (
        <div key={item.to}>
          <button
            onClick={() => toggleGroup(item.to)}
            className={cn(
              'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] text-[13.5px] font-medium transition-colors',
              groupActive ? 'text-[#141826] dark:text-white' : IDLE_CLS,
            )}
          >
            {ParentIcon && <ParentIcon className="w-4 h-4" />}
            <span className="flex-1 text-left">{item.label}</span>
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 text-[#9aa1b3] dark:text-[#5e6680] transition-transform',
                !groupOpen && '-rotate-90',
              )}
            />
          </button>
          {groupOpen && (
            <div className="mt-0.5 space-y-0.5">
              {visibleChildren.map((child) => {
                const fullPath = item.to + child.to;
                const ChildIcon = child.icon;
                return (
                  <NavLink
                    key={fullPath}
                    to={fullPath}
                    end
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 py-[7px] pl-[34px] pr-2.5 rounded-[9px] text-[13.5px] font-medium transition-colors',
                        isActive ? ACTIVE_CLS : IDLE_CLS,
                      )
                    }
                  >
                    {ChildIcon && <ChildIcon className="w-[15px] h-[15px]" />}
                    {child.label}
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    const ItemIcon = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === '/'}
        onClick={onClose}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] text-[13.5px] font-medium transition-colors',
            isActive ? ACTIVE_CLS : IDLE_CLS,
          )
        }
      >
        {ItemIcon && <ItemIcon className="w-4 h-4" />}
        {item.label}
      </NavLink>
    );
  };

  const showAdmin = user?.roles?.some((r) =>
    adminItems.some((item) => item.allowedRoles?.includes(r)),
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'w-64 flex flex-col h-[100dvh] fixed left-0 top-0 z-40 px-3.5 py-5 gap-[18px] transition-transform duration-300',
          'bg-white border-r border-[#e8eaf0] dark:bg-transparent dark:bg-gradient-to-b dark:from-[#11112a] dark:to-[#0a0a14] dark:border-white/[0.04]',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-1.5">
          <div className="rounded-[10px] overflow-hidden flex-shrink-0">
            <Logo size={34} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-base font-bold leading-tight text-[#141826] dark:text-white">
              Yume Studio
            </h1>
            <p className="text-[11px] text-[#8a91a5] dark:text-[#5e6680]">Quản lý chụp ảnh</p>
          </div>
          <div className="relative" ref={themeMenuRef}>
            <button
              onClick={() => setThemeMenuOpen((prev) => !prev)}
              title="Chế độ giao diện"
              className="w-[30px] h-[30px] rounded-lg flex items-center justify-center bg-[#f1f2f6] text-[#5b6275] hover:text-[#141826] dark:bg-white/[0.06] dark:text-[#9aa3b8] dark:hover:text-white transition-colors"
            >
              <ThemeIcon className="w-[15px] h-[15px]" />
            </button>
            {themeMenuOpen && (
              <div className="absolute right-0 top-9 z-50 rounded-xl p-1 min-w-[8.5rem] border bg-popover text-popover-foreground shadow-lg">
                {themeOptions.map(({ mode, label, Icon }) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setThemeMode(mode);
                      setThemeMenuOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      mode === themeMode ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto space-y-0.5 -mx-1 px-1">
          <p className="px-2.5 pb-1.5 text-[10.5px] font-bold tracking-[0.12em] text-[#9aa1b3] dark:text-[#5e6680]">
            TỔNG QUAN
          </p>
          {navItems.map(renderNavItem)}

          {showAdmin && (
            <>
              <p className="px-2.5 pt-5 pb-1.5 text-[10.5px] font-bold tracking-[0.12em] text-[#9aa1b3] dark:text-[#5e6680]">
                ADMIN
              </p>
              {adminItems.map(renderNavItem)}
            </>
          )}
        </nav>

        {/* User block */}
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#f7f8fa] border border-[#e8eaf0] dark:bg-white/[0.03] dark:border-[#1e2034]">
          <NavLink
            to="/profile"
            onClick={onClose}
            className="flex items-center gap-2.5 min-w-0 flex-1 group"
            title="Hồ sơ cá nhân"
          >
            <div className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center font-bold text-sm flex-shrink-0 text-white bg-gradient-to-br from-[#f59e0b] to-[#06b6d4]">
              {(user?.name || user?.username || '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold truncate text-[#141826] group-hover:text-primary-700 dark:text-white dark:group-hover:text-primary-200">
                {user?.name || user?.username}
              </p>
              <p className="text-[11px] truncate text-primary-700 dark:text-primary">
                {user?.roles?.map((r) => ROLE_LABELS[r]).join(', ')}
              </p>
            </div>
          </NavLink>
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            aria-label="Đăng xuất"
            className="p-1.5 rounded-lg text-[#8a91a5] hover:text-primary-700 hover:bg-[#f1f2f6] dark:text-[#5e6680] dark:hover:text-primary dark:hover:bg-white/[0.06] transition-colors"
          >
            <LogOut className="w-[15px] h-[15px]" />
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
