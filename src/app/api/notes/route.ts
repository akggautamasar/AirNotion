import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { Note } from '@/lib/types';

/**
 * GET /api/notes
 * Returns note metadata (index) for the user — no content field.
 * Content is fetched on demand via GET /api/notes/[id].
 */
export async function GET(req: NextRequest) {
  try {
    await db.ensureInit();
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const metas = db.getNotesMeta(userId);
    // Return notes with empty content — client fetches content when a note is opened
    const notes = metas.map((m) => ({
      id: m.id,
      title: m.title,
      content: '',
      plainText: '',
      tags: m.tags,
      folder: m.folder,
      pinned: m.pinned,
      archived: m.archived,
      color: m.color,
      status: m.status,
      wordCount: m.wordCount,
      charCount: m.charCount,
      updatedAt: m.updatedAt,
      createdAt: m.createdAt,
      linkedNotes: [],
      backlinks: [],
    }));

    return NextResponse.json({ notes });
  } catch (err) {
    console.error('GET /api/notes error:', err);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

/**
 * POST /api/notes
 * Upload full note content to Telegram, store metadata index in memory.
 */
export async function POST(req: NextRequest) {
  try {
    await db.ensureInit();
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const note = await req.json() as Note;
    if (!note.id) return NextResponse.json({ error: 'Note must have an id' }, { status: 400 });

    const meta = await db.saveNote(userId, note);
    return NextResponse.json({ note: meta }, { status: 201 });
  } catch (err) {
    console.error('POST /api/notes error:', err);
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
  }
}
