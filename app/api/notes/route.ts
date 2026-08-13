import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getNote, updateNote } from "@/lib/firebase";
import { validateNoteContent } from "@/lib/validate";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const note = await getNote(session);
    return NextResponse.json(note || { content: "", updatedAt: 0 });
  } catch (error) {
    return toErrorResponse(error, "GET /api/notes");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const body = await req.json();
    const content = validateNoteContent(body);
    await updateNote(session, content);
    return NextResponse.json({ content, updatedAt: Date.now() });
  } catch (error) {
    return toErrorResponse(error, "PATCH /api/notes");
  }
}
