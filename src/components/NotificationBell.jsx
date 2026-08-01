import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Check } from 'lucide-react';
import { notificationApi } from '../api';
import { getSocket } from '../lib/socket';
import { useAuth } from '../context/AuthContext';

function formatTime(date) {
  if (!date) return '';
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleDateString();
}

const typeColors = {
  success: 'border-eco-green/30 bg-eco-green/10',
  info: 'border-sky-blue/30 bg-sky-blue/10',
  warning: 'border-yellow-accent/30 bg-yellow-accent/10',
  error: 'border-soft-orange/30 bg-soft-orange/10',
};

export function NotificationBell() {
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const load = () => {
    notificationApi
      .list()
      .then(({ data }) => setNotifications(Array.isArray(data) ? data : []))
      .catch(() => setNotifications([]));
  };

  useEffect(() => {
    if (!user) return;
    load();
    const socket = getSocket();
    
    const handleNewNotification = (notification) => {
      setNotifications(prev => [notification, ...prev]);
    };

    socket.on('new_notification', handleNewNotification);
    
    const interval = setInterval(load, 20000);
    const onRefresh = () => load();
    window.addEventListener('notifications-refresh', onRefresh);
    
    return () => {
      socket.off('new_notification', handleNewNotification);
      clearInterval(interval);
      window.removeEventListener('notifications-refresh', onRefresh);
    };
  }, [user]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  const handleOpen = () => {
    setOpen((v) => !v);
    if (!open) load();
  };

  const handleNotificationClick = async (n) => {
    const id = n.id || n._id;
    if (!n.read && id) {
      try {
        await notificationApi.read(id);
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
    load();
    if (n.link) navigate(n.link);
  };

  const markAllRead = async () => {
    setLoading(true);
    try {
      await notificationApi.readAll();
      load();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={handleOpen}
        className="relative p-2 text-text-light hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-soft-orange text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[min(70vh,420px)] overflow-hidden bg-dark-card border border-white/10 rounded-xl shadow-2xl z-50 flex flex-col"
          >
            <motion.div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
              <h3 className="text-sm font-semibold text-white">Notifications</h3>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  disabled={loading}
                  className="text-xs text-eco-green hover:text-eco-light flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Mark all read
                </button>
              )}
            </motion.div>

            <motion.div className="overflow-y-auto flex-1 divide-y divide-white/5">
              {notifications.length === 0 ? (
                <p className="p-6 text-center text-sm text-text-light">No notifications yet</p>
              ) : (
                notifications.map((n) => {
                  const id = n.id || n._id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full text-left p-4 hover:bg-white/5 transition-colors ${
                        !n.read ? 'bg-white/[0.03]' : ''
                      }`}
                    >
                      <div className={`rounded-lg border p-3 ${typeColors[n.type] || typeColors.info}`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-white">{n.title}</p>
                          {!n.read && <span className="w-2 h-2 rounded-full bg-eco-green shrink-0 mt-1" />}
                        </div>
                        <p className="text-xs text-text-light mt-1 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-text-light/60 mt-2">{formatTime(n.createdAt)}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
