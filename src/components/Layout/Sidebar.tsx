import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../types';
import { navItems, superadminItems, type NavItem } from '../../config/navItems';
import Logo from '../Logo';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getInitialOpen = () => {
    const open: Record<string, boolean> = {};
    navItems.forEach((item) => {
      if (item.children?.some((child) => location.pathname.startsWith(item.to + child.to))) {
        open[item.to] = true;
      }
    });
    return open;
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(getInitialOpen);

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

  const isAllowed = (item: NavItem) =>
    !item.allowedRoles || user?.roles?.some((r) => item.allowedRoles!.includes(r));

  const renderNavItem = (item: NavItem) => {
    if (item.hidden || !isAllowed(item)) return null;

    if (item.children) {
      const visibleChildren = item.children.filter((c) => !c.hidden && isAllowed(c));
      if (visibleChildren.length === 0) return null;
      const isOpen = openGroups[item.to];

      return (
        <div key={item.to}>
          <button
            onClick={() => toggleGroup(item.to)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-3">
              <span>{item.icon}</span>
              {item.label}
            </span>
            <span className={`text-xs transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
          </button>
          {isOpen && (
            <div className="mt-1 ml-4 space-y-1 border-l border-gray-700 pl-3">
              {visibleChildren.map((child) => {
                const fullPath = item.to + child.to;
                return (
                  <NavLink
                    key={fullPath}
                    to={fullPath}
                    end
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`
                    }
                  >
                    <span>{child.icon}</span>
                    {child.label}
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === '/'}
        onClick={handleNavClick}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            isActive
              ? 'bg-primary-600 text-white'
              : 'text-gray-300 hover:bg-gray-800 hover:text-white'
          }`
        }
      >
        <span>{item.icon}</span>
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
        className={`w-60 bg-gray-900 text-white flex flex-col h-screen fixed left-0 top-0 z-40 transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="px-6 py-5 border-b border-gray-700">
          <div className="flex items-center gap-2.5">
            <Logo size={32} />
            <div>
              <h1 className="text-lg font-bold leading-tight">Yume Studio</h1>
              <p className="text-xs text-gray-400">Quản lý chụp ảnh</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(renderNavItem)}

          {user?.roles?.some((r) =>
            superadminItems.some((item) => item.allowedRoles?.includes(r)),
          ) && (
            <>
              <div className="pt-3 pb-1 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Admin
              </div>
              {superadminItems.map(renderNavItem)}
            </>
          )}
        </nav>

        <div className="px-4 py-4 border-t border-gray-700">
          <div className="text-sm text-gray-300 mb-2">
            <span className="font-medium">{user?.username}</span>
            {user?.name && <span className="ml-1 text-xs text-gray-400">({user.name})</span>}
            <div className="mt-1 flex flex-wrap gap-1">
              {user?.roles?.map((r) => (
                <span key={r} className="text-xs bg-gray-700 px-1.5 py-0.5 rounded">
                  {ROLE_LABELS[r]}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left text-xs text-gray-400 hover:text-white transition-colors"
          >
            Đăng xuất →
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
