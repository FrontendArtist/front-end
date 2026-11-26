import { create } from 'zustand';
import { getMyMessages } from '@/lib/messagesApi';

const EMPTY_MESSAGES = [];
let generation = 0;
let inFlight = null;

export const selectUserMessages = (state, userId) =>
    userId != null && state.userId === String(userId) ? state.messages : EMPTY_MESSAGES;

export const useUserMessagesStore = create((set, get) => ({
    userId: null,
    messages: [],
    isLoading: false,
    error: null,
    hasFetched: false,

    setMessagesUser: (userId) => {
        const nextId = userId == null ? null : String(userId);
        if (get().userId === nextId) return;
        generation++;
        inFlight = null;
        set({
            userId: nextId,
            messages: [],
            isLoading: false,
            error: null,
            hasFetched: false,
        });
    },

    fetchMessages: async (token, userId, force = false) => {
        const nextUserId = userId == null ? null : String(userId);
        if (!token || !nextUserId) return EMPTY_MESSAGES;

        if (get().userId !== nextUserId) {
            generation++;
            inFlight = null;
            set({
                userId: nextUserId,
                messages: [],
                isLoading: false,
                error: null,
                hasFetched: false,
            });
        }

        if (get().hasFetched && !force) return get().messages;

        if (inFlight && inFlight.userId === nextUserId) {
            return inFlight.promise;
        }

        const request = { generation, userId: nextUserId };
        const isCurrent = () => request.generation === generation && get().userId === nextUserId;

        set({ isLoading: true, error: null });

        request.promise = (async () => {
            try {
                const result = await getMyMessages(token, nextUserId);
                if (!isCurrent()) return EMPTY_MESSAGES;
                const messagesData = result?.data || [];
                set({
                    messages: messagesData,
                    hasFetched: true,
                    isLoading: false,
                });
                return messagesData;
            } catch (err) {
                if (!isCurrent()) return EMPTY_MESSAGES;
                set({
                    error: err.message,
                    isLoading: false,
                });
                return get().messages;
            } finally {
                if (inFlight === request) inFlight = null;
            }
        })();

        inFlight = request;
        return request.promise;
    },

    setMessages: (messages, userId = get().userId) => {
        const nextId = userId == null ? null : String(userId);
        if (nextId !== get().userId) return;
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
