import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchApplications, uploadOnboardingDoc } from '../applications/applicationSlice';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import { Briefcase, Calendar, FileText, Sparkles, Award } from 'lucide-react';
const steps = ['Applied', 'Interviewing', 'Offer Sent', 'Offer Accepted', 'Hired', 'Onboarded'];

const CandidateDashboard = () => {
  const dispatch = useDispatch();
  const { applications, loading: appsLoading } = useSelector((state) => state.applications);
  const { user } = useSelector((state) => state.auth);

  const [selectedApp, setSelectedApp] = useState(null);
  const [docType, setDocType] = useState('Identity Proof');
  const [docFile, setDocFile] = useState(null);
  const [docSuccess, setDocSuccess] = useState('');
  const [stats, setStats] = useState({ totalApplications: 0, activeInterviews: 0, offersReceived: 0, successRate: 0 });

  useEffect(() => {
    dispatch(fetchApplications());

    // Load stats dynamically
    api.get('/analytics')
      .then(res => {
        if (res.success && res.data.stats) {
          setStats(res.data.stats);
        }
      })
      .catch(err => console.log('Analytics err', err));
  }, [dispatch]);

  const handleDocUpload = async (e) => {
    e.preventDefault();
    if (!docFile) return;

    try {
      // Upload the document first
      const formData = new FormData();
      formData.append('file', docFile);
      // Onboarding documents are stored under 'other' category on server
      formData.append('category', 'other');

      const uploadRes = await api.post('/upload', formData);
      const fileUrl = uploadRes.data?.fileUrl;

      // Register doc in ATS
      await dispatch(uploadOnboardingDoc({
        appId: selectedApp._id,
        docType,
        fileUrl
      })).unwrap();

      setDocSuccess('Document successfully uploaded for verification!');
      setDocFile(null);
      setTimeout(() => {
        setDocSuccess('');
      }, 2500);

      // Re-fetch details
      const updated = await api.get(`/applications/${selectedApp._id}`);
      if (updated.success) {
        setSelectedApp(updated.data.application);
      }
    } catch (err) {
      alert('Upload failed');
    }
  };

  const columns = [
    {
      title: 'Company',
      key: 'company',
      render: (row) => <span className="font-bold text-slate-800">{row.job?.company?.name || 'N/A'}</span>,
    },
    {
      title: 'Role Title',
      key: 'title',
      render: (row) => <span className="font-medium text-slate-600">{row.job?.title}</span>,
    },
    {
      title: 'Location',
      key: 'location',
      render: (row) => <span>{row.job?.location}</span>,
    },
    {
      title: 'Current Stage',
      key: 'stage',
      render: (row) => {
        const types = {
          Applied: 'info',
          Rejected: 'danger',
          Hired: 'success',
          Onboarded: 'success',
          'Offer Sent': 'warning',
          'Offer Accepted': 'success'
        };
        return <Badge type={types[row.currentStage] || 'info'}>{row.currentStage}</Badge>;
      },
    },
    {
      title: 'Applied On',
      key: 'date',
      render: (row) => <span>{new Date(row.createdAt).toLocaleDateString()}</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            api.get(`/applications/${row._id}`).then(res => {
              if (res.success) {
                setSelectedApp(res.data.application);
              }
            });
          }}
        >
          Track Application
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-600 tracking-tight leading-none mb-2">
          Your Candidate Dashboard
        </h1>
        <p className="text-sm font-semibold text-slate-400">
          Track job proposals, schedule calendar details, and finalize onboarding documents
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Applications" subtitle="Total Submitted" bodyClassName="flex items-center justify-between !py-4">
          <span className="text-3xl font-black text-slate-800">{stats.totalApplications}</span>
          <Briefcase className="text-brand-500" size={32} />
        </Card>
        <Card title="Interviews" subtitle="Active Schedules" bodyClassName="flex items-center justify-between !py-4">
          <span className="text-3xl font-black text-slate-800">{stats.activeInterviews}</span>
          <Calendar className="text-indigo-500" size={32} />
        </Card>
        <Card title="Offer Letters" subtitle="Total Received" bodyClassName="flex items-center justify-between !py-4">
          <span className="text-3xl font-black text-slate-800">{stats.offersReceived}</span>
          <Award className="text-emerald-500" size={32} />
        </Card>
        <Card title="Success Index" subtitle="Offers Ratio" bodyClassName="flex items-center justify-between !py-4">
          <span className="text-3xl font-black text-slate-800">{stats.successRate}%</span>
          <Sparkles className="text-amber-500" size={32} />
        </Card>
      </div>

      {/* Applications List */}
      <Card title="Submitted Applications History">
        <Table
          columns={columns}
          data={applications}
          loading={appsLoading}
          emptyMessage="You haven't submitted any job applications yet. Go search jobs!"
        />
      </Card>

      {/* ATS Tracker Modal */}
      {selectedApp && (
        <Modal
          isOpen={!!selectedApp}
          onClose={() => setSelectedApp(null)}
          title={`ATS Timeline: ${selectedApp.job?.title}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-8">
            {/* Horizontal ATS Step Process */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-5">Hiring Funnel Status</h4>
              <div className="flex flex-wrap items-center gap-2.5">
                {steps.map((st, sIdx) => {
                  const isActive = selectedApp.currentStage === st;
                  const isPassed = steps.indexOf(selectedApp.currentStage) >= sIdx && selectedApp.currentStage !== 'Rejected';
                  return (
                    <div key={st} className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${isActive
                          ? 'bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-500/10'
                          : isPassed
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-slate-50 text-slate-400 border-slate-100'
                          }`}
                      >
                        {st}
                      </span>
                      {sIdx < steps.length - 1 && <span className="text-slate-300 font-bold">&rarr;</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Assessment Score */}
            {selectedApp.assessmentStatus === 'Completed' && (
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800">Recruitment Skills Test Result</h4>
                  <p className="text-xs text-slate-500">Your score has been registered on the candidate pipeline</p>
                </div>
                <span className="text-xl font-black text-indigo-600">{selectedApp.assessmentScore}%</span>
              </div>
            )}

            {/* Onboarding Documents Module */}
            {['Offer Accepted', 'Hired', 'Onboarded'].includes(selectedApp.currentStage) && (
              <div className="border-t border-slate-100 pt-6">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4">Onboarding Verification Dossier</h3>

                {/* Upload Form */}
                <form onSubmit={handleDocUpload} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col sm:flex-row gap-3 mb-6">
                  <div className="w-full sm:w-56">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Doc Category</label>
                    <select
                      className="form-input py-2.5!"
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                    >
                      <option value="Identity Proof">Identity Proof (Passport/ID)</option>
                      <option value="Address Proof">Address Proof (Utility Bill)</option>
                      <option value="Educational Certificates">Educational Certificates</option>
                      <option value="Experience Letters">Previous Experience Letters</option>
                      <option value="Bank Details">Bank Account Details</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Document File</label>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      onChange={(e) => setDocFile(e.target.files[0])}
                      className="form-input py-2.5!"
                      required
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" variant="primary" className="w-full sm:w-auto py-2.5!">
                      Submit Document
                    </Button>
                  </div>
                </form>

                {docSuccess && (
                  <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl mb-4 animate-fade-in">
                    {docSuccess}
                  </div>
                )}

                {/* Docs History */}
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Submitted Documents Status</h4>
                {selectedApp.onboardingDocuments?.length === 0 ? (
                  <p className="text-xs text-slate-400 font-medium">No documents uploaded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedApp.onboardingDocuments.map((doc) => (
                      <div key={doc._id} className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-slate-400" />
                          <span className="text-xs font-bold text-slate-700">{doc.docType}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-500 font-semibold hover:underline">
                            View File
                          </a>
                          <Badge
                            type={
                              doc.status === 'Verified'
                                ? 'success'
                                : doc.status === 'Rejected'
                                  ? 'danger'
                                  : 'warning'
                            }
                          >
                            {doc.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setSelectedApp(null)}>Close Timeline</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CandidateDashboard;
