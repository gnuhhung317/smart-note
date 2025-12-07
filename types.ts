
export enum Sender {
  USER = 'USER',
  AI = 'AI'
}

export enum MessageType {
  CHAT = 'CHAT',
  NOTE = 'NOTE' // The final synthesized note
}

export interface Message {
  id: string;
  sender: Sender;
  content: string;
  type: MessageType;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export enum AppState {
  IDLE = 'IDLE',
  CHATTING = 'CHATTING',
  SYNTHESIZING = 'SYNTHESIZING',
}

export enum ViewMode {
  CHAT = 'CHAT',
  DECISION_LAB = 'DECISION_LAB',
  SIX_HATS = 'SIX_HATS',
  FIRST_PRINCIPLES = 'FIRST_PRINCIPLES',
  DEBATE_ARENA = 'DEBATE_ARENA'
}

export type Language = 'en' | 'vi';

export interface SixHatsResult {
  white_hat: { title: string; content: string };
  red_hat: { title: string; content: string };
  black_hat: { title: string; content: string };
  yellow_hat: { title: string; content: string };
  green_hat: { title: string; content: string };
  blue_hat: { title: string; content: string };
}

// Decision Lab Types (Updated for 3-Phase Logic)
export type AgentRole = 'Skeptic' | 'Visionary' | 'Pragmatist' | 'Innovator' | 'Critic';

export interface AgentProfile {
  role: AgentRole;
  icon: string;
  color: string;
}

export interface Phase1Reaction {
  role: AgentRole;
  initial_thought: string;
}

export interface Phase2Discussion {
  role: AgentRole;
  target_role: AgentRole | 'Group'; // Who are they talking to?
  argument: string;
}

export interface Phase3Verdict {
  winner: string; // The selected path
  vote_summary: string; // e.g., "3-2 in favor of Option A"
  critical_warning: string; // The premortem
}

export interface DecisionResult {
  phase_1: Phase1Reaction[];
  phase_2: Phase2Discussion[];
  phase_3: Phase3Verdict;
}

// Debate Arena Types
export type DebateDifficulty = 'EASY' | 'HARD' | 'EXTREME';

export interface DebateScorecard {
  winner: 'USER' | 'AI' | 'DRAW';
  score: number; // 0-100
  commentary: string;
  critical_feedback: string;
  best_point: string;
}