import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const applyToJob = createAsyncThunk('applications/apply', async ({ jobId, applicationData }, thunkAPI) => {
  try {
    const response = await api.post(`/applications/apply/${jobId}`, applicationData);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const fetchApplications = createAsyncThunk('applications/fetchList', async (params = {}, thunkAPI) => {
  try {
    const query = new URLSearchParams(params).toString();
    const response = await api.get(`/applications?${query}`);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const fetchApplicationById = createAsyncThunk('applications/fetchById', async (appId, thunkAPI) => {
  try {
    const response = await api.get(`/applications/${appId}`);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const updateApplicationStage = createAsyncThunk('applications/updateStage', async ({ appId, stage }, thunkAPI) => {
  try {
    const response = await api.put(`/applications/${appId}/stage`, { stage });
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const updateAssessment = createAsyncThunk('applications/updateAssessment', async ({ appId, score, status }, thunkAPI) => {
  try {
    const response = await api.put(`/applications/${appId}/assessment`, { score, status });
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const addComment = createAsyncThunk('applications/addComment', async ({ appId, comment }, thunkAPI) => {
  try {
    const response = await api.post(`/applications/${appId}/comments`, { comment });
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const uploadOnboardingDoc = createAsyncThunk('applications/uploadDoc', async ({ appId, docType, fileUrl }, thunkAPI) => {
  try {
    const response = await api.post(`/applications/${appId}/onboarding`, { docType, fileUrl });
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const verifyOnboardingDoc = createAsyncThunk('applications/verifyDoc', async ({ appId, docId, status }, thunkAPI) => {
  try {
    const response = await api.put(`/applications/${appId}/onboarding/${docId}/verify`, { status });
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

const initialState = {
  applications: [],
  currentApplication: null,
  totalApplications: 0,
  page: 1,
  pages: 1,
  loading: false,
  error: null,
};

const applicationSlice = createSlice({
  name: 'applications',
  initialState,
  reducers: {
    clearCurrentApplication: (state) => {
      state.currentApplication = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch List
      .addCase(fetchApplications.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchApplications.fulfilled, (state, action) => {
        state.loading = false;
        state.applications = action.payload.applications;
        state.totalApplications = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchApplications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch By ID
      .addCase(fetchApplicationById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchApplicationById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentApplication = action.payload.application;
      })
      .addCase(fetchApplicationById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Stage
      .addCase(updateApplicationStage.fulfilled, (state, action) => {
        if (state.currentApplication && state.currentApplication._id === action.payload.application._id) {
          state.currentApplication = action.payload.application;
        }
        const index = state.applications.findIndex((a) => a._id === action.payload.application._id);
        if (index !== -1) {
          state.applications[index] = action.payload.application;
        }
      })
      // Comments
      .addCase(addComment.fulfilled, (state, action) => {
        if (state.currentApplication && state.currentApplication._id === action.payload.application._id) {
          state.currentApplication = action.payload.application;
        }
      })
      // Onboarding uploads
      .addCase(uploadOnboardingDoc.fulfilled, (state, action) => {
        if (state.currentApplication && state.currentApplication._id === action.payload.application._id) {
          state.currentApplication = action.payload.application;
        }
      })
      // Onboarding verification
      .addCase(verifyOnboardingDoc.fulfilled, (state, action) => {
        if (state.currentApplication && state.currentApplication._id === action.payload.application._id) {
          state.currentApplication = action.payload.application;
        }
      });
  },
});

export const { clearCurrentApplication } = applicationSlice.actions;
export default applicationSlice.reducer;
