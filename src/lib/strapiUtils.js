// This is the definitive version of the data formatting utility file,
// tailored to your specific flat Strapi API structure.

import { API_BASE_URL } from './api';

/**
 * A generic helper to format a single image object.
 * Handles both flat and nested image structures from Strapi.
 * @param {object} imgData - A single image object from your Strapi API (flat or nested).
 * @returns {{url: string, alt: string}}
 */
export function formatSingleImage(imgData) {
  if (!imgData) {
    return { url: '/images/forempties2.png', alt: 'Placeholder Image' };
  }

  // Handle nested structure: { data: { url: '...', alternativeText: '...' } }
  if (imgData.data && typeof imgData.data === 'object') {
    const dataObj = imgData.data;
    if (!dataObj.url) {
      return { url: '/images/forempties2.png', alt: 'Placeholder Image' };
    }
    const imageUrl = dataObj.url.startsWith('http') ? dataObj.url : `${API_BASE_URL}${dataObj.url}`;
    return {
      url: imageUrl,
      alt: dataObj.alternativeText || '',
    };
  }

  // Handle flat structure: { url: '...', alternativeText: '...' }
  if (!imgData.url) {
    return { url: '/images/forempties2.png', alt: 'Placeholder Image' };
  }
  const imageUrl = imgData.url.startsWith('http') ? imgData.url : `${API_BASE_URL}${imgData.url}`;
  return {
    url: imageUrl,
    alt: imgData.alternativeText || '',
  };
}
/**
 * Formats your specific Strapi API response for PRODUCTS.
 */
export function formatStrapiProducts(apiResponse) {
  if (!apiResponse || !apiResponse.data) return [];

  const rawList = Array.isArray(apiResponse.data)
    ? apiResponse.data
    : [apiResponse.data];

  return rawList
    .filter(item => item && (item.title || item.attributes?.title))
    .map(item => {
      const attrs = item.attributes || item;
      const priceVal = typeof attrs.price === 'object' ? attrs.price?.toman || 0 : (attrs.price || 0);
      const priceObject = { toman: priceVal };

      // shortDescription: اولویت با فیلد مستقل shortDescription، سپس fallback به اولین پاراگراف description
      const shortDescription =
        attrs.shortDescription ||
        (attrs.description && attrs.description[0]?.children?.[0]?.text) ||
        attrs.excerpt ||
        '';

      // content: فیلد متنی مارک‌داون برای محتوای عمیق محصول
      const content = attrs.content || null;

      // specifications: آرایه‌ای از { key, value } برای جدول مشخصات فنی
      const specifications = Array.isArray(attrs.specifications) ? attrs.specifications : [];

      // stock و isAvailable برای لاجیک FOMO موجودی
      const stock = typeof attrs.stock === 'number' ? attrs.stock : 0;
      const isAvailable = attrs.isAvailable !== false; // پیش‌فرض: true

      const rawImage = attrs.image || (attrs.images && (attrs.images[0] || attrs.images.data?.[0])) || attrs.cover || null;
      const images = (attrs.images || []).map(img => formatSingleImage(img));
      const mainImage = formatSingleImage(rawImage || (images.length > 0 ? images[0] : null));

      const categories = (attrs.categories || []).map(cat => {
        const categoryData = cat.data ? cat.data : cat;
        const categoryAttrs = categoryData.attributes || categoryData;

        let parentData = null;
        if (categoryAttrs.parent && categoryAttrs.parent.slug) {
          const pAttrs = categoryAttrs.parent.attributes || categoryAttrs.parent;
          parentData = {
            slug: pAttrs.slug,
            name: pAttrs.name
          };
        }
        else if (categoryAttrs.parent?.data) {
          const parentContent = categoryAttrs.parent.data;
          const parentAttrs = parentContent.attributes || parentContent;
          parentData = {
            slug: parentAttrs.slug,
            name: parentAttrs.name
          };
        }

        return {
          slug: categoryAttrs.slug,
          name: categoryAttrs.name,
          parent: parentData
        };
      });

      return {
        id: item.id,
        documentId: item.documentId || String(item.id || ''),
        title: attrs.title || '',
        slug: attrs.slug || '',
        price: priceObject,
        discountPrice: attrs.discountPrice || attrs.discount_price || null,
        shortDescription: shortDescription,
        content: content,
        specifications: specifications,
        stock: stock,
        isAvailable: isAvailable,
        images: images,
        image: mainImage,
        categories: categories,
      };
    });
}
/**
 * Helper to convert Strapi v5 Blocks / Rich Text format into an HTML string
 */
