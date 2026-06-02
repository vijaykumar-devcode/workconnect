import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';

// Mock socket.io-client's named export `io`
vi.mock('socket.io-client', () => {
  return {
    io: vi.fn(() => ({ on: vi.fn(), emit: vi.fn(), disconnect: vi.fn() }))
  };
});

// Mock the API module used for fetching LiveKit token
vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(() => Promise.resolve({ data: { token: 'livekit-token' } }))
  }
}));

import * as socketClient from 'socket.io-client';
import { InterviewProvider } from './InterviewContext';

describe('InterviewContext socket initialization', () => {
  beforeEach(() => {
    localStorage.clear();
    socketClient.io.mockClear();
  });

  it('does not connect if accessToken missing', async () => {
    render(
      <InterviewProvider interviewId="i1" userId="u1" role="candidate">
        <div>child</div>
      </InterviewProvider>
    );

    await waitFor(() => {
      expect(socketClient.io).not.toHaveBeenCalled();
    });
  });

  it('connects with auth token when accessToken present', async () => {
    localStorage.setItem('accessToken', 'test-token');

    render(
      <InterviewProvider interviewId="i1" userId="u1" role="candidate">
        <div>child</div>
      </InterviewProvider>
    );

    await waitFor(() => {
      expect(socketClient.io).toHaveBeenCalledWith('http://localhost:5000', { auth: { token: 'test-token' } });
    });
  });
});
