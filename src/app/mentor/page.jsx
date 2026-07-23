/**
 * @file src/app/mentor/page.jsx
 * @description Mentor Dashboard Page — Server Component
 *
 * 🎯 Strategy: Server-First
 * واکشی اولیه لیست پیام‌های instructor روی سرور انجام می‌شود تا:
 *   - صفحه با محتوا (نه skeleton) به مرورگر ارسال شود (بهتر برای UX)
 *   - توکن JWT هرگز در bundle کلاینت expose نشود
 *
 * کامپوننت InstructorChatPanel داده‌های اولیه را به عنوان prop دریافت
 * کرده و state تعاملی را روی کلاینت مدیریت می‌کند.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getInstructorMessages } from '@/lib/messagesApi';
import InstructorChatPanel from '@/components/chat/InstructorChatPanel';

/**
 * MentorPage — صفحه اصلی داشبورد استاد
 *
 * Auth Guard در layout.jsx اجرا شده است، پس اینجا می‌دانیم کاربر
 * حتماً یک administrator معتبر است.
 */
export default async function MentorPage() {
    // ─── دریافت سشن (برای استخراج توکن JWT) ────────────────────────────────
    const session = await getServerSession(authOptions);

    // ─── واکشی اولیه پیام‌های instructor ────────────────────────────────────
    // در صورت بروز خطا، آرایه خالی پاس می‌دهیم؛ کامپوننت کلاینت خطا را مدیریت می‌کند.
    let initialMessages = [];
    try {
        const res = await getInstructorMessages(session.user.jwt);
        initialMessages = res?.data || [];
    } catch (err) {
        // لاگ خطا فقط در development برای جلوگیری از expose شدن اطلاعات
        if (process.env.NODE_ENV === 'development') {
            console.error('❌ MentorPage: Failed to fetch instructor messages:', err.message);
        }
    }

    return (
        <InstructorChatPanel
            initialMessages={initialMessages}
            currentUser={session.user}
        />
    );
}
