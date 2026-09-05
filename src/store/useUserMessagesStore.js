import { create } from 'zustand';
import { getMyMessages } from '@/lib/messagesApi';

export const useUserMessagesStore = create((set, get) => ({
    messages: [],
    isLoading: false,
    error: null,
    hasFetched: false,

    fetchMessages: async (token, userId, force = false) => {
        if (!token) return;
        if ((get().hasFetched || get().isLoading) && !force) return;

        set({ isLoading: true, error: null });
        try {
            const result = await getMyMessages(token, userId);
            const messagesData = result?.data || [];
            set({
                messages: messagesData,
                hasFetched: true,
                isLoading: false,
            });
        } catch (err) {
            set({
                error: err.message,
                isLoading: false,
            });
        }
    },

    setMessages: (messages) => {
        set({ messages, hasFetched: true });
    },

    updateMessageInStore: (docId, updatedFields) => {
        set((state) => ({
            messages: state.messages.map((m) =>
                m.documentId === docId || String(m.id) === String(docId)
                    ? { ...m, ...updatedFields }
                    : m
            ),
        }));
    },

    invalidateMessages: () => {
        set({ hasFetched: false });
    },
}));
