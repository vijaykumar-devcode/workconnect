import React, { useState, useEffect } from 'react';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useDispatch } from 'react-redux';
import { createJob, updateJob, fetchJobs } from '../../jobs/jobSlice';
import { scheduleInterview } from '../../interviews/interviewSlice';
import { createOffer } from '../../offers/offerSlice';
import { addComment, fetchApplications } from '../../applications/applicationSlice';

export const PostJobModal = ({ isOpen, onClose, publisherId, onSuccess }) => {
  const dispatch = useDispatch();
  const [newJob, setNewJob] = useState({
    title: '', description: '', skillsRequired: '', experienceRequired: '',
    location: '', applicationDeadline: '', workMode: 'Onsite', employmentType: 'Full-Time', status: 'Published',
    salaryMin: '', salaryMax: '', numberOfOpenings: 1
  });

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
      onClose();
      setNewJob({
        title: '', description: '', skillsRequired: '', experienceRequired: '',
        location: '', applicationDeadline: '', workMode: 'Onsite', employmentType: 'Full-Time', status: 'Published',
        salaryMin: '', salaryMax: '', numberOfOpenings: 1
      });
      dispatch(fetchJobs({ publisher: publisherId }));
      onSuccess?.();
      alert('Job posted for admin moderation successfully!');
    } catch (err) {
      alert(err || 'Failed to post job. Please ensure company profile is verified.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Job Listing" maxWidth="max-w-5xl">
      <form onSubmit={handlePostJob} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">1. Basic Details</h3>
            <Input label="Job Title" value={newJob.title} onChange={e => setNewJob({ ...newJob, title: e.target.value })} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Location" value={newJob.location} onChange={e => setNewJob({ ...newJob, location: e.target.value })} required />
              <Input label="Application Deadline" type="date" value={newJob.applicationDeadline} onChange={e => setNewJob({ ...newJob, applicationDeadline: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Work Mode" options={[{ value: 'Remote', label: 'Remote' }, { value: 'Hybrid', label: 'Hybrid' }, { value: 'Onsite', label: 'Onsite' }]} value={newJob.workMode} onChange={e => setNewJob({ ...newJob, workMode: e.target.value })} />
              <Select label="Employment Type" options={[{ value: 'Full-Time', label: 'Full-Time' }, { value: 'Part-Time', label: 'Part-Time' }, { value: 'Contract', label: 'Contract' }]} value={newJob.employmentType} onChange={e => setNewJob({ ...newJob, employmentType: e.target.value })} />
            </div>
            <Select label="Job Status" options={[{ value: 'Draft', label: 'Draft (Save for Later)' }, { value: 'Published', label: 'Published (Go Live)' }]} value={newJob.status} onChange={e => setNewJob({ ...newJob, status: e.target.value })} />

            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mt-6">2. Requirements & Compensation</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Experience (Years)" type="number" value={newJob.experienceRequired} onChange={e => setNewJob({ ...newJob, experienceRequired: e.target.value })} required />
              <Input label="Number of Vacancies" type="number" min="1" value={newJob.numberOfOpenings} onChange={e => setNewJob({ ...newJob, numberOfOpenings: e.target.value })} required />
            </div>
            <Input label="Required Skills (comma separated)" placeholder="React, Node, CSS" value={newJob.skillsRequired} onChange={e => setNewJob({ ...newJob, skillsRequired: e.target.value })} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Min Salary ($/yr)" type="number" value={newJob.salaryMin} onChange={e => setNewJob({ ...newJob, salaryMin: e.target.value })} />
              <Input label="Max Salary ($/yr)" type="number" value={newJob.salaryMax} onChange={e => setNewJob({ ...newJob, salaryMax: e.target.value })} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">3. Job Description</h3>
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden h-[400px]">
              <ReactQuill theme="snow" value={newJob.description} onChange={(content) => setNewJob({ ...newJob, description: content })} className="h-full pb-10" />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
          <span className="text-[10px] text-slate-400 font-semibold max-w-[50%]">Note: If your company is not verified by admin, your job will be saved as a Draft.</span>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary">Submit Listing</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export const EditJobModal = ({ isOpen, onClose, job, publisherId }) => {
  const dispatch = useDispatch();
  const [editingJob, setEditingJob] = useState(null);

  useEffect(() => {
    if (job) setEditingJob(job);
  }, [job]);

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
      onClose();
      dispatch(fetchJobs({ publisher: publisherId }));
      alert('Job updated successfully!');
    } catch (err) {
      alert(err || 'Failed to update job.');
    }
  };

  if (!editingJob) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Job Listing" maxWidth="max-w-5xl">
      <form onSubmit={handleEditSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">1. Basic Details</h3>
            <Input label="Job Title" value={editingJob.title} onChange={e => setEditingJob({ ...editingJob, title: e.target.value })} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Location" value={editingJob.location} onChange={e => setEditingJob({ ...editingJob, location: e.target.value })} required />
              <Input label="Application Deadline" type="date" value={editingJob.applicationDeadline?.split('T')[0] || ''} onChange={e => setEditingJob({ ...editingJob, applicationDeadline: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Work Mode" options={[{ value: 'Remote', label: 'Remote' }, { value: 'Hybrid', label: 'Hybrid' }, { value: 'Onsite', label: 'Onsite' }]} value={editingJob.workMode} onChange={e => setEditingJob({ ...editingJob, workMode: e.target.value })} />
              <Select label="Employment Type" options={[{ value: 'Full-Time', label: 'Full-Time' }, { value: 'Part-Time', label: 'Part-Time' }, { value: 'Contract', label: 'Contract' }]} value={editingJob.employmentType} onChange={e => setEditingJob({ ...editingJob, employmentType: e.target.value })} />
            </div>
            <Select label="Job Status" options={[{ value: 'Draft', label: 'Draft (Save for Later)' }, { value: 'Published', label: 'Published (Go Live)' }, { value: 'Closed', label: 'Closed (Not accepting applications)' }]} value={editingJob.status} onChange={e => setEditingJob({ ...editingJob, status: e.target.value })} />

            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mt-6">2. Requirements & Compensation</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Experience (Years)" type="number" value={editingJob.experienceRequired} onChange={e => setEditingJob({ ...editingJob, experienceRequired: e.target.value })} required />
              <Input label="Number of Vacancies" type="number" min="1" value={editingJob.numberOfOpenings} onChange={e => setEditingJob({ ...editingJob, numberOfOpenings: e.target.value })} required />
            </div>
            <Input label="Required Skills (comma separated)" placeholder="React, Node, CSS" value={editingJob.skillsRequired} onChange={e => setEditingJob({ ...editingJob, skillsRequired: e.target.value })} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Min Salary ($/yr)" type="number" value={editingJob.salaryMin} onChange={e => setEditingJob({ ...editingJob, salaryMin: e.target.value })} />
              <Input label="Max Salary ($/yr)" type="number" value={editingJob.salaryMax} onChange={e => setEditingJob({ ...editingJob, salaryMax: e.target.value })} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-600 border-b border-slate-100 pb-2">3. Job Description</h3>
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden h-[400px]">
              <ReactQuill theme="snow" value={editingJob.description} onChange={(content) => setEditingJob({ ...editingJob, description: content })} className="h-full pb-10" />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
          <span className="text-[10px] text-slate-400 font-semibold max-w-[50%]">Note: If your company is not verified by admin, your job will be saved as a Draft.</span>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary">Save Changes</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export const ScheduleInterviewModal = ({ isOpen, onClose, activeApp, onScheduleSuccess, onScheduleError }) => {
  const dispatch = useDispatch();
  const [newInterview, setNewInterview] = useState({
    date: '', duration: 45, link: '', type: 'Technical Interview', roomType: 'EXTERNAL'
  });

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    onScheduleError('');
    try {
      await dispatch(scheduleInterview({
        applicationId: activeApp._id,
        ...newInterview
      })).unwrap();
      onClose();
      setNewInterview({ date: '', duration: 45, link: '', type: 'Technical Interview', roomType: 'EXTERNAL' });
      onScheduleSuccess(`Interview scheduled for ${activeApp.candidate?.name || 'the candidate'}! Notification sent successfully.`);
      dispatch(fetchApplications());
    } catch (err) {
      onScheduleError(typeof err === 'string' ? err : err?.message || 'Failed to schedule interview. Please try again.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Schedule Interview: ${activeApp?.candidate?.name}`}>
      <form onSubmit={handleScheduleSubmit} className="space-y-4">
        <Input label="Interview Date & Time" type="datetime-local" value={newInterview.date} onChange={e => setNewInterview({ ...newInterview, date: e.target.value })} required />
        <Input label="Duration (minutes)" type="number" value={newInterview.duration} onChange={e => setNewInterview({ ...newInterview, duration: e.target.value })} required />

        <Select
          label="Interview Room Type"
          options={[
            { value: 'EXTERNAL', label: 'External Meeting Link (Zoom, Meet)' },
            { value: 'INTERNAL_ROOM', label: 'Built-in LiveKit Room' }
          ]}
          value={newInterview.roomType}
          onChange={e => {
            const isInternal = e.target.value === 'INTERNAL_ROOM';
            setNewInterview({ ...newInterview, roomType: e.target.value, link: isInternal ? '' : newInterview.link });
          }}
        />

        {newInterview.roomType === 'EXTERNAL' && (
          <Input label="Virtual Meeting Link" placeholder="https://zoom.us/yourmeetid" value={newInterview.link} onChange={e => setNewInterview({ ...newInterview, link: e.target.value })} required />
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
          onChange={e => setNewInterview({ ...newInterview, type: e.target.value })}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">Schedule & Alert</Button>
        </div>
      </form>
    </Modal>
  );
};

export const SendOfferModal = ({ isOpen, onClose, activeApp }) => {
  const dispatch = useDispatch();
  const [newOffer, setNewOffer] = useState({
    salary: '', bonus: '', joiningDate: '', benefits: '', notes: ''
  });

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
      onClose();
      setNewOffer({ salary: '', bonus: '', joiningDate: '', benefits: '', notes: '' });
      dispatch(fetchApplications());
      alert('Job Offer created and dispatched to candidate successfully!');
    } catch (err) {
      alert(err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Send Job Offer: ${activeApp?.candidate?.name}`}>
      <form onSubmit={handleOfferSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Base Salary ($ / yr)" type="number" value={newOffer.salary} onChange={e => setNewOffer({ ...newOffer, salary: e.target.value })} required />
          <Input label="Yearly Performance Bonus ($)" type="number" value={newOffer.bonus} onChange={e => setNewOffer({ ...newOffer, bonus: e.target.value })} />
        </div>
        <Input label="Target Start Joining Date" type="date" value={newOffer.joiningDate} onChange={e => setNewOffer({ ...newOffer, joiningDate: e.target.value })} required />
        <Input label="Fringe Benefits (comma separated)" placeholder="Medical, Equity, Unlimited PTO" value={newOffer.benefits} onChange={e => setNewOffer({ ...newOffer, benefits: e.target.value })} />
        <div className="flex flex-col space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Internal Notes</label>
          <textarea rows={3} className="form-input" placeholder="Notes..." value={newOffer.notes} onChange={e => setNewOffer({ ...newOffer, notes: e.target.value })} />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">Dispatch Proposal</Button>
        </div>
      </form>
    </Modal>
  );
};

export const AddCommentModal = ({ isOpen, onClose, activeApp }) => {
  const dispatch = useDispatch();
  const [commentText, setCommentText] = useState('');

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText) return;
    try {
      await dispatch(addComment({ appId: activeApp._id, comment: commentText })).unwrap();
      setCommentText('');
      onClose();
      dispatch(fetchApplications());
      alert('Internal comment added successfully.');
    } catch (err) {
      alert(err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Recruiter Log Comments: ${activeApp?.candidate?.name}`}>
      <form onSubmit={handleAddComment} className="space-y-4">
        <div className="flex flex-col space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Write comments</label>
          <textarea rows={4} className="form-input" placeholder="Internal recruiter notes..." value={commentText} onChange={e => setCommentText(e.target.value)} required />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">Submit Comment</Button>
        </div>
      </form>
    </Modal>
  );
};
