import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { Note } from '@/lib/types';

/**
 * GET /api/notes
 * Returns all notes for the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    await db.ensureInit();

    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notes = db.getNotes(userId);
    return NextResponse.json({ notes });
  } catch (err) {
    console.error('GET /api/notes error:', err);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

/**
 * POST /api/notes
 * Create or update a note for the authenticated user.
 */
export async function POST(req: NextRequest) {
  try {
    await db.ensureInit();

    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const note = await req.json() as Note;
    if (!note.id) {
      return NextResponse.json({ error: 'Note must have an id' }, { status: 400 });
    }

    await db.saveNote(userId, note);
    return NextResponse.json({ note }, { status: 201 });
  } catch (err) {
    console.error('POST /api/notes error:', err);
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
  }
}
