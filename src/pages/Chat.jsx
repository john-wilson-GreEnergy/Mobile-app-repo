import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Hash, ChevronRight, Circle, CheckCheck, Check } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/db';

const CHANNELS = [
  { id: 'general', name: 'General', members: 24, unread: 0, lastMessage: 'Latest updates', lastTime: 'now' },
  { id: 'bess-techs', name: 'BESS Techs', members: 18, unread: 0, lastMessage: 'Team coordination', lastTime: 'now' },
  { id: 'site-managers', name: 'Site Managers', members: 6, unread: 0, lastMessage: 'Management updates', lastTime: 'now' },
  { id: 'announcements', name: 'Announcements', members: 52, unread: 0, lastMessage: 'Company announcements', lastTime: 'now' },
  { id: 'logistics', name: 'Logistics', members: 12, unread: 0, lastMessage: 'Logistics coordination', lastTime: 'now' },
];

export default function Chat() {
  const { user } = useAuth();
  const [activeChannel, setActiveChannel] = useState(null);
  const [channels, setChannels] = useState(CHANNELS);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  // Fetch chat messages from database
  const { data: chatMessages = [] } = useQuery({
    queryKey: ['chat-messages', activeChannel?.id],
    queryFn: () => activeChannel ? db.chat_messages.filter({ channel: activeChannel.id }) : Promise.resolve([]),
    enabled: !!activeChannel,
  });

  // Fetch chat spaces for member count
  const { data: spaceMembers = [] } = useQuery({
    queryKey: ['chat-members', activeChannel?.id],
    queryFn: () => activeChannel ? db.chat_space_memberships.filter({ space: activeChannel.id }) : Promise.resolve([]),
    enabled: !!activeChannel,
  });

  useEffect(() => {
    if (chatMessages.length > 0) {
      const formattedMessages = chatMessages.map(msg => ({
        id: msg.id,
        sender: msg.sender_name || msg.sender,
        role: msg.sender_role || 'Member',
        time: msg.created_date ? new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now',
        text: msg.message || msg.text,
        mine: msg.sender === user?.email,
        avatar: (msg.sender_name || 'U').split(' ').map(n => n[0]).join(''),
        confirmed: msg.read || false,
      }));
      setMessages(formattedMessages);
    }
  }, [chatMessages, user?.email]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannel]);

  const handleSend = async () => {
    if (!message.trim() || !activeChannel) return;
    try {
      await db.chat_messages.create({
        channel: activeChannel.id,
        sender: user?.email,
        sender_name: user?.full_name,
        message: message.trim(),
        read: false,
      });
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleConfirmReceipt = (msgId) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, confirmed: true } : m));
  };

  const handleOpenChannel = (channel) => {
    setActiveChannel(channel);
    // Clear unread badge when opening channel
    setChannels(prev => prev.map(c => c.id === channel.id ? { ...c, unread: 0 } : c));
  };

  if (activeChannel) {
    return (
      <ChatView
        channel={activeChannel}
        messages={messages}
        message={message}
        setMessage={setMessage}
        onSend={handleSend}
        onConfirmReceipt={handleConfirmReceipt}
        onBack={() => setActiveChannel(null)}
        messagesEndRef={messagesEndRef}
      />
    );
  }

  return (
    <div className="pb-6">
      <div className="px-4 pt-4">
        <p className="text-gray-500 text-sm mb-4">Select a channel to start messaging your crew</p>
        <div className="space-y-2">
          {channels.map((channel, i) => (
            <motion.button
              key={channel.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleOpenChannel(channel)}
              className="w-full flex items-center gap-4 p-4 rounded-3xl bg-card border border-border hover:border-primary/20 transition-all active-scale"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Hash className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-sm">{channel.name}</span>
                  <span className="text-gray-600 text-xs">· {channel.members} members</span>
                </div>
                <p className="text-gray-500 text-xs mt-0.5 truncate">{channel.lastMessage}</p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-gray-600 text-xs">{channel.lastTime}</span>
                {channel.unread > 0 && (
                  <span className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-[10px] font-black text-primary-foreground">
                    {channel.unread}
                  </span>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatView({ channel, messages, message, setMessage, onSend, onConfirmReceipt, onBack, messagesEndRef }) {
  return (
    <div className="flex flex-col h-full">
      {/* Channel Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5">
          <ChevronRight className="w-5 h-5 text-gray-400 rotate-180" />
        </motion.button>
        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Hash className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-white font-bold text-sm">{channel.name}</p>
          <p className="text-gray-600 text-xs">{channel.members} members</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Circle className="w-2 h-2 text-emerald-400 fill-emerald-400" />
          <span className="text-gray-500 text-xs">Live</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.mine ? 'flex-row-reverse' : ''}`}
            >
              {!msg.mine && (
                <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/20 flex items-center justify-center flex-shrink-0 text-primary text-[10px] font-black">
                  {msg.avatar}
                </div>
              )}
              <div className={`max-w-[75%] ${msg.mine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                {!msg.mine && (
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xs font-bold">{msg.sender}</span>
                    <span className="text-gray-600 text-[10px]">{msg.role}</span>
                  </div>
                )}
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.mine
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-card border border-border text-gray-200 rounded-tl-sm'
                }`}>
                  {msg.text}
                </div>

                {/* Footer: time + receipt status */}
                <div className={`flex items-center gap-2 ${msg.mine ? 'flex-row-reverse' : ''}`}>
                  <span className="text-gray-600 text-[10px]">{msg.time}</span>

                  {/* My messages: show delivery/read indicator */}
                  {msg.mine && (
                    <CheckCheck className="w-3.5 h-3.5 text-primary/60" />
                  )}

                  {/* Others' messages: confirm receipt button or confirmed badge */}
                  {!msg.mine && (
                    msg.confirmed ? (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center gap-1 text-emerald-400"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold">Received</span>
                      </motion.div>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onConfirmReceipt(msg.id)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-gray-500 hover:text-primary hover:border-primary/30 transition-all active-scale"
                      >
                        <Check className="w-3 h-3" />
                        <span className="text-[10px] font-bold">Confirm</span>
                      </motion.button>
                    )
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-card/30">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder={`Message #${channel.name.toLowerCase()}...`}
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSend()}
            className="flex-1 px-4 py-3 rounded-2xl bg-card border border-border text-white text-sm placeholder-gray-600 outline-none focus:border-primary/50"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onSend}
            disabled={!message.trim()}
            className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center active-scale disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4 text-primary-foreground" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}