import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllJobsAdmin, moderateJob } from '../jobs/jobSlice';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import Select from '../../components/ui/Select';

const AdminJobs = () => {
  const dispatch = useDispatch();
  const { jobs, loading } = useSelector((state) => state.jobs);

  useEffect(() => {
    dispatch(fetchAllJobsAdmin());
  }, [dispatch]);

  const handleJobModeration = async (jobId, nextStatus) => {
    if (!window.confirm(`Are you sure you want to change job status to ${nextStatus}?`)) return;
    try {
      await dispatch(moderateJob({ jobId, status: nextStatus })).unwrap();
      dispatch(fetchAllJobsAdmin());
      alert(`Job moderation updated to ${nextStatus}`);
    } catch (err) {
      alert(err);
    }
  };

  const jobColumns = [
    {
      title: 'Job Opening Title',
      key: 'title',
      render: (row) => <span className="font-bold text-slate-800">{row.title}</span>,
    },
    {
      title: 'Company',
      key: 'company',
      render: (row) => <span>{row.company?.name || 'N/A'}</span>,
    },
    {
      title: 'Employment Type',
      key: 'employmentType',
    },
    {
      title: 'Status',
      key: 'status',
      render: (row) => (
        <Badge type={row.status === 'Published' ? 'success' : row.status === 'Draft' ? 'neutral' : 'warning'}>
          {row.status}
        </Badge>
      ),
    },
    {
      title: 'Moderation Control',
      key: 'actions',
      render: (row) => (
        <Select
          placeholder="Moderate"
          options={[
            { value: 'Published', label: 'Publish Job' },
            { value: 'Closed', label: 'Close Job' },
            { value: 'Paused', label: 'Flag / Pause Job' },
            { value: 'Moderation', label: 'Hold for Review' }
          ]}
          onChange={(e) => handleJobModeration(row._id, e.target.value)}
          className="!py-1 text-xs"
        />
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none mb-2">
          Job Moderation
        </h1>
        <p className="text-sm font-semibold text-slate-400">
          Review, approve, flag, or close job postings across the platform
        </p>
      </div>

      <Card title="System Job Board">
        <Table
          columns={jobColumns}
          data={jobs}
          loading={loading}
          emptyMessage="No jobs found."
        />
      </Card>
    </div>
  );
};

export default AdminJobs;
