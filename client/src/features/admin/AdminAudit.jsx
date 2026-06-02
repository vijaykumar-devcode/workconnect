import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAuditLogs } from './auditSlice';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';

const AdminAudit = () => {
  const dispatch = useDispatch();
  const { logs, total, page, pages, loading } = useSelector((state) => state.audit);

  const [filters, setFilters] = useState({
    search: '',
    actionType: '',
    entityType: '',
    sort: 'newest', // 'newest' | 'oldest'
    startDate: '',
    endDate: '',
    page: 1,
    limit: 15
  });

  const loadLogs = useCallback(() => {
    dispatch(fetchAuditLogs(filters));
  }, [dispatch, filters]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pages) {
      setFilters(prev => ({ ...prev, page: newPage }));
    }
  };

  const auditColumns = [
    {
      title: 'Timestamp',
      key: 'createdAt',
      render: (row) => (
        <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">
          {new Date(row.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Admin User',
      key: 'adminName',
      render: (row) => <span className="font-bold text-slate-800">{row.adminName}</span>,
    },
    {
      title: 'Action',
      key: 'action',
      render: (row) => (
        <Badge type={row.action.includes('APPROVED') || row.action.includes('ACTIVATED') ? 'success' : row.action.includes('REJECTED') || row.action.includes('SUSPENDED') || row.action.includes('BANNED') || row.action.includes('CLOSED') ? 'danger' : 'warning'}>
          {row.action}
        </Badge>
      ),
    },
    {
      title: 'Entity',
      key: 'entityType',
      render: (row) => <span className="text-xs font-bold text-slate-600">{row.entityType}</span>,
    },
    {
      title: 'Details',
      key: 'details',
      render: (row) => <span className="text-sm text-slate-700">{row.details}</span>,
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none mb-2">
          Platform Audit Logs
        </h1>
        <p className="text-sm font-semibold text-slate-400">
          Track, search, and monitor all administrative actions across the platform.
        </p>
      </div>

      <Card>
        {/* Filters Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6 pb-6 border-b border-slate-100">
          <Input
            name="search"
            placeholder="Search details or admin name..."
            value={filters.search}
            onChange={handleFilterChange}
            label="Search"
          />
          
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-1">Action Type</label>
            <select name="actionType" value={filters.actionType} onChange={handleFilterChange} className="form-input !py-2.5">
              <option value="">All Actions</option>
              <option value="USER_SUSPENDED">USER_SUSPENDED</option>
              <option value="USER_ACTIVATED">USER_ACTIVATED</option>
              <option value="USER_BANNED">USER_BANNED</option>
              <option value="COMPANY_APPROVED">COMPANY_APPROVED</option>
              <option value="COMPANY_REJECTED">COMPANY_REJECTED</option>
              <option value="COMPANY_SUSPENDED">COMPANY_SUSPENDED</option>
              <option value="JOB_PUBLISHED">JOB_PUBLISHED</option>
              <option value="JOB_CLOSED">JOB_CLOSED</option>
              <option value="JOB_PAUSED">JOB_PAUSED</option>
              <option value="JOB_HELD">JOB_HELD</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-1">Entity Type</label>
            <select name="entityType" value={filters.entityType} onChange={handleFilterChange} className="form-input !py-2.5">
              <option value="">All Entities</option>
              <option value="USER">USER</option>
              <option value="COMPANY">COMPANY</option>
              <option value="JOB">JOB</option>
            </select>
          </div>

          <Input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
            label="Start Date"
          />
          <Input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
            label="End Date"
          />

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-1">Sort Order</label>
            <select name="sort" value={filters.sort} onChange={handleFilterChange} className="form-input !py-2.5">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="mb-4 text-xs font-bold text-slate-500">
          Showing {logs.length} of {total} records
        </div>

        <Table
          columns={auditColumns}
          data={logs}
          loading={loading}
          emptyMessage="No audit logs match your filters."
        />

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => handlePageChange(page - 1)} disabled={page === 1}>
              Previous
            </Button>
            <span className="text-sm font-semibold text-slate-600">Page {page} of {pages}</span>
            <Button variant="outline" size="sm" onClick={() => handlePageChange(page + 1)} disabled={page === pages}>
              Next
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminAudit;
