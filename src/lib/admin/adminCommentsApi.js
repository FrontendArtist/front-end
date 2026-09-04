import { adminFetch } from './adminFetch';
import { STRAPI_API_URL } from '../api';

export async function getAdminComments(jwt, { page, pageSize, start, limit = 20 } = {}) {
    let paginationQuery = '';
    if (start !== undefined && start !== null) {
        paginationQuery = `pagination[start]=${start}&pagination[limit]=${limit}`;
    } else {
        const p = page || 1;
        const ps = pageSize || 50;
        paginationQuery = `pagination[page]=${p}&pagination[pageSize]=${ps}`;
    }

    const endpoint = `/api/comments?sort=createdAt:desc&${paginationQuery}&populate[user]=true&populate[article]=true&populate[product]=true&populate[course]=true&populate[comment_parent]=true`;
    try {
        const data = await adminFetch(endpoint, jwt);
        if (!data) return { comments: [], meta: null, error: true };

        const comments = (data.data || []).map((item) => {
            const attrs = item.attributes || item;

            const articleObj = attrs.article?.data?.attributes || attrs.article?.data || attrs.article || null;
            const productObj = attrs.product?.data?.attributes || attrs.product?.data || attrs.product || null;
            const courseObj  = attrs.course?.data?.attributes  || attrs.course?.data  || attrs.course  || null;

            const relatedTitle =
                productObj?.title ||
                articleObj?.title ||
                courseObj?.title  ||
                'عمومی';

            const relatedType =
                productObj ? 'محصول' :
                articleObj ? 'مقاله' :
                courseObj  ? 'دوره'   : 'سایر';

            const userName =
                attrs.user?.username ||
                attrs.user?.data?.attributes?.username ||
                attrs.name ||
                'کاربر مهمان';

            const relatedUrl =
                productObj?.slug ? `/product/${productObj.slug}` :
                articleObj?.slug ? `/articles/${articleObj.slug}` :
                courseObj?.slug  ? `/courses/${courseObj.slug}`   : null;

            const articleDocId = attrs.article?.documentId || attrs.article?.data?.documentId || attrs.article?.id || attrs.article?.data?.id || null;
            const productDocId = attrs.product?.documentId || attrs.product?.data?.documentId || attrs.product?.id || attrs.product?.data?.id || null;
            const courseDocId  = attrs.course?.documentId  || attrs.course?.data?.documentId  || attrs.course?.id  || attrs.course?.data?.id  || null;

            const parentDocId = attrs.comment_parent?.documentId || attrs.comment_parent?.data?.documentId || attrs.comment_parent?.id || attrs.comment_parent?.data?.id || null;

            return {
                id: item.id,
                documentId: item.documentId || String(item.id),
                name: userName,
                content: attrs.content || '',
                rating: attrs.rating || 0,
                isApproved: attrs.isApproved ?? false,
                relatedTitle,
                relatedType,
                relatedUrl,
                articleDocId,
                productDocId,
                courseDocId,
                parentId: attrs.comment_parent?.id || attrs.comment_parent?.data?.id || null,
                parentDocId,
                createdAt: attrs.createdAt,
            };
        });

        return { comments, meta: data.meta || null, error: false };
    } catch (e) {
        console.error('[getAdminComments] error:', e);
        return { comments: [], meta: null, error: true };
    }
}

export async function updateCommentApproval(documentId, isApproved, jwt) {
    try {
        const res = await fetch(`${STRAPI_API_URL}/api/comments/${documentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${jwt}`,
            },
            body: JSON.stringify({ data: { isApproved } }),
        });
        return res.ok;
    } catch (e) {
        console.error('[updateCommentApproval] error:', e);
        return false;
    }
}

export async function deleteCommentAdmin(documentId, jwt) {
    try {
        const res = await fetch(`${STRAPI_API_URL}/api/comments/${documentId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${jwt}`,
            },
        });
        return res.ok;
    } catch (e) {
        console.error('[deleteCommentAdmin] error:', e);
        return false;
    }
}

export async function replyCommentAdmin(parentId, content, jwt) {
    try {
        const dataPayload = {
            name: 'مدیریت',
            content: content.trim(),
            rating: 5,
            isApproved: true,
            comment_parent: { connect: [parentId] }
        };

        const res = await fetch(`${STRAPI_API_URL}/api/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${jwt}`,
            },
            body: JSON.stringify({ data: dataPayload }),
        });
        return res.ok;
    } catch (e) {
        console.error('[replyCommentAdmin] error:', e);
        return false;
    }
}
