import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import Select from '../../components/ui/Select';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/users');
      if (res.success) setUsers(res.data.users);
    } catch (err) {
      
    } finally {
      setLoading(false);
    }
  };

  const handleUserStatusChange = async (userId, newStatus) => {
    if (!window.confirm(`Change this user's status to ${newStatus}?`)) return;
    try {
      await api.put(`/auth/users/${userId}/status`, { status: newStatus });
      alert(`User status changed to ${newStatus}`);
      loadUsers();
    } catch (err) {
      alert(err);
    }
  };

  const userColumns = [
    {
      title: 'Full Name',
      key: 'name',
      render: (row) => <span className="font-bold text-slate-800">{row.name}</span>,
    },
    {
      title: 'Email',
      key: 'email',
    },
    {
      title: 'Active Role',
      key: 'role',
      render: (row) => <Badge type="info">{row.role}</Badge>,
    },
    {
      title: 'Status',
      key: 'status',
      render: (row) => {
        const types = { ACTIVE: 'success', SUSPENDED: 'warning', BANNED: 'danger', PENDING: 'neutral' };
        return <Badge type={types[row.status] || 'neutral'}>{row.status}</Badge>;
      },
    },
    {
      title: 'Moderate',
      key: 'actions',
      render: (row) => (
        <Select
          placeholder="Set Account Status"
          options={[
            { value: 'ACTIVE', label: 'Activate Account' },
            { value: 'SUSPENDED', label: 'Suspend Session' },
            { value: 'BANNED', label: 'Ban Account permanently' }
          ]}
          onChange={(e) => handleUserStatusChange(row._id, e.target.value)}
          className="!py-1 text-xs"
        />
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none mb-2">
          User Control Center
        </h1>
        <p className="text-sm font-semibold text-slate-400">
          Manage system accounts, moderate access, and enforce platform security policies
        </p>
      </div>

      <Card title="System Accounts List">
        <Table
          columns={userColumns}
          data={users}
          loading={loading}
          emptyMessage="No user accounts registered on this system."
        />
      </Card>
    </div>
  );
};

export default AdminUsers;