export function strapiBlocksToHtml(blocks) {
  if (!blocks) return '';
  if (typeof blocks === 'string') return blocks;
  if (!Array.isArray(blocks)) {
    if (typeof blocks === 'object') blocks = [blocks];
    else return '';
  }

  return blocks
    .map((block) => {
      if (!block) return '';
      if (typeof block === 'string') return block;

      const renderChildren = (children) => {
        if (!Array.isArray(children)) return '';
        return children
          .map((child) => {
            if (typeof child === 'string') return child;
            let text = child.text || '';
            if (child.bold) text = `<strong>${text}</strong>`;
            if (child.italic) text = `<em>${text}</em>`;
            if (child.underline) text = `<u>${text}</u>`;
            if (child.strikethrough) text = `<s>${text}</s>`;
            if (child.code) text = `<code>${text}</code>`;
            return text;
          })
          .join('');
      };

      const childrenHtml = renderChildren(block.children);

      switch (block.type) {
        case 'heading': {
          const level = block.level || 2;
          return `<h${level}>${childrenHtml}</h${level}>`;
        }
        case 'paragraph':
          return `<p>${childrenHtml}</p>`;
        case 'list': {
          const tag = block.format === 'ordered' ? 'ol' : 'ul';
          const items = Array.isArray(block.children)
            ? block.children
                .map((item) => `<li>${renderChildren(item.children || [item])}</li>`)
                .join('')
            : '';
          return `<${tag}>${items}</${tag}>`;
        }
        case 'quote':
          return `<blockquote><p>${childrenHtml}</p></blockquote>`;
        case 'code':
          return `<pre><code>${childrenHtml}</code></pre>`;
        case 'image': {
          const url = block.image?.url || '';
          const alt = block.image?.alternativeText || '';
          return url ? `<figure><img src="${url}" alt="${alt}" /></figure>` : '';
        }
        default:
          return childrenHtml ? `<p>${childrenHtml}</p>` : '';
      }
    })
    .join('');
}

/**
 * Formats your specific Strapi API response for ARTICLES.
 */
