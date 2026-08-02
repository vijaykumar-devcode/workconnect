import React from 'react';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';

const RecruiterJobsPanel = ({ jobs }) => {
  return (
    <div className="lg:col-span-1">
      <Card title="Assigned Job Openings">
        {jobs.length === 0 ? (
          <p className="text-xs text-slate-400 font-medium">No jobs assigned yet.</p>
        ) : (
          <div className="space-y-3.5">
            {jobs.map((job) => (
              <div key={job._id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <h4 className="text-sm font-extrabold text-slate-800 leading-tight mb-1">{job.title}</h4>
                <p className="text-xs font-semibold text-slate-400">{job.company?.name || 'Acme Tech'}</p>
                <div className="mt-2">
                  <Badge type="info">{job.workMode}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default RecruiterJobsPanel;