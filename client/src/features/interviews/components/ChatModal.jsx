import React, { useRef, useEffect, useState } from 'react';
import { useInterview } from '../InterviewContext';
import { useTheme } from '../../../context/ThemeContext';

export default function ChatModal() {
  const { isChatOpen, toggleChat, chatHistory, sendChatMessage } = useInterview();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef(null);

  // Append-only auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isChatOpen]);

  if (!isChatOpen) return null;

  const handleSend = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      sendChatMessage(inputText.trim());
      setInputText('');
    }
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className={`w-[400px] h-[500px] rounded-xl shadow-2xl flex flex-col overflow-hidden border transition-colors duration-200 ${
        isDark
          ? 'bg-slate-900 border-slate-700'
          : 'bg-white border-gray-200'
      }`}>

        {/* Header */}
        <div className={`h-14 border-b flex items-center justify-between px-4 transition-colors duration-200 ${
          isDark ? 'border-slate-800 bg-slate-950' : 'border-gray-100 bg-gray-50'
        }`}>
          <h3 className={`font-semibold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>
            Interview Chat
          </h3>
          <button
            onClick={toggleChat}
            className={`transition-colors p-1 rounded ${
              isDark ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'
            }`}
          >
            ✕
          </button>
        </div>

        {/* Message List (Virtualized / Append Only) */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatHistory.map((msg, idx) => (
            <div key={idx} className="flex flex-col">
              <span className={`text-xs mb-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                {new Date(msg.createdAt).toLocaleTimeString()}
              </span>
              <div className={`p-3 rounded-lg text-sm break-words border ${
                isDark
                  ? 'bg-slate-800 text-slate-200 border-slate-700/50'
                  : 'bg-gray-100 text-gray-900 border-gray-200'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {chatHistory.length === 0 && (
            <div className={`h-full flex items-center justify-center text-sm ${
              isDark ? 'text-slate-500' : 'text-gray-400'
            }`}>
              No messages yet. Say hello!
            </div>
          )}
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className={`p-4 border-t flex gap-2 transition-colors duration-200 ${
          isDark ? 'border-slate-800 bg-slate-950' : 'border-gray-100 bg-gray-50'
        }`}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className={`flex-1 rounded-lg px-3 py-2 text-sm border focus:outline-none focus:border-indigo-500 transition-colors ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Send
          </button>
        </form>

      </div>
    </div>
  );
}
