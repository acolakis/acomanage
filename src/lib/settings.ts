import { prisma } from "@/lib/prisma";

/**
 * Gets a system setting value by key.
 * Returns the default value if the setting doesn't exist.
 */
export async function getSystemSetting<T>(
  key: string,
  defaultValue: T
): Promise<T> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key },
    });
    if (!setting?.value) return defaultValue;
    return setting.value as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Sets a system setting value.
 */
export async function setSystemSetting(
  key: string,
  value: unknown
): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value: JSON.parse(JSON.stringify(value)) },
    create: { key, value: JSON.parse(JSON.stringify(value)) },
  });
}

/**
 * Gets the source company name used in template documents.
 * This is the company name that will be replaced with the target company's name.
 */
export async function getTemplateSourceCompany(): Promise<string> {
  const value = await getSystemSetting<string>(
    "template_source_company",
    "Frankenberg"
  );
  return value;
}

export interface TemplateSourceData {
  companyName: string;
  street: string;
  zip: string;
  city: string;
  geschaeftsfuehrer: string;
  produktionsleiter: string;
  technischerLeiter: string;
}

/**
 * Gets all source template data for full document personalization.
 * These values are what appears in the original templates and will be replaced
 * with target company data on download.
 */
export async function getTemplateSourceData(): Promise<TemplateSourceData> {
  const [companyName, street, zip, city, geschaeftsfuehrer, produktionsleiter, technischerLeiter] =
    await Promise.all([
      getSystemSetting<string>("template_source_company", "Frankenberg"),
      getSystemSetting<string>("template_source_street", "Mitterand Straße 35"),
      getSystemSetting<string>("template_source_zip", "52146"),
      getSystemSetting<string>("template_source_city", "Würselen"),
      getSystemSetting<string>("template_source_geschaeftsfuehrer", "Sebastian Schlaadt"),
      getSystemSetting<string>("template_source_produktionsleiter", "Stefan Gleixner"),
      getSystemSetting<string>("template_source_technischer_leiter", "Frank Becker"),
    ]);

  return { companyName, street, zip, city, geschaeftsfuehrer, produktionsleiter, technischerLeiter };
}
