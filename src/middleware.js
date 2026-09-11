import { NextResponse } from 'next/server';

export function middleware(req) {
  const url = req.nextUrl.clone();
  const { pathname, searchParams } = url;

  // Temporarily redirect /products and /products/:path* to /courses
  if (pathname === '/products' || pathname.startsWith('/products/')) {
    const nextUrl = req.nextUrl.clone();
    nextUrl.pathname = '/courses';
    nextUrl.search = '';
    return NextResponse.redirect(nextUrl, { status: 307 });
  }

  // Redirect /products?category=...&sub=... → /products/... (preserve sort/page)
  if (pathname === '/products') {
    const category = searchParams.get('category');
    const sub = searchParams.get('sub');

    if (category || sub) {
      const sort = searchParams.get('sort') || undefined;
      const page = searchParams.get('page') || undefined;

      let targetPath = '/products';
      if (category) targetPath += `/${category}`;
      if (category && sub) targetPath += `/${sub}`;

      const nextUrl = req.nextUrl.clone();
      nextUrl.pathname = targetPath;
      nextUrl.searchParams.delete('category');
      nextUrl.searchParams.delete('sub');
      if (sort) nextUrl.searchParams.set('sort', sort);
      if (page) nextUrl.searchParams.set('page', page);

      return NextResponse.redirect(nextUrl, { status: 301 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/products',
    '/products/:path*',
    '/product/:path*',
  ],
};
