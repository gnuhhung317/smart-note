import { ChatSession } from '../types';

const STORAGE_KEY = 'socratic_notes_sessions';
const API_KEY_STORAGE = 'socratic_notes_api_key';

export const loadSessions = (): ChatSession[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to load sessions", e);
    return [];
  }
};

export const saveSession = (session: ChatSession) => {
  const sessions = loadSessions();
  const index = sessions.findIndex(s => s.id === session.id);
  
  if (index >= 0) {
    sessions[index] = session;
  } else {
    sessions.unshift(session);
  }
  
  // Sort by updatedAt desc
  sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  return sessions;
};

export const deleteSession = (sessionId: string): ChatSession[] => {
  const sessions = loadSessions().filter(s => s.id !== sessionId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  return sessions;
};

export const createNewSession = (): ChatSession => {
  return {
    id: Date.now().toString(),
    title: 'New Chat',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
};

// API Key Management
export const getApiKey = (): string | null => {
  return localStorage.getItem(API_KEY_STORAGE);
};

export const saveApiKey = (key: string) => {
  localStorage.setItem(API_KEY_STORAGE, key);
};

export const removeApiKey = () => {
  localStorage.removeItem(API_KEY_STORAGE);
};