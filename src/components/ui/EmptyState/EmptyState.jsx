import Link from 'next/link';

import styles from './EmptyState.module.scss';

const EmptyState = ({
  title = 'موردی یافت نشد',
  description,
  actionLabel,
  actionHref,
}) => {
  return (
    <div className={styles.emptyState}>
      <div className={styles.content}>
        <h2 className={styles.title}>{title}</h2>
        {description ? <p className={styles.description}>{description}</p> : null}
        {actionLabel && actionHref ? (
          <Link className={styles.action} href={actionHref}>
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
};

export default EmptyState;