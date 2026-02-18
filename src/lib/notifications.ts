import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  message?: string;
  referenceType?: string;
  referenceId?: string;
}

/**
 * Create a single in-app notification for a user.
 * Also sends an email notification if SMTP is configured.
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message || null,
        referenceType: params.referenceType || null,
        referenceId: params.referenceId || null,
      },
    });

    // Send email notification (fire-and-forget)
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { email: true },
    });
    if (user?.email) {
      sendEmail({
        to: user.email,
        subject: `AcoManage: ${params.title}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">${params.title}</h2>
            ${params.message ? `<p>${params.message}</p>` : ""}
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              Diese Benachrichtigung wurde automatisch von AcoManage gesendet.
            </p>
          </div>
        `,
      }).catch((err) => console.error("Email notification error:", err));
    }
  } catch (error) {
    console.error("Fehler beim Erstellen der Benachrichtigung:", error);
  }
}

/**
 * Notify all users linked to a company (CLIENT users via companyUsers).
 */
export async function notifyCompanyUsers(
  companyId: string,
  params: Omit<CreateNotificationParams, "userId">
) {
  try {
    const companyUsers = await prisma.companyUser.findMany({
      where: { companyId },
      select: { userId: true },
    });

    await Promise.all(
      companyUsers.map((cu) =>
        createNotification({ ...params, userId: cu.userId })
      )
    );
  } catch (error) {
    console.error("Fehler beim Benachrichtigen der Betriebsbenutzer:", error);
  }
}

/**
 * Notify all ADMIN and EMPLOYEE users.
 */
export async function notifyAdminsAndEmployees(
  params: Omit<CreateNotificationParams, "userId">
) {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: { in: ["ADMIN", "EMPLOYEE"] },
        isActive: true,
      },
      select: { id: true },
    });

    await Promise.all(
      users.map((u) =>
        createNotification({ ...params, userId: u.id })
      )
    );
  } catch (error) {
    console.error("Fehler beim Benachrichtigen der Admins/Mitarbeiter:", error);
  }
}
