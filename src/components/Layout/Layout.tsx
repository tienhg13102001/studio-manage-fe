import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] overflow-hidden" style={{ background: 'var(--page-bg)' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 min-w-0 min-h-0 md:ml-64 flex flex-col">
        <Topbar onOpenMenu={() => setSidebarOpen(true)} />
        {/* main tự cuộn; trang danh sách dùng DataTable `fill` để chỉ cuộn trong bảng */}
        <main className="flex-1 min-h-0 overflow-y-auto flex flex-col px-4 py-5 md:px-8 md:pt-7 md:pb-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
