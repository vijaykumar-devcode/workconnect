import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchJobs = createAsyncThunk('jobs/fetchJobs', async (params, thunkAPI) => {
  try {
    // Convert params object to query string
    const query = new URLSearchParams(params).toString();
    const response = await api.get(`/jobs?${query}`);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const fetchJobById = createAsyncThunk('jobs/fetchJobById', async (jobId, thunkAPI) => {
  try {
    const response = await api.get(`/jobs/${jobId}`);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const createJob = createAsyncThunk('jobs/createJob', async (jobData, thunkAPI) => {
  try {
    const response = await api.post('/jobs', jobData);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const updateJob = createAsyncThunk('jobs/updateJob', async ({ jobId, jobData }, thunkAPI) => {
  try {
    const response = await api.put(`/jobs/${jobId}`, jobData);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const deleteJob = createAsyncThunk('jobs/deleteJob', async (jobId, thunkAPI) => {
  try {
    await api.delete(`/jobs/${jobId}`);
    return jobId;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const duplicateJob = createAsyncThunk('jobs/duplicateJob', async (jobId, thunkAPI) => {
  try {
    const response = await api.post(`/jobs/${jobId}/duplicate`);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const assignRecruiter = createAsyncThunk('jobs/assignRecruiter', async ({ jobId, recruiterId }, thunkAPI) => {
  try {
    const response = await api.put(`/jobs/${jobId}/assign`, { recruiterId });
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

// Admin Moderation
export const moderateJob = createAsyncThunk('jobs/moderateJob', async ({ jobId, status }, thunkAPI) => {
  try {
    const response = await api.put(`/jobs/${jobId}/moderate`, { status });
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const fetchAllJobsAdmin = createAsyncThunk('jobs/fetchAllAdmin', async (_, thunkAPI) => {
  try {
    const response = await api.get('/jobs/admin/all');
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

const initialState = {
  jobs: [],
  currentJob: null,
  totalJobs: 0,
  page: 1,
  pages: 1,
  loading: false,
  error: null,
};

const jobSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    clearCurrentJob: (state) => {
      state.currentJob = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Jobs
      .addCase(fetchJobs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.loading = false;
        state.jobs = action.payload.jobs;
        state.totalJobs = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Job By Id
      .addCase(fetchJobById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchJobById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentJob = action.payload.job;
      })
      .addCase(fetchJobById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create Job
      .addCase(createJob.fulfilled, (state, action) => {
        state.jobs.unshift(action.payload.job);
      })
      // Update Job
      .addCase(updateJob.fulfilled, (state, action) => {
        const index = state.jobs.findIndex((j) => j._id === action.payload.job._id);
        if (index !== -1) {
          state.jobs[index] = action.payload.job;
        }
        if (state.currentJob && state.currentJob._id === action.payload.job._id) {
          state.currentJob = action.payload.job;
        }
      })
      // Delete Job
      .addCase(deleteJob.fulfilled, (state, action) => {
        state.jobs = state.jobs.filter((j) => j._id !== action.payload);
      })
      // Duplicate Job
      .addCase(duplicateJob.fulfilled, (state, action) => {
        state.jobs.unshift(action.payload.job);
      })
      // Assign Recruiter
      .addCase(assignRecruiter.fulfilled, (state, action) => {
        if (state.currentJob && state.currentJob._id === action.payload.job._id) {
          state.currentJob = action.payload.job;
        }
      })
      // Admin Fetch All Jobs
      .addCase(fetchAllJobsAdmin.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAllJobsAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.jobs = action.payload.jobs;
      })
      .addCase(fetchAllJobsAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Moderate Job
      .addCase(moderateJob.fulfilled, (state, action) => {
        const index = state.jobs.findIndex((j) => j._id === action.payload.job._id);
        if (index !== -1) {
          state.jobs[index] = action.payload.job;
        }
      });
  },
});

export const { clearCurrentJob } = jobSlice.actions;
export default jobSlice.reducer;
