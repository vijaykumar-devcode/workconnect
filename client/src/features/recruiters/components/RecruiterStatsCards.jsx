import React from 'react';
import Card from '../../../components/ui/Card';
import { Briefcase, Users, ClipboardCheck, Calendar } from 'lucide-react';

const RecruiterStatsCards = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
      <Card title="Assigned Jobs" subtitle="Active Listings" bodyClassName="flex items-center justify-between !py-4">
        <span className="text-3xl font-black text-slate-800">{stats.totalAssignedJobs}</span>
        <Briefcase className="text-brand-500" size={32} />
      </Card>
      <Card title="Interviews" subtitle="Live Panels Pending" bodyClassName="flex items-center justify-between !py-4">
        <span className="text-3xl font-black text-slate-800">{stats.activeInterviews}</span>
        <Calendar className="text-indigo-500" size={32} />
      </Card>
      <Card title="Screened" subtitle="Candidates Checked" bodyClassName="flex items-center justify-between !py-4">
        <span className="text-3xl font-black text-slate-800">{stats.candidatesScreened}</span>
        <Users className="text-emerald-500" size={32} />
      </Card>
      <Card title="Hires" subtitle="Successful Fill Rate" bodyClassName="flex items-center justify-between !py-4">
        <span className="text-3xl font-black text-slate-800">{stats.hiresMade}</span>
        <ClipboardCheck className="text-amber-500" size={32} />
      </Card>
    </div>
  );
};

export default RecruiterStatsCards;