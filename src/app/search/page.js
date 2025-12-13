import { searchGlobal } from '@/lib/searchApi';
import SearchResults from '@/modules/search/SearchResults';
import Breadcrumb from '@/components/ui/BreadCrumb/Breadcrumb';

export const metadata = {
    title: 'جستجو | طرح الهی',
    description: 'نتایج جستجو در سایت طرح الهی',
};

export default async function SearchPage({ searchParams }) {
    const { q, type } = await searchParams; // searchParams must be awaited in recent Next.js versions
    const query = q || '';
    const userType = type || 'all';
    const data = await searchGlobal(query, userType);

    const breadcrumbItems = [
        { label: 'خانه', href: '/' },
        { label: 'جستجو', active: true },
    ];

    return (
        <main className="container">
            <div style={{ marginTop: 'var(--space-section-top-desktop)' }}>
                <Breadcrumb items={breadcrumbItems} />
            </div>
            <SearchResults data={data} query={query} key={`${query}-${userType}`} />
        </main>
    );
}
