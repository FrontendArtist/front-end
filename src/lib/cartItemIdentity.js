// هویت کاتالوگ برای دوره و فصل ثابت است؛ شناسهٔ عددی ممکن است بین نمایش‌ها متفاوت باشد.
export function isSameCartItem(first, second) {
    if (first.type !== second.type) return false;
    if (first.type === 'course') {
        const firstId = first.documentId || first.externalCourseId;
        const secondId = second.documentId || second.externalCourseId;
        if (firstId && secondId && String(firstId) === String(secondId)) return true;
    }
    if (first.type === 'chapter') {
        const firstInt = first.integrationId || first.externalCourseId;
        const secondInt = second.integrationId || second.externalCourseId;
        if (firstInt && secondInt && String(firstInt).toLowerCase() === String(secondInt).toLowerCase()) return true;
        if (first.chapterId && second.chapterId && String(first.chapterId) === String(second.chapterId)) {
            const firstParent = first.parentExternalId || first.courseDocumentId || first.courseId;
            const secondParent = second.parentExternalId || second.courseDocumentId || second.courseId;
            if (!firstParent || !secondParent || String(firstParent) === String(secondParent)) return true;
        }
    }
    return first.id != null && second.id != null && String(first.id) === String(second.id);
}

export function deduplicateCourses(items) {
    return items.filter((item, index) =>
        (item.type !== 'course' && item.type !== 'chapter') ||
        !items.slice(0, index).some(previous => isSameCartItem(previous, item))
    );
}
