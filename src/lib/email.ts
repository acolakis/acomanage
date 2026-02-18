import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
}

async function getSmtpConfig(): Promise<SmtpConfig | null> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "smtp" },
    });

    if (!setting?.value) return null;

    const config = setting.value as Record<string, unknown>;
    if (!config.host || !config.from) return null;

    return {
      host: config.host as string,
      port: (config.port as number) || 587,
      user: (config.user as string) || "",
      pass: (config.pass as string) || "",
      from: config.from as string,
      secure: (config.secure as boolean) || false,
    };
  } catch {
    return null;
  }
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const config = await getSmtpConfig();
  if (!config) {
    console.warn("SMTP not configured, skipping email");
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user
        ? { user: config.user, pass: config.pass }
        : undefined,
    });

    await transporter.sendMail({
      from: config.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    return true;
  } catch (err) {
    console.error("Email send error:", err);
    return false;
  }
}

export async function sendTestEmail(to: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: "AcoManage — Test-E-Mail",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">AcoManage Test-E-Mail</h2>
        <p>Diese E-Mail bestätigt, dass die SMTP-Konfiguration korrekt eingerichtet ist.</p>
        <p style="color: #666; font-size: 14px; margin-top: 20px;">
          Gesendet von AcoManage am ${new Date().toLocaleDateString("de-DE")}
        </p>
      </div>
    `,
  });
}
