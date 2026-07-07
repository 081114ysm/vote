import { NextResponse } from 'next/server';
import { applyElectionAction, loadElectionState } from '@/lib/election-server';
import { loadMemoryElectionState, applyMemoryElectionAction, resetMemoryElectionState } from '@/lib/election-memory';

export const dynamic = 'force-dynamic';

function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export async function GET() {
  try {
    const state = hasDatabase() ? await loadElectionState() : loadMemoryElectionState();
    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to load election state',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || typeof body.type !== 'string') {
      return NextResponse.json({ error: 'Invalid action payload' }, { status: 400 });
    }

    let state;
    if (hasDatabase()) {
      state = await applyElectionAction(body);
    } else {
      if (body.type === 'reset') {
        state = resetMemoryElectionState();
      } else {
        state = applyMemoryElectionAction(body);
      }
    }

    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to update election state',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
