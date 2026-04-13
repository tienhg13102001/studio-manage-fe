import type { ComponentType } from 'react';
import type { UserRole } from '../types';
import DashboardPage from '../pages/DashboardPage';
import CustomersPage from '../pages/CustomersPage';
import CustomerDetailPage from '../pages/CustomerDetailPage';
import SchedulesPage from '../pages/SchedulesPage';
import FinancePage from '../pages/FinancePage';
import CategoriesPage from '../pages/CategoriesPage';
import UsersPage from '../pages/UsersPage';
import CustomerSizePage from '../pages/CustomerSizePage';
import PackagesPage from '../pages/PackagesPage';

export interface NavItem {
  to: string;
  label: string;
  icon: string;
  allowedRoles?: UserRole[];
  component?: ComponentType;
  index?: boolean;
  hidden?: boolean;
  children?: NavItem[];
}

export const navItems: NavItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    icon: '📊',
    allowedRoles: [0, 1, 2, 3, 4],
    component: DashboardPage,
    index: true,
  },
  {
    to: '/customers',
    label: 'Khách hàng',
    icon: '🏫',
    allowedRoles: [0, 1, 2, 4],
    children: [
      {
        to: '',
        label: 'Danh sách lớp học',
        icon: '📋',
        allowedRoles: [0, 1, 2, 4],
        component: CustomersPage,
      },
      {
        to: '/size',
        label: 'Thông tin học sinh',
        icon: '📏',
        allowedRoles: [0, 1, 2, 4],
        component: CustomerSizePage,
      },
      {
        to: '/:id',
        label: 'Chi tiết khách hàng',
        icon: '',
        allowedRoles: [0, 1, 2, 4],
        component: CustomerDetailPage,
        hidden: true,
      },
    ],
  },
  { to: '/schedules', label: 'Lịch chụp', icon: '📅', component: SchedulesPage },
  {
    to: '/packages',
    label: 'Gói chụp',
    icon: '📦',
    allowedRoles: [0, 1, 2, 4],
    component: PackagesPage,
  },
  {
    to: '/finance',
    label: 'Thu chi',
    icon: '💰',
    allowedRoles: [0, 1, 2, 4],
    component: FinancePage,
  },
  {
    to: '/settings/categories',
    label: 'Danh mục',
    icon: '🏷️',
    allowedRoles: [0, 1, 2, 4],
    component: CategoriesPage,
  },
];

export const superadminItems: NavItem[] = [
  {
    to: '/settings/users',
    label: 'Người dùng',
    icon: '👥',
    allowedRoles: [0],
    component: UsersPage,
  },
];
