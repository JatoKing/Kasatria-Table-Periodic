import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.css';

const CONTACT_EMAIL = 'izzatzamri01@gmail.com';

export const metadata: Metadata = {
  title: 'Privacy policy | Kasatria People Table',
  description: 'What Kasatria People Table receives from Google when you sign in, and what it records.',
};

/** Privacy policy linked from the login page and from the Google OAuth consent screen (Branding). */
export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <article className={styles.content}>
        <p className={styles.brand}>Kasatria People Table</p>
        <h1 className={styles.title}>Privacy policy</h1>
        <p className={styles.updated}>Last updated 30 October 2026</p>

        <p className={styles.lead}>
          Kasatria People Table shows a sample list of people as a 3D table. This page explains what the
          app receives when you sign in with Google and what it keeps.
        </p>

        <section className={styles.section} aria-labelledby="shared">
          <h2 id="shared" className={styles.heading}>
            What Google shares with the app
          </h2>
          <p>
            Your name, email address and profile picture. The app uses them only to show who is signed
            in, in the corner of the 3D view.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="not-requested">
          <h2 id="not-requested" className={styles.heading}>
            What the app does not ask for
          </h2>
          <p>
            No access to your Gmail, Google Drive, Google Sheets or any other data in your Google
            account.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="people-data">
          <h2 id="people-data" className={styles.heading}>
            Where the people data comes from
          </h2>
          <p>
            The people in the table are the sample dataset provided for the Kasatria assessment. They are
            kept in a private Google Sheet that the app&rsquo;s server reads with its own service
            account. Your Google account is never used to read it.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="session">
          <h2 id="session" className={styles.heading}>
            How long you stay signed in
          </h2>
          <p>
            Your sign-in lives only in the open browser tab. The app saves nothing to cookies or local
            storage, so reloading or closing the tab signs you out. Signing out also revokes the
            app&rsquo;s access with Google.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="records">
          <h2 id="records" className={styles.heading}>
            What is recorded
          </h2>
          <p>
            When the people data loads, the server records your email address and the time in the
            hosting logs (Vercel). These logs show who has used the app. They are not shared or sold,
            and they are kept only as long as Vercel retains logs for this project.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="contact">
          <h2 id="contact" className={styles.heading}>
            Contact
          </h2>
          <p>
            Questions, or a request to remove your email from the logs:{' '}
            <a className={styles.link} href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </p>
        </section>

        <Link className={styles.back} href="/">
          Back to sign in
        </Link>
      </article>
    </main>
  );
}