export function formatStrapiArticles(apiResponse) {
  if (!apiResponse || !apiResponse.data) return [];

  return apiResponse.data
    .filter(item => item && item.title)
    .map(item => {
      let rawContent = item.content;
      if (Array.isArray(rawContent) || (rawContent && typeof rawContent === 'object')) {
        rawContent = strapiBlocksToHtml(rawContent);
      }

      const rawCats =
        item.articles_categories?.data || item.articles_categories ||
        item.attributes?.articles_categories?.data || item.attributes?.articles_categories ||
        item.categories?.data || item.categories ||
        item.attributes?.categories?.data || item.attributes?.categories ||
        item.category?.data || item.category || [];

      const catList = (Array.isArray(rawCats) ? rawCats : [rawCats]).filter(Boolean);
      const categories = catList.map(c => {
        const cAttrs = c.attributes || c;
        return {
          id: c.id,
          documentId: c.documentId || String(c.id || ''),
          name: cAttrs.name || cAttrs.title || '',
          slug: cAttrs.slug || '',
        };
      }).filter(c => c.name || c.slug);

      // استخراج تگ‌ها به صورت انعطاف‌پذیر (آرایه رشته‌ها، کاما جدا شده یا آبجکت‌های Strapi)
      let rawTags =
        item.tags?.data || item.tags ||
        item.attributes?.tags?.data || item.attributes?.tags || [];
      if (typeof rawTags === 'string') {
        rawTags = rawTags.split(',').map(s => s.trim()).filter(Boolean);
      }
      const tagList = (Array.isArray(rawTags) ? rawTags : [rawTags]).filter(Boolean);
      const tags = tagList.map(t => {
        if (typeof t === 'string') {
          return { name: t, slug: t };
        }
        const tAttrs = t.attributes || t;
        return {
          id: t.id,
          name: tAttrs.name || tAttrs.title || tAttrs.slug || '',
          slug: tAttrs.slug || tAttrs.name || tAttrs.title || '',
        };
      }).filter(t => t.name || t.slug);

      return {
        id: item.id,
        documentId: item.documentId, // ← اضافه شده برای سیستم کامنت‌ها
        slug: item.slug,
        title: item.title,
        excerpt: item.excerpt,
        content: rawContent || '', // HTML/RichText content
        date: item.publishedAt || item.createdAt,
        createdAt: item.createdAt || item.publishedAt,
        publishedAt: item.publishedAt || item.createdAt,
        category: categories[0] || null,
        categories,
        tags,
        enable_cta: item.enable_cta !== undefined ? Boolean(item.enable_cta) : (item.attributes?.enable_cta !== undefined ? Boolean(item.attributes.enable_cta) : true),
        featured_course: item.featured_course?.data ? (item.featured_course.data.attributes || item.featured_course.data) : (item.featured_course || null),
        featured_product: item.featured_product?.data ? (item.featured_product.data.attributes || item.featured_product.data) : (item.featured_product || null),
        // Articles have a single 'cover' object.
        cover: formatSingleImage(item.cover),
      };
    });
}

/**
 * Formats your specific Strapi API response for COURSES.
 */
export function formatStrapiCourses(apiResponse) {
  if (!apiResponse || !apiResponse.data) return [];

  const rawList = Array.isArray(apiResponse.data)
    ? apiResponse.data
    : [apiResponse.data];

  return rawList
    .filter(item => item && item.title)
    .map(item => {
      /**
       * تابع کمکی برای فرمت استاندارد جلسات (Lessons / Sessions)
       */
      const formatLesson = (session) => {
        if (!session) return null;
        let audioUrl = session.audioUrl || null;
        if (audioUrl) {
          try {
            const url = new URL(audioUrl);
            if (url.pathname.startsWith('/uploads/')) {
              audioUrl = `/api/media${url.pathname}`;
            }
          } catch {
            // در صورت نسبی بودن URL، تغییر ایجاد نمی‌شود
          }
        }
        return {
          id: session.id,
          title: session.title || '',
          videoUrl: session.videoUrl || null,
          audioUrl,
          isFree: Boolean(session.isFree),
          duration: session.duration || '00:00',
        };
      };

      /**
       * فرمت عمیق فصل‌ها و دروس داخلی آن‌ها (Strapi v5 deep nested structure)
       * تضمین برگشت آرایه خالی [] در صورت null یا undefined بودن جهت جلوگیری از کرش UI
       */
      const chapters = Array.isArray(item.chapters)
        ? item.chapters.map(ch => ({
            id: ch.id,
            title: ch.title || '',
            price: { toman: ch.price || 0 },
            duration: ch.duration || null,
            lessons: Array.isArray(ch.lessons)
              ? ch.lessons.map(formatLesson).filter(Boolean)
              : [],
          }))
        : [];

      /**
       * فرمت سرفصل‌های دوره غیرفصلی (Flat Curriculum)
       */
      const curriculum = Array.isArray(item.curriculum)
        ? item.curriculum.map(formatLesson).filter(Boolean)
        : [];

      return {
        id: item.id,
        documentId: item.documentId,
        slug: item.slug,
        title: item.title,
        price: { toman: item.price || 0 },
        shortDescription:
          (item.description && item.description[0]?.children[0]?.text) || item.shortDescription || '',
        image: formatSingleImage(item.media ? item.media[0] : item.image || null),
        teaserUrl: item.teaserUrl || null,
        content: item.content || null,
        isChaptered: Boolean(item.isChaptered),
        chapters,
        curriculum,
      };
    });
}

