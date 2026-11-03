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

const ACTIVE_CLS = 'bg-foil text-book font-semibold';
const IDLE_CLS = 'text-book-foreground/85 hover:bg-book-line hover:text-book-foreground';
const FOCUS_CLS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foil focus-visible:ring-offset-2 focus-visible:ring-offset-book';

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
              'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[14px] font-medium transition-colors',
              FOCUS_CLS,
              groupActive ? 'text-book-foreground font-semibold hover:bg-book-line' : IDLE_CLS,
            )}
          >
            {ParentIcon && <ParentIcon className="w-4 h-4" />}
            <span className="flex-1 text-left">{item.label}</span>
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 text-book-muted transition-transform',
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
                        'flex items-center gap-2.5 py-[7px] pl-[34px] pr-2.5 rounded-md text-[14px] font-medium transition-colors',
                        FOCUS_CLS,
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
            'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[14px] font-medium transition-colors',
            FOCUS_CLS,
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
          'bg-book text-book-foreground',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-1.5">
          <div className="rounded-md overflow-hidden flex-shrink-0">
            <Logo size={34} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-[17px] font-bold leading-tight text-foil">
              Yume Studio
            </p>
            <p className="text-xs text-book-muted">Studio chụp kỷ yếu</p>
          </div>
          <div className="relative" ref={themeMenuRef}>
            <button
              onClick={() => setThemeMenuOpen((prev) => !prev)}
              title="Chế độ giao diện"
              aria-label="Chế độ giao diện"
              className={cn(
                'w-8 h-8 rounded-md flex items-center justify-center bg-book-line text-book-foreground/85 hover:text-book-foreground transition-colors',
                FOCUS_CLS,
              )}
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

        <nav aria-label="Điều hướng" className="flex-1 overflow-y-auto space-y-0.5 -mx-1 px-1">
          <p className="px-2.5 pb-1.5 text-xs font-semibold text-book-muted">Công việc</p>
          {navItems.map(renderNavItem)}

          {showAdmin && (
            <>
              <p className="mx-2.5 mt-4 border-t border-book-line px-0 pt-4 pb-1.5 text-xs font-semibold text-book-muted">
                Quản trị
              </p>
              {adminItems.map(renderNavItem)}
            </>
          )}
        </nav>

        {/* User block */}
        <div className="flex items-center gap-2.5 border-t border-book-line px-1 pt-3.5">
          <NavLink
            to="/profile"
            onClick={onClose}
            className={cn('flex items-center gap-2.5 min-w-0 flex-1 group rounded-md', FOCUS_CLS)}
            title="Hồ sơ cá nhân"
          >
            <div className="w-[34px] h-[34px] rounded-md flex items-center justify-center font-display font-bold text-[15px] flex-shrink-0 bg-foil text-book">
              {(user?.name || user?.username || '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold truncate text-book-foreground group-hover:text-foil">
                {user?.name || user?.username}
              </p>
              <p className="text-xs truncate text-book-muted">
                {user?.roles?.map((r) => ROLE_LABELS[r]).join(', ')}
              </p>
            </div>
          </NavLink>
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            aria-label="Đăng xuất"
            className={cn(
              'p-2 rounded-md text-book-muted hover:text-book-foreground hover:bg-book-line transition-colors',
              FOCUS_CLS,
            )}
          >
            <LogOut className="w-[15px] h-[15px]" />
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
