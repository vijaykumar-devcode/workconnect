import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import jobReducer from '../features/jobs/jobSlice';
import companyReducer from '../features/companies/companySlice';
import applicationReducer from '../features/applications/applicationSlice';
import interviewReducer from '../features/interviews/interviewSlice';
import offerReducer from '../features/offers/offerSlice';
import auditReducer from '../features/admin/auditSlice';
import notificationReducer from '../features/notifications/notificationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    jobs: jobReducer,
    companies: companyReducer,
    applications: applicationReducer,
    interviews: interviewReducer,
    offers: offerReducer,
    audit: auditReducer,
    notifications: notificationReducer,
  },
});
