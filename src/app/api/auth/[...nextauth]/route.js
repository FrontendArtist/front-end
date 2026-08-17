import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const handler = NextAuth(authOptions);

async function authHandler(req, context) {
  try {
    if (context?.params && typeof context.params.then === 'function') {
      context.params = await context.params;
    }
    return await handler(req, context);
  } catch (error) {
    console.error('⚠️ [Auth Route Handler Error]:', error?.message || error);
    
    // اگر درخواست مربوط به session بود، همیشه JSON خالی برمی‌گردانیم تا کلاینت کرش نکند
    const url = new URL(req.url);
    if (url.pathname.endsWith('/session')) {
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(
      JSON.stringify({ error: 'Authentication service temporarily unavailable' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export { authHandler as GET, authHandler as POST };