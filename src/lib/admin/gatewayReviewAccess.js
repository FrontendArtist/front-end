import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { checkAdminTopUpPermissionWithByeMoney } from '@/lib/byeMoneyApi';

export async function getGatewayReviewAccess() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt) return { session: null, status: 401 };
    const permission = await checkAdminTopUpPermissionWithByeMoney({ jwt: session.user.jwt });
    return { session, status: permission.hasPermission ? 200 : permission.status || 403 };
}
