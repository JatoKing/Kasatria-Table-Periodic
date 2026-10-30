'use client';

import 'lenis/dist/lenis.css';
import { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitText from '@/components/SplitText/SplitText';
import { useSmoothScroll } from '@/hooks/useSmoothScroll';
import type { AuthState } from './AuthProvider';
import { CustomCursor } from './CustomCursor';
import { GoogleSignInButton } from './GoogleSignInButton';
import styles from './LoginScreen.module.css';
import { VisitorPass, type PassField } from './VisitorPass';

type LoginState = Exclude<AuthState, { status: 'signed-in' }>;

interface LoginScreenProps {
  state: LoginState;
  onSignIn: () => void;
}

const BUTTON_LABELS: Record<LoginState['status'], string> = {
  initializing: 'Sign in with Google',
  unavailable: 'Sign in with Google',
  'signed-out': 'Sign in with Google',
  'signing-in': 'Signing in…',
};

/** What happens on sign-in, each tied to the part of the pass it explains. */
const STEPS: { field: PassField; title: string; body: string }[] = [
  {
    field: 'holder',
    title: 'Google confirms who you are',
    body: 'Your name, email and photo come from your Google account. Pick the account that can view the people spreadsheet.',
  },
  {
    field: 'access',
    title: 'The sheet opens read-only',
    body: 'The app asks for view-only access to Google Sheets and reads just the people sheet. It can’t change anything.',
  },
  {
    field: 'validity',
    title: 'Nothing is kept',
    body: 'Your access lives only in this tab. Reload or close it and you’re signed out; the app saves nothing to the browser.',
  },
];

const HEADLINE_PROPS = {
  tag: 'span',
  className: styles.headlineLine,
  splitType: 'chars',
  textAlign: 'left',
  trigger: 'load',
  delay: 28,
  duration: 0.9,
} as const;

/**
 * Front-desk login: a visitor pass hangs beside the copy and carries the sign-in button. Scrolling
 * walks through what signing in does, and the pass highlights the field each step is about.
 */
export function LoginScreen({ state, onSignIn }: LoginScreenProps) {
  const stepsRef = useRef<HTMLOListElement>(null);
  const [activeField, setActiveField] = useState<PassField | null>(null);

  useSmoothScroll();

  useGSAP(
    () => {
      const items = stepsRef.current?.querySelectorAll<HTMLElement>('[data-field]') ?? [];
      items.forEach((item) => {
        const field = item.dataset.field as PassField;
        ScrollTrigger.create({
          trigger: item,
          start: 'top 62%',
          end: 'bottom 38%',
          onToggle: (self) =>
            setActiveField((current) => (self.isActive ? field : current === field ? null : current)),
        });
      });
    },
    { scope: stepsRef },
  );

  const message =
    state.status === 'unavailable' || state.status === 'signed-out' ? state.message : null;
  const signIn = {
    onClick: onSignIn,
    disabled: state.status !== 'signed-out',
    label: BUTTON_LABELS[state.status],
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="login-title">
        <h1 id="login-title" className="visually-hidden">
          Visitors, please sign in.
        </h1>
        <p className={styles.headline} aria-hidden="true">
          <SplitText {...HEADLINE_PROPS} text="Visitors," />
          <SplitText {...HEADLINE_PROPS} text="please sign in." />
        </p>
        <p className={styles.subtitle}>
          Kasatria People Table shows everyone in the people spreadsheet. Sign in on the pass with a
          Google account that can view the sheet.
        </p>
      </section>

      <div className={styles.pass}>
        <VisitorPass
          highlight={activeField}
          onSignIn={signIn.onClick}
          signInDisabled={signIn.disabled}
          signInLabel={signIn.label}
          message={message}
        />
      </div>

      <section className={styles.steps} aria-labelledby="steps-title">
        <h2 id="steps-title" className={styles.stepsTitle}>
          What signing in does
        </h2>
        <ol ref={stepsRef} className={styles.stepList}>
          {STEPS.map((step, index) => (
            <li
              key={step.field}
              className={styles.step}
              data-field={step.field}
              data-active={activeField === step.field}
            >
              <span className={styles.stepNumber} aria-hidden="true">
                {index + 1}
              </span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepBody}>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* On narrow screens the pass has scrolled away by now, so the button is repeated here. */}
      <div className={styles.closing}>
        <GoogleSignInButton {...signIn} />
      </div>

      <CustomCursor />
    </main>
  );
}
