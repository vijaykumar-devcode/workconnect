import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const createOffer = createAsyncThunk('offers/create', async (offerData, thunkAPI) => {
  try {
    const response = await api.post('/offers', offerData);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const fetchOffers = createAsyncThunk('offers/fetchList', async (_, thunkAPI) => {
  try {
    const response = await api.get('/offers');
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const fetchOfferById = createAsyncThunk('offers/fetchById', async (offerId, thunkAPI) => {
  try {
    const response = await api.get(`/offers/${offerId}`);
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

export const updateOfferStatus = createAsyncThunk('offers/updateStatus', async ({ offerId, status }, thunkAPI) => {
  try {
    const response = await api.put(`/offers/${offerId}/status`, { status });
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});

const initialState = {
  offers: [],
  currentOffer: null,
  loading: false,
  error: null,
};

const offerSlice = createSlice({
  name: 'offers',
  initialState,
  reducers: {
    clearCurrentOffer: (state) => {
      state.currentOffer = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch List
      .addCase(fetchOffers.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchOffers.fulfilled, (state, action) => {
        state.loading = false;
        state.offers = action.payload.offers;
      })
      .addCase(fetchOffers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch By Id
      .addCase(fetchOfferById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchOfferById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOffer = action.payload.offer;
      })
      .addCase(fetchOfferById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create Offer
      .addCase(createOffer.fulfilled, (state, action) => {
        state.offers.unshift(action.payload.offer);
      })
      // Update Offer Status
      .addCase(updateOfferStatus.fulfilled, (state, action) => {
        if (state.currentOffer && state.currentOffer._id === action.payload.offer._id) {
          state.currentOffer = action.payload.offer;
        }
        const index = state.offers.findIndex((o) => o._id === action.payload.offer._id);
        if (index !== -1) {
          state.offers[index] = action.payload.offer;
        }
      });
  },
});

export const { clearCurrentOffer } = offerSlice.actions;
export default offerSlice.reducer;
