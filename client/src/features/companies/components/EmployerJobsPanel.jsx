import React from 'react';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';

const EmployerJobsPanel = ({ jobs, onEdit, onDuplicate, onDelete, isDashboardView }) => {
  return (
    <div className={`${isDashboardView ? 'lg:col-span-1' : ''} space-y-4`}>
      <Card title="Active Listings">
        {jobs.length === 0 ? (
          <p className="text-xs text-slate-400 font-medium">No posted jobs.</p>
        ) : (
          <div className="space-y-3.5">
            {jobs.map((job) => (
              <div key={job._id} className="p-4.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800 leading-tight mb-1 truncate max-w-[140px]">{job.title}</h4>
                  <Badge type={job.status === 'Published' ? 'success' : 'neutral'}>{job.status}</Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => onEdit(job)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                    Edit
                  </button>
                  <button onClick={() => onDuplicate(job._id)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                    Duplicate
                  </button>
                  <button onClick={() => onDelete(job._id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default EmployerJobsPanel;