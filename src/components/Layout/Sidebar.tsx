import { useEffect, useRef, useState } from 'react';
import { FaChevronRight } from 'react-icons/fa';
import { HiSun, HiMoon, HiDesktopComputer } from 'react-icons/hi';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme, type ThemeMode } from '../../context/ThemeContext';
import { ROLE_LABELS } from '../../types';
import { navItems, adminItems, type NavItem } from '../../config/navItems';
import { Logo } from '../atoms';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

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
      if (item.children?.some((child) => location.pathname.startsWith(item.to + child.to))) {
        open[item.to] = true;
      }
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

  const handleNavClick = () => {
    onClose();
  };

  const toggleGroup = (to: string) => {
    setOpenGroups((prev) => ({ ...prev, [to]: !prev[to] }));
  };

  const themeOptions: Array<{ mode: ThemeMode; label: string; icon: JSX.Element }> = [
    { mode: 'light', label: 'Sáng', icon: <HiSun className="w-3.5 h-3.5" /> },
    { mode: 'dark', label: 'Tối', icon: <HiMoon className="w-3.5 h-3.5" /> },
    { mode: 'system', label: 'Hệ thống', icon: <HiDesktopComputer className="w-3.5 h-3.5" /> },
  ];

  const currentThemeIcon =
    themeMode === 'system' ? (
      <HiDesktopComputer className="w-4 h-4" />
    ) : resolvedTheme === 'dark' ? (
      <HiMoon className="w-4 h-4" />
    ) : (
      <HiSun className="w-4 h-4" />
    );

  const isAllowed = (item: NavItem) =>
    !item.allowedRoles || user?.roles?.some((r) => item.allowedRoles!.includes(r));

  const renderNavItem = (item: NavItem) => {
    if (item.hidden || !isAllowed(item)) return null;

    if (item.children) {
      const visibleChildren = item.children.filter((c) => !c.hidden && isAllowed(c));
      if (visibleChildren.length === 0) return null;
      const isOpen = openGroups[item.to];

      const ParentIcon = item.icon;
      return (
        <div key={item.to}>
          <button
            onClick={() => toggleGroup(item.to)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
            style={{color:'var(--nav-text)'}}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--nav-hover-text)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--nav-text)'; }}
          >
            <span className="flex items-center gap-3">
              {ParentIcon && <ParentIcon className="w-4 h-4" />}
              {item.label}
            </span>
            <FaChevronRight
              className={`text-xs transition-transform ${isOpen ? 'rotate-90' : ''}`}
            />
          </button>
          {isOpen && (
            <div className="mt-1 ml-4 space-y-1 border-l pl-3" style={{borderColor:'var(--nav-child-border)'}}>
              {visibleChildren.map((child) => {
                const fullPath = item.to + child.to;
                const ChildIcon = child.icon;
                return (
                  <NavLink
                    key={fullPath}
                    to={fullPath}
                    end
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                        isActive ? 'text-white' : ''
                      }`
                    }
                    style={({ isActive }) =>
                      isActive
                        ? {background:'linear-gradient(135deg,#f59e0b,#b45309)', boxShadow:'0 0 12px rgba(245,158,11,0.42)', color:'#fff'}
                        : {color:'var(--nav-text)'}
                    }
                  >
                    {ChildIcon && <ChildIcon className="w-4 h-4" />}
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
        onClick={handleNavClick}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
            isActive ? 'text-white' : ''
          }`
        }
        style={({ isActive }) =>
          isActive
            ? {background:'linear-gradient(135deg,#f59e0b,#b45309)', boxShadow:'0 0 12px rgba(245,158,11,0.42)', color:'#fff'}
            : {color:'var(--nav-text)'}
        }
      >
        {ItemIcon && <ItemIcon className="w-4 h-4" />}
        {item.label}
      </NavLink>
    );
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`w-60 flex flex-col h-[100dvh] fixed left-0 top-0 z-40 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--sidebar-border)',
          boxShadow: 'var(--sidebar-shadow)',
        }}
      >
        {/* Logo area */}
        <div className="px-5 py-4" style={{borderBottom:'1px solid var(--sidebar-header-border)'}}>
          <div className="flex items-center gap-3">
            <div className="rounded-xl overflow-hidden flex-shrink-0">
              <Logo size={32} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold leading-tight text-gradient">Yume Studio</h1>
              <p className="text-xs mt-0.5" style={{color:'var(--text-faint)'}}>Quản lý chụp ảnh</p>
            </div>
            <div className="relative" ref={themeMenuRef}>
              <button
                onClick={() => setThemeMenuOpen((prev) => !prev)}
                title="Chế độ giao diện"
                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
                style={{
                  background: resolvedTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(245,158,11,0.12)',
                  color: resolvedTheme === 'dark' ? '#cbd5e1' : '#d97706',
                  border: `1px solid ${resolvedTheme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(245,158,11,0.2)'}`,
                }}
              >
                {currentThemeIcon}
              </button>

              {themeMenuOpen && (
                <div
                  className="absolute right-0 top-10 z-50 rounded-xl p-1 min-w-[8.5rem]"
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    boxShadow: 'var(--card-shadow)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  {themeOptions.map((option) => {
                    const active = option.mode === themeMode;
                    return (
                      <button
                        key={option.mode}
                        onClick={() => {
                          setThemeMode(option.mode);
                          setThemeMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        style={
                          active
                            ? {
                                background: 'linear-gradient(135deg, #f59e0b, #b45309)',
                                color: '#ffffff',
                              }
                            : {
                                background: 'transparent',
                                color: 'var(--text-primary)',
                              }
                        }
                      >
                        {option.icon}
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(renderNavItem)}

          {user?.roles?.some((r) => adminItems.some((item) => item.allowedRoles?.includes(r))) && (
            <>
              <div className="pt-4 pb-1 px-3 text-xs font-bold uppercase tracking-widest" style={{color:'var(--nav-section-label)'}}>
                Admin
              </div>
              {adminItems.map(renderNavItem)}
            </>
          )}
        </nav>

        <div className="px-4 py-4" style={{borderTop:'1px solid var(--user-border)'}}>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 text-white"
              style={{background:'linear-gradient(135deg,#f59e0b,#06b6d4)', boxShadow:'0 0 12px rgba(245,158,11,0.42)'}}
            >
              {(user?.name || user?.username || '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{color:'var(--user-name-color)'}}>{user?.name || user?.username}</p>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {user?.roles?.map((r) => (
                  <span key={r} className="text-xs px-1.5 py-0.5 rounded-md" style={{background:'var(--user-role-bg)',color:'var(--user-role-text)'}}>
                    {ROLE_LABELS[r]}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left text-xs transition-colors"
            style={{color:'var(--user-logout-color)'}}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#d97706'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--user-logout-color)'; }}
          >
            Đăng xuất →
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
