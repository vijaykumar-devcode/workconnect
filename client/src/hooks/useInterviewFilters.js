import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export const useInterviewFilters = (interviews = [], userType = 'employer') => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Extract unique options
  const jobRoles = useMemo(() => {
    const roles = interviews.map(i => i.application?.job?.title).filter(Boolean);
    return [...new Set(roles)];
  }, [interviews]);

  const statuses = useMemo(() => {
    const stats = interviews.map(i => i.status).filter(Boolean);
    return [...new Set(stats)];
  }, [interviews]);

  // Current filter values from URL
  const nameQuery = searchParams.get('name') || '';
  const roleQuery = searchParams.get('role') || '';
  const statusQuery = searchParams.get('status') || '';
  const dateQuery = searchParams.get('date') || ''; // Format: YYYY-MM-DD

  // Local state for debouncing the text input
  const [localName, setLocalName] = useState(nameQuery);

  useEffect(() => {
    // If URL param changed externally, update local state
    if (nameQuery !== localName && !localName && nameQuery) {
      setLocalName(nameQuery);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParams(prev => {
        if (localName) {
          prev.set('name', localName);
        } else {
          prev.delete('name');
        }
        return prev;
      });
    }, 400); // 400ms debounce
    return () => clearTimeout(timer);
  }, [localName, setSearchParams]);

  // Dropdown / date setters
  const setRole = (role) => {
    setSearchParams(prev => {
      if (role) prev.set('role', role); else prev.delete('role');
      return prev;
    });
  };

  const setStatus = (status) => {
    setSearchParams(prev => {
      if (status) prev.set('status', status); else prev.delete('status');
      return prev;
    });
  };

  const setDate = (dateStr) => {
    setSearchParams(prev => {
      if (dateStr) prev.set('date', dateStr); else prev.delete('date');
      return prev;
    });
  };

  const clearFilters = () => {
    setLocalName('');
    setSearchParams({});
  };

  const removeFilter = (key) => {
    if (key === 'name') setLocalName('');
    setSearchParams(prev => {
      prev.delete(key);
      return prev;
    });
  };

  const activeFiltersCount = ['name', 'role', 'status', 'date'].filter(k => searchParams.has(k)).length;

  const activeFiltersList = [];
  if (nameQuery) activeFiltersList.push({ key: 'name', label: `Search: ${nameQuery}` });
  if (roleQuery) activeFiltersList.push({ key: 'role', label: `Role: ${roleQuery}` });
  if (statusQuery) activeFiltersList.push({ key: 'status', label: `Status: ${statusQuery}` });
  if (dateQuery) activeFiltersList.push({ key: 'date', label: `Date: ${dateQuery}` });

  // Apply filters using AND logic
  const filteredInterviews = useMemo(() => {
    return interviews.filter(interview => {
      let matches = true;

      // 1. Name match (Candidate Name for Employers, Company Name for Candidates)
      if (nameQuery) {
        const targetName = userType === 'employer' 
          ? interview.candidate?.name 
          : interview.application?.job?.company?.name;
        
        if (!targetName || !targetName.toLowerCase().includes(nameQuery.toLowerCase())) {
          matches = false;
        }
      }

      // 2. Role match (exact)
      if (matches && roleQuery) {
        if (interview.application?.job?.title !== roleQuery) matches = false;
      }

      // 3. Status match (exact)
      if (matches && statusQuery) {
        if (interview.status !== statusQuery) matches = false;
      }

      // 4. Date match (exact YYYY-MM-DD match for local time of the interview)
      if (matches && dateQuery) {
        if (interview.date) {
          // Convert to local YYYY-MM-DD string to match the date picker
          const dateObj = new Date(interview.date);
          // Account for local timezone offset
          const localDateStr = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000))
            .toISOString()
            .split('T')[0];

          if (localDateStr !== dateQuery) matches = false;
        } else {
          matches = false;
        }
      }

      return matches;
    });
  }, [interviews, nameQuery, roleQuery, statusQuery, dateQuery, userType]);

  return {
    filteredInterviews,
    jobRoles,
    statuses,
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
    activeFiltersList
  };
};
