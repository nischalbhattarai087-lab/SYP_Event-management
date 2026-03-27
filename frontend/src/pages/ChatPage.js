import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, Search, ChevronLeft, User } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import './ChatPage.css';

const ROLE_COLORS = {
  admin: '#ef4444',
  organizer: '#0d9488',
  user: '#6366f1',
};

const ROLE_LABELS = {
  admin: 'Admin',
  organizer: 'Organizer',
  user: 'User',
};

function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatMsgTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const ChatPage = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgText, setMsgText] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat'
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  // Load contacts and conversations
  const loadContactsAndConvs = useCallback(async () => {
    try {
      const [contactsRes, convsRes] = await Promise.all([
        api.get('/chat/contacts'),
        api.get('/chat/conversations'),
      ]);
      setContacts(contactsRes.data.data || []);
      setConversations(convsRes.data.data || []);
    } catch {
      toast.error('Failed to load chat contacts.');
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  useEffect(() => {
    loadContactsAndConvs();
  }, [loadContactsAndConvs]);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (convId) => {
    if (!convId) return;
    setLoadingMsgs(true);
    try {
      const res = await api.get(`/chat/conversations/${convId}/messages`);
      setMessages(res.data.data || []);
    } catch {
      toast.error('Failed to load messages.');
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  // Poll messages every 3 seconds when a conversation is open
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (selectedConv) {
      pollRef.current = setInterval(async () => {
        try {
          const res = await api.get(`/chat/conversations/${selectedConv.id}/messages`);
          setMessages(res.data.data || []);
          // Also refresh conversation list to update last_message
          const convsRes = await api.get('/chat/conversations');
          setConversations(convsRes.data.data || []);
        } catch {}
      }, 3000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedConv]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openConversation = async (contact) => {
    try {
      const res = await api.post('/chat/conversations', { participant_id: contact.id });
      const conv = res.data.data;
      // Ensure other_user info is set
      const enriched = {
        ...conv,
        other_user_id: contact.id,
        other_user_name: contact.name,
        other_user_role: contact.role,
      };
      setSelectedConv(enriched);
      await loadMessages(conv.id);
      setMobileView('chat');
      // Refresh conversations sidebar
      const convsRes = await api.get('/chat/conversations');
      setConversations(convsRes.data.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Cannot open conversation.');
    }
  };

  const selectExistingConv = async (conv) => {
    setSelectedConv(conv);
    await loadMessages(conv.id);
    setMobileView('chat');
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!msgText.trim() || !selectedConv || sendingMsg) return;
    setSendingMsg(true);
    try {
      const res = await api.post(`/chat/conversations/${selectedConv.id}/messages`, { message: msgText.trim() });
      setMessages(prev => [...prev, res.data.data]);
      setMsgText('');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send message.');
    } finally {
      setSendingMsg(false);
    }
  };

  // Merge contacts + existing conversation contacts into one unified contact list
  const allContactIds = new Set(contacts.map(c => c.id));
  const convContacts = conversations
    .map(c => ({ id: c.other_user_id, name: c.other_user_name, role: c.other_user_role }))
    .filter(c => !allContactIds.has(c.id));
  const allContacts = [...contacts, ...convContacts];

  const filteredContacts = allContacts.filter(c =>
    c.name?.toLowerCase().includes(searchQ.toLowerCase()) ||
    c.role?.toLowerCase().includes(searchQ.toLowerCase())
  );
  const filteredConvs = conversations.filter(c =>
    c.other_user_name?.toLowerCase().includes(searchQ.toLowerCase()) ||
    c.other_user_role?.toLowerCase().includes(searchQ.toLowerCase())
  );

  const existingConvMap = {};
  conversations.forEach(c => { existingConvMap[c.other_user_id] = c; });

  return (
    <div className="chat-page" style={{ paddingTop: 68 }}>
      <div className="page-header">
        <div className="container">
          <h1>Messages</h1>
          <p>Chat with {user?.role === 'user' ? 'organizers & admins' : user?.role === 'organizer' ? 'users & admins' : 'organizers & users'}</p>
        </div>
      </div>

      <div className="chat-container container">
        {/* Sidebar */}
        <aside className={`chat-sidebar${mobileView === 'chat' ? ' chat-sidebar--hidden' : ''}`}>
          <div className="chat-sidebar__search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search people…"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
            />
          </div>

          {loadingContacts ? (
            <div className="chat-sidebar__loader"><Loader /></div>
          ) : (
            <>
              {/* Recent Conversations */}
              {filteredConvs.length > 0 && (
                <div className="chat-sidebar__section">
                  <p className="chat-sidebar__section-label">Recent</p>
                  {filteredConvs.map(conv => (
                    <button
                      key={conv.id}
                      className={`chat-contact${selectedConv?.id === conv.id ? ' active' : ''}`}
                      onClick={() => selectExistingConv(conv)}
                    >
                      <div className="chat-contact__avatar" style={{ background: ROLE_COLORS[conv.other_user_role] }}>
                        {getInitials(conv.other_user_name)}
                      </div>
                      <div className="chat-contact__info">
                        <div className="chat-contact__top">
                          <span className="chat-contact__name">{conv.other_user_name}</span>
                          <span className="chat-contact__time">{conv.last_message_at ? formatMsgTime(conv.last_message_at) : ''}</span>
                        </div>
                        <div className="chat-contact__bottom">
                          <span className="chat-contact__preview">{conv.last_message || 'Start a conversation'}</span>
                          <span className="chat-role-badge" style={{ color: ROLE_COLORS[conv.other_user_role] }}>
                            {ROLE_LABELS[conv.other_user_role] || conv.other_user_role}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* All Contacts */}
              <div className="chat-sidebar__section">
                <p className="chat-sidebar__section-label">All Contacts</p>
                {filteredContacts.length === 0 ? (
                  <p className="chat-sidebar__empty">No contacts found</p>
                ) : (
                  filteredContacts.map(contact => {
                    const existingConv = existingConvMap[contact.id];
                    return (
                      <button
                        key={contact.id}
                        className={`chat-contact${selectedConv?.other_user_id === contact.id ? ' active' : ''}`}
                        onClick={() => existingConv ? selectExistingConv(existingConv) : openConversation(contact)}
                      >
                        <div className="chat-contact__avatar" style={{ background: ROLE_COLORS[contact.role] }}>
                          {getInitials(contact.name)}
                        </div>
                        <div className="chat-contact__info">
                          <div className="chat-contact__top">
                            <span className="chat-contact__name">{contact.name}</span>
                          </div>
                          <div className="chat-contact__bottom">
                            <span className="chat-contact__preview">{contact.email}</span>
                            <span className="chat-role-badge" style={{ color: ROLE_COLORS[contact.role] }}>
                              {ROLE_LABELS[contact.role] || contact.role}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </aside>

        {/* Chat Window */}
        <main className={`chat-window${mobileView === 'list' ? ' chat-window--hidden' : ''}`}>
          {!selectedConv ? (
            <div className="chat-empty">
              <MessageCircle size={64} />
              <h3>Select a conversation</h3>
              <p>Choose a contact from the sidebar to start chatting.</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                <button className="chat-back-btn" onClick={() => setMobileView('list')}>
                  <ChevronLeft size={20} />
                </button>
                <div className="chat-header__avatar" style={{ background: ROLE_COLORS[selectedConv.other_user_role] }}>
                  {getInitials(selectedConv.other_user_name)}
                </div>
                <div className="chat-header__info">
                  <span className="chat-header__name">{selectedConv.other_user_name}</span>
                  <span className="chat-header__role" style={{ color: ROLE_COLORS[selectedConv.other_user_role] }}>
                    {ROLE_LABELS[selectedConv.other_user_role] || selectedConv.other_user_role}
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div className="chat-messages">
                {loadingMsgs ? (
                  <div className="chat-messages__loader"><Loader /></div>
                ) : messages.length === 0 ? (
                  <div className="chat-messages__empty">
                    <User size={36} />
                    <p>No messages yet. Say hello! 👋</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMine = msg.sender_id === user?.id;
                    const showName = !isMine && (idx === 0 || messages[idx - 1]?.sender_id !== msg.sender_id);
                    return (
                      <div key={msg.id} className={`chat-msg${isMine ? ' chat-msg--mine' : ' chat-msg--theirs'}`}>
                        {!isMine && showName && (
                          <div className="chat-msg__sender-avatar" style={{ background: ROLE_COLORS[msg.sender_role] }}>
                            {getInitials(msg.sender_name)}
                          </div>
                        )}
                        {!isMine && !showName && <div className="chat-msg__avatar-spacer" />}
                        <div className="chat-msg__content">
                          <div className="chat-msg__bubble">{msg.message}</div>
                          <span className="chat-msg__time">{formatMsgTime(msg.created_at)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form className="chat-input-bar" onSubmit={sendMessage}>
                <input
                  type="text"
                  className="chat-input"
                  placeholder="Type a message…"
                  value={msgText}
                  onChange={e => setMsgText(e.target.value)}
                  autoComplete="off"
                />
                <button type="submit" className="chat-send-btn" disabled={!msgText.trim() || sendingMsg}>
                  <Send size={18} />
                </button>
              </form>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default ChatPage;
