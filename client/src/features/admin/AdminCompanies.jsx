import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllCompaniesAdmin, verifyCompany } from '../companies/companySlice';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';

const AdminCompanies = () => {
  const dispatch = useDispatch();
  const { companies, loading } = useSelector((state) => state.companies);

  useEffect(() => {
    dispatch(fetchAllCompaniesAdmin());
  }, [dispatch]);

  const handleCompanyVerify = async (companyId, verifyFlag) => {
    if (!window.confirm(`Are you sure you want to ${verifyFlag ? 'approve' : 'reject'} this company?`)) return;
    try {
      await dispatch(verifyCompany({ companyId, isVerified: verifyFlag })).unwrap();
      dispatch(fetchAllCompaniesAdmin());
      alert(`Company verification set to: ${verifyFlag ? 'APPROVED' : 'REJECTED'}`);
    } catch (err) {
      alert(err);
    }
  };

  const companyColumns = [
    {
      title: 'Company Name',
      key: 'name',
      render: (row) => <span className="font-bold text-slate-800">{row.name}</span>,
    },
    {
      title: 'HQ Location',
      key: 'location',
    },
    {
      title: 'Industry',
      key: 'industry',
    },
    {
      title: 'Verification',
      key: 'status',
      render: (row) => (
        <Badge type={row.isVerified ? 'success' : 'warning'}>
          {row.isVerified ? 'Verified Profile' : 'Pending Verification'}
        </Badge>
      ),
    },
    {
      title: 'Approval Control',
      key: 'actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Button variant="success" size="sm" onClick={() => handleCompanyVerify(row._id, true)} disabled={row.isVerified}>
            Approve
          </Button>
          <Button variant="danger" size="sm" onClick={() => handleCompanyVerify(row._id, false)} disabled={!row.isVerified}>
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none mb-2">
          Corporate Approvals
        </h1>
        <p className="text-sm font-semibold text-slate-400">
          Review and approve new employer registrations to maintain platform trust
        </p>
      </div>

      <Card title="Company Directory">
        <Table
          columns={companyColumns}
          data={companies}
          loading={loading}
          emptyMessage="No companies registered yet."
        />
      </Card>
    </div>
  );
};

export default AdminCompanies;
