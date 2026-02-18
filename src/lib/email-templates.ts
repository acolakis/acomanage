function baseTemplate(content: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px;">
        <h1 style="color: #2563eb; font-size: 20px; margin: 0;">AcoManage</h1>
      </div>
      ${content}
      <div style="border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 24px; color: #9ca3af; font-size: 12px;">
        <p>Diese E-Mail wurde automatisch von AcoManage gesendet.</p>
      </div>
    </div>
  `;
}

export function inspectionCompletedEmail(companyName: string, inspectionNumber: string): { subject: string; html: string } {
  return {
    subject: `Begehung ${inspectionNumber} abgeschlossen — ${companyName}`,
    html: baseTemplate(`
      <h2 style="color: #333; font-size: 18px;">Begehung abgeschlossen</h2>
      <p>Die Begehung <strong>${inspectionNumber}</strong> für <strong>${companyName}</strong> wurde abgeschlossen.</p>
      <p>Sie können den Bericht im AcoManage-Portal einsehen.</p>
    `),
  };
}

export function documentUpdatedEmail(documentTitle: string, version: number): { subject: string; html: string } {
  return {
    subject: `Dokument aktualisiert: ${documentTitle}`,
    html: baseTemplate(`
      <h2 style="color: #333; font-size: 18px;">Dokument aktualisiert</h2>
      <p>Das Dokument <strong>${documentTitle}</strong> wurde auf Version <strong>${version}</strong> aktualisiert.</p>
      <p>Bitte prüfen Sie die aktuelle Version im AcoManage-Portal.</p>
    `),
  };
}

export function documentPropagatedEmail(documentTitle: string, companyName: string): { subject: string; html: string } {
  return {
    subject: `Neues Dokument: ${documentTitle}`,
    html: baseTemplate(`
      <h2 style="color: #333; font-size: 18px;">Neues Dokument verfügbar</h2>
      <p>Das Dokument <strong>${documentTitle}</strong> wurde für <strong>${companyName}</strong> bereitgestellt.</p>
      <p>Sie können es im AcoManage-Portal herunterladen.</p>
    `),
  };
}

export function riskAssessmentActiveEmail(title: string, companyName: string): { subject: string; html: string } {
  return {
    subject: `GBU freigegeben: ${title}`,
    html: baseTemplate(`
      <h2 style="color: #333; font-size: 18px;">Gefährdungsbeurteilung freigegeben</h2>
      <p>Die Gefährdungsbeurteilung <strong>${title}</strong> für <strong>${companyName}</strong> wurde freigegeben.</p>
      <p>Sie können sie im AcoManage-Portal einsehen.</p>
    `),
  };
}

export function measureDeadlineEmail(description: string, deadline: string, companyName: string): { subject: string; html: string } {
  return {
    subject: `Neue Maßnahme mit Frist — ${companyName}`,
    html: baseTemplate(`
      <h2 style="color: #333; font-size: 18px;">Neue Maßnahme mit Frist</h2>
      <p><strong>Betrieb:</strong> ${companyName}</p>
      <p><strong>Maßnahme:</strong> ${description}</p>
      <p><strong>Frist:</strong> ${deadline}</p>
      <p>Bitte stellen Sie sicher, dass die Maßnahme fristgerecht umgesetzt wird.</p>
    `),
  };
}
