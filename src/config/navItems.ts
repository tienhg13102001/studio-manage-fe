import type { ComponentType } from 'react';
import type { IconType } from 'react-icons';
import {
  FaBoxOpen,
  FaCalendarAlt,
  FaCashRegister,
  FaClipboardList,
  FaCogs,
  FaLayerGroup,
  FaRulerCombined,
  FaTachometerAlt,
  FaTags,
  FaTshirt,
  FaUniversity,
  FaUsers,
  FaWrench,
} from 'react-icons/fa';
import { MdFeedback } from 'react-icons/md';
import type { UserRole } from '../types';
import DashboardPage from '../pages/DashboardPage';
import CustomersPage from '../pages/CustomersPage';
import CustomerDetailPage from '../pages/CustomerDetailPage';
import SchedulesPage from '../pages/SchedulesPage';
import FinancePage from '../pages/FinancePage';
import CategoriesPage from '../pages/CategoriesPage';
import CostumesPage from '../pages/CostumesPage';
import CostumeTypesPage from '../pages/CostumeTypesPage';
import UsersPage from '../pages/UsersPage';
import CustomerSizePage from '../pages/CustomerSizePage';
import PackagesPage from '../pages/PackagesPage';
import FeedbackPage from '../pages/FeedbackPage';

export interface NavItem {
  to: string;
  label: string;
  icon?: IconType;
  iconClassName?: string;
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
    icon: FaTachometerAlt,
    iconClassName: 'text-blue-400',
    allowedRoles: [0, 1, 2, 3, 4],
    component: DashboardPage,
    index: true,
  },
  {
    to: '/customers',
    label: 'Khách hàng',
    icon: FaUniversity,
    iconClassName: 'text-cyan-300',
    allowedRoles: [0, 1, 2, 4],
    children: [
      {
        to: '',
        label: 'Danh sách lớp học',
        icon: FaClipboardList,
        iconClassName: 'text-slate-300',
        allowedRoles: [0, 1, 2, 4],
        component: CustomersPage,
      },
      {
        to: '/size',
        label: 'Thông tin học sinh',
        icon: FaRulerCombined,
        iconClassName: 'text-emerald-300',
        allowedRoles: [0, 1, 2, 4],
        component: CustomerSizePage,
      },
      {
        to: '/:id',
        label: 'Chi tiết khách hàng',
        allowedRoles: [0, 1, 2, 4],
        component: CustomerDetailPage,
        hidden: true,
      },
    ],
  },
  {
    to: '/schedules',
    label: 'Lịch chụp',
    icon: FaCalendarAlt,
    iconClassName: 'text-indigo-300',
    component: SchedulesPage,
  },
];

export const adminItems: NavItem[] = [
  {
    to: '/manage',
    label: 'Quản lý',
    icon: FaWrench,
    iconClassName: 'text-amber-300',
    allowedRoles: [0, 1, 5],
    children: [
      {
        to: '/finance',
        label: 'Tài chính',
        icon: FaCashRegister,
        iconClassName: 'text-green-300',
        allowedRoles: [0, 1, 5],
        component: FinancePage,
      },
      {
        to: '/users',
        label: 'Người dùng',
        icon: FaUsers,
        iconClassName: 'text-blue-300',
        allowedRoles: [0, 1],
        component: UsersPage,
      },
      {
        to: '/feedback',
        label: 'Phản hồi',
        icon: MdFeedback,
        iconClassName: 'text-pink-300',
        allowedRoles: [0, 1],
        component: FeedbackPage,
      },
    ],
  },
  {
    to: '/settings',
    label: 'Cài đặt',
    icon: FaCogs,
    iconClassName: 'text-slate-300',
    allowedRoles: [0, 1],
    children: [
      {
        to: '/categories',
        label: 'Danh mục thu/chi',
        icon: FaTags,
        iconClassName: 'text-violet-300',
        allowedRoles: [0, 1],
        component: CategoriesPage,
      },
      {
        to: '/costumes',
        label: 'Trang phục',
        icon: FaTshirt,
        iconClassName: 'text-fuchsia-300',
        allowedRoles: [0, 1],
        component: CostumesPage,
      },
      {
        to: '/costume-types',
        label: 'Loại trang phục',
        icon: FaLayerGroup,
        iconClassName: 'text-violet-200',
        allowedRoles: [0, 1],
        component: CostumeTypesPage,
      },
      {
        to: '/packages',
        label: 'Gói chụp',
        icon: FaBoxOpen,
        iconClassName: 'text-orange-300',
        allowedRoles: [0, 1, 2, 4],
        component: PackagesPage,
      },
    ],
  },
];
