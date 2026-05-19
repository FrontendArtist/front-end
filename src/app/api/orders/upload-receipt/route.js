/**
 * POST /api/orders/upload-receipt
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-Side API Proxy — Card-to-Card Receipt Upload
 *
 * DATA FLOW (all steps run server-side; Strapi token never reaches the client):
 *
 *  Client (browser)
 *    │  POST multipart/form-data  { orderId, file, trackingNumber, cardHolderName }
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
 *                 – save trackingNumber & cardHolderName
 *                 – advance paymentStatus → "pending_verification"
 *    │
 *    ▼
 *  Client receives { success: true, order: { … } }   (no token exposed)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// ── Environment ───────────────────────────────────────────────────────────────
// STRAPI_API_TOKEN is intentionally NOT prefixed with NEXT_PUBLIC_ so it is
// never bundled into client-side JavaScript.
const STRAPI_BASE_URL =
    process.env.NEXT_PUBLIC_STRAPI_API_URL || "http://localhost:1337";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request) {
    // ── Auth Guard ──────────────────────────────────────────────────────────────
    // Ensure only authenticated users can call this endpoint.
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json(
            { message: "برای ارسال فیش، ابتدا وارد حساب کاربری خود شوید." },
            { status: 401 }
        );
    }

    // ── Guard: Token configured ─────────────────────────────────────────────────
    if (!STRAPI_TOKEN) {
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
    const trackingNumber = formData.get("trackingNumber"); // string
    const cardHolderName = formData.get("cardHolderName"); // string

    // [VALIDATION 1] Required text fields
    if (!orderId || typeof orderId !== "string" || orderId.trim() === "") {
        return NextResponse.json(
            { message: "شناسه سفارش (orderId) الزامی است." },
            { status: 400 }
        );
    }

    if (!trackingNumber || trackingNumber.trim() === "") {
        return NextResponse.json(
            { message: "کد پیگیری واریز الزامی است." },
            { status: 400 }
        );
    }

    if (!cardHolderName || cardHolderName.trim() === "") {
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

    // ── STEP 2: Upload image to Strapi /api/upload ──────────────────────────────
    // Rebuild a fresh FormData so we only forward the file blob to Strapi.
    // The Bearer token is injected server-side and never exposed to the client.
    let uploadedMediaId;
    try {
        const uploadForm = new FormData();
        // Strapi's upload plugin expects the field name "files"
        uploadForm.append("files", file, file.name || "receipt.jpg");

        const uploadRes = await fetch(`${STRAPI_BASE_URL}/api/upload`, {
            method: "POST",
            headers: {
                // Do NOT set Content-Type manually — fetch sets the correct boundary
                // for multipart automatically when body is FormData.
                Authorization: `Bearer ${STRAPI_TOKEN}`,
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

    // ── STEP 3: Update the Order in Strapi ─────────────────────────────────────
    // Strapi v5 uses documentId in the URL instead of numeric id.
    // We set paymentStatus to "pending_verification" so the admin knows
    // a receipt has been submitted and is awaiting manual review.
    try {
        const orderUpdatePayload = {
            data: {
                receiptImage: uploadedMediaId,         // Link the uploaded media by its numeric id
                trackingNumber: trackingNumber.trim(),
                cardHolderName: cardHolderName.trim(),
                paymentMethod: "card_to_card",         // Confirm the payment channel
                paymentStatus: "pending_verification", // Advance the status lifecycle
            },
        };

        const orderRes = await fetch(
            // Strapi v5: /api/{plural-name}/{documentId}
            `${STRAPI_BASE_URL}/api/orders/${orderId.trim()}`,
            {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${STRAPI_TOKEN}`,
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
                    trackingNumber: updatedOrder?.data?.trackingNumber,
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
