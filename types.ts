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