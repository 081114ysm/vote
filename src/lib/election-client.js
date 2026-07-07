'use client';

import { useCallback, useEffect, useState } from 'react';
import { createDefaultState, normalizeState } from './election-core';

async function fetchElectionState() {
  const response = await fetch('/api/election', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load state (${response.status})`);
  }
  return normalizeState(await response.json());
}

async function sendElectionAction(action) {
  const response = await fetch('/api/election', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(action),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.detail || payload?.error || `Failed to update state (${response.status})`);
  }

  return normalizeState(await response.json());
}

export function useElectionState() {
  const [state, setState] = useState(() => createDefaultState());
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchElectionState();
      setState(next);
      setError(null);
      return next;
    } catch (err) {
      setError(err);
      return null;
    }
  }, []);

  const dispatch = useCallback(async (action) => {
    try {
      const next = await sendElectionAction(action);
      setState(next);
      setError(null);
      return next;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      void refresh();
    }, 2000);

    return () => window.clearInterval(interval);
  }, [refresh]);

  return [state, dispatch, refresh, error];
}

export { fetchElectionState, sendElectionAction };