/**
 * Formats your specific Strapi API response for SERVICES.
 */
export function formatStrapiServices(apiResponse) {
  if (!apiResponse || !apiResponse.data) return [];

  return apiResponse.data
    .filter(item => item && item.title)
    .map(item => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      description: (item.description && item.description[0]?.children[0]?.text) || '',
      // Services have a single 'image' object
      image: formatSingleImage(item.image),
      link: item.link || null,
    }));
}

/**
 * تاریخ را به فرمت فارسی تبدیل می‌کند
 * @param {string} isoDate - تاریخ به فرمت ISO
 * @returns {string} تاریخ فارسی شده
 */
function formatPersianDate(isoDate) {
  if (!isoDate) return '';

  const date = new Date(isoDate);
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  return new Intl.DateTimeFormat('fa-IR', options).format(date);
}

/**
 * Formats your specific Strapi API response for TESTIMONIALS.
 */
export function formatStrapiTestimonials(apiResponse) {
  if (!apiResponse || !apiResponse.data) return [];

  return apiResponse.data
    .filter(item => item && item.name && item.comment)
    .map(item => ({
      id: item.id,
      documentId: item.documentId,
      name: item.name,
      title: item.title || null,
      comment: item.comment,
      createdAt: item.createdAt || item.publishedAt || null,
      formattedDate: formatPersianDate(item.createdAt || item.publishedAt),
    }));
}

/**
 * Formats your specific Strapi API response for FAQs.
 * Maps Strapi FAQ fields to the format expected by the Accordion component.
 */
export function formatStrapiFaqs(apiResponse) {
  // Handle both formats: direct array or { data: [...] }
  const dataArray = Array.isArray(apiResponse) ? apiResponse : apiResponse?.data;

  if (!dataArray || !Array.isArray(dataArray)) return [];

  return dataArray
    .filter(item => item && item.question && item.answer)
    .map(item => ({
      id: item.id,
      title: item.question,    // Maps to Accordion's 'title' prop
      content: item.answer,    // Maps to Accordion's 'content' prop
    }));
}

/**
 * ✅ Formatter برای محصولات
 */
function formatStrapiProduct(product) {
  const attr = product.attributes || {};
  const img = attr.images?.data?.[0]
    ? formatSingleImage(attr.images.data[0])
    : { url: '/images/placeholder.png' };

  return {
    id: product.id,
    title: attr.title,
    slug: attr.slug,
    price: attr.price,
    image: img.url,
  };
}



/**
 * ✅ Formatter برای داده‌های Strapi Categories
 */
export function formatStrapiCategories(data = []) {
  if (!Array.isArray(data)) return [];

  return data.map((item) => {
    const base = item?.attributes || item; // ← اضافه شد

    return {
      id: item.id,
      name: base.name || '',
      slug: base.slug || '',
      image: formatSingleImage(base.image),

      subCategories:
        base.subCategories?.data?.map((sub) => {
          const sBase = sub?.attributes || sub;

          return {
            id: sub.id,
            name: sBase.name || '',
            slug: sBase.slug || '',
            image: formatSingleImage(sBase.image),
            products:
              sBase.products?.data?.map(formatStrapiProduct) ||
              sBase.products?.map(formatStrapiProduct) ||
              [],
          };
        }) ||
        base.subCategories?.map((sub) => {
          return {
            id: sub.id,
            name: sub.name || '',
            slug: sub.slug || '',
            image: formatSingleImage(sub.image),
            products: sub.products?.map(formatStrapiProduct) || [],
          };
        }) ||
        [],

      products:
        base.products?.data?.map(formatStrapiProduct) ||
        base.products?.map(formatStrapiProduct) ||
        [],
    };
  });
}
