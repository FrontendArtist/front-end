// هویت کاتالوگ برای دوره ثابت است؛ شناسهٔ عددی ممکن است بین نمایش‌ها متفاوت باشد.
export function isSameCartItem(first, second) {
    if (first.type !== second.type) return false;
    if (first.type === 'course') {
        const firstId = first.documentId || first.externalCourseId;
        const secondId = second.documentId || second.externalCourseId;
        if (firstId && secondId && String(firstId) === String(secondId)) return true;
    }
    return first.id != null && second.id != null && String(first.id) === String(second.id);
}

export function deduplicateCourses(items) {
    return items.filter((item, index) => item.type !== 'course' ||
        !items.slice(0, index).some(previous => isSameCartItem(previous, item)));
}
