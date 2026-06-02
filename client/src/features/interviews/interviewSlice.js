import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const scheduleInterview = createAsyncThunk('interviews/schedule', async (interviewData, thunkAPI) => {
  try {
    const response = await api.post('/interviews', interviewData);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const fetchInterviews = createAsyncThunk('interviews/fetchList', async (_, thunkAPI) => {
  try {
    const response = await api.get('/interviews');
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const updateInterview = createAsyncThunk('interviews/update', async ({ interviewId, updateData }, thunkAPI) => {
  try {
    const response = await api.put(`/interviews/${interviewId}`, updateData);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const submitFeedback = createAsyncThunk('interviews/feedback', async ({ interviewId, feedbackData }, thunkAPI) => {
  try {
    const response = await api.put(`/interviews/${interviewId}/feedback`, feedbackData);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

const initialState = {
  interviews: [],
  loading: false,
  error: null,
};

const interviewSlice = createSlice({
  name: 'interviews',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch List
      .addCase(fetchInterviews.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchInterviews.fulfilled, (state, action) => {
        state.loading = false;
        state.interviews = action.payload.interviews;
      })
      .addCase(fetchInterviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Schedule
      .addCase(scheduleInterview.fulfilled, (state, action) => {
        state.interviews.push(action.payload.interview);
      })
      // Update
      .addCase(updateInterview.fulfilled, (state, action) => {
        const index = state.interviews.findIndex((i) => i._id === action.payload.interview._id);
        if (index !== -1) {
          state.interviews[index] = action.payload.interview;
        }
      })
      // Feedback
      .addCase(submitFeedback.fulfilled, (state, action) => {
        const index = state.interviews.findIndex((i) => i._id === action.payload.interview._id);
        if (index !== -1) {
          state.interviews[index] = action.payload.interview;
        }
      });
  },
});

export default interviewSlice.reducer;
