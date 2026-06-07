import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../features/auth/authSlice';
import { useTheme } from '../../context/ThemeContext';
import Logo from '../ui/Logo';
import {
  Squares2X2Icon,
  BriefcaseIcon,
  UsersIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
  CalendarIcon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline';
import NotificationDropdown from '../ui/NotificationDropdown';

const SidebarLayout = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useSelector((state) => state.auth);
  const { theme, toggleTheme } = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const role = user?.role || 'CANDIDATE';

  // Navigation Items per role using Heroicons
  const menuItems = {
    ADMIN: [
      { label: 'Overview', path: '/admin', icon: Squares2X2Icon },
      { label: 'Employer Approval', path: '/admin/companies', icon: BuildingOfficeIcon },
      { label: 'Jobs Moderation', path: '/admin/jobs', icon: BriefcaseIcon },
      { label: 'User Control', path: '/admin/users', icon: UsersIcon },
      { label: 'Audit Logs', path: '/admin/audit', icon: DocumentTextIcon },
    ],
    EMPLOYER: [
      { label: 'Dashboard', path: '/employer', icon: Squares2X2Icon },
      { label: 'My Company', path: '/employer/company', icon: BuildingOfficeIcon },
      { label: 'Jobs Manager', path: '/employer/jobs', icon: BriefcaseIcon },
      { label: 'Recruitment Team', path: '/employer/team', icon: UsersIcon },
      { label: 'Applicants', path: '/employer/applicants', icon: AcademicCapIcon },
      { label: 'Interviews Scheduler', path: '/employer/interviews', icon: CalendarIcon },
      { label: 'Offers Tracker', path: '/employer/offers', icon: DocumentTextIcon },
    ],
    RECRUITER: [
      { label: 'Recruiter Dashboard', path: '/recruiter', icon: Squares2X2Icon },
      { label: 'Assigned Jobs', path: '/recruiter/jobs', icon: BriefcaseIcon },
      { label: 'ATS Candidates Pipeline', path: '/recruiter/applicants', icon: AcademicCapIcon },
      { label: 'Interviews Panel', path: '/recruiter/interviews', icon: CalendarIcon },
      { label: 'Offer Coordination', path: '/recruiter/offers', icon: DocumentTextIcon },
    ],
    CANDIDATE: [
      { label: 'Job Search Board', path: '/candidate/search', icon: BriefcaseIcon },
      { label: 'Applications Tracker', path: '/candidate', icon: Squares2X2Icon },
      { label: 'My Profile Setups', path: '/candidate/profile', icon: UserCircleIcon },
      { label: 'Interview Schedules', path: '/candidate/interviews', icon: CalendarIcon },
      { label: 'Offer Letters', path: '/candidate/offers', icon: DocumentTextIcon },
      { label: 'Help Desk Support', path: '/candidate/support', icon: QuestionMarkCircleIcon },
    ],
  };

  const currentMenu = menuItems[role] || menuItems.CANDIDATE;

  return (
    <div className="min-h-screen flex bg-theme-bg text-theme-text-primary transition-colors duration-200">
      {/* Mobile Header Toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-theme-surface border-b border-theme-border px-6 py-4 flex items-center justify-between z-30 shadow-sm transition-colors duration-200">
        <Link to="/" className="cursor-pointer hover:opacity-90 transition-opacity">
          <Logo variant="full" theme={theme} iconClassName="w-7 h-7" textClassName="text-lg" />
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-theme-bg border border-theme-border text-theme-text-secondary hover:text-theme-text-primary transition-colors"
          >
            {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded-lg hover:bg-theme-bg text-theme-text-secondary focus:outline-none"
          >
            {isOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 bg-theme-surface border-r border-theme-border w-64 p-5 flex flex-col z-40 transform lg:transform-none transition-all duration-300 lg:static ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Logo */}
        <div className="pb-4 border-b border-theme-border mb-4 pt-3 lg:pt-0">
          <Link to="/" className="cursor-pointer hover:opacity-90 transition-opacity block">
            <Logo variant="full" theme={theme} iconClassName="w-8 h-8" textClassName="text-xl" />
          </Link>
        </div>

        {/* User Card */}
        <div className="mb-5 bg-theme-bg/60 p-4 rounded-xl border border-theme-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center font-bold text-base border border-brand-blue/20">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-bold text-theme-text-primary truncate">{user?.name}</h4>
            <span className="text-[10px] uppercase font-extrabold text-brand-blue tracking-wider">
              {role}
            </span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
          {currentMenu.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.label}
                onClick={() => {
                  navigate(item.path);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3.5 px-4.5 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/15'
                    : 'hover:bg-theme-bg hover:text-theme-text-primary text-theme-text-secondary'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="pt-4 border-t border-theme-border mt-6 space-y-2">
          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3.5 px-4.5 py-3 rounded-xl text-sm font-semibold text-theme-text-secondary hover:bg-theme-bg hover:text-theme-text-primary transition-all duration-200"
          >
            {theme === 'dark' ? (
              <>
                <SunIcon className="w-5 h-5" />
                Light mode
              </>
            ) : (
              <>
                <MoonIcon className="w-5 h-5" />
                Dark mode
              </>
            )}
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 px-4.5 py-3 rounded-xl text-sm font-semibold text-theme-error hover:bg-theme-error/10 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            Logout Session
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col pt-16 lg:pt-0 overflow-y-auto max-h-screen">
        <header className="hidden lg:flex items-center justify-between px-8 py-5 bg-theme-surface border-b border-theme-border shadow-sm/5 z-20 transition-colors duration-200">
          <span className="text-lg font-semibold text-theme-text-secondary">
            Welcome back, <span className="font-bold text-theme-text-primary">{user?.name}</span>
          </span>

          <div className="flex items-center gap-4">
            <NotificationDropdown />
            
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-theme-bg border border-theme-border text-theme-text-secondary hover:text-theme-text-primary transition-colors"
            >
              {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        <div className="p-6 lg:p-8 flex-1 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
};

export default SidebarLayout;
