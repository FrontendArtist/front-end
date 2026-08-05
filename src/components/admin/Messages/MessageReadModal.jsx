'use strict';

import React, { useState } from 'react';
import ChatModal from '@/components/common/ChatModal/ChatModal';

/**
 * MessageReadModal Component
 * Displays the contact message details, interactive chat stream, status controls, and reply section for admins.
 */
export default function MessageReadModal({ isOpen, onClose, message, onUpdateMessage, onDelete, isDeleting = false }) {
    const [error, setError] = useState(null);

    if (!message) return null;

    const handleSendReply = async ({ body, status }) => {
        setError(null);

        const existingReplies = Array.isArray(message.replies) ? message.replies : [];
        let updatedReplies = [...existingReplies];

        if (body && body.trim()) {
            updatedReplies.push({
                body: body.trim(),
                isAdmin: true,
                createdAt: new Date().toISOString()
            });
        }

        try {
            const res = await fetch(`/api/admin/contact-messages/${message.documentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    replies: updatedReplies,
                    status: status,
                    isRead: true
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.error || 'خطا در ذخیره‌سازی اطلاعات');
            }

            if (onUpdateMessage) {
                onUpdateMessage({
                    replies: updatedReplies,
                    status: status,
                    isRead: true
                });
            }
        } catch (err) {
            setError(err.message || 'بروز خطا هنگام ثبت پاسخ. لطفاً مجدداً امتحان کنید.');
            throw err;
        }
    };

    const handleStatusChange = async (newStatus) => {
        setError(null);
        try {
            const res = await fetch(`/api/admin/contact-messages/${message.documentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: newStatus,
                    isRead: true
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.error || 'خطا در تغییر وضعیت پیام');
            }

            if (onUpdateMessage) {
                onUpdateMessage({
                    status: newStatus,
                    isRead: true
                });
            }
        } catch (err) {
            setError(err.message || 'بروز خطا هنگام تغییر وضعیت.');
            throw err;
        }
    };

    return (
        <ChatModal
            isOpen={isOpen}
            onClose={onClose}
            message={message}
            isAdmin={true}
            onSendReply={handleSendReply}
            onStatusChange={handleStatusChange}
            onDelete={onDelete}
            isDeleting={isDeleting}
            error={error}
        />
    );
}
