import React from 'react';
import Card from '../../../components/ui/Card';
import { Briefcase, Users, CheckCircle } from 'lucide-react';

const EmployerStatsCards = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      <Card title="Posted Jobs" subtitle="Active Listings" bodyClassName="flex items-center justify-between !py-4">
        <span className="text-3xl font-black text-slate-800">{stats.totalJobs}</span>
        <Briefcase className="text-brand-500" size={32} />
      </Card>
      <Card title="Applicants" subtitle="Total Received" bodyClassName="flex items-center justify-between !py-4">
        <span className="text-3xl font-black text-slate-800">{stats.totalApplications}</span>
        <Users className="text-indigo-500" size={32} />
      </Card>
      <Card title="Hired" subtitle="Successfully Onboarded" bodyClassName="flex items-center justify-between !py-4">
        <span className="text-3xl font-black text-slate-800">{stats.hires}</span>
        <CheckCircle className="text-emerald-500" size={32} />
      </Card>
    </div>
  );
};

export default EmployerStatsCards;