import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchApplications, uploadOnboardingDoc } from '../applications/applicationSlice';
import { fetchOffers, updateOfferStatus } from '../offers/offerSlice';
import { fetchInterviews } from '../interviews/interviewSlice';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import { Briefcase, Calendar, CheckCircle2, FileText, Sparkles, Award, Video, Clock, Info } from 'lucide-react';

const CandidateDashboard = () => {
  const dispatch = useDispatch();
  const { applications, loading: appsLoading } = useSelector((state) => state.applications);
  const { offers } = useSelector((state) => state.offers);
  const { interviews, loading: interviewsLoading } = useSelector((state) => state.interviews);
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [docType, setDocType] = useState('Identity Proof');
  const [docFile, setDocFile] = useState(null);
  const [docSuccess, setDocSuccess] = useState('');
  const [stats, setStats] = useState({ totalApplications: 0, activeInterviews: 0, offersReceived: 0, successRate: 0 });

  useEffect(() => {
    dispatch(fetchApplications());
    dispatch(fetchOffers());
    dispatch(fetchInterviews());

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

  const handleOfferDecision = async (offerId, decision) => {
    const actionText = decision === 'Accepted' ? 'accept' : 'decline';
    if (!window.confirm(`Are you sure you want to ${actionText} this offer?`)) return;

    try {
      await dispatch(updateOfferStatus({ offerId, status: decision })).unwrap();
      alert(`Offer ${decision.toLowerCase()}!`);
      setSelectedOffer(null);
      dispatch(fetchApplications());
      dispatch(fetchOffers());
    } catch (err) {
      alert('Error updating offer');
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

  // ATS Pipeline Steps
  const steps = [
    'Applied', 'Screening', 'Shortlisted', 'Assessment', 'Interview Round 1', 'Selected', 'Offer Sent', 'Offer Accepted', 'Hired', 'Onboarded'
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

      {/* Offers Notice */}
      {offers.filter(o => o.status === 'Sent').map(offer => (
        <div key={offer._id} className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 p-6 rounded-2xl flex items-center justify-between flex-wrap gap-4 shadow-sm animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-extrabold text-xl">
              🎁
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Congratulations! You received a Job Offer!</h3>
              <p className="text-xs font-semibold text-slate-500">Base Salary Offered: ${offer.salary.toLocaleString()}/yr + Joining Date: {new Date(offer.joiningDate).toLocaleDateString()}</p>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={() => setSelectedOffer(offer)}>
            Review Details
          </Button>
        </div>
      ))}

      {/* Upcoming Interviews Section */}
      <Card title="Your Interview Schedule" subtitle="Manage your technical and HR rounds">
        {interviewsLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-slate-100 rounded-xl"></div>
          </div>
        ) : (!interviews || interviews.length === 0) ? (
          <div className="text-center py-12 px-6 bg-slate-50 rounded-xl border border-slate-100">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-extrabold text-slate-700">No upcoming interviews yet</h3>
            <p className="text-xs font-semibold text-slate-500 mt-1 max-w-sm mx-auto">
              Keep applying to jobs! When employers shortlist you, your scheduled virtual meetings will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {interviews.map(interview => {
              const isFuture = new Date(interview.date) > new Date();
              const canJoin = isFuture && interview.status === 'Scheduled';
              return (
                <div key={interview._id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Badge type={interview.status === 'Scheduled' ? 'info' : interview.status === 'Completed' ? 'success' : 'neutral'}>
                        {interview.status}
                      </Badge>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        {interview.type}
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-800 leading-tight mb-1 truncate">
                      {interview.application?.job?.title || 'Unknown Role'}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 truncate mb-4">
                      {interview.application?.job?.company?.name || 'Partner Company'}
                    </p>

                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <Clock size={14} className="text-slate-400" />
                        {new Date(interview.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} ({interview.duration}m)
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 truncate">
                        <Video size={14} className="text-slate-400" />
                        {interview.interviewer?.name || 'Hiring Team'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedInterview(interview)}
                    >
                      <Info size={14} className="mr-1" /> Details
                    </Button>

                    {canJoin && (
                      interview.roomType === 'INTERNAL_ROOM' ? (
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate(`/interview/${interview._id}/room`)}
                        >
                          <Video size={14} className="mr-1" /> Join Built-in
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          onClick={() => window.open(interview.link, '_blank')}
                        >
                          <Video size={14} className="mr-1" /> Join External
                        </Button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Offer History */}
      <Card title="Job Offers Archive" subtitle="Track all your received and past job offers">
        {(!offers || offers.length === 0) ? (
          <div className="text-center py-8 text-slate-400 font-semibold text-xs">
            No offers received yet.
          </div>
        ) : (
          <div className="space-y-3">
            {offers.map(offer => (
              <div key={offer._id} className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800">{offer.application?.job?.title || 'Role'}</h4>
                  <p className="text-xs font-semibold text-slate-500">{offer.application?.job?.company?.name || 'Company'}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge type={offer.status === 'Accepted' ? 'success' : offer.status === 'Rejected' ? 'error' : offer.status === 'Sent' ? 'info' : 'neutral'}>
                    {offer.status}
                  </Badge>
                  <Button variant="outline" size="sm" className="!py-1 !px-2 text-[10px]" onClick={() => setSelectedOffer(offer)}>
                    View Terms
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

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
                      className="form-input !py-2.5"
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
                      className="form-input !py-2.5"
                      required
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" variant="primary" className="w-full sm:w-auto !py-2.5">
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

      {/* Interview Details Modal */}
      {selectedInterview && (
        <Modal
          isOpen={!!selectedInterview}
          onClose={() => setSelectedInterview(null)}
          title="Interview Details"
          maxWidth="max-w-md"
        >
          <div className="space-y-6">
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Position</h4>
              <p className="text-sm font-extrabold text-slate-800">{selectedInterview.application?.job?.title}</p>
              <p className="text-xs font-semibold text-slate-500">{selectedInterview.application?.job?.company?.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Status</h4>
                <Badge type={selectedInterview.status === 'Scheduled' ? 'info' : selectedInterview.status === 'Completed' ? 'success' : 'neutral'}>
                  {selectedInterview.status}
                </Badge>
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Format</h4>
                <p className="text-sm font-bold text-slate-800">{selectedInterview.type}</p>
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Date & Time</h4>
                <p className="text-sm font-bold text-slate-800">{new Date(selectedInterview.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Duration</h4>
                <p className="text-sm font-bold text-slate-800">{selectedInterview.duration} Minutes</p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Interviewer Contact</h4>
              <p className="text-sm font-bold text-slate-800">{selectedInterview.interviewer?.name}</p>
              <p className="text-xs font-semibold text-slate-500">{selectedInterview.interviewer?.email}</p>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Meeting Access</h4>
              <div className="flex flex-col gap-2">
                {selectedInterview.roomType === 'INTERNAL_ROOM' ? (
                  <Button
                    variant="primary"
                    className="w-full flex justify-center items-center gap-2"
                    onClick={() => navigate(`/interview/${selectedInterview._id}/room`)}
                  >
                    <Video size={16} /> Join Built-in Interview Room
                  </Button>
                ) : (
                  selectedInterview.link && (
                    <div className="mt-2">
                      <p className="text-[10px] font-semibold text-slate-400 mb-1 tracking-wide uppercase">External Meeting Link:</p>
                      <a href={selectedInterview.link} target="_blank" rel="noopener noreferrer" className="block p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs font-bold truncate hover:bg-slate-100 transition-colors">
                        {selectedInterview.link}
                      </a>
                    </div>
                  )
                )}
              </div>
              <p className="text-[10px] font-semibold text-slate-400 mt-3">
                Make sure to join 5 minutes early. Ensure your camera and microphone are working.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setSelectedInterview(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Offer Details Modal */}
      {selectedOffer && (
        <Modal
          isOpen={!!selectedOffer}
          onClose={() => setSelectedOffer(null)}
          title="Official Job Offer Details"
          maxWidth="max-w-xl"
        >
          <div className="space-y-6">
            <div className="bg-slate-50 border border-slate-100 p-5 rounded-xl">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Position</h4>
              <p className="text-lg font-black text-slate-900">{selectedOffer.application?.job?.title}</p>
              <p className="text-sm font-bold text-slate-600">{selectedOffer.application?.job?.company?.name}</p>

              <div className="mt-3 flex gap-2">
                <Badge type={selectedOffer.status === 'Accepted' ? 'success' : selectedOffer.status === 'Rejected' ? 'error' : 'info'}>
                  Status: {selectedOffer.status}
                </Badge>
                <Badge type="neutral">{selectedOffer.application?.job?.employmentType}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Base Salary</h4>
                <p className="text-xl font-black text-emerald-600">${selectedOffer.salary?.toLocaleString()} / yr</p>
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Performance Bonus</h4>
                <p className="text-xl font-black text-emerald-600">${selectedOffer.bonus?.toLocaleString() || 0}</p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Joining Date</h4>
              <p className="text-sm font-bold text-slate-800">{new Date(selectedOffer.joiningDate).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            {selectedOffer.benefits?.length > 0 && (
              <div className="border-t border-slate-100 pt-5">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3">Fringe Benefits & Perks</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedOffer.benefits.map((benefit, i) => (
                    <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100">
                      {benefit}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedOffer.notes && (
              <div className="border-t border-slate-100 pt-5">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Employer Notes</h4>
                <p className="text-sm font-medium text-slate-700 leading-relaxed bg-amber-50/50 p-4 rounded-xl border border-amber-100 whitespace-pre-wrap">
                  {selectedOffer.notes}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
              <Button variant="outline" onClick={() => setSelectedOffer(null)}>Close</Button>
              {selectedOffer.status === 'Sent' && (
                <>
                  <Button variant="danger" onClick={() => handleOfferDecision(selectedOffer._id, 'Rejected')}>
                    Decline Offer
                  </Button>
                  <Button variant="success" onClick={() => handleOfferDecision(selectedOffer._id, 'Accepted')}>
                    Accept Offer
                  </Button>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CandidateDashboard;
