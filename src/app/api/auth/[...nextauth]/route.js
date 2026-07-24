import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = async (req, context) => {
    const params = await context?.params;
    return NextAuth(req, { ...context, params }, authOptions);
};

export { handler as GET, handler as POST };