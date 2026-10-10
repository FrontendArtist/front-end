import { formatStrapiCourses, getEffectiveCoursePrice } from './courseUtils';
import { formatStrapiProducts } from './productUtils';

// فقط شناسهٔ قلم از سفارش خوانده می‌شود؛ قیمت و موجودی از کاتالوگ منتشرشده می‌آیند.
export async function recoverOrderItems(orderItems, user, readCatalog) {
    const items = [];
    const warnings = [];
    for (const old of orderItems) {
        const isCourse = Boolean(old.courseId || old.chapterId || old.__component === 'order.course-order-item');
        const id = isCourse ? old.courseId : old.productId;
        if (!id) { warnings.push(`«${old.title}» قابل انتقال نیست.`); continue; }
        const params = new URLSearchParams({ status: 'published', 'filters[id][$eq]': String(id) });
        if (isCourse) {
            params.set('populate[chapters]', 'true');
            params.set('populate[media]', 'true');
        } else {
            params.set('populate[images]', 'true');
        }
        const data = await readCatalog(`/api/${isCourse ? 'courses' : 'products'}?${params}`);
        const current = (isCourse ? formatStrapiCourses(data) : formatStrapiProducts(data))[0];
        if (!current || (!isCourse && (!current.isAvailable || current.stock < 1))) {
            warnings.push(`«${old.title}» اکنون موجود یا قابل خرید نیست.`); continue;
        }
        const chapter = old.chapterId ? current.chapters.find((c) => String(c.id) === String(old.chapterId)) : null;
        if (old.chapterId && !chapter) { warnings.push(`فصل «${old.title}» دیگر قابل خرید نیست.`); continue; }
        if (isCourse && !chapter && current.isChaptered) { warnings.push(`«${old.title}» اکنون به‌صورت فصلی عرضه می‌شود.`); continue; }
        const price = chapter ? { toman: Number(chapter.price.toman), original: Number(chapter.price.toman) }
            : isCourse ? getEffectiveCoursePrice(current, user) : current.price;
        const quantity = isCourse ? 1 : Math.min(current.stock, Math.max(1, Number(old.quantity) || 1));
        if (!isCourse && quantity < Number(old.quantity)) warnings.push(`تعداد «${old.title}» به موجودی فعلی کاهش یافت.`);
        items.push({ id: chapter ? `chapter-${chapter.id}` : current.id,
            documentId: current.documentId, courseId: isCourse ? current.id : undefined,
            chapterId: chapter?.id, type: chapter ? 'chapter' : isCourse ? 'course' : 'product',
            title: chapter ? `${current.title} - ${chapter.title}` : current.title,
            slug: chapter ? `${current.slug}-chapter-${chapter.id}` : current.slug,
            price: Number(price.toman), originalPrice: Number(price.original ?? current.originalPrice ?? price.toman),
            normalPrice: isCourse ? Number(current.price.toman) : undefined,
            internationalPrice: chapter ? null : current.internationalPrice,
            image: current.image?.url || '/images/forempties2.png', quantity,
            stock: isCourse ? undefined : current.stock });
    }
    return { items, warnings };
}
