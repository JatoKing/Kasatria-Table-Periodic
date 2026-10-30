import type { ReactNode } from 'react';
import styles from './StatusMessage.module.css';

interface StatusMessageProps {
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  tone?: 'info' | 'error';
}

/** Centred message on the dark stage for loading, empty and error states. */
export function StatusMessage({ title, children, actions, tone = 'info' }: StatusMessageProps) {
  return (
    <div className={styles.overlay}>
      <section
        className={styles.panel}
        data-tone={tone}
        role={tone === 'error' ? 'alert' : 'status'}
      >
        <h2 className={styles.title}>{title}</h2>
        {children && <div className={styles.body}>{children}</div>}
        {actions && <div className={styles.actions}>{actions}</div>}
      </section>
    </div>
  );
}
