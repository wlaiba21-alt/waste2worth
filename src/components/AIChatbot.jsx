

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';
import { aiApi } from '../api';

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
  { id: 1, sender: 'ai', text: 'Hi there! I\'m your AI recycling assistant. How can I help you today?' }]
  );
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Add user message
    const userMsg = { id: Date.now(), sender: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const { data } = await aiApi.chat(userMsg.text);
      setMessages((prev) => [...prev, { id: Date.now(), sender: 'ai', text: data.response }]);
    } catch (error) {
      console.error('AI Chat Error:', error);
      setMessages((prev) => [...prev, { id: Date.now(), sender: 'ai', text: 'I\'m sorry, I couldn\'t respond right now. Please try again later!' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        className="fixed bottom-6 right-6 w-14 h-14 bg-eco-green rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:scale-110 transition-transform z-50"
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        initial={{ scale: 0 }}
        animate={{ scale: isOpen ? 0 : 1 }}>
        
        <MessageSquare className="w-6 h-6 text-white" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen &&
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-6 right-6 w-[350px] h-[500px] glass-card flex flex-col overflow-hidden z-50 border-white/20 bg-dark-bg/95">
          
            {/* Header */}
            <div className="bg-dark-card border-b border-white/10 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-eco-green/20 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-eco-green" />
                </div>
                <div>
                  <h3 className="font-poppins font-medium text-white text-sm">AI Assistant</h3>
                  <p className="text-xs text-eco-green">Online</p>
                </div>
              </div>
              <button
              onClick={() => setIsOpen(false)}
              className="text-text-light hover:text-white transition-colors">
              
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {messages.map((msg) =>
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
              
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 ${
              msg.sender === 'user' ? 'bg-sky-blue/20' : 'bg-eco-green/20'}`
              }>
                    {msg.sender === 'user' ?
                <User className="w-3 h-3 text-sky-blue" /> :
                <Bot className="w-3 h-3 text-eco-green" />
                }
                  </div>
                  <div className={`p-3 rounded-2xl text-sm ${
              msg.sender === 'user' ?
              'bg-sky-blue text-white rounded-tr-sm' :
              'bg-dark-card border border-white/5 text-text-light rounded-tl-sm'}`
              }>
                    {msg.text}
                  </div>
                </div>
            )}
            {isLoading && (
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-6 h-6 bg-eco-green/20 rounded-full flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-3 h-3 text-eco-green" />
                </div>
                <div className="p-3 rounded-2xl text-sm bg-dark-card border border-white/5 text-text-light rounded-tl-sm">
                  Thinking...
                </div>
              </div>
            )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 border-t border-white/10 bg-dark-card">
              <div className="relative">
                <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about recycling..."
                className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-eco-green transition-colors" />
              
                <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-eco-green rounded-full flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-eco-deep transition-colors">
                
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        }
      </AnimatePresence>
    </>);

}