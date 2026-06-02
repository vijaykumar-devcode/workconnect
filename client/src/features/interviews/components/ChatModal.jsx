import React, { useRef, useEffect, useState } from 'react';
import { useInterview } from '../InterviewContext';

export default function ChatModal() {
  const { isChatOpen, toggleChat, chatHistory, sendChatMessage } = useInterview();
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
      <div className="w-[400px] h-[500px] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-950">
          <h3 className="font-semibold text-slate-200">Interview Chat</h3>
          <button 
            onClick={toggleChat}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            ✕
          </button>
        </div>

        {/* Message List (Virtualized / Append Only) */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatHistory.map((msg, idx) => (
            <div key={idx} className="flex flex-col">
              <span className="text-xs text-slate-500 mb-1">{new Date(msg.createdAt).toLocaleTimeString()}</span>
              <div className="bg-slate-800 text-slate-200 p-3 rounded-lg text-sm break-words border border-slate-700/50">
                {msg.content}
              </div>
            </div>
          ))}
          {chatHistory.length === 0 && (
            <div className="h-full flex items-center justify-center text-sm text-slate-500">
              No messages yet. Say hello!
            </div>
          )}
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-slate-950 flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
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
