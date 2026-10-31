import { create } from 'zustand';
import {
    fetchClientNotifications,
    updateClientNotifications,
} from '@/lib/client/notificationsClientApi';

const EMPTY_NOTIFICATIONS = [];
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

let generation = 0;
let inFlight = null;

export function normalizeNotification(raw) {
    if (!raw) return null;
    const attrs = raw.attributes || raw;
    const docId = raw.documentId || attrs.documentId;
    const numId = raw.id || attrs.id;
    const eventKey = attrs.eventKey;
    const id = String(eventKey || docId || numId || '');
    if (!id) return null;

    let link = attrs.link || '';
    const type = attrs.type || 'confirmed';
    const rawId = attrs.rawId ? String(attrs.rawId) : null;

    if (!link) {
        if (type === 'confirmed') link = '/profile/purchases';
        else if (type === 'payment_failed') link = '/cart';
        else if (type === 'pending_verification' || type === 'rejected') {
            link = rawId ? `/profile/orders/${rawId}` : '/profile/orders';
        } else if (type === 'mentor_reply') {
            link = rawId ? `/profile/messages?open=${rawId}&mentor=true` : '/profile/messages';
        } else if (type === 'support_reply') {
            link = rawId ? `/profile/messages?open=${rawId}` : '/profile/messages';
        } else {
            link = '/profile';
        }
    }

    return {
        id,
        documentId: docId ? String(docId) : String(numId || id),
        rawId,
        type,
        title: attrs.title || 'اعلان جدید',
        message: attrs.notifMessage || attrs.message || '',
        hint: attrs.hint || null,
        date: attrs.updatedAt || raw.updatedAt || attrs.createdAt || raw.createdAt || null,
        isRead: Boolean(attrs.isRead),
        link,
    };
}

export const selectAccountNotifications = (state, userId) =>
    userId != null && state.userId === String(userId)
        ? state.notifications
        : EMPTY_NOTIFICATIONS;

export const useNotificationsStore = create((set, get) => ({
    userId: null,
    notifications: [],
    isLoading: false,
    error: null,
    hasFetched: false,

    setNotificationsUser: (userId) => {
        const nextId = userId == null ? null : String(userId);
        if (get().userId === nextId) return;
        generation++;
        inFlight = null;
        set({
            userId: nextId,
            notifications: [],
            isLoading: false,
            error: null,
            hasFetched: false,
        });
    },

    fetchNotifications: async (force = false, userId = get().userId) => {
        if (userId == null) return [];
        const targetUserId = String(userId);
        if (get().userId !== targetUserId) {
            get().setNotificationsUser(targetUserId);
        }
        if (get().hasFetched && !force) return get().notifications;
        if (inFlight) return inFlight.promise;

        const request = { generation };
        const isCurrent = () => request.generation === generation;
        set({ isLoading: true, error: null });

        request.promise = (async () => {
            try {
                const result = await fetchClientNotifications();
                if (!isCurrent()) return [];

                const rawList = Array.isArray(result?.data)
                    ? result.data
                    : Array.isArray(result)
                        ? result
                        : [];

                const cutoff = Date.now() - SEVEN_DAYS_MS;

                const normalized = rawList
                    .map(normalizeNotification)
                    .filter((item) => {
                        if (!item || item.isRead) return false;
                        if (item.date) {
                            const ts = new Date(item.date).getTime();
                            if (Number.isFinite(ts) && ts < cutoff) return false;
                        }
                        return true;
                    })
                    .sort((a, b) => {
                        const timeA = a.date ? new Date(a.date).getTime() : 0;
                        const timeB = b.date ? new Date(b.date).getTime() : 0;
                        return timeB - timeA;
                    });

                set({
                    notifications: normalized,
                    hasFetched: true,
                    isLoading: false,
                });
                return normalized;
            } catch (err) {
                if (!isCurrent()) return [];
                set({
                    error: err.message,
                    hasFetched: true,
                    isLoading: false,
                });
                return get().notifications;
            } finally {
                if (inFlight === request) inFlight = null;
            }
        })();

        inFlight = request;
        return request.promise;
    },

    markAsRead: async (id, userId = get().userId) => {
        if (!userId || !id) return;
        const strId = String(id);
        set((state) => ({
            notifications: state.notifications.filter(
                (n) =>
                    n.id !== strId &&
                    n.documentId !== strId &&
                    n.rawId !== strId
            ),
        }));

        try {
            await updateClientNotifications({ action: 'markAsRead', id: strId });
        } catch (err) {
            console.error('[useNotificationsStore markAsRead Error]:', err);
        }
    },

    markMessageAsRead: async (msgId, userId = get().userId) => {
        if (!userId || !msgId) return;
        const targetStr = String(msgId);
        const hasMatch = get().notifications.some(
            (n) => n.rawId === targetStr || n.id.includes(targetStr)
        );
        if (!hasMatch) return;

        set((state) => ({
            notifications: state.notifications.filter(
                (n) => n.rawId !== targetStr && !n.id.includes(targetStr)
            ),
        }));

        try {
            await updateClientNotifications({
                action: 'markMessageAsRead',
                rawId: targetStr,
            });
        } catch (err) {
            console.error('[useNotificationsStore markMessageAsRead Error]:', err);
        }
    },

    markAllAsRead: async (userId = get().userId) => {
        if (!userId) return;
        if (get().notifications.length === 0) return;

        set({ notifications: [] });

        try {
            await updateClientNotifications({ action: 'markAllAsRead' });
        } catch (err) {
            console.error('[useNotificationsStore markAllAsRead Error]:', err);
        }
    },

    invalidateNotifications: () => set({ hasFetched: false }),
}));

