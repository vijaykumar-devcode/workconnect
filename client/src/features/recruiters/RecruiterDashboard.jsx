import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchJobs } from '../jobs/jobSlice';
import { fetchApplications, updateApplicationStage, updateAssessment, addComment } from '../applications/applicationSlice';
import { scheduleInterview } from '../interviews/interviewSlice';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import OnboardingReviewModal from '../applications/OnboardingReviewModal';
import { Briefcase, Users, Star, ClipboardCheck, Calendar, Search, SlidersHorizontal, MessageSquare, FileText } from 'lucide-react';

const RecruiterDashboard = () => {
  const dispatch = useDispatch();
  const { jobs } = useSelector((state) => state.jobs);
  const { applications, loading } = useSelector((state) => state.applications);
  const { user } = useSelector((state) => state.auth);

  // States
  const [activeApp, setActiveApp] = useState(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isGradeOpen, setIsGradeOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  const [commentText, setCommentText] = useState('');
  const [gradeScore, setGradeScore] = useState('');
  const [interviewLink, setInterviewLink] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewFormat, setInterviewFormat] = useState('Technical Interview');
  const [roomType, setRoomType] = useState('EXTERNAL');

  const [stats, setStats] = useState({ totalAssignedJobs: 0, activeInterviews: 0, candidatesScreened: 0, hiresMade: 0 });

  useEffect(() => {
    dispatch(fetchJobs({ assignedRecruiter: user._id }));
    dispatch(fetchApplications());
    loadAnalytics();
  }, [dispatch]);

  const loadAnalytics = () => {
    api.get('/analytics')
      .then(res => {
        if (res.success && res.data.stats) {
          setStats(res.data.stats);
        }
      })
      
  };

  const handleStageChange = async (appId, nextStage) => {
    try {
      await dispatch(updateApplicationStage({ appId, stage: nextStage })).unwrap();
      dispatch(fetchApplications());
      loadAnalytics();
      alert(`Candidate moved to ${nextStage}`);
    } catch (err) {
      alert(err);
    }
  };

  const handleGradeSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(updateAssessment({
        appId: activeApp._id,
        score: Number(gradeScore),
        status: 'Completed'
      })).unwrap();
      setIsGradeOpen(false);
      setGradeScore('');
      dispatch(fetchApplications());
      alert('Assessment score registered successfully on applicant profile!');
    } catch (err) {
      alert(err);
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(scheduleInterview({
        applicationId: activeApp._id,
        date: interviewDate,
        duration: 60,
        link: roomType === 'EXTERNAL' ? interviewLink : '',
        type: interviewFormat,
        roomType
      })).unwrap();
      setIsScheduleOpen(false);
      setInterviewLink('');
      setInterviewDate('');
      setRoomType('EXTERNAL');
      dispatch(fetchApplications());
      alert('Interview scheduled and applicant informed via WorkConnect alerts!');
    } catch (err) {
      alert(err);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText) return;
    try {
      await dispatch(addComment({ appId: activeApp._id, comment: commentText })).unwrap();
      setCommentText('');
      setIsCommentsOpen(false);
      dispatch(fetchApplications());
      alert('Comment added successfully.');
    } catch (err) {
      alert(err);
    }
  };

  const columns = [
    {
      title: 'Applicant Name',
      key: 'name',
      render: (row) => <span className="font-bold text-slate-800">{row.candidate?.name}</span>,
    },
    {
      title: 'Assigned Role',
      key: 'role',
      render: (row) => <span className="font-semibold text-slate-500">{row.job?.title}</span>,
    },
    {
      title: 'ATS Stage',
      key: 'stage',
      render: (row) => <Badge type="info">{row.currentStage}</Badge>,
    },
    {
      title: 'Score',
      key: 'score',
      render: (row) => (
        <span>
          {row.assessmentScore !== null ? (
            <Badge type="success">{row.assessmentScore}%</Badge>
          ) : (
            <Badge type="neutral">No Score</Badge>
          )}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Select
            placeholder="Change Stage"
            options={[
              { value: 'Screening', label: 'Screening' },
              { value: 'Shortlisted', label: 'Shortlist' },
              { value: 'Assessment', label: 'Assign Assessment' },
              { value: 'Selected', label: 'Select' },
              { value: 'Rejected', label: 'Reject' }
            ]}
            onChange={(e) => handleStageChange(row._id, e.target.value)}
            className="!w-32 !py-1 text-xs"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setActiveApp(row);
              setIsScheduleOpen(true);
            }}
          >
            Schedule
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setActiveApp(row);
              setIsGradeOpen(true);
            }}
          >
            Grade Score
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setActiveApp(row);
              setIsCommentsOpen(true);
            }}
          >
            <MessageSquare size={14} />
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
              <FileText size={14} className="mr-1" /> Docs
            </Button>
          )}
          <a href={row.resumeUrl?.startsWith('http') ? row.resumeUrl : `${import.meta.env.VITE_API_URL || ''}${row.resumeUrl}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-brand-500 hover:underline px-2">
            Resume
          </a>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none mb-2">
          Recruiter Control Deck
        </h1>
        <p className="text-sm font-semibold text-slate-400">
          Source applications, audit resumes, score candidate tests, and dispatch calendars
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <Card title="Assigned Jobs" subtitle="Active Listings" bodyClassName="flex items-center justify-between !py-4">
          <span className="text-3xl font-black text-slate-800">{stats.totalAssignedJobs}</span>
          <Briefcase className="text-brand-500" size={32} />
        </Card>
        <Card title="Interviews" subtitle="Live Panels Pending" bodyClassName="flex items-center justify-between !py-4">
          <span className="text-3xl font-black text-slate-800">{stats.activeInterviews}</span>
          <Calendar className="text-indigo-500" size={32} />
        </Card>
        <Card title="Screened" subtitle="Candidates Checked" bodyClassName="flex items-center justify-between !py-4">
          <span className="text-3xl font-black text-slate-800">{stats.candidatesScreened}</span>
          <Users className="text-emerald-500" size={32} />
        </Card>
        <Card title="Hires" subtitle="Successful Fill Rate" bodyClassName="flex items-center justify-between !py-4">
          <span className="text-3xl font-black text-slate-800">{stats.hiresMade}</span>
          <ClipboardCheck className="text-amber-500" size={32} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Assigned Jobs */}
        <div className="lg:col-span-1">
          <Card title="Assigned Job Openings">
            {jobs.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium">No jobs assigned yet.</p>
            ) : (
              <div className="space-y-3.5">
                {jobs.map((job) => (
                  <div key={job._id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                    <h4 className="text-sm font-extrabold text-slate-800 leading-tight mb-1">{job.title}</h4>
                    <p className="text-xs font-semibold text-slate-400">{job.company?.name || 'Acme Tech'}</p>
                    <div className="mt-2">
                      <Badge type="info">{job.workMode}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Candidate Pipelines */}
        <div className="lg:col-span-2">
          <Card title="Candidates Sourcing Pipelines">
            <Table
              columns={columns}
              data={applications}
              loading={loading}
              emptyMessage="No applications received for your assigned vacancies."
            />
          </Card>
        </div>
      </div>

      {/* Modal Schedule */}
      {isScheduleOpen && activeApp && (
        <Modal isOpen={isScheduleOpen} onClose={() => setIsScheduleOpen(false)} title={`Schedule Interview: ${activeApp.candidate?.name}`}>
          <form onSubmit={handleScheduleSubmit} className="space-y-4">
            <Input label="Interview Date & Time" type="datetime-local" value={interviewDate} onChange={e => setInterviewDate(e.target.value)} required />
            
            <Select
              label="Interview Room Type"
              options={[
                { value: 'EXTERNAL', label: 'External Meeting Link (Zoom, Meet)' },
                { value: 'INTERNAL_ROOM', label: 'Built-in LiveKit Room' }
              ]}
              value={roomType}
              onChange={e => setRoomType(e.target.value)}
            />

            {roomType === 'EXTERNAL' && (
              <Input label="Virtual Meeting Room Link" placeholder="https://zoom.us/yourmeetid" value={interviewLink} onChange={e => setInterviewLink(e.target.value)} required />
            )}
            
            <Select
              label="Interview Form"
              options={[
                { value: 'Technical Interview', label: 'Technical Assessment' },
                { value: 'HR Interview', label: 'HR Screening Panel' },
                { value: 'Manager Interview', label: 'Final Manager Review' }
              ]}
              value={interviewFormat}
              onChange={e => setInterviewFormat(e.target.value)}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setIsScheduleOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Submit Calendar</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Grade Assessment */}
      {isGradeOpen && activeApp && (
        <Modal isOpen={isGradeOpen} onClose={() => setIsGradeOpen(false)} title={`Grade Skills Test: ${activeApp.candidate?.name}`}>
          <form onSubmit={handleGradeSubmit} className="space-y-4">
            <Input label="Skills Test Score (%)" type="number" placeholder="e.g. 85" value={gradeScore} onChange={e => setGradeScore(e.target.value)} required />
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setIsGradeOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Register Grade</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal comments */}
      {isCommentsOpen && activeApp && (
        <Modal isOpen={isCommentsOpen} onClose={() => setIsCommentsOpen(false)} title={`Recruiter Comments: ${activeApp.candidate?.name}`}>
          <form onSubmit={handleCommentSubmit} className="space-y-4">
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Internal Feedback Note</label>
              <textarea rows={4} className="form-input" placeholder="Provide notes..." value={commentText} onChange={e => setCommentText(e.target.value)} required />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setIsCommentsOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Submit note</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal onboarding docs */}
      <OnboardingReviewModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        application={activeApp}
      />
    </div>
  );
};

export default RecruiterDashboard;
