import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyCompany, addRecruiter, removeRecruiter } from './companySlice';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import { Users, Plus, Trash2 } from 'lucide-react';

const EmployerTeam = () => {
  const dispatch = useDispatch();
  const { company, loading } = useSelector((state) => state.companies);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [newRecruiter, setNewRecruiter] = useState({ name: '', email: '', password: '' });

  useEffect(() => {
    dispatch(fetchMyCompany());
  }, [dispatch]);

  const handleInviteRecruiter = async (e) => {
    e.preventDefault();
    try {
      await dispatch(addRecruiter(newRecruiter)).unwrap();
      setIsInviteOpen(false);
      setNewRecruiter({ name: '', email: '', password: '' });
      alert('Recruiter invited successfully. They will receive an email with their credentials and verification OTP.');
    } catch (err) {
      alert(err || 'Failed to invite recruiter.');
    }
  };

  const handleRemoveRecruiter = async (recruiterId) => {
    if (!window.confirm('Are you sure you want to remove this recruiter?')) return;
    try {
      await dispatch(removeRecruiter(recruiterId)).unwrap();
      alert('Recruiter removed.');
    } catch (err) {
      alert(err || 'Failed to remove recruiter.');
    }
  };

  const recruiterColumns = [
    { title: 'Name', key: 'name', render: (row) => <span className="font-bold text-slate-800">{row.name}</span> },
    { title: 'Email Address', key: 'email', render: (row) => <span className="text-slate-500">{row.email}</span> },
    { title: 'Status', key: 'status', render: (row) => <Badge type={row.isEmailVerified ? 'success' : 'warning'}>{row.isEmailVerified ? 'Verified' : 'Pending OTP'}</Badge> },
    {
      title: 'Actions',
      key: 'actions',
      render: (row) => (
        <button onClick={() => handleRemoveRecruiter(row._id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors" title="Remove Recruiter">
          <Trash2 size={16} />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Recruitment Team</h2>
        <p className="text-slate-500 mt-1">Manage your team of recruiters and interviewers</p>
      </div>

      <div className="pt-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users size={20} className="text-brand-500" /> Active Team Members
            </h3>
            <p className="text-sm text-slate-500">Invite members who can post jobs, manage applications, and interview candidates.</p>
          </div>
          <Button variant="outline" onClick={() => setIsInviteOpen(true)}>
            <Plus size={16} className="mr-1.5" /> Invite Recruiter
          </Button>
        </div>
        
        <Card>
          {loading && !company ? (
            <div className="p-8 text-center text-slate-500">Loading team...</div>
          ) : company ? (
            <Table
              columns={recruiterColumns}
              data={company.recruiters || []}
              emptyMessage="No recruiters invited yet. Invite your team to get started!"
            />
          ) : (
            <div className="p-8 text-center text-slate-500">
              Please register your company profile first to invite recruiters.
            </div>
          )}
        </Card>
      </div>

      {isInviteOpen && (
        <Modal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} title="Invite Team Recruiter">
          <form onSubmit={handleInviteRecruiter} className="space-y-4">
            <Input
              label="Full Name"
              value={newRecruiter.name}
              onChange={e => setNewRecruiter({ ...newRecruiter, name: e.target.value })}
              required
            />
            <Input
              label="Email Address"
              type="email"
              value={newRecruiter.email}
              onChange={e => setNewRecruiter({ ...newRecruiter, email: e.target.value })}
              required
            />
            <div className="space-y-1">
              <Input
                label="Initial Temporary Password"
                type="text"
                value={newRecruiter.password}
                onChange={e => setNewRecruiter({ ...newRecruiter, password: e.target.value })}
                required
              />
              <p className="text-xs text-slate-400">The recruiter will receive this password via email.</p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" type="button" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Send Invitation</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default EmployerTeam;
