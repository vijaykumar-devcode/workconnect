import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchJobs, createJob, updateJob, deleteJob, duplicateJob, assignRecruiter } from '../jobs/jobSlice';
import { fetchApplications, updateApplicationStage, addComment } from '../applications/applicationSlice';
import { scheduleInterview } from '../interviews/interviewSlice';
import { createOffer } from '../offers/offerSlice';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import OnboardingReviewModal from '../applications/OnboardingReviewModal';
import { Briefcase, Users, CheckCircle, Plus, Copy, Trash2, Calendar, ClipboardSignature, MessageCircle, Edit3, FileText } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import EmployerStatsCards from './components/EmployerStatsCards';
import EmployerJobsPanel from './components/EmployerJobsPanel';
import EmployerApplicationsPanel from './components/EmployerApplicationsPanel';
import { PostJobModal, EditJobModal, ScheduleInterviewModal, SendOfferModal, AddCommentModal } from './components/EmployerModals';

const EmployerDashboard = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const { jobs } = useSelector((state) => state.jobs);
  const { applications, loading } = useSelector((state) => state.applications);
  const { user } = useSelector((state) => state.auth);

  const [isPostOpen, setIsPostOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  const [activeApp, setActiveApp] = useState(null);
  const [editingJob, setEditingJob] = useState(null);

  // Stats
  const [stats, setStats] = useState({ totalJobs: 0, totalApplications: 0, hires: 0 });
  const [funnel, setFunnel] = useState([]);
  const [scheduleSuccess, setScheduleSuccess] = useState('');
  const [scheduleError, setScheduleError] = useState('');

  useEffect(() => {
    dispatch(fetchJobs({ publisher: user._id }));
    dispatch(fetchApplications());
    loadAnalytics();
  }, [dispatch, user._id]);

  const loadAnalytics = () => {
    api.get('/analytics')
      .then(res => {
        if (res.success && res.data.stats) {
          setStats(res.data.stats);
          setFunnel(res.data.funnel || []);
        }
      })
  };

  const handleDuplicate = async (jobId) => {
    try {
      await dispatch(duplicateJob(jobId)).unwrap();
      dispatch(fetchJobs({ publisher: user._id }));
      loadAnalytics();
      alert('Job duplicated successfully!');
    } catch (err) {
      alert(err);
    }
  };

  const handleDelete = async (jobId) => {
    if (!window.confirm('Delete this job posting?')) return;
    try {
      await dispatch(deleteJob(jobId)).unwrap();
      alert('Job deleted.');
      loadAnalytics();
    } catch (err) {
      alert(err);
    }
  };

  const handleStageChange = async (appId, nextStage) => {
    try {
      await dispatch(updateApplicationStage({ appId, stage: nextStage })).unwrap();
      dispatch(fetchApplications());
      loadAnalytics();
      alert(`Candidate transitioned to: ${nextStage}`);
    } catch (err) {
      alert(err);
    }
  };

  const columns = [
    {
      title: 'Candidate Name',
      key: 'name',
      render: (row) => <span className="font-bold text-slate-800">{row.candidate?.name}</span>,
    },
    {
      title: 'Applied Role',
      key: 'role',
      render: (row) => <span className="font-semibold text-slate-500">{row.job?.title}</span>,
    },
    {
      title: 'Current Stage',
      key: 'stage',
      render: (row) => <Badge type="info">{row.currentStage}</Badge>,
    },
    {
      title: 'Actions Menu',
      key: 'actions',
      render: (row) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Select
            placeholder="Change Stage"
            options={[
              { value: 'Screening', label: 'Screening' },
              { value: 'Shortlisted', label: 'Shortlist' },
              { value: 'Assessment', label: 'Assign Assessment' },
              { value: 'Selected', label: 'Select Candidate' },
              { value: 'Hired', label: 'Hire Candidate' },
              { value: 'Rejected', label: 'Reject Candidate' }
            ]}
            onChange={(e) => handleStageChange(row._id, e.target.value)}
            className="!w-36 !py-1 text-xs"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setActiveApp(row);
              setIsScheduleOpen(true);
            }}
          >
            <Calendar size={14} className="mr-1" /> Schedule
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setActiveApp(row);
              setIsOfferOpen(true);
            }}
          >
            <ClipboardSignature size={14} className="mr-1" /> Send Offer
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setActiveApp(row);
              setIsCommentsOpen(true);
            }}
          >
            <MessageCircle size={14} />
          </Button>
          {(row.currentStage === 'Onboarding' || row.currentStage === 'Pending Onboarding') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveApp(row);
                setIsOnboardingOpen(true);
              }}
              className="text-brand-600 border-brand-200 hover:bg-brand-50"
            >
              <FileText size={14} className="mr-1" /> Onboarding Docs
            </Button>
          )}
          <a href={row.resumeUrl?.startsWith('http') ? row.resumeUrl : `${import.meta.env.VITE_API_URL || ''}${row.resumeUrl}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-brand-500 hover:underline px-2">
            Resume
          </a>
        </div>
      ),
    },
  ];

  const isJobsView = location.pathname.endsWith('/jobs');
  const isApplicantsView = location.pathname.endsWith('/applicants');
  const isDashboardView = !isJobsView && !isApplicantsView;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-600 tracking-tight leading-none mb-2">
            {isJobsView ? 'Jobs Manager' : isApplicantsView ? 'Applicants Tracking' : 'Employer Dashboard'}
          </h1>
          <p className="text-sm font-semibold text-slate-400">
            {isJobsView ? 'Publish and manage job vacancies' : isApplicantsView ? 'Review and progress candidate applications' : 'Publish job vacancies, schedule live panels, and coordinate offers'}
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsPostOpen(true)}>
          <Plus size={18} className="mr-1.5" /> Post Job Vacancy
        </Button>
      </div>

      {/* Immediate scheduling success / error banner */}
      {scheduleSuccess && (
        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-semibold animate-fade-in">
          <svg className="w-5 h-5 shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {scheduleSuccess}
        </div>
      )}
      {scheduleError && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-semibold animate-fade-in">
          <svg className="w-5 h-5 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {scheduleError}
        </div>
      )}

      {/* Stats - Only on main dashboard */}
      {isDashboardView && <EmployerStatsCards stats={stats} />}

      {/* Main Content Grid */}
      <div className={`grid grid-cols-1 ${isDashboardView ? 'lg:grid-cols-3' : ''} gap-8`}>

        {(isDashboardView || isJobsView) && (
          <EmployerJobsPanel
            jobs={jobs}
            onEdit={(job) => {
              setEditingJob({
                ...job,
                skillsRequired: job.skillsRequired?.join(', ') || '',
                salaryMin: job.salaryRange?.min || '',
                salaryMax: job.salaryRange?.max || '',
                numberOfOpenings: job.numberOfOpenings || 1,
              });
              setIsEditOpen(true);
            }}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            isDashboardView={isDashboardView}
          />
        )}

        {(isDashboardView || isApplicantsView) && (
          <EmployerApplicationsPanel
            applications={applications}
            loading={loading}
            columns={columns}
            isDashboardView={isDashboardView}
          />
        )}
      </div>

      {/* Modal post job */}
      <PostJobModal
        isOpen={isPostOpen}
        onClose={() => setIsPostOpen(false)}
        publisherId={user._id}
        onSuccess={loadAnalytics}
      />

      {/* Modal edit job */}
      <EditJobModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditingJob(null);
        }}
        job={editingJob}
        publisherId={user._id}
      />

      {/* Modal schedule interview */}
      <ScheduleInterviewModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        activeApp={activeApp}
        onScheduleSuccess={(msg) => {
          setScheduleSuccess(msg);
          setTimeout(() => setScheduleSuccess(''), 5000);
        }}
        onScheduleError={setScheduleError}
      />

      {/* Modal send offer */}
      <SendOfferModal
        isOpen={isOfferOpen}
        onClose={() => setIsOfferOpen(false)}
        activeApp={activeApp}
      />

      {/* Modal add comment */}
      <AddCommentModal
        isOpen={isCommentsOpen}
        onClose={() => setIsCommentsOpen(false)}
        activeApp={activeApp}
      />

      {/* Modal onboarding docs */}
      <OnboardingReviewModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        application={activeApp}
      />
    </div>
  );
};

export default EmployerDashboard;
