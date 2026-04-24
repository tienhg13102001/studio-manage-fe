import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/LoginPage';
import { navItems, adminItems, type NavItem } from './config/navItems';
import type { UserRole } from './types';
import StudentFormPage from './pages/StudentFormPage';
import FeedbackFormPage from './pages/FeedbackFormPage';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function wrapProtected(element: JSX.Element, allowedRoles?: UserRole[]) {
  return allowedRoles ? (
    <ProtectedRoute allowedRoles={allowedRoles}>{element}</ProtectedRoute>
  ) : (
    element
  );
}

function renderRouteItem(item: NavItem) {
  if (item.children) {
    return (
      <Route
        key={item.to}
        path={item.to.slice(1)}
        element={wrapProtected(<Outlet />, item.allowedRoles)}
      >
        {item.children.map((child) => {
          if (!child.component) return null;
          const Element = child.component;
          const element = wrapProtected(<Element />, child.allowedRoles);
          const childPath = child.to.startsWith('/') ? child.to.slice(1) : child.to;
          return childPath === '' ? (
            <Route key="index" index element={element} />
          ) : (
            <Route key={child.to} path={childPath} element={element} />
          );
        })}
      </Route>
    );
  }

  if (!item.component) return null;
  const Element = item.component;
  const element = wrapProtected(<Element />, item.allowedRoles);

  return item.index ? (
    <Route key={item.to} index element={element} />
  ) : (
    <Route key={item.to} path={item.to.slice(1)} element={element} />
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/form/:customer" element={<StudentFormPage />} />
            <Route path="/feedback" element={<FeedbackFormPage />} />
            <Route path="/feedback/:customer" element={<FeedbackFormPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {[...navItems, ...adminItems].map(renderRouteItem)}
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
