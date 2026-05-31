import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { Note } from '@/lib/types';

interface RouteParams {
  params: { id: string };
}

/**
 * GET /api/notes/[id]
 * Returns a single note for the authenticated user.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await db.ensureInit();

    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const note = db.getNote(userId, params.id);
    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ note });
  } catch (err) {
    console.error(`GET /api/notes/${params.id} error:`, err);
    return NextResponse.json({ error: 'Failed to fetch note' }, { status: 500 });
  }
}

/**
 * PUT /api/notes/[id]
 * Update a note in the database.
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    await db.ensureInit();

    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json() as Note;
    if (body.id !== params.id) {
      return NextResponse.json({ error: 'ID mismatch' }, { status: 400 });
    }

    await db.saveNote(userId, body);
    return NextResponse.json({ note: body });
  } catch (err) {
    console.error(`PUT /api/notes/${params.id} error:`, err);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

/**
 * DELETE /api/notes/[id]
 * Delete a note from the database.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await db.ensureInit();

    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db.deleteNote(userId, params.id);
    return NextResponse.json({ success: true, id: params.id });
  } catch (err) {
    console.error(`DELETE /api/notes/${params.id} error:`, err);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
