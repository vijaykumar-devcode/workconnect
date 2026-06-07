import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchJobs } from './jobSlice';
import { applyToJob } from '../applications/applicationSlice';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import Logo from '../../components/ui/Logo';
import { useTheme } from '../../context/ThemeContext';
import { MagnifyingGlassIcon, MapPinIcon, BriefcaseIcon, CurrencyDollarIcon, CalendarIcon } from '@heroicons/react/24/outline';

const Landing = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { jobs, loading } = useSelector((state) => state.jobs);
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { theme } = useTheme();

  const [searchTerm, setSearchTerm] = useState('');
  const [workMode, setWorkMode] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [applyError, setApplyError] = useState('');
  const [applySuccess, setApplySuccess] = useState('');

  useEffect(() => {
    dispatch(fetchJobs({ status: 'Published' }));
  }, [dispatch]);

  const handleSearch = (e) => {
    e.preventDefault();
    dispatch(fetchJobs({
      status: 'Published',
      search: searchTerm,
      workMode,
      employmentType
    }));
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!resumeFile) {
      setApplyError('Please upload a resume file.');
      return;
    }

    try {
      // 1. Upload File
      const formData = new FormData();
      formData.append('file', resumeFile);
      // Use canonical category expected by server
      formData.append('category', 'resume');

      const uploadRes = await api.post('/upload', formData);

      const fileUrl = uploadRes.data?.fileUrl;

      // 2. Submit Application
      await dispatch(applyToJob({
        jobId: selectedJob._id,
        applicationData: { resumeUrl: fileUrl, coverLetter }
      })).unwrap();

      setApplySuccess('Successfully applied!');
      setTimeout(() => {
        setIsApplyOpen(false);
        setSelectedJob(null);
        setApplySuccess('');
        setResumeFile(null);
        setCoverLetter('');
      }, 2500);
    } catch (err) {
      setApplyError(err?.message || err?.error || (typeof err === 'string' ? err : 'Failed to apply.'));
    }
  };

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text-primary flex flex-col font-sans transition-colors duration-200">
      {/* Navbar */}
      <header className="bg-theme-surface border-b border-theme-border px-6 lg:px-12 py-5 flex items-center justify-between shadow-sm sticky top-0 z-30 transition-colors duration-200">
        <div className="flex items-center gap-2">
          {/* Logo brand icon on mobile, full logo on large screens */}
          <Logo variant="icon-only" iconClassName="w-8 h-8 md:hidden" />
          <Logo variant="full" theme={theme} iconClassName="w-8 h-8 hidden md:block" />
        </div>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <Button
              variant="primary"
              onClick={() => {
                const route = user?.role === 'CANDIDATE' ? '/candidate' : `/${user?.role?.toLowerCase()}`;
                navigate(route);
              }}
            >
              Dashboard
            </Button>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="text-sm font-semibold text-theme-text-secondary hover:text-brand-blue transition-colors"
              >
                Sign In
              </button>
              <Button variant="primary" onClick={() => navigate('/signup')}>
                Register Free
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-brand-blue/5 via-theme-bg to-theme-bg py-16 lg:py-24 px-6 text-center max-w-5xl mx-auto w-full">
        <h1 className="text-4xl lg:text-6xl font-black tracking-tight leading-[1.1] mb-6">
          Connecting Skilled Professionals with <span className="gradient-text">Meaningful Opportunities</span>
        </h1>
        <p className="text-lg text-theme-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed font-semibold">
          Discover thousands of curated job listings, coordinate interviews, and build your career in our unified recruitment ecosystem.
        </p>

        {/* Search Bar */}
        <form
          onSubmit={handleSearch}
          className="bg-theme-surface p-3 rounded-2xl border border-theme-border shadow-xl max-w-4xl mx-auto flex flex-col md:flex-row gap-2.5 transition-colors"
        >
          <div className="flex-1 flex items-center gap-2.5 px-3 border-b md:border-b-0 md:border-r border-theme-border pb-2 md:pb-0">
            <MagnifyingGlassIcon className="w-5 h-5 text-theme-text-secondary" />
            <input
              type="text"
              placeholder="Search keyword (e.g. React, Manager)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full py-2 bg-transparent outline-none text-theme-text-primary placeholder:text-theme-text-secondary/70 text-sm"
            />
          </div>

          <div className="w-full md:w-48 px-3 border-b md:border-b-0 md:border-r border-theme-border pb-2 md:pb-0 flex items-center">
            <Select
              placeholder="Work Mode"
              options={[
                { value: 'Remote', label: 'Remote' },
                { value: 'Hybrid', label: 'Hybrid' },
                { value: 'Onsite', label: 'Onsite' }
              ]}
              value={workMode}
              onChange={(e) => setWorkMode(e.target.value)}
              className="!border-none !bg-transparent !p-0 !ring-0 focus:ring-0 w-full"
            />
          </div>

          <div className="w-full md:w-48 px-3 flex items-center">
            <Select
              placeholder="Employment"
              options={[
                { value: 'Full-Time', label: 'Full-Time' },
                { value: 'Part-Time', label: 'Part-Time' },
                { value: 'Contract', label: 'Contract' }
              ]}
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className="!border-none !bg-transparent !p-0 !ring-0 focus:ring-0 w-full"
            />
          </div>

          <Button type="submit" variant="primary" className="!py-3 px-6">
            Find Jobs
          </Button>
        </form>
      </section>

      {/* Main Jobs Listing */}
      <section className="flex-1 px-6 lg:px-12 py-10 max-w-7xl w-full mx-auto">
        <h2 className="text-2xl font-extrabold text-theme-text-primary tracking-tight mb-8">
          Curated Job Openings
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 bg-theme-surface border border-theme-border rounded-2xl" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20 text-theme-text-secondary bg-theme-surface rounded-2xl border border-theme-border p-8 shadow-sm">
            No published jobs match your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <Card
                key={job._id}
                className="hover:translate-y-[-4px] transition-all duration-300 cursor-pointer flex flex-col justify-between"
                bodyClassName="flex flex-col justify-between h-full"
              >
                <div onClick={() => setSelectedJob(job)}>
                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-theme-bg border border-theme-border flex items-center justify-center font-bold text-theme-text-secondary overflow-hidden shadow-sm">
                      {job.company?.logo ? (
                        <img src={job.company?.logo?.startsWith('http') ? job.company.logo : `${import.meta.env.VITE_API_URL || ''}${job.company.logo}`} alt="logo" className="w-full h-full object-contain p-1" />
                      ) : (
                        job.company?.name?.charAt(0) || 'C'
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-theme-text-secondary uppercase tracking-wide">
                        {job.company?.name}
                      </h4>
                      <h3 className="text-base font-bold text-theme-text-primary tracking-tight leading-snug truncate max-w-[200px]">
                        {job.title}
                      </h3>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-5">
                    <Badge type="info">{job.workMode}</Badge>
                    <Badge type="neutral">{job.employmentType}</Badge>
                    <Badge type="success">{job.experienceRequired}+ Yrs Exp</Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-theme-border mt-2">
                  <div className="flex items-center text-theme-text-secondary text-xs font-semibold gap-1">
                    <MapPinIcon className="w-4 h-4" />
                    {job.location}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!isAuthenticated) {
                        navigate('/login');
                        return;
                      }
                      if (user?.role !== 'CANDIDATE') {
                        alert('Only Candidates can apply!');
                        return;
                      }
                      setSelectedJob(job);
                      setIsApplyOpen(true);
                    }}
                  >
                    Apply Now
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Detail Modal */}
      {selectedJob && !isApplyOpen && (
        <Modal
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          title="Job Details"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-6">
            <div className="flex items-center gap-4.5">
              <div className="w-16 h-16 rounded-2xl bg-theme-bg border border-theme-border flex items-center justify-center font-extrabold text-theme-text-secondary text-xl shadow-md">
                {selectedJob.company?.logo ? (
                  <img src={selectedJob.company?.logo?.startsWith('http') ? selectedJob.company.logo : `${import.meta.env.VITE_API_URL || ''}${selectedJob.company.logo}`} alt="logo" className="w-full h-full object-contain p-1" />
                ) : (
                  selectedJob.company?.name?.charAt(0) || 'C'
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-theme-text-primary leading-tight">
                  {selectedJob.title}
                </h2>
                <p className="text-sm font-semibold text-theme-text-secondary">
                  {selectedJob.company?.name} — {selectedJob.location}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4.5 bg-theme-bg border border-theme-border rounded-2xl">
              <div>
                <span className="text-[10px] uppercase font-bold text-theme-text-secondary tracking-wider">Work Mode</span>
                <p className="text-sm font-bold text-theme-text-primary">{selectedJob.workMode}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-theme-text-secondary tracking-wider">Employment</span>
                <p className="text-sm font-bold text-theme-text-primary">{selectedJob.employmentType}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-theme-text-secondary tracking-wider">Experience</span>
                <p className="text-sm font-bold text-theme-text-primary">{selectedJob.experienceRequired}+ Years</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-theme-text-secondary tracking-wider">Openings</span>
                <p className="text-sm font-bold text-theme-text-primary">{selectedJob.numberOfOpenings} Seat(s)</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-theme-text-primary uppercase tracking-wider mb-2">Description</h3>
              <div
                className="text-sm text-theme-text-secondary leading-relaxed [&>h1]:text-xl [&>h1]:font-bold [&>h1]:mb-3 [&>h2]:text-lg [&>h2]:font-bold [&>h2]:mb-2 [&>h3]:text-base [&>h3]:font-bold [&>h3]:mb-2 [&>p]:mb-4 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4 [&>ul>li]:mb-1 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-4"
                dangerouslySetInnerHTML={{ __html: selectedJob.description }}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-theme-border">
              <Button variant="outline" onClick={() => setSelectedJob(null)}>Close</Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (!isAuthenticated) {
                    navigate('/login');
                    return;
                  }
                  if (user?.role !== 'CANDIDATE') {
                    alert('Only Candidates can apply!');
                    return;
                  }
                  setIsApplyOpen(true);
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Apply Modal */}
      {isApplyOpen && selectedJob && (
        <Modal
          isOpen={isApplyOpen}
          onClose={() => {
            setIsApplyOpen(false);
            setApplyError('');
          }}
          title={`Apply for ${selectedJob.title}`}
        >
          <form onSubmit={handleApplySubmit} className="space-y-5">
            {applySuccess && (
              <div className="p-4.5 bg-theme-success/15 border border-theme-success/20 text-theme-success text-sm font-semibold rounded-2xl">
                {applySuccess}
              </div>
            )}
            {applyError && (
              <div className="p-4.5 bg-theme-error/15 border border-theme-error/20 text-theme-error text-sm font-semibold rounded-2xl">
                {applyError}
              </div>
            )}

            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-bold text-theme-text-secondary uppercase tracking-wider">
                Resume File
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setResumeFile(e.target.files[0])}
                className="form-input !py-2.5"
                required
              />
            </div>

            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-bold text-theme-text-secondary uppercase tracking-wider">
                Cover Letter (Optional)
              </label>
              <textarea
                rows={4}
                className="form-input"
                placeholder="Write a brief cover letter..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-theme-border">
              <Button
                variant="outline"
                onClick={() => {
                  setIsApplyOpen(false);
                  setApplyError('');
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Submit Application
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 pt-16 pb-8 px-6 lg:px-12 mt-auto">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 mb-16">
            <div className="lg:col-span-2">
              <Logo variant="full" theme="dark" iconClassName="w-10 h-10 mb-2" textClassName="text-2xl font-black" />
              <p className="text-slate-400 text-sm font-medium mt-6 max-w-sm leading-relaxed">
                The unified recruitment ecosystem connecting elite talent with the world's most innovative companies. Built for modern hiring.
              </p>
              <div className="flex gap-4 mt-8">
                {/* Social Icons */}
                <a href="#!" className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-brand-blue hover:border-brand-blue hover:bg-brand-blue/10 transition-all">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>
                </a>
                <a href="#!" className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-brand-blue hover:border-brand-blue hover:bg-brand-blue/10 transition-all">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                </a>
                <a href="#!" className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-brand-blue hover:border-brand-blue hover:bg-brand-blue/10 transition-all">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 tracking-wide">Candidates</h4>
              <ul className="space-y-4">
                <li><a href="#!" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Browse Jobs</a></li>
                <li><a href="#!" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Career Advice</a></li>
                <li><a href="#!" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Resume Builder</a></li>
                <li><a href="#!" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Salary Insights</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 tracking-wide">Employers</h4>
              <ul className="space-y-4">
                <li><a href="#!" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Post a Job</a></li>
                <li><a href="#!" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Search Resumes</a></li>
                <li><a href="#!" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">ATS Integration</a></li>
                <li><a href="#!" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Pricing Plans</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 tracking-wide">Company</h4>
              <ul className="space-y-4">
                <li><a href="#!" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">About Us</a></li>
                <li><a href="#!" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Contact Support</a></li>
                <li><a href="#!" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Privacy Policy</a></li>
                <li><a href="#!" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-xs font-semibold">&copy; {new Date().getFullYear()} WorkConnect. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#!" className="text-slate-500 hover:text-slate-300 text-xs font-semibold transition-colors">Privacy</a>
              <a href="#!" className="text-slate-500 hover:text-slate-300 text-xs font-semibold transition-colors">Terms</a>
              <a href="#!" className="text-slate-500 hover:text-slate-300 text-xs font-semibold transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
