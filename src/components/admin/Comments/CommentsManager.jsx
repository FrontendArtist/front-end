'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  XCircle,
  Trash2,
  Reply,
  MessageSquare,
  Search,
  AlertCircle,
  CornerDownRight,
  ExternalLink,
} from 'lucide-react';
import styles from './CommentsManager.module.scss';
import AdminSearch from '../Shared/AdminSearch';
import { AdminTableContainer, AdminTable, AdminToolbar } from '../Shared/AdminTable';
import AdminBadge from '../Shared/AdminBadge';
import AdminButton from '../Shared/AdminButton';
import AdminLazyLoad from '../Shared/AdminLazyLoad';
import { useAdminLazyLoad } from '../Shared/useAdminLazyLoad';
import { fetchAdminComments, updateCommentStatus, deleteComment, replyToComment } from '@/lib/client/admin/commentsClient';

/**
 * فرمت‌کننده تاریخ شمسی نسبی / فشرده
 */
function formatDate(isoDate) {
  if (!isoDate) return '—';
  try {
    return new Date(isoDate).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

/**
 * مرتب‌سازی و مرتب ساختن ساختار درختی پاسخ‌ها زیر نظر اصلی (Tree Flattening)
 */
function buildTreeOrderedList(commentList) {
  const map = new Map();
  commentList.forEach((c) => map.set(c.id, { ...c, children: [] }));

  const roots = [];
  map.forEach((item) => {
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId).children.push(item);
    } else {
      roots.push(item);
    }
  });

  const ordered = [];
  function traverse(node, depth = 0) {
    ordered.push({ ...node, depth });
    if (node.children && node.children.length > 0) {
      // مرتب‌سازی پاسخ‌ها بر اساس زمان (قدیمی‌تر اول برای ترتیب زمانی پاسخ‌ها)
      node.children.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      node.children.forEach((child) => traverse(child, depth + 1));
    }
  }

  roots.forEach((root) => traverse(root, 0));
  return ordered;
}

