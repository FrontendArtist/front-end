import { adminFetch } from './adminFetch';

export async function getContactMessages(jwt, { page = 1, pageSize = 50 } = {}) {
    const endpoint = `/api/contact-messages?sort=createdAt:desc&pagination[page]=${page}&pagination[pageSize]=${pageSize}&status=draft`;
    try {
        const data = await adminFetch(endpoint, jwt);
        if (!data) return { messages: [], meta: null, error: true };

        const messages = (data.data || []).map((item) => {
            const attrs = item.attributes || item;
            return {
                id: item.id,
                documentId: item.documentId || String(item.id),
                name: attrs.name || '—',
                contactInfo: attrs.contactInfo || '—',
                subject: attrs.subject || 'بدون موضوع',
                body: attrs.body || '',
                isRead: attrs.isRead ?? false,
                status: attrs.status || 'open',
                replies: attrs.replies || [],
                createdAt: attrs.createdAt
            };
        });

        return { messages, meta: data.meta || null, error: false };
    } catch (e) {
        console.error('[getContactMessages] error:', e);
        return { messages: [], meta: null, error: true };
    }
}
