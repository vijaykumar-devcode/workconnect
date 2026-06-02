import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNotifications, markAsRead, markAllAsRead } from '../../features/notifications/notificationSlice';
import { BellIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const NotificationDropdown = () => {
  const dispatch = useDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const { notifications, unreadCount, loading } = useSelector((state) => state.notifications);
  const { isAuthenticated } = useSelector((state) => state.auth);

  // Fetch notifications on mount if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchNotifications());
    }
  }, [dispatch, isAuthenticated]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = (e, id) => {
    e.stopPropagation();
    dispatch(markAsRead(id));
  };

  const handleMarkAllAsRead = (e) => {
    e.stopPropagation();
    dispatch(markAllAsRead());
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-xl bg-theme-bg border border-theme-border text-theme-text-secondary hover:text-theme-text-primary transition-colors relative"
      >
        <BellIcon className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-brand-error text-[9px] font-bold text-white shadow-sm ring-2 ring-theme-surface">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-theme-surface rounded-xl shadow-lg border border-theme-border overflow-hidden z-50 transform origin-top-right transition-all animate-fade-in">
          <div className="px-4 py-3 border-b border-theme-border flex items-center justify-between bg-theme-bg/50">
            <h3 className="text-sm font-extrabold text-theme-text-primary">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-bold text-brand-blue hover:text-brand-blue-hover transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-xs font-semibold text-theme-text-secondary">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center">
                <BellIcon className="w-10 h-10 text-theme-text-secondary opacity-30 mb-2" />
                <p className="text-sm font-semibold text-theme-text-secondary">No notifications yet</p>
                <p className="text-xs text-theme-text-secondary mt-1">When you get updates, they'll show up here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-theme-border">
                {notifications.map((notification) => (
                  <li
                    key={notification._id}
                    className={`p-4 transition-colors hover:bg-theme-bg/50 cursor-pointer ${!notification.isRead ? 'bg-brand-blue/5' : ''
                      }`}
                    onClick={(e) => {
                      if (!notification.isRead) handleMarkAsRead(e, notification._id);
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${!notification.isRead ? 'font-bold text-theme-text-primary' : 'font-semibold text-theme-text-secondary'}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-theme-text-secondary mt-1 line-clamp-2 leading-relaxed">
                          {notification.message}
                        </p>
                        <p className="text-[10px] font-bold text-theme-text-secondary/60 mt-2 uppercase tracking-wide">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <button
                          onClick={(e) => handleMarkAsRead(e, notification._id)}
                          className="shrink-0 text-brand-blue p-1 rounded-full hover:bg-brand-blue/10 transition-colors"
                          title="Mark as read"
                        >
                          <CheckCircleIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-2 border-t border-theme-border bg-theme-bg/30 text-center">
              <button
                onClick={() => setIsOpen(false)}
                className="text-xs font-bold text-theme-text-secondary hover:text-theme-text-primary transition-colors"
              >
                Close Menu
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
