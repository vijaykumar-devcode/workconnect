import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOffers, updateOfferStatus } from '../offers/offerSlice';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { FileText, DollarSign, CheckCircle, Clock, XCircle } from 'lucide-react';

const CandidateOffers = () => {
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

  const handleDecision = async (offerId, status) => {
    const actionText = status === 'Accepted' ? 'accept' : 'reject';
    if (!window.confirm(`Are you sure you want to ${actionText} this offer?`)) return;

    await dispatch(updateOfferStatus({ offerId, status })).unwrap();
    dispatch(fetchOffers());
  };

  const columns = [
    {
      title: 'Company',
      key: 'company',
      render: (row) => <span className="font-bold text-slate-800">{row.application?.job?.company?.name || 'Unknown Company'}</span>,
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
      title: 'Joining Date',
      key: 'joiningDate',
      render: (row) => <span className="text-sm text-slate-600 font-medium">{new Date(row.joiningDate).toLocaleDateString()}</span>,
    },
    {
      title: 'Status',
      key: 'status',
      render: (row) => getStatusBadge(row.status),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => handleDecision(row._id, 'Accepted')} disabled={row.status === 'Accepted'}>
            Accept
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDecision(row._id, 'Rejected')} disabled={row.status === 'Rejected'}>
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none mb-2 flex items-center gap-2">
          <FileText className="text-brand-500" size={28} /> Offer Letters
        </h1>
        <p className="text-sm font-semibold text-slate-400">
          Review offers issued to you and accept or reject them from a dedicated screen.
        </p>
      </div>

      <Card>
        <Table
          columns={columns}
          data={offers}
          loading={loading}
          emptyMessage="No offers received yet."
        />
      </Card>
    </div>
  );
};

export default CandidateOffers;