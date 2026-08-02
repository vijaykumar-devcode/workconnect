import React from 'react';
import { Search, X, Filter } from 'lucide-react';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';

const InterviewFilterBar = ({
  jobRoles = [],
  statuses = [],
  localName,
  setLocalName,
  roleQuery,
  setRole,
  statusQuery,
  setStatus,
  dateQuery,
  setDate,
  clearFilters,
  removeFilter,
  activeFiltersCount,
  activeFiltersList,
  userType = 'employer' // 'employer' or 'candidate'
}) => {
  return (
    <div className="bg-theme-surface border border-theme-border rounded-xl p-4 mb-6 space-y-4 shadow-sm animate-fade-in">
      {/* ── Filter Inputs Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Input
          label={userType === 'employer' ? 'Candidate Name' : 'Company Name'}
          placeholder="Search by name..."
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          icon={<Search size={16} />}
        />

        <Select
          label="Job Role"
          value={roleQuery}
          onChange={(e) => setRole(e.target.value)}
          placeholder="All Roles"
          options={jobRoles.map((role) => ({ label: role, value: role }))}
        />

        <Select
          label="Status"
          value={statusQuery}
          onChange={(e) => setStatus(e.target.value)}
          placeholder="All Statuses"
          options={statuses.map((s) => ({ label: s, value: s }))}
        />

        <Input
          label="Interview Date"
          type="date"
          value={dateQuery}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {/* ── Active Filters & Reset ── */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-theme-border/50">
          <span className="text-xs font-semibold text-theme-text-secondary flex items-center gap-1.5 mr-2">
            <Filter size={14} /> Active Filters ({activeFiltersCount}):
          </span>

          {activeFiltersList.map((filter) => (
            <span
              key={filter.key}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-bold"
            >
              {filter.label}
              <button
                onClick={() => removeFilter(filter.key)}
                className="hover:bg-brand-200 p-0.5 rounded-full transition-colors text-brand-600 hover:text-brand-800"
                aria-label={`Remove ${filter.label} filter`}
              >
                <X size={12} strokeWidth={3} />
              </button>
            </span>
          ))}

          <Button 
            variant="ghost" 
            size="sm" 
            className="ml-auto text-xs !py-1 !px-2 text-slate-500 hover:text-slate-700" 
            onClick={clearFilters}
          >
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
};

export default InterviewFilterBar;
