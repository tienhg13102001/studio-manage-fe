import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--page-bg)' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 min-w-0 md:ml-64 flex flex-col">
        <Topbar onOpenMenu={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 py-5 md:px-8 md:pt-7 md:pb-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
