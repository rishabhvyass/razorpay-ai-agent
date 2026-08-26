import { create } from 'zustand';
import { ChatTurn } from '../types';

interface ChatState {
  conversationId: string | null;
  turns: ChatTurn[];
  isThinking: boolean;
  isActivityOpen: boolean;
  setConversationId: (id: string | null) => void;
  setTurns: (turns: ChatTurn[]) => void;
  addTurn: (turn: ChatTurn) => void;
  setThinking: (isThinking: boolean) => void;
  setActivityOpen: (isOpen: boolean) => void;
  toggleActivity: () => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversationId: null,
  turns: [],
  isThinking: false,
  isActivityOpen: false,

  setConversationId: (conversationId) => set({ conversationId }),
  setTurns: (turns) => set({ turns }),
  addTurn: (turn) => set((state) => ({ turns: [...state.turns, turn] })),
  setThinking: (isThinking) => set({ isThinking }),
  setActivityOpen: (isActivityOpen) => set({ isActivityOpen }),
  toggleActivity: () => set((state) => ({ isActivityOpen: !state.isActivityOpen })),
  clearChat: () => set({ conversationId: null, turns: [], isThinking: false, isActivityOpen: false }),
}));
