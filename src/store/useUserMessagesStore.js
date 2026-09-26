import { create } from 'zustand';
import { getMyMessages } from '@/lib/messagesApi';

let inFlightPromise = null;

export const useUserMessagesStore = create((set, get) => ({
    messages: [],
    isLoading: false,
    error: null,
    hasFetched: false,

    fetchMessages: async (token, userId, force = false) => {
        if (!token) return get().messages;
        if (get().hasFetched && !force) return get().messages;

        if (inFlightPromise) {
            return inFlightPromise;
        }

        set({ isLoading: true, error: null });

        inFlightPromise = (async () => {
            try {
                const result = await getMyMessages(token, userId);
                const messagesData = result?.data || [];
                set({
                    messages: messagesData,
                    hasFetched: true,
                    isLoading: false,
                });
                return messagesData;
            } catch (err) {
                set({
                    error: err.message,
                    isLoading: false,
                });
                return get().messages;
            } finally {
                inFlightPromise = null;
            }
        })();

        return inFlightPromise;
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
