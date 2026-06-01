import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { Note } from '@/lib/types';

interface RouteParams {
  params: { id: string };
}

/**
 * GET /api/notes/[id]
 * Downloads full note content from Telegram on demand.
 * This is the only place note content is read — it is never stored in server RAM.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await db.ensureInit();
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const note = await db.getNote(userId, params.id);
    if (!note) return NextResponse.json({ error: 'Note not found' }, { status: 404 });

    return NextResponse.json({ note });
  } catch (err) {
    console.error(`GET /api/notes/${params.id} error:`, err);
    return NextResponse.json({ error: 'Failed to fetch note' }, { status: 500 });
  }
}

const MAX_NOTE_BYTES = 20 * 1024 * 1024; // 20 MB hard limit per note save

/**
 * PUT /api/notes/[id]
 * Re-uploads note content to Telegram, updates the metadata index.
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    await db.ensureInit();
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Reject oversized payloads before reading into memory
    const contentLength = parseInt(req.headers.get('content-length') ?? '0', 10);
    if (contentLength > MAX_NOTE_BYTES) {
      return NextResponse.json(
        { error: `Note is too large (${(contentLength / 1048576).toFixed(1)} MB). Remove some images to reduce the size below 20 MB.` },
        { status: 413 }
      );
    }

    const body = await req.json() as Note;
    if (body.id !== params.id) return NextResponse.json({ error: 'ID mismatch' }, { status: 400 });

    const meta = await db.saveNote(userId, body);
    return NextResponse.json({ note: meta });
  } catch (err) {
    console.error(`PUT /api/notes/${params.id} error:`, err);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

/**
 * DELETE /api/notes/[id]
 * Removes note from the metadata index. The Telegram document remains
 * but becomes unreferenced (Telegram auto-expires old files eventually).
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await db.ensureInit();
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await db.deleteNote(userId, params.id);
    return NextResponse.json({ success: true, id: params.id });
  } catch (err) {
    console.error(`DELETE /api/notes/${params.id} error:`, err);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
