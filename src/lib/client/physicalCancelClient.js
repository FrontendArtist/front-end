import { cancelErrorMessage } from '@/lib/physicalCancel';

async function call(url, init) {
    try {
        const res = await fetch(url, init);
        const json = await res.json().catch(() => ({}));
        if (res.ok && json?.data) return { ok: true, data: json.data };
        return { ok: false, code: json?.code, status: res.status, message: cancelErrorMessage(json?.code, res.status) };
    } catch {
        return { ok: false, status: 0, message: 'خطا در ارتباط با سرور.' };
    }
}

const base = (mode, id) => mode === 'admin'
    ? `/api/admin/physical-purchases/${encodeURIComponent(id)}`
    : `/api/physical-orders/${encodeURIComponent(id)}`;

export const fetchCancelPreview = ({ mode, id, quantity }) =>
    call(`${base(mode, id)}/cancellation-preview${mode === 'admin' ? `?quantity=${encodeURIComponent(quantity)}` : ''}`, { cache: 'no-store' });

export const submitCancel = ({ mode, id, operationId, reason, quantity }) =>
    call(`${base(mode, id)}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'admin' ? { operationId, quantity, reason } : { operationId, reason }),
    });
