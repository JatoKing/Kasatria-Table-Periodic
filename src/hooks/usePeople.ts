import { useCallback, useEffect, useState } from 'react';
import { loadPeople } from '@/lib/people/people-service';
import type { PeopleData } from '@/lib/people/types';

export type PeopleState =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'ready'; data: PeopleData };

/** Loads people from the sheet for the given token. Aborts the request on unmount or token change. */
export function usePeople(accessToken: string): { state: PeopleState; retry: () => void } {
  const [state, setState] = useState<PeopleState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    loadPeople(accessToken, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: 'ready', data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: 'error',
          error: error instanceof Error ? error : new Error('The people data could not be loaded.'),
        });
      });

    return () => controller.abort();
  }, [accessToken, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((count) => count + 1);
  }, []);

  return { state, retry };
}
