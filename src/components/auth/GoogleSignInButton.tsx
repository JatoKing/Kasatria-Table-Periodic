import styles from './GoogleSignInButton.module.css';

interface GoogleSignInButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}

/**
 * Custom "Sign in with Google" button in Google's light theme. A custom button is needed because the
 * official rendered button only supports the ID-token flow, while this app needs an access token
 * for the Sheets API from the same click.
 *
 * The G mark is Google's official asset, placed at public/google-g-logo.svg (see README).
 * It is set as a CSS background so a missing file leaves an empty space instead of a broken image.
 */
export function GoogleSignInButton({
  onClick,
  disabled = false,
  label = 'Sign in with Google',
}: GoogleSignInButtonProps) {
  return (
    <button type="button" className={styles.button} onClick={onClick} disabled={disabled}>
      <span
        className={styles.logo}
        style={{ backgroundImage: 'url(/google-g-logo.svg)' }}
        aria-hidden="true"
      />
      <span className={styles.label}>{label}</span>
    </button>
  );
}
