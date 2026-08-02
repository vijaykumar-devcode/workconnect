import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import { CircleHelp, Send, LifeBuoy } from 'lucide-react';

const CandidateSupport = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const response = await api.get('/support/my');
      setTickets(response.data?.tickets || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSubmitting(true);
    try {
      await api.post('/support', { subject, message });
      setSubject('');
      setMessage('');
      await loadTickets();
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Subject',
      key: 'subject',
      render: (row) => <span className="font-bold text-slate-800">{row.subject || 'Support Ticket'}</span>,
    },
    {
      title: 'Status',
      key: 'status',
      render: (row) => <Badge type={row.status === 'Closed' ? 'success' : row.status === 'Open' ? 'info' : 'neutral'}>{row.status}</Badge>,
    },
    {
      title: 'Updated',
      key: 'updatedAt',
      render: (row) => <span className="text-sm text-slate-500">{new Date(row.updatedAt || row.createdAt).toLocaleString()}</span>,
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none mb-2 flex items-center gap-2">
          <CircleHelp className="text-brand-500" size={28} /> Help Desk Support
        </h1>
        <p className="text-sm font-semibold text-slate-400">
          Open support tickets, track their status, and keep communication in one place.
        </p>
      </div>

      <Card title="Create Support Ticket" subtitle="Describe the issue and the support team will review it.">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
          <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Message</label>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="form-input min-h-30"
              placeholder="Describe your issue"
              required
            />
          </div>
          <Button type="submit" variant="primary" disabled={submitting}>
            <Send size={16} className="mr-1.5" /> {submitting ? 'Submitting...' : 'Submit Ticket'}
          </Button>
        </form>
      </Card>

      <Card title="My Tickets" subtitle="Track previously opened support requests.">
        <Table
          columns={columns}
          data={tickets}
          loading={loading}
          emptyMessage="No support tickets submitted yet."
        />
      </Card>

      <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
        <LifeBuoy size={14} /> Support tickets are submitted directly through the shared API wrapper.
      </div>
    </div>
  );
};

export default CandidateSupport;