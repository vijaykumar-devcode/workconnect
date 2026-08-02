import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import Select from '../../components/ui/Select';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');

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

  const uniqueRoles = Array.from(new Set(users.map(u => u.role))).filter(Boolean);
  const roleOptions = [
    { value: '', label: 'All Users' },
    ...uniqueRoles.map(role => ({
      value: role,
      label: role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
    }))
  ];

  const filteredUsers = roleFilter
    ? users.filter(u => u.role === roleFilter)
    : users;

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

      <Card 
        title="System Accounts List"
        actions={
          <div className="w-48">
            <Select
              placeholder="Filter by Category"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              options={roleOptions}
              className="!py-1.5 text-xs"
            />
          </div>
        }
      >
        <Table
          columns={userColumns}
          data={filteredUsers}
          loading={loading}
          emptyMessage={
            roleFilter
              ? "No users found matching the selected category."
              : "No user accounts registered on this system."
          }
        />
      </Card>
    </div>
  );
};

export default AdminUsers;
