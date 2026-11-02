'use client';

/**
 * @file src/components/admin/Orders/PhysicalDeliveryControl.jsx
 * @description ثبت وضعیت ارسال کالای فیزیکی برای ردیف بای‌مانی (I11-O)
 *
 * تغییر وضعیت فقط از route سروری Next.js انجام می‌شود (JWT ادمین از session سروری)؛
 * مرورگر توکن بای‌مانی را برای PUT نمی‌فرستد و هیچ درخواستی به استراپی زده نمی‌شود.
 * وضعیت فقط در بای‌مانی نگهداری می‌شود؛ این کامپوننت صرفاً پاسخ آن را نمایش می‌دهد.
 */

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { CourseOrderId, getAdminCourseOrderReceipt } from '@/lib/byeMoneyApi';
import { getPhysicalDeliveryLabel } from '@/lib/physicalDelivery';
import AdminButton from '../Shared/AdminButton';

export default function PhysicalDeliveryControl({ purchaseId, cartId, initialStatus = null }) {
    const { data: session } = useSession();
    const [status, setStatus] = useState(initialStatus);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);

    // وضعیت فعلی از رسید سفارش ادمین خوانده می‌شود (فقط خواندن؛ شکست آن مانع ثبت نیست)
    useEffect(() => {
        // اگر وضعیت از جزئیات سفارش آمده، رسید دوباره از مرورگر خوانده نمی‌شود
        if (initialStatus || !purchaseId || !session?.user?.jwt) return;
        const controller = new AbortController();
        let mounted = true;
        const orderId = cartId ? CourseOrderId.for('Cart', cartId) : CourseOrderId.for('Purchase', purchaseId);
        getAdminCourseOrderReceipt({ jwt: session.user.jwt, orderId, signal: controller.signal })
            .then((res) => {
                if (!mounted || !res?.success) return;
                const item = (res.data?.items || []).find((i) => i?.purchaseId === purchaseId);
                if (item?.physicalDeliveryStatus) setStatus(item.physicalDeliveryStatus);
            })
            .catch(() => {});
        return () => {
            mounted = false;
            controller.abort();
        };
    }, [purchaseId, cartId, initialStatus, session?.user?.jwt]);

    const submit = async (next) => {
        setBusy(true);
        setMessage(null);
        try {
            const res = await fetch(`/api/admin/physical-purchases/${encodeURIComponent(purchaseId)}/delivery-status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: next }),
            });
            const json = await res.json().catch(() => ({}));
            if (res.ok && json?.data?.deliveryStatus) {
                setStatus(json.data.deliveryStatus);
                setMessage({ ok: true, text: `وضعیت ارسال: ${getPhysicalDeliveryLabel(json.data.deliveryStatus)}` });
            } else {
                setMessage({ ok: false, text: json?.error || 'ثبت وضعیت ارسال ناموفق بود.' });
            }
        } catch {
            setMessage({ ok: false, text: 'خطا در ارتباط با سرور.' });
        } finally {
            setBusy(false);
        }
    };

    const canShip = status !== 'Shipped' && status !== 'Delivered';
    const canDeliver = status !== 'Delivered';

    return (
        <div data-testid="physical-delivery-control">
            <div>
                <span>وضعیت ارسال کالا: </span>
                <strong>{getPhysicalDeliveryLabel(status) || 'نامشخص'}</strong>
            </div>
            {canDeliver && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    {canShip && (
                        <AdminButton variant="edit" disabled={busy} onClick={() => submit('Shipped')}>
                            ثبت ارسال‌شده
                        </AdminButton>
                    )}
                    <AdminButton variant="default" disabled={busy} onClick={() => submit('Delivered')}>
                        ثبت تحویل‌شده
                    </AdminButton>
                </div>
            )}
            {message && (
                <p role={message.ok ? 'status' : 'alert'} style={{ marginTop: '6px', color: message.ok ? '#34d399' : '#f87171' }}>
                    {message.text}
                </p>
            )}
        </div>
    );
}
