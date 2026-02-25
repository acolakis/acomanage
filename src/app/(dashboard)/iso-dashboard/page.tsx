import { prisma } from "@/lib/prisma";
import { getSelectedCompanyFilter, getSelectedCompanyId } from "@/lib/company-filter";
import { ComplianceOverview } from "@/components/iso-dashboard/compliance-overview";

export type ComplianceLevel = "gruen" | "gelb" | "rot";

export interface ClauseMetrics {
  [key: string]: number | string | boolean;
}

export interface ClauseData {
  clause: number;
  title: string;
  level: ComplianceLevel;
  metrics: ClauseMetrics;
  statusText: string;
  recommendation: string;
}

export interface IsoDashboardData {
  companyName: string | null;
  clauses: ClauseData[];
}

async function getIsoDashboardData(): Promise<IsoDashboardData> {
  const selectedCompanyId = getSelectedCompanyId();
  const companyFilter = getSelectedCompanyFilter();

  // Get company name if filtered
  let companyName: string | null = null;
  if (selectedCompanyId) {
    const company = await prisma.company.findUnique({
      where: { id: selectedCompanyId },
      select: { name: true },
    });
    companyName = company?.name ?? null;
  }

  const now = new Date();
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  // ============================================================
  // CLAUSE 4: Kontext der Organisation
  // ============================================================
  const contextFilter = selectedCompanyId
    ? { companyId: selectedCompanyId }
    : {};

  const contexts = await prisma.companyContext.findMany({
    where: contextFilter,
    select: {
      internalIssues: true,
      externalIssues: true,
      interestedParties: true,
      sgaScope: true,
    },
  });

  const totalCompanies = selectedCompanyId
    ? 1
    : await prisma.company.count({ where: { isActive: true } });

  const contextComplete = contexts.filter(
    (c) => c.internalIssues && c.externalIssues && c.interestedParties && c.sgaScope
  ).length;
  const contextPartial = contexts.filter(
    (c) =>
      (c.internalIssues || c.externalIssues || c.interestedParties || c.sgaScope) &&
      !(c.internalIssues && c.externalIssues && c.interestedParties && c.sgaScope)
  ).length;

  let clause4Level: ComplianceLevel;
  if (totalCompanies > 0 && contextComplete === totalCompanies) {
    clause4Level = "gruen";
  } else if (contextComplete > 0 || contextPartial > 0) {
    clause4Level = "gelb";
  } else {
    clause4Level = "rot";
  }

  const clause4: ClauseData = {
    clause: 4,
    title: "Kontext der Organisation",
    level: clause4Level,
    metrics: {
      contextsComplete: contextComplete,
      contextsPartial: contextPartial,
      totalCompanies,
    },
    statusText:
      clause4Level === "gruen"
        ? "Kontext vollstaendig fuer alle Betriebe dokumentiert"
        : clause4Level === "gelb"
          ? `${contextComplete} von ${totalCompanies} Betrieben vollstaendig, ${contextPartial} teilweise`
          : "Kein Organisationskontext dokumentiert",
    recommendation:
      clause4Level === "gruen"
        ? "Regelmaessige Ueberpruefung des Kontexts empfohlen"
        : clause4Level === "gelb"
          ? "Fehlende Kontextangaben ergaenzen (interne/externe Themen, interessierte Parteien, Geltungsbereich)"
          : "Organisationskontext dringend erfassen (Klausel 4.1-4.4)",
  };

  // ============================================================
  // CLAUSE 5: Fuehrung und Beteiligung der Beschaeftigten
  // ============================================================
  const leadershipContexts = await prisma.companyContext.findMany({
    where: contextFilter,
    select: {
      ohsPolicy: true,
      ohsRoles: true,
      participationMechanism: true,
    },
  });

  const policyComplete = leadershipContexts.filter((c) => c.ohsPolicy).length;
  const rolesComplete = leadershipContexts.filter(
    (c) => c.ohsRoles && Array.isArray(c.ohsRoles) && (c.ohsRoles as unknown[]).length > 0
  ).length;
  const participationComplete = leadershipContexts.filter(
    (c) => c.participationMechanism
  ).length;

  let clause5Level: ComplianceLevel;
  if (
    totalCompanies > 0 &&
    policyComplete === totalCompanies &&
    rolesComplete === totalCompanies
  ) {
    clause5Level = "gruen";
  } else if (policyComplete > 0 || rolesComplete > 0) {
    clause5Level = "gelb";
  } else {
    clause5Level = "rot";
  }

  const clause5: ClauseData = {
    clause: 5,
    title: "Fuehrung und Beteiligung der Beschaeftigten",
    level: clause5Level,
    metrics: {
      policyDefined: policyComplete,
      rolesDefined: rolesComplete,
      participationDefined: participationComplete,
      totalCompanies,
    },
    statusText:
      clause5Level === "gruen"
        ? "SGA-Politik und Rollen fuer alle Betriebe definiert"
        : clause5Level === "gelb"
          ? `SGA-Politik: ${policyComplete}/${totalCompanies}, Rollen: ${rolesComplete}/${totalCompanies}`
          : "Keine SGA-Politik oder Rollen definiert",
    recommendation:
      clause5Level === "gruen"
        ? "Beteiligung der Beschaeftigten weiter staerken"
        : clause5Level === "gelb"
          ? "Fehlende SGA-Politik oder Rollenverteilung ergaenzen"
          : "SGA-Politik und Rollen dringend festlegen (Klausel 5.2-5.4)",
  };

  // ============================================================
  // CLAUSE 6: Planung
  // ============================================================
  const [activeRiskAssessments, activeObjectives, konformLegalReqs, totalLegalReqs] =
    await Promise.all([
      prisma.riskAssessment.count({
        where: { status: "active", ...companyFilter },
      }),
      prisma.ohsObjective.count({
        where: { status: "AKTIV", ...companyFilter },
      }),
      prisma.legalRequirement.count({
        where: {
          complianceStatus: "KONFORM",
          isActive: true,
          ...companyFilter,
        },
      }),
      prisma.legalRequirement.count({
        where: { isActive: true, ...companyFilter },
      }),
    ]);

  let clause6Level: ComplianceLevel;
  if (activeRiskAssessments > 0 && activeObjectives > 0 && totalLegalReqs > 0 && konformLegalReqs === totalLegalReqs) {
    clause6Level = "gruen";
  } else if (activeRiskAssessments > 0 || activeObjectives > 0) {
    clause6Level = "gelb";
  } else {
    clause6Level = "rot";
  }

  const clause6: ClauseData = {
    clause: 6,
    title: "Planung",
    level: clause6Level,
    metrics: {
      activeRiskAssessments,
      activeObjectives,
      konformLegalReqs,
      totalLegalReqs,
    },
    statusText:
      clause6Level === "gruen"
        ? `${activeRiskAssessments} aktive GBU, ${activeObjectives} aktive Ziele, alle ${totalLegalReqs} Rechtsanforderungen konform`
        : clause6Level === "gelb"
          ? `${activeRiskAssessments} aktive GBU, ${activeObjectives} Ziele, ${konformLegalReqs}/${totalLegalReqs} Rechtsanforderungen konform`
          : "Keine aktiven Gefaehrdungsbeurteilungen oder Ziele",
    recommendation:
      clause6Level === "gruen"
        ? "Regelmaessige Ueberpruefung der GBU und Ziele sicherstellen"
        : clause6Level === "gelb"
          ? "Fehlende GBU aktivieren, SGA-Ziele setzen, Rechtskataster vervollstaendigen"
          : "Gefaehrdungsbeurteilungen und SGA-Ziele dringend erstellen (Klausel 6.1-6.2)",
  };

  // ============================================================
  // CLAUSE 7: Unterstuetzung
  // ============================================================
  const [completedTrainings, overdueTrainings, totalDocuments] = await Promise.all([
    prisma.trainingEvent.count({
      where: { status: "DURCHGEFUEHRT", ...companyFilter },
    }),
    prisma.trainingEvent.count({
      where: {
        OR: [
          { status: "UEBERFAELLIG", ...companyFilter },
          {
            status: "GEPLANT",
            trainingDate: { lt: now },
            ...companyFilter,
          },
        ],
      },
    }),
    selectedCompanyId
      ? prisma.companyDocument.count({ where: { companyId: selectedCompanyId } })
      : prisma.document.count({ where: { status: "active" } }),
  ]);

  let clause7Level: ComplianceLevel;
  if (completedTrainings > 0 && overdueTrainings === 0 && totalDocuments > 0) {
    clause7Level = "gruen";
  } else if (completedTrainings > 0 || totalDocuments > 0) {
    clause7Level = "gelb";
  } else {
    clause7Level = "rot";
  }

  const clause7: ClauseData = {
    clause: 7,
    title: "Unterstuetzung",
    level: clause7Level,
    metrics: {
      completedTrainings,
      overdueTrainings,
      totalDocuments,
    },
    statusText:
      clause7Level === "gruen"
        ? `${completedTrainings} Schulungen durchgefuehrt, ${totalDocuments} Dokumente, keine ueberfaelligen Schulungen`
        : clause7Level === "gelb"
          ? `${completedTrainings} Schulungen durchgefuehrt, ${overdueTrainings} ueberfaellig, ${totalDocuments} Dokumente`
          : "Keine Schulungen durchgefuehrt und keine Dokumente zugewiesen",
    recommendation:
      clause7Level === "gruen"
        ? "Schulungsplan aktuell halten und Dokumentation pflegen"
        : clause7Level === "gelb"
          ? "Ueberfaellige Schulungen nachholen und Dokumentation erweitern"
          : "Schulungsprogramm und Dokumentation aufbauen (Klausel 7.2-7.5)",
  };

  // ============================================================
  // CLAUSE 8: Betrieb
  // ============================================================
  const [completedInspections, activeEmergencyPlans, openChangeRequests] =
    await Promise.all([
      prisma.inspection.count({
        where: {
          status: { in: ["COMPLETED", "SENT"] },
          inspectionDate: { gte: twelveMonthsAgo },
          ...companyFilter,
        },
      }),
      prisma.emergencyPlan.count({
        where: { isActive: true, ...companyFilter },
      }),
      prisma.changeRequest.count({
        where: {
          status: { in: ["BEANTRAGT", "BEWERTET", "GENEHMIGT"] },
          ...companyFilter,
        },
      }),
    ]);

  let clause8Level: ComplianceLevel;
  if (completedInspections > 0 && activeEmergencyPlans > 0) {
    clause8Level = "gruen";
  } else if (completedInspections > 0 || activeEmergencyPlans > 0) {
    clause8Level = "gelb";
  } else {
    clause8Level = "rot";
  }

  const clause8: ClauseData = {
    clause: 8,
    title: "Betrieb",
    level: clause8Level,
    metrics: {
      completedInspections,
      activeEmergencyPlans,
      openChangeRequests,
    },
    statusText:
      clause8Level === "gruen"
        ? `${completedInspections} Begehungen (12 Mon.), ${activeEmergencyPlans} Notfallplaene, ${openChangeRequests} offene Aenderungen`
        : clause8Level === "gelb"
          ? `${completedInspections} Begehungen (12 Mon.), ${activeEmergencyPlans} Notfallplaene aktiv`
          : "Keine Begehungen oder Notfallplaene vorhanden",
    recommendation:
      clause8Level === "gruen"
        ? "Begehungsrhythmus beibehalten und Notfallplaene regelmaessig ueben"
        : clause8Level === "gelb"
          ? "Fehlende Begehungen durchfuehren oder Notfallplaene erstellen"
          : "Betriebliche Begehungen und Notfallplanung dringend einrichten (Klausel 8.1-8.2)",
  };

  // ============================================================
  // CLAUSE 9: Bewertung der Leistung
  // ============================================================
  const [completedAudits, approvedReviews] = await Promise.all([
    prisma.internalAudit.count({
      where: {
        status: "ABGESCHLOSSEN",
        actualDate: { gte: twelveMonthsAgo },
        ...companyFilter,
      },
    }),
    prisma.managementReview.count({
      where: {
        approvedAt: { not: null },
        reviewDate: { gte: twelveMonthsAgo },
        ...companyFilter,
      },
    }),
  ]);

  let clause9Level: ComplianceLevel;
  if (completedAudits > 0 && approvedReviews > 0) {
    clause9Level = "gruen";
  } else if (completedAudits > 0 || approvedReviews > 0) {
    clause9Level = "gelb";
  } else {
    clause9Level = "rot";
  }

  const clause9: ClauseData = {
    clause: 9,
    title: "Bewertung der Leistung",
    level: clause9Level,
    metrics: {
      completedAudits,
      approvedReviews,
    },
    statusText:
      clause9Level === "gruen"
        ? `${completedAudits} Audit(s) abgeschlossen, ${approvedReviews} Managementbewertung(en) genehmigt (12 Mon.)`
        : clause9Level === "gelb"
          ? `${completedAudits} Audit(s), ${approvedReviews} Managementbewertung(en) in den letzten 12 Monaten`
          : "Keine Audits oder Managementbewertungen in den letzten 12 Monaten",
    recommendation:
      clause9Level === "gruen"
        ? "Audit- und Bewertungszyklus fortsetzen"
        : clause9Level === "gelb"
          ? "Fehlende Audits oder Managementbewertungen durchfuehren"
          : "Internes Audit und Managementbewertung dringend planen (Klausel 9.2-9.3)",
  };

  // ============================================================
  // CLAUSE 10: Verbesserung
  // ============================================================
  const [openIncidents, overdueActions, completedActions, totalActions] =
    await Promise.all([
      prisma.incident.count({
        where: {
          status: { in: ["GEMELDET", "IN_UNTERSUCHUNG", "MASSNAHMEN"] },
          ...companyFilter,
        },
      }),
      prisma.correctiveAction.count({
        where: {
          status: { in: ["OFFEN", "IN_BEARBEITUNG"] },
          deadline: { lt: now },
          ...companyFilter,
        },
      }),
      prisma.correctiveAction.count({
        where: {
          status: { in: ["UMGESETZT", "WIRKSAMKEIT_GEPRUEFT", "ABGESCHLOSSEN"] },
          ...companyFilter,
        },
      }),
      prisma.correctiveAction.count({
        where: companyFilter,
      }),
    ]);

  let clause10Level: ComplianceLevel;
  if (overdueActions === 0 && openIncidents === 0 && totalActions > 0) {
    clause10Level = "gruen";
  } else if (overdueActions === 0 && (completedActions > 0 || openIncidents <= 2)) {
    clause10Level = "gelb";
  } else {
    clause10Level = "rot";
  }

  const clause10: ClauseData = {
    clause: 10,
    title: "Verbesserung",
    level: clause10Level,
    metrics: {
      openIncidents,
      overdueActions,
      completedActions,
      totalActions,
    },
    statusText:
      clause10Level === "gruen"
        ? `Keine offenen Vorfaelle, ${completedActions} Massnahmen umgesetzt, keine ueberfaelligen`
        : clause10Level === "gelb"
          ? `${openIncidents} offene Vorfaelle, ${overdueActions} ueberfaellige Massnahmen, ${completedActions}/${totalActions} umgesetzt`
          : `${openIncidents} offene Vorfaelle, ${overdueActions} ueberfaellige Massnahmen`,
    recommendation:
      clause10Level === "gruen"
        ? "KVP-Prozess beibehalten und Wirksamkeit pruefen"
        : clause10Level === "gelb"
          ? "Offene Vorfaelle untersuchen und Massnahmen zeitnah umsetzen"
          : "Ueberfaellige Massnahmen sofort bearbeiten und Vorfaelle untersuchen (Klausel 10.1-10.3)",
  };

  return {
    companyName,
    clauses: [clause4, clause5, clause6, clause7, clause8, clause9, clause10],
  };
}

export default async function IsoDashboardPage() {
  const data = await getIsoDashboardData();
  const serializedData = JSON.parse(JSON.stringify(data));

  return (
    <div className="space-y-6">
      <ComplianceOverview data={serializedData} />
    </div>
  );
}
