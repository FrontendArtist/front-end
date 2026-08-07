/**
 * @file src/lib/htmlUtils.js
 * @description ابزارهای تبدیل محتوای Strapi به HTML
 *
 * این فایل از strapiUtils.js جدا شده تا SRP رعایت شود.
 * strapiUtils.js مسئول فرمت داده است، htmlUtils.js مسئول تبدیل rich text به HTML.
 *
 * @module lib/htmlUtils
 */

/**
 * تبدیل فرمت Strapi v5 Blocks / Rich Text به رشته HTML
 *
 * @param {Array|string|null} blocks - محتوای blocks از Strapi
 * @returns {string} HTML string آماده برای رندر
 *
 * @example
 * // استفاده در domain API ها:
 * const html = strapiBlocksToHtml(item.content);
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
