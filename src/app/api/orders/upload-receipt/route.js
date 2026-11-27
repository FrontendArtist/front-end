/**
 * POST /api/orders/upload-receipt
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-Side API Proxy — Card-to-Card Receipt Upload
 *
 * DATA FLOW (all steps run server-side; Strapi token never reaches the client):
 *
 *  Client (browser)
 *    │  POST multipart/form-data  { orderId, file, cardHolderName }
 *    ▼
 *  This Next.js Route Handler   ← you are here
 *    │
 *    ├─ [STEP 1] Validate incoming form fields (size, type, required fields)
 *    │
 *    ├─ [STEP 2] Forward the image file to Strapi's /api/upload endpoint
 *    │            using the server-only STRAPI_API_TOKEN
 *    │            → receive back the Strapi media object (id, url, …)
 *    │
 *    └─ [STEP 3] PATCH the target order via Strapi's documentId-based endpoint
 *                 – link receiptImage (by media id)
 *                 – save cardHolderName
 *                 – advance paymentStatus → "pending_verification"
 *    │
 *    ▼
 *  Client receives { success: true, order: { … } }   (no token exposed)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { lightAuthOptions } from "@/lib/auth";
import { STRAPI_API_URL } from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ORDER_ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;

// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request) {
    // ── Auth Guard ──────────────────────────────────────────────────────────────
    // Ensure only authenticated users can call this endpoint.
    const session = await getServerSession(lightAuthOptions);
    if (!session?.user?.id) {
        return NextResponse.json(
            { message: "برای ارسال فیش، ابتدا وارد حساب کاربری خود شوید." },
            { status: 401 }
        );
    }

    // ── Guard: Token configured ─────────────────────────────────────────────────
    // STRAPI_API_TOKEN is intentionally NOT prefixed with NEXT_PUBLIC_ so it is
    // never bundled into client-side JavaScript.
    const strapiToken = process.env.STRAPI_API_TOKEN;
    if (!strapiToken) {
        // Log server-side only; never reveal token details to the client.
        console.error("[upload-receipt] STRAPI_API_TOKEN is not set in environment.");
        return NextResponse.json(
            { message: "خطای پیکربندی سرور. لطفاً با پشتیبانی تماس بگیرید." },
            { status: 500 }
        );
    }

    // ── Parse multipart/form-data ───────────────────────────────────────────────
    let formData;
    try {
        formData = await request.formData();
    } catch {
        return NextResponse.json(
            { message: "درخواست نامعتبر است. فرمت باید multipart/form-data باشد." },
            { status: 400 }
        );
    }

    // ── Extract & validate fields ───────────────────────────────────────────────
    const orderId = formData.get("orderId");        // Strapi v5 documentId (string)
    const file = formData.get("file");           // File | null
    const cardHolderName = formData.get("cardHolderName"); // string

    // [VALIDATION 1] Required text fields
    if (!orderId || typeof orderId !== "string" || orderId.trim() === "") {
        return NextResponse.json(
            { message: "شناسه سفارش (orderId) الزامی است." },
            { status: 400 }
        );
    }

    const trimmedOrderId = orderId.trim();
    if (!ORDER_ID_RE.test(trimmedOrderId)) {
        return NextResponse.json(
            { message: "شناسه سفارش نامعتبر است." },
            { status: 400 }
        );
    }

    if (!cardHolderName || typeof cardHolderName !== "string" || cardHolderName.trim() === "") {
        return NextResponse.json(
            { message: "نام صاحب کارت الزامی است." },
            { status: 400 }
        );
    }

    // [VALIDATION 2] File presence
    if (!file || typeof file.arrayBuffer !== "function") {
        return NextResponse.json(
            { message: "فایل تصویر فیش الزامی است." },
            { status: 400 }
        );
    }

    // [VALIDATION 3] MIME type — only images allowed
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
            {
                message:
                    "فرمت فایل مجاز نیست. لطفاً یک تصویر با فرمت JPEG، PNG یا WebP آپلود کنید.",
            },
            { status: 400 }
        );
    }

    // [VALIDATION 4] File size — max 5 MB
    if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
            { message: "حجم فایل نباید از ۵ مگابایت بیشتر باشد." },
            { status: 400 }
        );
    }

    // [VALIDATION 5] Mandatory order lookup, ownership check (IDOR), and state guard BEFORE upload
    let existingOrder = null;
    try {
        const orderCheckRes = await fetch(
            `${STRAPI_API_URL}/api/orders/${encodeURIComponent(trimmedOrderId)}?populate[0]=user`,
            {
                headers: { Authorization: `Bearer ${strapiToken}` },
                cache: "no-store",
            }
        );

        if (orderCheckRes.status === 404) {
            return NextResponse.json(
                { message: "سفارش مورد نظر یافت نشد." },
                { status: 404 }
            );
        }

        if (!orderCheckRes.ok) {
            return NextResponse.json(
                { message: "امکان بررسی وضعیت سفارش وجود ندارد. لطفاً دوباره تلاش کنید." },
                { status: 502 }
            );
        }

        const orderCheckData = await orderCheckRes.json().catch(() => null);
        existingOrder = orderCheckData?.data ?? null;

        if (!existingOrder) {
            return NextResponse.json(
                { message: "سفارش مورد نظر یافت نشد." },
                { status: 404 }
            );
        }
    } catch (checkErr) {
        console.error("[upload-receipt] Network error while checking order:", checkErr);
        return NextResponse.json(
            { message: "ارتباط با سرور سفارشات برقرار نشد. لطفاً دوباره تلاش کنید." },
            { status: 503 }
        );
    }

    const sessionUserId = String(session.user.id);
    const existingUser = existingOrder.user ?? null;
    const rawSessionPhone = session.user.phoneNumber || session.user.phone;
    const sessionPhone =
        typeof rawSessionPhone === "string" && rawSessionPhone.trim().length >= 10
            ? rawSessionPhone.trim()
            : null;
    const orderPhone =
        typeof existingOrder.phone === "string" ? existingOrder.phone.trim() : null;

    const isOwner =
        existingUser?.id != null
            ? String(existingUser.id) === sessionUserId
            : Boolean(sessionPhone && orderPhone && sessionPhone === orderPhone);

    if (!isOwner) {
        return NextResponse.json(
            { message: "شما مجاز به ارسال فیش برای این سفارش نیستید." },
            { status: 403 }
        );
    }

    const paymentMethod = String(existingOrder.paymentMethod || "").trim().toLowerCase();
    const oStatus = String(existingOrder.orderStatus || "").trim().toLowerCase();
    const pStatus = String(existingOrder.paymentStatus || "").trim().toLowerCase();

    if (
        oStatus === "canceled" ||
        oStatus === "cancelled" ||
        oStatus === "rejected" ||
        pStatus === "failed" ||
        pStatus === "rejected"
    ) {
        return NextResponse.json(
            { message: "این سفارش لغو شده است و امکان ارسال فیش برای آن وجود ندارد." },
            { status: 400 }
        );
    }

    if (paymentMethod !== "card_to_card" || pStatus !== "pending_payment" || oStatus !== "pending") {
        return NextResponse.json(
            { message: "امکان ارسال فیش فقط برای سفارش‌های کارت‌به‌کارت در انتظار پرداخت وجود دارد." },
            { status: 400 }
        );
    }

    // ── STEP 2: Upload image to Strapi /api/upload ──────────────────────────────
    // Rebuild a fresh FormData so we only forward the file blob to Strapi.
    // The Bearer token is injected server-side and never exposed to the client.
    let uploadedMediaId;
    try {
        const uploadForm = new FormData();
        // Strapi's upload plugin expects the field name "files"
        uploadForm.append("files", file, file.name || "receipt.jpg");

        // ── تنظیم مسیر ذخیره‌سازی receipt در Object Storage ────────────────────
        // تمام فیش‌ها مستقیماً درون پوشه receipts ذخیره می‌شوند.
        // شناسه سفارش در نام فایل قرار می‌گیرد تا فایل‌ها کاملاً متمایز و قابل‌شناسایی باشند.
        const receiptFolder = "receipts";
        const uniqueTimestamp = Date.now();
        const rawExt = (file.name || "receipt.jpg").split(".").pop() || "jpg";
        const fileExt = rawExt.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "jpg";
        const uniqueFileName = `order-${trimmedOrderId}-${uniqueTimestamp}.${fileExt}`;

        // path مستقیماً در form data (سطح metas، نه fileInfo)
        uploadForm.append("path", receiptFolder);

        // fileInfo برای metadata ذخیره‌سازی در database Strapi
        uploadForm.append(
            "fileInfo",
            JSON.stringify({
                name: uniqueFileName,
                caption: `Receipt for order ${trimmedOrderId}`,
                alternativeText: `Payment receipt for order ${trimmedOrderId}`,
            })
        );

        const uploadRes = await fetch(`${STRAPI_API_URL}/api/upload`, {
            method: "POST",
            headers: {
                // Do NOT set Content-Type manually — fetch sets the correct boundary
                // for multipart automatically when body is FormData.
                Authorization: `Bearer ${strapiToken}`,
            },
            body: uploadForm,
        });

        if (!uploadRes.ok) {
            const errText = await uploadRes.text();
            console.error("[upload-receipt] Strapi upload failed:", errText);
            return NextResponse.json(
                { message: "آپلود تصویر فیش با خطا مواجه شد. لطفاً دوباره تلاش کنید." },
                { status: 502 }
            );
        }

        // Strapi returns an array of uploaded media objects
        const uploadData = await uploadRes.json();
        uploadedMediaId = uploadData?.[0]?.id;

        if (!uploadedMediaId) {
            console.error("[upload-receipt] Strapi upload returned no media id:", uploadData);
            return NextResponse.json(
                { message: "خطای غیرمنتظره در پردازش تصویر. لطفاً دوباره تلاش کنید." },
                { status: 502 }
            );
        }
    } catch (err) {
        console.error("[upload-receipt] Network error during file upload:", err);
        return NextResponse.json(
            { message: "ارتباط با سرور ذخیره‌سازی برقرار نشد. لطفاً دوباره تلاش کنید." },
            { status: 503 }
        );
    }

    // ── STEP 3: Check User/Order Name & Update Order in Strapi ────────────────
    // Strapi v5 uses documentId in the URL instead of numeric id.
    // Reuse existingOrder & existingUser verified in Step 1.
    try {
        let shouldUpdateOrderFullName = true;
        let userToUpdateId = null;

        const userProfileName = (existingUser?.firstName || existingUser?.lastName)
            ? `${existingUser?.firstName || ''} ${existingUser?.lastName || ''}`.trim()
            : '';

        const orderFullName = existingOrder?.fullName?.trim() || '';
        const isOrderNameGeneric =
            !orderFullName ||
            orderFullName.startsWith('کاربر (') ||
            orderFullName === 'کاربر فروشگاه' ||
            /^\d+$/.test(orderFullName);

        // اگر در پروفایل کاربر نام وجود داشت و سفارش نام معتبر داشت، نام قبلی را حفظ کن
        if (userProfileName && !isOrderNameGeneric) {
            shouldUpdateOrderFullName = false;
        }

        const trimmedCardHolder = cardHolderName.trim();

        // اگر کاربر مالک در پروفایلش نام ندارد، برای ثبت خودکار نام در پروفایل ذخیره کن
        if (
            existingUser?.id != null &&
            String(existingUser.id) === sessionUserId &&
            !userProfileName &&
            trimmedCardHolder
        ) {
            userToUpdateId = existingUser.id;
        }

        // در صورت خالی بودن نام پروفایل، نام کاربر را نیز در دیتابیس کاربران تکمیل کن
        if (userToUpdateId && trimmedCardHolder) {
            try {
                const nameParts = trimmedCardHolder.split(' ');
                const firstName = nameParts[0] || trimmedCardHolder;
                const lastName = nameParts.slice(1).join(' ') || '';

                await fetch(`${STRAPI_API_URL}/api/users/${encodeURIComponent(String(userToUpdateId))}`, {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${strapiToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        firstName,
                        lastName,
                    }),
                });
            } catch (uErr) {
                console.warn('[upload-receipt] Could not update user profile name:', uErr);
            }
        }

        const orderUpdatePayload = {
            data: {
                receiptImage: uploadedMediaId,         // Link the uploaded media by its numeric id
                cardHolderName: trimmedCardHolder,
                paymentMethod: "card_to_card",         // Confirm the payment channel
                paymentStatus: "pending_verification", // Advance the status lifecycle
                orderStatus: "pending",                // ریست کردن وضعیت سفارش به در حال بررسی
                rejectionReason: null,                 // پاک کردن دلیل رد قبلی
                ...(shouldUpdateOrderFullName ? { fullName: trimmedCardHolder } : {}),
            },
        };

        const orderRes = await fetch(
            // Strapi v5: /api/{plural-name}/{documentId}
            `${STRAPI_API_URL}/api/orders/${encodeURIComponent(trimmedOrderId)}`,
            {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${strapiToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(orderUpdatePayload),
            }
        );

        if (!orderRes.ok) {
            const errData = await orderRes.json().catch(() => ({}));
            console.error("[upload-receipt] Strapi order update failed:", JSON.stringify(errData));
            return NextResponse.json(
                {
                    message:
                        errData?.error?.message ||
                        "بروزرسانی سفارش با خطا مواجه شد. لطفاً با پشتیبانی تماس بگیرید.",
                },
                { status: 502 }
            );
        }

        const updatedOrder = await orderRes.json();

        // ── Success Response ──────────────────────────────────────────────────────
        // Return only the data the client actually needs; never forward raw Strapi
        // internals or tokens.
        return NextResponse.json(
            {
                success: true,
                message:
                    "فیش واریزی با موفقیت ثبت شد. پرداخت شما در انتظار تأیید توسط فروشگاه است.",
                order: {
                    documentId: updatedOrder?.data?.documentId,
                    paymentStatus: updatedOrder?.data?.paymentStatus,
                },
            },
            { status: 200 }
        );
    } catch (err) {
        console.error("[upload-receipt] Network error during order update:", err);
        return NextResponse.json(
            { message: "ارتباط با سرور سفارشات برقرار نشد. لطفاً دوباره تلاش کنید." },
            { status: 503 }
        );
    }
}
