import type { GoogleUser } from '@/lib/google/user-profile';
import styles from './UserMenu.module.css';

interface UserMenuProps {
  user: GoogleUser;
  onSignOut: () => void;
}

export function UserMenu({ user, onSignOut }: UserMenuProps) {
  return (
    <div className={styles.menu}>
      {user.pictureUrl && (
        // A 28 px avatar from Google does not benefit from next/image optimisation.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.avatar}
          src={user.pictureUrl}
          alt=""
          width={28}
          height={28}
          referrerPolicy="no-referrer"
        />
      )}
      <div className={styles.identity}>
        <span className={styles.name}>{user.name}</span>
        {user.email && <span className={styles.email}>{user.email}</span>}
      </div>
      <button type="button" className={styles.signOut} onClick={onSignOut}>
        Sign out
      </button>
    </div>
  );
}
