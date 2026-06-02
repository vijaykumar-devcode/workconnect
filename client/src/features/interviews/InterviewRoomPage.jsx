import React from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { InterviewProvider } from './InterviewContext';
import InterviewLayout from './InterviewLayout';

const InterviewRoomPage = () => {
  const { id } = useParams();
  const { user } = useSelector((state) => state.auth);

  if (!user) return null;

  return (
    <InterviewProvider interviewId={id} userId={user._id} role={user.role}>
      <InterviewLayout interviewId={id} />
    </InterviewProvider>
  );
};

export default InterviewRoomPage;
