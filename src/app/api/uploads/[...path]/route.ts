import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as fs from "fs";
import * as path from "path";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

// GET /api/uploads/[...path] - Serve uploaded files
export async function GET(
  _request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const filePath = path.join(process.cwd(), "uploads", ...params.path);

    // Prevent directory traversal
    const resolvedPath = path.resolve(filePath);
    const uploadsDir = path.resolve(path.join(process.cwd(), "uploads"));
    if (!resolvedPath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: "Zugriff verweigert" }, { status: 403 });
    }

    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({ error: "Datei nicht gefunden" }, { status: 404 });
    }

    const buffer = fs.readFileSync(resolvedPath);
    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error serving file:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Datei" },
      { status: 500 }
    );
  }
}
