import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const registerCompany = createAsyncThunk('companies/register', async (companyData, thunkAPI) => {
  try {
    const response = await api.post('/companies', companyData);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const fetchMyCompany = createAsyncThunk('companies/fetchMy', async (_, thunkAPI) => {
  try {
    const response = await api.get('/companies/my');
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const updateMyCompany = createAsyncThunk('companies/updateMy', async (companyData, thunkAPI) => {
  try {
    const response = await api.put('/companies/my', companyData);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const addRecruiter = createAsyncThunk('companies/addRecruiter', async (recruiterData, thunkAPI) => {
  try {
    const response = await api.post('/companies/recruiters', recruiterData);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const removeRecruiter = createAsyncThunk('companies/removeRecruiter', async (recruiterId, thunkAPI) => {
  try {
    await api.delete(`/companies/recruiters/${recruiterId}`);
    return recruiterId;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

// Admin Actions
export const fetchAllCompaniesAdmin = createAsyncThunk('companies/fetchAllAdmin', async (_, thunkAPI) => {
  try {
    const response = await api.get('/companies');
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const verifyCompany = createAsyncThunk('companies/verify', async ({ companyId, isVerified }, thunkAPI) => {
  try {
    const response = await api.put(`/companies/${companyId}/verify`, { isVerified });
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

const initialState = {
  company: null,
  companies: [],
  loading: false,
  error: null,
};

const companySlice = createSlice({
  name: 'companies',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(registerCompany.pending, (state) => {
        state.loading = true;
      })
      .addCase(registerCompany.fulfilled, (state, action) => {
        state.loading = false;
        state.company = action.payload.company;
      })
      .addCase(registerCompany.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch My Company
      .addCase(fetchMyCompany.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMyCompany.fulfilled, (state, action) => {
        state.loading = false;
        state.company = action.payload.company;
      })
      .addCase(fetchMyCompany.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update My Company
      .addCase(updateMyCompany.fulfilled, (state, action) => {
        state.company = action.payload.company;
      })
      // Add Recruiter
      .addCase(addRecruiter.fulfilled, (state, action) => {
        if (state.company) {
          if (!state.company.recruiters) state.company.recruiters = [];
          state.company.recruiters.push(action.payload.recruiter);
        }
      })
      // Remove Recruiter
      .addCase(removeRecruiter.fulfilled, (state, action) => {
        if (state.company && state.company.recruiters) {
          state.company.recruiters = state.company.recruiters.filter(
            (r) => r._id !== action.payload
          );
        }
      })
      // Admin Fetch All Companies
      .addCase(fetchAllCompaniesAdmin.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAllCompaniesAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.companies = action.payload.companies;
      })
      .addCase(fetchAllCompaniesAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Admin Verify Company
      .addCase(verifyCompany.fulfilled, (state, action) => {
        const index = state.companies.findIndex((c) => c._id === action.payload.company._id);
        if (index !== -1) {
          state.companies[index] = action.payload.company;
        }
      });
  },
});

export default companySlice.reducer;
