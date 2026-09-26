'use client';

/**
 * @file src/modules/profile/MessageDetailModal.jsx
 * @description پنجره چت اختصاصی کاربر (استفاده از ماژول مشترک ChatModal)
 */

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { updateMyMessage, updateInstructorMessage } from '@/lib/messagesApi';
import ChatModal from '@/components/common/ChatModal/ChatModal';

export default function MessageDetailModal({ message, isOpen, onClose, onUpdateMessage }) {
    const { data: session } = useSession();
    const [error, setError] = useState(null);

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
