import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

const normalizeNotification = (notification) => ({
  ...notification,
  isRead: notification?.isRead ?? notification?.read ?? false,
});

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchAll',
  async (_, thunkAPI) => {
    try {
      const response = await api.get('/notifications');
      return response.data.notifications;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const markAsRead = createAsyncThunk(
  'notifications/markRead',
  async (notificationId, thunkAPI) => {
    try {
      const response = await api.put(`/notifications/${notificationId}`);
      return response.data.notification;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const markAllAsRead = createAsyncThunk(
  'notifications/markAllRead',
  async (_, thunkAPI) => {
    try {
      const response = await api.put('/notifications/mark-all');
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

const initialState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = (action.payload || []).map(normalizeNotification);
        state.unreadCount = state.notifications.filter((n) => !n.isRead).length;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Mark As Read
      .addCase(markAsRead.fulfilled, (state, action) => {
        const updatedNotification = normalizeNotification(action.payload);
        if (updatedNotification) {
          const index = state.notifications.findIndex(n => n._id === updatedNotification._id);
          if (index !== -1) {
            state.notifications[index].isRead = true;
            state.unreadCount = state.notifications.filter((n) => !n.isRead).length;
          }
        }
      })

      // Mark All As Read
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.notifications.forEach(n => {
          n.isRead = true;
        });
        state.unreadCount = 0;
      });
  },
});

export default notificationSlice.reducer;
