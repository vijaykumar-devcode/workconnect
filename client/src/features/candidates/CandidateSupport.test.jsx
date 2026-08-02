import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, beforeEach, expect } from 'vitest';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: { tickets: [] } })),
    post: vi.fn(() => Promise.resolve({ success: true })),
  },
}));

import api from '../../services/api';
import CandidateSupport from './CandidateSupport';

describe('CandidateSupport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the support desk and loads tickets from the shared API', async () => {
    render(<CandidateSupport />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/support/my');
    });

    expect(screen.getByText(/Help Desk Support/i)).toBeTruthy();
    expect(screen.getByText(/Create Support Ticket/i)).toBeTruthy();
    expect(screen.getByText(/My Tickets/i)).toBeTruthy();
  });
});