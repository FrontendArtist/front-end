/**
 * Client-side API wrapper for Orders
 * این ماژول برای واکشی سفارشات از مسیر سمت کاربر استفاده می‌شود
 */

export async function fetchClientOrders() {
    const response = await fetch('/api/orders');
    
    if (!response.ok) {
        let errorMessage = 'خطا در دریافت لیست سفارشات';
        try {
            const errBody = await response.json();
            errorMessage = errBody.message || errorMessage;
        } catch(e) {
            console.error('Failed to parse error response:', e);
        }
        throw new Error(errorMessage);
    }
    
    return response.json();
}
