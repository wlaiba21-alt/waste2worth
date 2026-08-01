import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Send, ArrowLeft, Check, CheckCheck } from 'lucide-react';
import { chatApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../lib/socket';

export function ChatPage() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const socketRef = useRef(null);

  const loadThreads = () => {
    chatApi.threads().then(({ data }) => setThreads(data));
  };

  useEffect(() => {
    loadThreads();
  }, []);

  useEffect(() => {
    if (!threadId && threads.length > 0 && !activeThread) {
      navigate(`/chat/${threads[0].threadId}`, { replace: true });
    }
  }, [threads, threadId]);

  useEffect(() => {
    const id = threadId || activeThread?.threadId;
    if (!id) return;

    chatApi.messages(id).then(({ data }) => {
      setActiveThread(data);
      setMessages(data.messages || []);
    });

    const socket = getSocket();
    socketRef.current = socket;
    socket.emit('join_thread', id);
    const onMessage = (msg) => {
      if (msg.threadId !== id && msg.threadId !== String(id)) return;
      setMessages((prev) => {
        const msgId = String(msg.id);
        if (prev.some((m) => String(m.id) === msgId)) return prev;
        return [...prev, msg];
      });
    };
    socket.on('new_message', onMessage);
    return () => socket.off('new_message', onMessage);
  }, [threadId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !threadId || !currentUser) return;
    const text = input.trim();
    setInput('');
    try {
      const { data } = await chatApi.sendMessage(threadId, text);
      setMessages((prev) => {
        const msgId = String(data.id);
        if (prev.some((m) => String(m.id) === msgId)) return prev;
        return [
          ...prev,
          {
            id: data.id,
            senderId: data.senderId,
            text: data.text,
            timestamp: data.timestamp,
            seen: data.seen,
            threadId,
          },
        ];
      });
      loadThreads();
      window.dispatchEvent(new Event('notifications-refresh'));
    } catch (err) {
      console.error('Failed to send message:', err);
      setInput(text);
    }
  };

  const other = threads.find((t) => t.threadId === threadId)?.otherParticipant;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[calc(100vh-8rem)] flex glass-card overflow-hidden">
      <div className={`w-full md:w-80 border-r border-white/10 flex flex-col ${threadId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-white/10">
          <h2 className="font-semibold text-white">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.map((t) => (
            <div
              key={t.threadId}
              onClick={() => navigate(`/chat/${t.threadId}`)}
              className={`p-4 border-b border-white/5 cursor-pointer flex gap-3 ${threadId === t.threadId ? 'bg-eco-green/10' : 'hover:bg-white/5'}`}
            >
              <img src={t.otherParticipant?.avatar || 'https://ui-avatars.com/api/?name=U'} alt="" className="w-10 h-10 rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{t.otherParticipant?.name}</p>
                <p className="text-xs text-text-light truncate">{t.lastMessage}</p>
              </div>
              {t.unread > 0 && <span className="bg-eco-green text-xs px-2 py-0.5 rounded-full">{t.unread}</span>}
            </div>
          ))}
        </div>
      </div>

      <div className={`flex-1 flex flex-col ${!threadId ? 'hidden md:flex' : 'flex'}`}>
        {threadId ? (
          <>
            <div className="p-4 border-b border-white/10 flex items-center gap-3">
              <button onClick={() => navigate('/chat')} className="md:hidden p-2"><ArrowLeft className="w-5 h-5" /></button>
              <img src={other?.avatar || 'https://ui-avatars.com/api/?name=V'} alt="" className="w-8 h-8 rounded-full" />
              <p className="font-medium text-white">{other?.name || 'Chat'}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m, idx) => {
                const isMe =
                  String(m.senderId) === String(currentUser?.id) ||
                  String(m.senderId) === String(currentUser?._id);
                return (
                  <motion.div
                    key={m.id || `${m.timestamp}-${idx}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-eco-green text-white rounded-br-sm' : 'bg-white/10 text-text-light rounded-bl-sm'}`}>
                      {m.text}
                      <div className="flex justify-end mt-1 opacity-60">{m.seen ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            <form onSubmit={handleSend} className="p-4 border-t border-white/10 flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 glass-input rounded-full" placeholder="Type a message..." />
              <button type="submit" className="p-3 bg-eco-green rounded-full text-white"><Send className="w-4 h-4" /></button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-light">Select a conversation</div>
        )}
      </div>
    </motion.div>
  );
}
