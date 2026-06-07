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

const EmployerDashboard = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const { jobs } = useSelector((state) => state.jobs);
  const { applications, loading } = useSelector((state) => state.applications);
  const { user } = useSelector((state) => state.auth);

  // Form states
  const [isPostOpen, setIsPostOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  const [activeApp, setActiveApp] = useState(null);
  const [commentText, setCommentText] = useState('');

  // Stats
  const [stats, setStats] = useState({ totalJobs: 0, totalApplications: 0, hires: 0 });
  const [funnel, setFunnel] = useState([]);

  // Job form State
  const [newJob, setNewJob] = useState({
    title: '', description: '', skillsRequired: '', experienceRequired: '',
    location: '', applicationDeadline: '', workMode: 'Onsite', employmentType: 'Full-Time', status: 'Published',
    salaryMin: '', salaryMax: '', numberOfOpenings: 1
  });
  
  const [editingJob, setEditingJob] = useState(null);

  // Schedule Interview State
  const [newInterview, setNewInterview] = useState({
    date: '', duration: 45, link: '', type: 'Technical Interview', roomType: 'EXTERNAL'
  });

  // Offer State
  const [newOffer, setNewOffer] = useState({
    salary: '', bonus: '', joiningDate: '', benefits: '', notes: ''
  });

  useEffect(() => {
    dispatch(fetchJobs({ publisher: user._id }));
    dispatch(fetchApplications());
    loadAnalytics();
  }, [dispatch]);

  const loadAnalytics = () => {
    api.get('/analytics')
      .then(res => {
        if (res.success && res.data.stats) {
          setStats(res.data.stats);
          setFunnel(res.data.funnel || []);
        }
      })
      
  };

  const handlePostJob = async (e) => {
    e.preventDefault();
    try {
      const skillsArray = typeof newJob.skillsRequired === 'string' ? newJob.skillsRequired.split(',').map(s => s.trim()) : newJob.skillsRequired;
      const payload = {
        ...newJob,
        skillsRequired: skillsArray,
        salaryRange: { min: Number(newJob.salaryMin) || 0, max: Number(newJob.salaryMax) || 0 },
        numberOfOpenings: Number(newJob.numberOfOpenings) || 1
      };
      delete payload.salaryMin;
      delete payload.salaryMax;

      await dispatch(createJob(payload)).unwrap();
      setIsPostOpen(false);
      setNewJob({
        title: '', description: '', skillsRequired: '', experienceRequired: '',
        location: '', applicationDeadline: '', workMode: 'Onsite', employmentType: 'Full-Time', status: 'Published',
        salaryMin: '', salaryMax: '', numberOfOpenings: 1
      });
      dispatch(fetchJobs({ publisher: user._id }));
      loadAnalytics();
      alert('Job posted for admin moderation successfully!');
    } catch (err) {
      alert(err || 'Failed to post job. Please ensure company profile is verified.');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const skillsArray = typeof editingJob.skillsRequired === 'string' ? editingJob.skillsRequired.split(',').map(s => s.trim()) : editingJob.skillsRequired;
      const payload = {
        ...editingJob,
        skillsRequired: skillsArray,
        salaryRange: { min: Number(editingJob.salaryMin) || 0, max: Number(editingJob.salaryMax) || 0 },
        numberOfOpenings: Number(editingJob.numberOfOpenings) || 1
      };
      delete payload.salaryMin;
      delete payload.salaryMax;

      await dispatch(updateJob({ jobId: editingJob._id, jobData: payload })).unwrap();
      setIsEditOpen(false);
      setEditingJob(null);
      dispatch(fetchJobs({ publisher: user._id }));
      alert('Job updated successfully!');
    } catch (err) {
      alert(err || 'Failed to update job.');
    }
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

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText) return;
    try {
      await dispatch(addComment({ appId: activeApp._id, comment: commentText })).unwrap();
      setCommentText('');
      setIsCommentsOpen(false);
      dispatch(fetchApplications());
      alert('Internal comment added successfully.');
    } catch (err) {
      alert(err);
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(scheduleInterview({
        applicationId: activeApp._id,
        ...newInterview
      })).unwrap();
      setIsScheduleOpen(false);
      setNewInterview({ date: '', duration: 45, link: '', type: 'Technical Interview', roomType: 'EXTERNAL' });
      dispatch(fetchApplications());
      alert('Interview scheduled successfully! Notification sent to Candidate.');
    } catch (err) {
      alert(err);
    }
  };

  const handleOfferSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(createOffer({
        applicationId: activeApp._id,
        salary: Number(newOffer.salary),
        bonus: Number(newOffer.bonus || 0),
        joiningDate: newOffer.joiningDate,
        benefits: newOffer.benefits.split(',').map(b => b.trim()),
        notes: newOffer.notes,
        status: 'Sent'
      })).unwrap();
      setIsOfferOpen(false);
      setNewOffer({ salary: '', bonus: '', joiningDate: '', benefits: '', notes: '' });
      dispatch(fetchApplications());
      alert('Job Offer created and dispatched to candidate successfully!');
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

      {/* Stats - Only on main dashboard */}
      {isDashboardView && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card title="Posted Jobs" subtitle="Active Listings" bodyClassName="flex items-center justify-between !py-4">
            <span className="text-3xl font-black text-slate-800">{stats.totalJobs}</span>
            <Briefcase className="text-brand-500" size={32} />
          </Card>
          <Card title="Applicants" subtitle="Total Received" bodyClassName="flex items-center justify-between !py-4">
            <span className="text-3xl font-black text-slate-800">{stats.totalApplications}</span>
            <Users className="text-indigo-500" size={32} />
          </Card>
          <Card title="Hired" subtitle="Successfully Onboarded" bodyClassName="flex items-center justify-between !py-4">
            <span className="text-3xl font-black text-slate-800">{stats.hires}</span>
            <CheckCircle className="text-emerald-500" size={32} />
          </Card>
        </div>
      )}

      {/* Main Content Grid */}
      <div className={`grid grid-cols-1 ${isDashboardView ? 'lg:grid-cols-3' : ''} gap-8`}>
        
        {/* Jobs list */}
        {(isDashboardView || isJobsView) && (
          <div className={`${isDashboardView ? 'lg:col-span-1' : ''} space-y-4`}>
            <Card title="Active Listings">
            {jobs.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium">No posted jobs.</p>
            ) : (
              <div className="space-y-3.5">
                {jobs.map((job) => (
                  <div key={job._id} className="p-4.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-800 leading-tight mb-1 truncate max-w-[140px]">{job.title}</h4>
                      <Badge type={job.status === 'Published' ? 'success' : 'neutral'}>{job.status}</Badge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => {
                        setEditingJob({
                          ...job,
                          skillsRequired: job.skillsRequired?.join(', ') || '',
                          salaryMin: job.salaryRange?.min || '',
                          salaryMax: job.salaryRange?.max || '',
                          numberOfOpenings: job.numberOfOpenings || 1
                        });
                        setIsEditOpen(true);
                      }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => handleDuplicate(job._id)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                        <Copy size={16} />
                      </button>
                      <button onClick={() => handleDelete(job._id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </Card>
          </div>
        )}

        {/* Applications */}
        {(isDashboardView || isApplicantsView) && (
          <div className={isDashboardView ? 'lg:col-span-2' : ''}>
            <Card title="Applications Pipelines Tracking">
            <Table
              columns={columns}
              data={applications}
              loading={loading}
              emptyMessage="No candidate has applied to your listings yet."
            />
            </Card>
          </div>
        )}
      </div>

      {/* Modal post job */}
      {isPostOpen && (
        <Modal isOpen={isPostOpen} onClose={() => setIsPostOpen(false)} title="Create New Job Listing" maxWidth="max-w-5xl">
          <form onSubmit={handlePostJob} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">1. Basic Details</h3>
                <Input label="Job Title" value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})} required />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Location" value={newJob.location} onChange={e => setNewJob({...newJob, location: e.target.value})} required />
                  <Input label="Application Deadline" type="date" value={newJob.applicationDeadline} onChange={e => setNewJob({...newJob, applicationDeadline: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Select label="Work Mode" options={[{value: 'Remote', label: 'Remote'}, {value: 'Hybrid', label: 'Hybrid'}, {value: 'Onsite', label: 'Onsite'}]} value={newJob.workMode} onChange={e => setNewJob({...newJob, workMode: e.target.value})} />
                  <Select label="Employment Type" options={[{value: 'Full-Time', label: 'Full-Time'}, {value: 'Part-Time', label: 'Part-Time'}, {value: 'Contract', label: 'Contract'}]} value={newJob.employmentType} onChange={e => setNewJob({...newJob, employmentType: e.target.value})} />
                </div>

                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mt-6">2. Requirements & Compensation</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Experience (Years)" type="number" value={newJob.experienceRequired} onChange={e => setNewJob({...newJob, experienceRequired: e.target.value})} required />
                  <Input label="Number of Vacancies" type="number" min="1" value={newJob.numberOfOpenings} onChange={e => setNewJob({...newJob, numberOfOpenings: e.target.value})} required />
                </div>
                <Input label="Required Skills (comma separated)" placeholder="React, Node, CSS" value={newJob.skillsRequired} onChange={e => setNewJob({...newJob, skillsRequired: e.target.value})} required />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Min Salary ($/yr)" type="number" value={newJob.salaryMin} onChange={e => setNewJob({...newJob, salaryMin: e.target.value})} />
                  <Input label="Max Salary ($/yr)" type="number" value={newJob.salaryMax} onChange={e => setNewJob({...newJob, salaryMax: e.target.value})} />
                </div>
              </div>

              {/* Right Column - Rich Text */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">3. Job Description</h3>
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden h-[400px]">
                  <ReactQuill 
                    theme="snow" 
                    value={newJob.description} 
                    onChange={(content) => setNewJob({...newJob, description: content})} 
                    className="h-full pb-10"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsPostOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Submit Listing</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal edit job */}
      {isEditOpen && editingJob && (
        <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Job Listing" maxWidth="max-w-5xl">
          <form onSubmit={handleEditSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">1. Basic Details</h3>
                <Input label="Job Title" value={editingJob.title} onChange={e => setEditingJob({...editingJob, title: e.target.value})} required />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Location" value={editingJob.location} onChange={e => setEditingJob({...editingJob, location: e.target.value})} required />
                  <Input label="Application Deadline" type="date" value={editingJob.applicationDeadline?.split('T')[0] || ''} onChange={e => setEditingJob({...editingJob, applicationDeadline: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Select label="Work Mode" options={[{value: 'Remote', label: 'Remote'}, {value: 'Hybrid', label: 'Hybrid'}, {value: 'Onsite', label: 'Onsite'}]} value={editingJob.workMode} onChange={e => setEditingJob({...editingJob, workMode: e.target.value})} />
                  <Select label="Employment Type" options={[{value: 'Full-Time', label: 'Full-Time'}, {value: 'Part-Time', label: 'Part-Time'}, {value: 'Contract', label: 'Contract'}]} value={editingJob.employmentType} onChange={e => setEditingJob({...editingJob, employmentType: e.target.value})} />
                </div>

                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mt-6">2. Requirements & Compensation</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Experience (Years)" type="number" value={editingJob.experienceRequired} onChange={e => setEditingJob({...editingJob, experienceRequired: e.target.value})} required />
                  <Input label="Number of Vacancies" type="number" min="1" value={editingJob.numberOfOpenings} onChange={e => setEditingJob({...editingJob, numberOfOpenings: e.target.value})} required />
                </div>
                <Input label="Required Skills (comma separated)" placeholder="React, Node, CSS" value={editingJob.skillsRequired} onChange={e => setEditingJob({...editingJob, skillsRequired: e.target.value})} required />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Min Salary ($/yr)" type="number" value={editingJob.salaryMin} onChange={e => setEditingJob({...editingJob, salaryMin: e.target.value})} />
                  <Input label="Max Salary ($/yr)" type="number" value={editingJob.salaryMax} onChange={e => setEditingJob({...editingJob, salaryMax: e.target.value})} />
                </div>
              </div>

              {/* Right Column - Rich Text */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-600 border-b border-slate-100 pb-2">3. Job Description</h3>
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden h-[400px]">
                  <ReactQuill 
                    theme="snow" 
                    value={editingJob.description} 
                    onChange={(content) => setEditingJob({...editingJob, description: content})} 
                    className="h-full pb-10"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Save Changes</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal schedule interview */}
      {isScheduleOpen && activeApp && (
        <Modal isOpen={isScheduleOpen} onClose={() => setIsScheduleOpen(false)} title={`Schedule Interview: ${activeApp.candidate?.name}`}>
          <form onSubmit={handleScheduleSubmit} className="space-y-4">
            <Input label="Interview Date & Time" type="datetime-local" value={newInterview.date} onChange={e => setNewInterview({...newInterview, date: e.target.value})} required />
            <Input label="Duration (minutes)" type="number" value={newInterview.duration} onChange={e => setNewInterview({...newInterview, duration: e.target.value})} required />
            
            <Select
              label="Interview Room Type"
              options={[
                { value: 'EXTERNAL', label: 'External Meeting Link (Zoom, Meet)' },
                { value: 'INTERNAL_ROOM', label: 'Built-in LiveKit Room' }
              ]}
              value={newInterview.roomType}
              onChange={e => {
                const isInternal = e.target.value === 'INTERNAL_ROOM';
                setNewInterview({...newInterview, roomType: e.target.value, link: isInternal ? '' : newInterview.link});
              }}
            />

            {newInterview.roomType === 'EXTERNAL' && (
              <Input label="Virtual Meeting Link" placeholder="https://zoom.us/yourmeetid" value={newInterview.link} onChange={e => setNewInterview({...newInterview, link: e.target.value})} required />
            )}
            
            <Select
              label="Interview Type Format"
              options={[
                { value: 'HR Interview', label: 'HR Screening Interview' },
                { value: 'Technical Interview', label: 'Technical Board Interview' },
                { value: 'Manager Interview', label: 'Hiring Manager Interview' },
                { value: 'Final Interview', label: 'Executive Final Interview' }
              ]}
              value={newInterview.type}
              onChange={e => setNewInterview({...newInterview, type: e.target.value})}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setIsScheduleOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Schedule & Alert</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal send offer */}
      {isOfferOpen && activeApp && (
        <Modal isOpen={isOfferOpen} onClose={() => setIsOfferOpen(false)} title={`Send Job Offer: ${activeApp.candidate?.name}`}>
          <form onSubmit={handleOfferSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Base Salary ($ / yr)" type="number" value={newOffer.salary} onChange={e => setNewOffer({...newOffer, salary: e.target.value})} required />
              <Input label="Yearly Performance Bonus ($)" type="number" value={newOffer.bonus} onChange={e => setNewOffer({...newOffer, bonus: e.target.value})} />
            </div>

            <Input label="Target Start Joining Date" type="date" value={newOffer.joiningDate} onChange={e => setNewOffer({...newOffer, joiningDate: e.target.value})} required />
            <Input label="Fringe Benefits (comma separated)" placeholder="Medical, Equity, Unlimited PTO" value={newOffer.benefits} onChange={e => setNewOffer({...newOffer, benefits: e.target.value})} />
            
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Internal Notes</label>
              <textarea rows={3} className="form-input" placeholder="Notes..." value={newOffer.notes} onChange={e => setNewOffer({...newOffer, notes: e.target.value})} />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setIsOfferOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Dispatch Proposal</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal add comment */}
      {isCommentsOpen && activeApp && (
        <Modal isOpen={isCommentsOpen} onClose={() => setIsCommentsOpen(false)} title={`Recruiter Log Comments: ${activeApp.candidate?.name}`}>
          <form onSubmit={handleAddComment} className="space-y-4">
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Write comments</label>
              <textarea rows={4} className="form-input" placeholder="Internal recruiter notes..." value={commentText} onChange={e => setCommentText(e.target.value)} required />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setIsCommentsOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Submit Comment</Button>
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

export default EmployerDashboard;
