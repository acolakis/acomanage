import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendTestEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const to = body.to as string;

    if (!to) {
      return NextResponse.json(
        { error: "E-Mail-Adresse ist erforderlich" },
        { status: 400 }
      );
    }

    const success = await sendTestEmail(to);

    if (success) {
      return NextResponse.json({ message: "Test-E-Mail wurde gesendet" });
    } else {
      return NextResponse.json(
        { error: "SMTP nicht konfiguriert oder Fehler beim Senden" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Test email error:", error);
    return NextResponse.json(
      { error: "Fehler beim Senden der Test-E-Mail" },
      { status: 500 }
    );
  }
}
