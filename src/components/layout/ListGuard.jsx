import EmptyState from '@/components/ui/EmptyState/EmptyState';

const normalizeEntityName = (value) => {
  const fallback = 'مورد';
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
};

const withPersianSuffix = (label) => {
  if (label.endsWith('ی') || label.endsWith('‌ای')) {
    return label;
  }

  return `${label}${label.endsWith('ه') ? '‌ای' : 'ی'}`;
};

const ListGuard = ({
  data = [],
  hasFilters = false,
  children,
  entityName = 'مورد',
  resetLink = '/',
}) => {
  const safeData = Array.isArray(data) ? data : [];
  const normalizedEntity = normalizeEntityName(entityName);
  const indefiniteEntity = withPersianSuffix(normalizedEntity);

  if (safeData.length > 0) {
    return children;
  }

  if (hasFilters) {
    return (
      <EmptyState
        title={`هیچ ${indefiniteEntity} با این مشخصات یافت نشد`}
        description={`می‌توانید فیلترها را بازنشانی کنید تا تمام ${normalizedEntity}‌ها نمایش داده شوند.`}
        actionLabel="مشاهده همه"
        actionHref={resetLink || '/'}
      />
    );
  }

  return (
    <EmptyState
      title={`هنوز ${indefiniteEntity} ثبت نشده است`}
      description={`محتوای مربوط به ${normalizedEntity}‌ها به‌زودی تکمیل خواهد شد.`}
      actionLabel="بازگشت به صفحه اصلی"
      actionHref="/"
    />
  );
};

export default ListGuard;