export default function CommentsManager({ initialComments = [], initialMeta = null }) {
  // ── Lazy Loading State ───────────────────────────────────────────────────
  const {
    items: comments,
    setItems: setComments,
    total: totalComments,
    hasMore,
    isLoading: isLoadingMore,
    loadError,
    loadMore: loadMoreComments,
    sentinelRef,
  } = useAdminLazyLoad({
    initialItems: initialComments,
    initialMeta,
    fetchFn: fetchAdminComments,
    chunkSize: 20,
    idKey: 'documentId',
  });

  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'approved'
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [replyingComment, setReplyingComment] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [deletingComment, setDeletingComment] = useState(null);

  // Status & loading indicators
  const [actionLoading, setActionLoading] = useState(null); // comment id being processed
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text: '' }

  const showNotification = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // ─── Filter comments ────────────────────────────────────────────────────────
  const filteredComments = comments.filter((c) => {
    const matchesFilter =
      filter === 'all'
        ? true
        : filter === 'pending'
        ? !c.isApproved
        : c.isApproved;

    const matchesSearch =
      !searchTerm.trim() ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.relatedTitle.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const orderedComments = buildTreeOrderedList(filteredComments);

  const pendingCount = comments.filter((c) => !c.isApproved).length;
  const approvedCount = comments.filter((c) => c.isApproved).length;

  // ─── Actions ────────────────────────────────────────────────────────────────

  // 1. Toggle Approve / Disapprove
  const handleToggleApprove = async (comment) => {
    setActionLoading(comment.documentId);
    const newApprovedState = !comment.isApproved;

    try {
      await updateCommentStatus(comment.documentId, comment.documentId, newApprovedState);

      setComments((prev) =>
        prev.map((c) =>
          c.documentId === comment.documentId
            ? { ...c, isApproved: newApprovedState }
            : c
        )
      );

      showNotification(
        'success',
        newApprovedState ? 'نظر با موفقیت تأیید شد.' : 'نظر به حالت در انتظار تأیید تغییر یافت.'
      );
    } catch (err) {
      showNotification('error', 'عملیات با خطا مواجه شد.');
    } finally {
      setActionLoading(null);
    }
  };

  // 2. Delete Comment
  const handleDeleteConfirm = async () => {
    if (!deletingComment) return;
    setActionLoading(deletingComment.documentId);

    try {
      await deleteComment(deletingComment.documentId);

      setComments((prev) =>
        prev.filter((c) => c.documentId !== deletingComment.documentId)
      );

      showNotification('success', 'نظر با موفقیت حذف شد.');
      setDeletingComment(null);
    } catch (err) {
      showNotification('error', 'خطا در حذف نظر.');
    } finally {
      setActionLoading(null);
    }
  };

  // 3. Submit Reply
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyingComment || !replyText.trim()) return;

    setActionLoading(replyingComment.documentId);

    try {
      const parentDocId = replyingComment.documentId || replyingComment.id;

      const payload = {
        name: 'مدیریت',
        content: replyText.trim(),
        rating: 5,
        isApproved: true,
      };

      if (parentDocId) {
        payload.comment_parent = { connect: [parentDocId] };
      }

      if (replyingComment.articleDocId) {
        payload.article = { connect: [replyingComment.articleDocId] };
      } else if (replyingComment.productDocId) {
        payload.product = { connect: [replyingComment.productDocId] };
      } else if (replyingComment.courseDocId) {
        payload.course = { connect: [replyingComment.courseDocId] };
      }

      const created = await replyToComment(payload);

      // افزودن پاسخ به فید محلی
      setComments((prev) => [
        ...prev,
        {
          id: created.id || Date.now(),
          documentId: created.documentId || String(created.id || Date.now()),
          name: 'مدیریت',
          content: replyText.trim(),
          rating: 5,
          isApproved: true,
          relatedTitle: replyingComment.relatedTitle,
          relatedType: replyingComment.relatedType,
          relatedUrl: replyingComment.relatedUrl,
          articleDocId: replyingComment.articleDocId,
          productDocId: replyingComment.productDocId,
          courseDocId: replyingComment.courseDocId,
          parentId: replyingComment.id,
          parentDocId: parentDocId,
          createdAt: new Date().toISOString(),
        },
      ]);

      showNotification('success', 'پاسخ مدیریت با موفقیت ثبت و تأیید شد.');
      setReplyingComment(null);
      setReplyText('');
    } catch (err) {
      showNotification('error', err.message || 'خطا در ثبت پاسخ.');
    } finally {
      setActionLoading(null);
    }
  };

  const headers = ['نویسنده', 'متن نظر', 'مربوط به', 'تاریخ', 'وضعیت', 'عملیات'];

  return (
    <div className={styles.wrapper}>
      {/* Toast Notification */}
      {message && (
        <div
          className={`${styles.notification} ${
            message.type === 'success' ? styles['notification--success'] : styles['notification--error']
          }`}
        >
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      <AdminTableContainer>
        {/* Control Bar: Filter Tabs & Search */}
        <AdminToolbar>
          <div className={styles.tabs} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <AdminButton
              variant={filter === 'all' ? 'edit' : 'default'}
              onClick={() => setFilter('all')}
            >
              نمایش {comments.length} از {totalComments || comments.length} نظر
            </AdminButton>
            <AdminButton
              variant={filter === 'pending' ? 'edit' : 'default'}
              onClick={() => setFilter('pending')}
            >
              در انتظار تأیید ({pendingCount})
            </AdminButton>
            <AdminButton
              variant={filter === 'approved' ? 'edit' : 'default'}
              onClick={() => setFilter('approved')}
            >
              تأیید شده ({approvedCount})
            </AdminButton>
          </div>

          <AdminSearch
            placeholder="جستجو در نویسنده، متن یا نام بخش..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </AdminToolbar>

        {/* Comments Table */}
        {orderedComments.length === 0 ? (
          <div className={styles.emptyState}>
            <MessageSquare size={40} className={styles.emptyIcon} />
            <p>هیچ نظری مطابق با فیلترهای انتخابی یافت نشد.</p>
          </div>
        ) : (
          <AdminTable headers={headers}>
                {orderedComments.map((c) => {
                  const isReply = c.depth > 0;

                  return (
                    <tr
                      key={c.documentId || c.id}
                      className={`${styles.row} ${isReply ? styles['row--reply'] : ''}`}
                    >
                      <td
                        className={styles.authorCell}
                        style={isReply ? { paddingRight: `${16 + c.depth * 28}px` } : undefined}
                      >
                        <div className={styles.authorWrapper}>
                          {isReply && <CornerDownRight size={15} className={styles.replyIcon} />}
                          <span className={styles.authorName}>{c.name}</span>
                          {isReply && <AdminBadge status="info" text="پاسخ" variant="info" />}
                        </div>
                      </td>
                      <td className={styles.contentCell}>
                        <p className={styles.contentParagraph}>{c.content}</p>
                      </td>
                      <td>
                        {c.relatedUrl ? (
                          <Link
                            href={c.relatedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.targetBadgeLink}
                            title="مشاهده صفحه در تب جدید"
                          >
                            <span>{c.relatedType}: {c.relatedTitle}</span>
                            <ExternalLink size={13} className={styles.externalIcon} />
                          </Link>
                        ) : (
                          <span className={styles.targetBadge}>
                            {c.relatedType}: {c.relatedTitle}
                          </span>
                        )}
                      </td>
                      <td className={styles.dateCell}>{formatDate(c.createdAt)}</td>
                      <td>
                        <AdminBadge
                          status={c.isApproved ? 'تأیید شده' : 'در انتظار'}
                          variant={c.isApproved ? 'success' : 'warning'}
                        />
                      </td>
                      <td className={styles.actionsCell}>
                        {/* Toggle Approval */}
                        <AdminButton
                          variant={c.isApproved ? 'reject' : 'approve'}
                          onClick={() => handleToggleApprove(c)}
                          disabled={actionLoading === c.documentId}
                          title={c.isApproved ? 'لغو تأیید' : 'تأیید نظر'}
                        >
                          {c.isApproved ? <XCircle size={16} /> : <CheckCircle size={16} />}
                        </AdminButton>

                        {/* Reply Button */}
                        <AdminButton
                          variant="reply"
                          onClick={() => {
                            setReplyingComment(c);
                            setReplyText('');
                          }}
                          disabled={actionLoading === c.documentId}
                          title="پاسخ دادن"
                        >
                          <Reply size={16} />
                        </AdminButton>

                        {/* Delete Button */}
                        <AdminButton
                          variant="delete"
                          onClick={() => setDeletingComment(c)}
                          disabled={actionLoading === c.documentId}
                          title="حذف نظر"
                        >
                          <Trash2 size={16} />
                        </AdminButton>
                      </td>
                    </tr>
                  );
                })}
          </AdminTable>
        )}

        {/* ── Lazy Load Sentinel & Load More Button ───────────────── */}
        <AdminLazyLoad
          sentinelRef={sentinelRef}
          hasMore={hasMore}
          isLoading={isLoadingMore}
          error={loadError}
          onLoadMore={loadMoreComments}
          currentCount={comments.length}
          totalCount={totalComments}
          itemLabel="نظر"
        />
      </AdminTableContainer>

      {/* ── Reply Modal ────────────────────────────────────────────────────── */}
      {replyingComment && (
        <div className={styles.modalOverlay} onClick={() => setReplyingComment(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>پاسخ به نظر کاربر</h3>
            <div className={styles.quotedComment}>
              <strong>{replyingComment.name}:</strong>
              <p>{replyingComment.content}</p>
            </div>

            <form onSubmit={handleSendReply}>
              <textarea
                className={styles.replyTextarea}
                rows={4}
                placeholder="متن پاسخ مدیریت را وارد کنید..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                required
                autoFocus
              />

              <div className={styles.modalActions}>
                <AdminButton
                  variant="default"
                  onClick={() => setReplyingComment(null)}
                >
                  انصراف
                </AdminButton>
                <AdminButton type="submit" variant="approve" disabled={!replyText.trim()}>
                  ارسال پاسخ
                </AdminButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ─────────────────────────────────────── */}
      {deletingComment && (
        <div className={styles.modalOverlay} onClick={() => setDeletingComment(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>حذف نظر</h3>
            <p className={styles.deleteWarning}>
              آیا از حذف نظر <strong>«{deletingComment.name}»</strong> اطمینان دارید؟ این عملیات قابل بازگشت نیست.
            </p>
            <div className={styles.modalActions}>
              <AdminButton
                variant="default"
                onClick={() => setDeletingComment(null)}
              >
                انصراف
              </AdminButton>
              <AdminButton
                variant="delete"
                onClick={handleDeleteConfirm}
              >
                حذف قطعی
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
