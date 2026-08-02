import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Landing from '../features/jobs/Landing';
import Login from '../features/auth/Login';
import Signup from '../features/auth/Signup';
import VerifyOTP from '../features/auth/VerifyOTP';
import ForgotPassword from '../features/auth/ForgotPassword';
import ResetPassword from '../features/auth/ResetPassword';
import CandidateDashboard from '../features/candidates/CandidateDashboard';
import CandidateProfile from '../features/candidates/CandidateProfile';
import PublicCandidateProfile from '../features/candidates/PublicCandidateProfile';
import CandidateInterviews from '../features/candidates/CandidateInterviews';
import CandidateOffers from '../features/candidates/CandidateOffers';
import CandidateSupport from '../features/candidates/CandidateSupport';
import EmployerDashboard from '../features/companies/EmployerDashboard';
import EmployerCompany from '../features/companies/EmployerCompany';
import EmployerTeam from '../features/companies/EmployerTeam';
import EmployerInterviews from '../features/companies/EmployerInterviews';
import EmployerOffers from '../features/companies/EmployerOffers';
import RecruiterDashboard from '../features/recruiters/RecruiterDashboard';
import AdminDashboard from '../features/analytics/AdminDashboard';
import AdminUsers from '../features/admin/AdminUsers';
import AdminCompanies from '../features/admin/AdminCompanies';
import AdminJobs from '../features/admin/AdminJobs';
import AdminAudit from '../features/admin/AdminAudit';
import InterviewRoomPage from '../features/interviews/InterviewRoomPage';
import SidebarLayout from '../components/layouts/SidebarLayout';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return <SidebarLayout>{children}</SidebarLayout>;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verify-otp" element={<VerifyOTP />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Candidate Portal */}
      <Route
        path="/candidate"
        element={
          <ProtectedRoute allowedRoles={['CANDIDATE']}>
            <CandidateDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidate/profile"
        element={
          <ProtectedRoute allowedRoles={['CANDIDATE']}>
            <CandidateProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidate/search"
        element={
          <ProtectedRoute allowedRoles={['CANDIDATE']}>
            <Landing hideNav={true} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidate/interviews"
        element={
          <ProtectedRoute allowedRoles={['CANDIDATE']}>
            <CandidateInterviews />
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidate/offers"
        element={
          <ProtectedRoute allowedRoles={['CANDIDATE']}>
            <CandidateOffers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidate/support"
        element={
          <ProtectedRoute allowedRoles={['CANDIDATE']}>
            <CandidateSupport />
          </ProtectedRoute>
        }
      />
      <Route path="/candidate/:id" element={<PublicCandidateProfile />} />

      {/* Shared Interview Room */}
      <Route
        path="/interview/:id/room"
        element={
          <ProtectedRoute allowedRoles={['CANDIDATE', 'EMPLOYER', 'RECRUITER']}>
            <InterviewRoomPage />
          </ProtectedRoute>
        }
      />

      {/* Employer Portal */}
      <Route
        path="/employer"
        element={
          <ProtectedRoute allowedRoles={['EMPLOYER']}>
            <EmployerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employer/jobs"
        element={
          <ProtectedRoute allowedRoles={['EMPLOYER']}>
            <EmployerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employer/team"
        element={
          <ProtectedRoute allowedRoles={['EMPLOYER']}>
            <EmployerTeam />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employer/applicants"
        element={
          <ProtectedRoute allowedRoles={['EMPLOYER']}>
            <EmployerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employer/company"
        element={
          <ProtectedRoute allowedRoles={['EMPLOYER']}>
            <EmployerCompany />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employer/interviews"
        element={
          <ProtectedRoute allowedRoles={['EMPLOYER']}>
            <EmployerInterviews />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employer/offers"
        element={
          <ProtectedRoute allowedRoles={['EMPLOYER']}>
            <EmployerOffers />
          </ProtectedRoute>
        }
      />

      {/* Recruiter Portal */}
      <Route
        path="/recruiter"
        element={
          <ProtectedRoute allowedRoles={['RECRUITER']}>
            <RecruiterDashboard />
          </ProtectedRoute>
        }
      />

      {/* Admin Portal */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/companies"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminCompanies />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/jobs"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminJobs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audit"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminAudit />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
