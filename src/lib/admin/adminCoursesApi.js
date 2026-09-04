import { adminFetch } from './adminFetch';

export async function getAdminCoursesAll(jwt, { page, pageSize, start, limit = 20 } = {}) {
    let paginationQuery = '';
    if (start !== undefined && start !== null) {
        paginationQuery = `pagination[start]=${start}&pagination[limit]=${limit}`;
    } else {
        const p = page || 1;
        const ps = pageSize || 50;
        paginationQuery = `pagination[page]=${p}&pagination[pageSize]=${ps}`;
    }

    const endpointDraft =
        `/api/courses?populate[media][fields][0]=url&populate[media][fields][1]=name&sort=createdAt:desc&${paginationQuery}&status=draft`;
    const endpointPub =
        `/api/courses?fields[0]=documentId&fields[1]=publishedAt&pagination[limit]=500&status=published`;

    const [data, pubData] = await Promise.all([
        adminFetch(endpointDraft, jwt),
        adminFetch(endpointPub, jwt),
    ]);

    if (!data) return { courses: [], meta: null, error: true };

    const publishedMap = new Map();
    if (pubData?.data && Array.isArray(pubData.data)) {
        pubData.data.forEach((p) => {
            const attrs = p.attributes || p;
            const docId = p.documentId || String(p.id);
            publishedMap.set(docId, attrs.publishedAt || attrs.createdAt || true);
        });
    }

    const courses = (data.data || []).map((item) => {
        const attrs = item.attributes || item;
        const docId = item.documentId || String(item.id);
        const actualPublishedAt = publishedMap.get(docId) || null;

        const rawMedia = attrs.media?.data || attrs.media || [];
        const media = Array.isArray(rawMedia)
            ? rawMedia.map((m) => {
                const mAttrs = m.attributes || m;
                return { id: m.id, documentId: m.documentId || String(m.id), url: mAttrs.url, name: mAttrs.name };
            })
            : [];

        return {
            id: item.id,
            documentId: docId,
            title: attrs.title || '',
            slug: attrs.slug || '',
            price: attrs.price ?? null,
            isFree: attrs.isFree ?? false,
            isChaptered: attrs.isChaptered ?? false,
            publishedAt: actualPublishedAt,
            media,
        };
    });

    return { courses, meta: data.meta || null, error: false };
}

export async function getAdminCourseById(documentId, jwt) {
    const endpointDraft =
        `/api/courses/${documentId}?populate[media]=true&populate[chapters][populate][lessons]=true&populate[curriculum]=true&status=draft`;
    const endpointPub =
        `/api/courses/${documentId}?fields[0]=publishedAt&status=published`;

    const [data, pubRes] = await Promise.all([
        adminFetch(endpointDraft, jwt),
        adminFetch(endpointPub, jwt),
    ]);

    if (!data) return { course: null, error: true };

    const item = data.data || data;
    const attrs = item.attributes || item;

    const pubItem = pubRes?.data || pubRes;
    const pubAttrs = pubItem?.attributes || pubItem;
    const actualPublishedAt = pubAttrs?.publishedAt || null;

    const rawMedia = attrs.media?.data || attrs.media || [];
    const media = Array.isArray(rawMedia)
        ? rawMedia.map((m) => {
            const mAttrs = m.attributes || m;
            return { id: m.id, documentId: m.documentId || String(m.id), url: mAttrs.url, name: mAttrs.name };
        })
        : [];

    const rawChapters = Array.isArray(attrs.chapters) ? attrs.chapters : [];
    const chapters = rawChapters.map((ch) => ({
        id: ch.id,
        title: ch.title || '',
        price: ch.price ?? null,
        duration: ch.duration || '',
        lessons: Array.isArray(ch.lessons) ? ch.lessons.map((l) => ({
            id: l.id,
            title: l.title || '',
            isFree: l.isFree ?? false,
            videoUrl: l.videoUrl || '',
            audioUrl: l.audioUrl || '',
            duration: l.duration || '',
        })) : [],
    }));

    const rawCurriculum = Array.isArray(attrs.curriculum) ? attrs.curriculum : [];
    const curriculum = rawCurriculum.map((l) => ({
        id: l.id,
        title: l.title || '',
        isFree: l.isFree ?? false,
        videoUrl: l.videoUrl || '',
        audioUrl: l.audioUrl || '',
        duration: l.duration || '',
    }));

    const course = {
        id: item.id,
        documentId: item.documentId || String(item.id),
        title: attrs.title || '',
        slug: attrs.slug || '',
        price: attrs.price ?? null,
        isFree: attrs.isFree ?? false,
        isChaptered: attrs.isChaptered ?? false,
        teaserUrl: attrs.teaserUrl || '',
        description: attrs.description || '',
        content: attrs.content || '',
        publishedAt: actualPublishedAt,
        media,
        chapters,
        curriculum,
    };

    return { course, error: false };
}

export async function getAdminCourses(jwt) {
    const raw = await adminFetch('/api/courses?fields[0]=title&fields[1]=slug&status=published&pagination[limit]=200', jwt);
    if (!raw?.data) return [];
    return raw.data.map((item) => {
        const attrs = item.attributes || item;
        return {
            id: item.id,
            documentId: item.documentId || String(item.id),
            title: attrs.title || '',
            slug: attrs.slug || '',
        };
    });
}
