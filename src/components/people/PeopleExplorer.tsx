'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@/components/auth/AuthProvider';
import { usePeople } from '@/hooks/usePeople';
import type { LayoutName } from '@/lib/layouts/layouts';
import { PeopleApiError } from '@/lib/people/people-service';
import { LayoutControls } from './LayoutControls';
import { NetWorthLegend } from './NetWorthLegend';
import { PeopleScene3D } from './PeopleScene3D';
import styles from './PeopleExplorer.module.css';
import { StatusMessage } from './StatusMessage';
import { UserMenu } from './UserMenu';

interface PeopleExplorerProps {
  session: Session;
  onSignOut: (message?: string) => void;
}

const SESSION_EXPIRED_MESSAGE = 'Your Google session expired. Sign in again to reload the data.';

function describeCount(peopleCount: number, skippedRows: readonly number[]): string {
  const shown = `${peopleCount} ${peopleCount === 1 ? 'person' : 'people'}`;
  if (skippedRows.length === 0) return shown;
  const label = skippedRows.length === 1 ? 'row' : 'rows';
  return `${shown}. Skipped sheet ${label} ${skippedRows.join(', ')} (missing name or net worth).`;
}

export function PeopleExplorer({ session, onSignOut }: PeopleExplorerProps) {
  const { state, retry } = usePeople(session.accessToken);
  const [layout, setLayout] = useState<LayoutName>('table');

  // Retrying cannot fix an expired or revoked token, so go back to the sign-in screen instead.
  const sessionExpired =
    state.status === 'error' && state.error instanceof PeopleApiError && state.error.status === 401;

  useEffect(() => {
    if (sessionExpired) onSignOut(SESSION_EXPIRED_MESSAGE);
  }, [sessionExpired, onSignOut]);

  const people = state.status === 'ready' ? state.data.people : null;
  const skippedRows = state.status === 'ready' ? state.data.skippedRows : [];

  return (
    <div className={styles.stage}>
      {people && people.length > 0 && <PeopleScene3D people={people} layout={layout} />}

      {state.status === 'loading' && <StatusMessage title="Loading people from Google Sheets…" />}

      {state.status === 'error' && !sessionExpired && (
        <StatusMessage
          tone="error"
          title="The people data could not be loaded"
          actions={
            <>
              <button type="button" onClick={retry}>
                Try again
              </button>
              <button type="button" onClick={() => onSignOut()}>
                Sign out
              </button>
            </>
          }
        >
          {state.error.message}
        </StatusMessage>
      )}

      {people && people.length === 0 && (
        <StatusMessage
          title="The sheet has no people yet"
          actions={
            <button type="button" onClick={retry}>
              Try again
            </button>
          }
        >
          Add rows under the header in the Google Sheet, then select Try again.
        </StatusMessage>
      )}

      <header className={styles.topBar}>
        <UserMenu user={session.user} onSignOut={() => onSignOut()} />
      </header>

      {people && people.length > 0 && (
        <footer className={styles.bottomBar}>
          <p className={styles.notice}>{describeCount(people.length, skippedRows)}</p>
          <div className={styles.controls}>
            <LayoutControls value={layout} onChange={setLayout} />
          </div>
          <div className={styles.legend}>
            <NetWorthLegend />
          </div>
        </footer>
      )}
    </div>
  );
}
