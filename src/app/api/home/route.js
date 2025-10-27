import { getAllCategories } from '@/lib/categoriesApi';
import { getAllFaqs } from '@/lib/faqApi';
import { getAllTestimonials } from '@/lib/testimonialsApi';
import { getProducts } from '@/lib/productsApi';
import { getArticles } from '@/lib/articlesApi';
import { getServices } from '@/lib/servicesApi';
import { getCourses } from '@/lib/coursesApi';

export const revalidate = 300;

export async function GET() {
  try {
    const [categories, faqs, testimonials, products, articles, services, courses] = await Promise.all([
      getAllCategories(),
      getAllFaqs(),
      getAllTestimonials(),
      getProducts({ limit: 20 }),
      getArticles({ limit: 20 }),
      getServices({ limit: 20 }),
      getCourses({ limit: 20 }),
    ]);

    return Response.json({
      categories,
      faqs,
      testimonials,
      products,
      articles,
      services,
      courses,
    });
  } catch (error) {
    console.error('خطا در /api/home aggregation:', error);
    return Response.json(
      { error: 'خطا در دریافت داده‌های صفحه اصلی', message: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}


