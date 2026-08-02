import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchInterviews } from '../interviews/interviewSlice';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Calendar, Video, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useInterviewFilters } from '../../hooks/useInterviewFilters';
import InterviewFilterBar from '../interviews/components/InterviewFilterBar';

const CandidateInterviews = () => {
  const dispatch = useDispatch();
  const { interviews, loading } = useSelector((state) => state.interviews);

  const filters = useInterviewFilters(interviews, 'candidate');

  useEffect(() => {
    dispatch(fetchInterviews());
  }, [dispatch]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return <Badge type="success"><CheckCircle size={12} className="mr-1" /> {status}</Badge>;
      case 'Cancelled':
        return <Badge type="danger"><XCircle size={12} className="mr-1" /> {status}</Badge>;
      case 'Scheduled':
      case 'Rescheduled':
        return <Badge type="info"><Clock size={12} className="mr-1" /> {status}</Badge>;
      default:
        return <Badge type="neutral">{status}</Badge>;
    }
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
      title: 'Interview Date',
      key: 'date',
      render: (row) => (
        <span className="text-sm text-slate-600 font-medium whitespace-nowrap">
          {new Date(row.date).toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (row) => getStatusBadge(row.status),
    },
    {
      title: 'Meeting Room',
      key: 'link',
      render: (row) => {
        if (row.roomType === 'INTERNAL_ROOM') {
          return (
            <Link
              to={`/interview/${row._id}/room`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-600 rounded-lg text-xs font-bold hover:bg-brand-100 transition-colors"
            >
              <Video size={14} /> Join Call
            </Link>
          );
        }

        return row.link ? (
          <a
            href={row.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors"
          >
            <Video size={14} /> Join External
          </a>
        ) : (
          <span className="text-xs text-slate-400 font-semibold">No link</span>
        );
      },
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none mb-2 flex items-center gap-2">
          <Calendar className="text-brand-500" size={28} /> Interview Schedule
        </h1>
        <p className="text-sm font-semibold text-slate-400">
          View your upcoming and past interviews, including meeting links and call rooms.
        </p>
      </div>

      <InterviewFilterBar {...filters} userType="candidate" />

      <Card>
        <Table
          columns={columns}
          data={filters.filteredInterviews}
          loading={loading}
          emptyMessage={
            filters.activeFiltersCount > 0
              ? "No interviews match your active filters."
              : "No upcoming interviews yet."
          }
        />
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => window.history.back()}>
          Back
        </Button>
      </div>
    </div>
  );
};

export default CandidateInterviews;