'use client';

/**
 * @file src/modules/profile/MessageDetailModal.jsx
 * @description پنجره چت اختصاصی کاربر (استفاده از ماژول مشترک ChatModal)
 */

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { updateMyMessage, updateInstructorMessage, getMyMessages } from '@/lib/messagesApi';
import ChatModal from '@/components/common/ChatModal/ChatModal';

export default function MessageDetailModal({ message, isOpen, onClose, onUpdateMessage }) {
    const { data: session } = useSession();
    const [error, setError] = useState(null);

    // Polling 5 ثانیه‌ای فقط در زمان باز بودن چت
    useEffect(() => {
        if (!isOpen || !message || !session?.user?.jwt) return;

        const token = session.user.jwt;
        const msgId = message.documentId || String(message.id);

        const fetchLatest = async () => {
            if (document.visibilityState !== 'visible') return;
            try {
                const res = await getMyMessages(token, session?.user?.id);
                const list = res?.data || [];
                const updated = list.find(
                    (m) => m.documentId === msgId || String(m.id) === msgId
                );
                if (updated && onUpdateMessage) {
                    onUpdateMessage(updated);
                }
            } catch {
                // silent fail on poll
            }
        };

        const intervalId = setInterval(fetchLatest, 5000);
        return () => clearInterval(intervalId);
    }, [isOpen, message, session?.user?.jwt, session?.user?.id, onUpdateMessage]);

    if (!isOpen || !message) return null;

    const handleSendReply = async ({ body }) => {
        if (!body || !session?.user?.jwt) return;
        setError(null);

        const newReply = {
            body: body,
            isAdmin: false,
            sender: 'user',
            createdAt: new Date().toISOString()
        };

        const existingReplies = Array.isArray(message.replies) ? message.replies : [];
        const updatedReplies = [...existingReplies, newReply];

        try {
            const payload = {
                replies: updatedReplies,
                status: 'open',
            };

            const isInstructorThread = message.messageType === 'instructor' || message.type === 'instructor';
            if (isInstructorThread) {
                await updateInstructorMessage(message.documentId || String(message.id), session.user.jwt, payload);
            } else {
                await updateMyMessage(message.documentId || String(message.id), session.user.jwt, payload);
            }

            if (onUpdateMessage) {
                onUpdateMessage(payload);
            }
        } catch (err) {
            setError('خطا در ارسال پاسخ. لطفاً دوباره تلاش کنید.');
            throw err;
        }
    };

    return (
        <ChatModal
            isOpen={isOpen}
            onClose={onClose}
            message={message}
            isAdmin={false}
            onSendReply={handleSendReply}
            error={error}
        />
    );
}
