import { getAllArticles } from '@/lib/articlesApi';
import { getAllCourses } from '@/lib/coursesApi';
import { getAllProducts } from '@/lib/productsApi';
import { SITE_URL } from '@/lib/constants';

function constructProductUrl(product) {
  const categories = product.categories;
  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    return `${SITE_URL}/product/${product.slug}`;
  }

  const subcategory = categories.find(cat => cat.parent && cat.parent.slug);
  if (subcategory && subcategory.parent) {
    return `${SITE_URL}/products/${subcategory.parent.slug}/${subcategory.slug}/${product.slug}`;
  }

  const rootCategory = categories.find(cat => !cat.parent);
  if (rootCategory) {
    return `${SITE_URL}/products/${rootCategory.slug}/${product.slug}`;
  }

  return `${SITE_URL}/product/${product.slug}`;
}

export default async function sitemap() {
  const [articles, courses, products] = await Promise.all([
    getAllArticles(),
    getAllCourses(),
    getAllProducts(),
  ]);

  const staticUrls = [
    {
      url: `${SITE_URL}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/courses`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/articles`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/services`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  const articleUrls = articles.map((article) => ({
    url: `${SITE_URL}/articles/${article.slug}`,
    lastModified: new Date(article.updatedAt || article.publishedAt || new Date()),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const courseUrls = courses.map((course) => ({
    url: `${SITE_URL}/courses/${course.slug}`,
    lastModified: new Date(course.updatedAt || course.createdAt || new Date()),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const productUrls = products.map((product) => ({
    url: constructProductUrl(product),
    lastModified: new Date(product.updatedAt || product.createdAt || new Date()),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticUrls, ...courseUrls, ...articleUrls, ...productUrls];
}
