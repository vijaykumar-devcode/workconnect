import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOffers } from '../offers/offerSlice';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { FileText, DollarSign, CheckCircle, Clock, XCircle } from 'lucide-react';

const EmployerOffers = () => {
  const dispatch = useDispatch();
  const { offers, loading } = useSelector((state) => state.offers);

  useEffect(() => {
    dispatch(fetchOffers());
  }, [dispatch]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Accepted':
        return <Badge type="success"><CheckCircle size={12} className="mr-1" /> {status}</Badge>;
      case 'Rejected':
      case 'Expired':
        return <Badge type="danger"><XCircle size={12} className="mr-1" /> {status}</Badge>;
      case 'Sent':
      case 'Viewed':
        return <Badge type="info"><Clock size={12} className="mr-1" /> {status}</Badge>;
      default:
        return <Badge type="neutral">{status}</Badge>;
    }
  };

  const columns = [
    {
      title: 'Candidate Name',
      key: 'candidate',
      render: (row) => <span className="font-bold text-slate-800">{row.candidate?.name || 'Unknown'}</span>,
    },
    {
      title: 'Job Role',
      key: 'role',
      render: (row) => <span className="font-semibold text-slate-500">{row.application?.job?.title || 'Unknown Role'}</span>,
    },
    {
      title: 'Salary Offer',
      key: 'salary',
      render: (row) => (
        <span className="font-bold text-emerald-600 flex items-center">
          <DollarSign size={14} className="mr-0.5" />
          {row.salary ? row.salary.toLocaleString() : 'N/A'}
        </span>
      ),
    },
    {
      title: 'Target Joining Date',
      key: 'joiningDate',
      render: (row) => (
        <span className="text-sm text-slate-600 font-medium">
          {new Date(row.joiningDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      title: 'Offer Status',
      key: 'status',
      render: (row) => getStatusBadge(row.status),
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none mb-2 flex items-center gap-2">
          <FileText className="text-brand-500" size={28} /> Offers Tracker
        </h1>
        <p className="text-sm font-semibold text-slate-400">
          Track and manage all employment offers issued by your company.
        </p>
      </div>

      <Card>
        <Table
          columns={columns}
          data={offers}
          loading={loading}
          emptyMessage="No offers have been issued by your company yet."
        />
      </Card>
    </div>
  );
};

export default EmployerOffers;
