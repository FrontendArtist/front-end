// src/lib/auth.js - نسخه اصلاح شده با لاگ برای دیباگ

import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

// آدرس پایه Strapi API از .env.local
const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;

export const authOptions = {
    providers: [
        CredentialsProvider({
            id: 'otp-login',
            name: 'ورود با کد یکبار مصرف',
            credentials: {
                phoneNumber: { label: 'شماره موبایل', type: 'text' },
                otpCode: { label: 'کد تایید', type: 'text' },
            },
            async authorize(credentials) {
                // 🚨 لاگ برای دیباگ: چه اطلاعاتی به NextAuth رسیده است؟
                console.log('--- NextAuth Authorize Called ---');
                console.log('Received Credentials:', credentials);

                const { phoneNumber, otpCode } = credentials;

                // اطمینان از وجود داده‌ها
                if (!phoneNumber || !otpCode) {
                    console.error("Missing credentials.");
                    return null;
                }

                // فراخوانی API سفارشی Strapi: /api/auth/otp/verify
                const verifyUrl = `${STRAPI_API_URL}/api/auth/otp/verify`;

                try {
                    const response = await fetch(verifyUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phoneNumber, otpCode }),
                        cache: 'no-store'
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        // اگر Strapi خطای 400 بدهد، آن را به عنوان Error پرتاب کن
                        const errorMsg = data.error?.message || data.message || 'خطا در تایید کد';
                        console.error('Strapi API Error:', errorMsg);
                        throw new Error(errorMsg);
                    }

                    const { jwt, user } = data;

                    if (user && jwt) {
                        console.log('Authorization Successful. User ID:', user.id);
                        return { ...user, id: user.id, jwt: jwt };
                    }

                    console.error('Authorization failed: Missing user or JWT in response.');
                    return null;

                } catch (error) {
                    console.error('OTP Verification Failed (NextAuth Catch Block):', error.message);
                    // خطا را مجدداً پرتاب کنید تا در AuthModal قابل مشاهده باشد
                    throw new Error(error.message || 'خطای سرور در فرایند احراز هویت.');
                }
            },
        }),

        GoogleProvider({
            clientId: process.env.GOOGLE_ID || '',
            clientSecret: process.env.GOOGLE_SECRET || '',
            allowDangerousEmailAccountLinking: true
        }),
    ],

    // Callbacks و Secret بدون تغییر باقی می‌مانند
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.jwt = user.jwt;
                token.phoneNumber = user.phoneNumber;
            }
            return token;
        },
        async session({ session, token }) {
            session.user.id = token.id;
            session.user.jwt = token.jwt;
            session.user.phoneNumber = token.phoneNumber;
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: { error: '/auth/error' },
};

export const handler = NextAuth(authOptions);