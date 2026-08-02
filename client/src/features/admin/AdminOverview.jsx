import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Users, Building, Briefcase, FileText } from 'lucide-react';

const AdminOverview = () => {
  const [analytics, setAnalytics] = useState({
    stats: { totalUsers: 0, totalCandidates: 0, totalRecruiters: 0, totalEmployers: 0, totalJobs: 0, activeJobs: 0, totalApplications: 0 },
    signupTrend: [],
    jobPostingTrend: []
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = () => {
    api.get('/analytics')
      .then(res => {
        if (res.success && res.data) {
          setAnalytics(res.data);
        }
      })

  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none mb-2">
          Administrator Overview
        </h1>
        <p className="text-sm font-semibold text-slate-400">
          High-level metrics and platform growth analytics
        </p>
      </div>

      {/* Aggregate Counts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Registered Users" subtitle="System Accounts" bodyClassName="flex items-center justify-between !py-4">
          <span className="text-3xl font-black text-slate-800">{analytics.stats.totalUsers}</span>
          <Users className="text-brand-500" size={32} />
        </Card>
        <Card title="Company accounts" subtitle="Corporate Signups" bodyClassName="flex items-center justify-between !py-4">
          <span className="text-3xl font-black text-slate-800">{analytics.stats.totalEmployers}</span>
          <Building className="text-indigo-500" size={32} />
        </Card>
        <Card title="Job Postings" subtitle="All System Listings" bodyClassName="flex items-center justify-between !py-4">
          <span className="text-3xl font-black text-slate-800">{analytics.stats.totalJobs}</span>
          <Briefcase className="text-emerald-500" size={32} />
        </Card>
        <Card title="Job Applications" subtitle="ATS Submissions" bodyClassName="flex items-center justify-between !py-4">
          <span className="text-3xl font-black text-slate-800">{analytics.stats.totalApplications}</span>
          <FileText className="text-amber-500" size={32} />
        </Card>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title="Monthly User Signups" subtitle="Candidate and employer registrations">
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.signupTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} fontWeight={600} />
                <YAxis stroke="#94a3b8" fontSize={11} fontWeight={600} />
                <Tooltip />
                <Area type="monotone" dataKey="users" stroke="#4f6eff" fillOpacity={0.1} fill="#4f6eff" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Monthly Job Postings" subtitle="Published opportunities across the platform">
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.jobPostingTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} fontWeight={600} />
                <YAxis stroke="#94a3b8" fontSize={11} fontWeight={600} />
                <Tooltip />
                <Area type="monotone" dataKey="jobs" stroke="#6366f1" fillOpacity={0.1} fill="#6366f1" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminOverview;
