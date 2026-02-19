import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { copyFile, mkdir, stat, readdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const SOURCE_DIR = '/root/acomanagement/acomanagement';
const UPLOADS_BASE = path.join(process.cwd(), 'uploads', 'documents');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function extractCategoryCode(folderName: string, knownCodes: Set<string>): string | null {
  // Extract letter group + digits: "A 01 ..." → letters="A", digits="01"
  const match = folderName.match(/^([A-Z]+)\s+(\d+)/);
  if (!match) return null;
  const [, letters, digits] = match;
  const baseCode = `${letters}${digits.padStart(2, '0')}`;

  // Check for suffix (1-3 uppercase letters after digits, followed by space or dash)
  // e.g. "F 01 BC Aushang..." → suffix "BC", "H 01 B - Maschinen..." → suffix "B"
  const afterDigits = folderName.slice(match[0].length);
  const suffixMatch = afterDigits.match(/^\s+([A-Z]{1,3})(?:\s|-)/);
  if (suffixMatch) {
    const codeWithSuffix = baseCode + suffixMatch[1];
    if (knownCodes.has(codeWithSuffix)) return codeWithSuffix;
  }

  if (knownCodes.has(baseCode)) return baseCode;
  return null;
}

async function collectFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await collectFiles(fullPath);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  console.log('Starting template import...');
  console.log(`Source: ${SOURCE_DIR}`);
  console.log(`Target: ${UPLOADS_BASE}`);

  // Build category map
  const categories = await prisma.documentCategory.findMany();
  const categoryMap = new Map(categories.map(c => [c.code, c.id]));
  const knownCodes = new Set(categories.map(c => c.code));
  console.log(`Found ${categories.length} document categories in DB`);

  // Get admin user
  const adminUser = await prisma.user.findFirst({
    where: { email: 'admin@acomanage.de' },
  });
  if (!adminUser) {
    console.error('Admin user not found! Run db:seed first.');
    process.exit(1);
  }

  // Read top-level directories
  const entries = await readdir(SOURCE_DIR, { withFileTypes: true });
  const folders = entries.filter(e => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
  console.log(`Found ${folders.length} folders to process\n`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;
  let noCategory = 0;

  for (const folder of folders) {
    const code = extractCategoryCode(folder.name, knownCodes);
    if (!code) {
      console.warn(`  SKIP (no code): ${folder.name}`);
      noCategory++;
      continue;
    }

    const categoryId = categoryMap.get(code);
    if (!categoryId) {
      console.warn(`  SKIP (code "${code}" not in DB): ${folder.name}`);
      noCategory++;
      continue;
    }

    // Ensure upload directory
    const uploadDir = path.join(UPLOADS_BASE, code);
    await mkdir(uploadDir, { recursive: true });

    // Get all files recursively
    const folderPath = path.join(SOURCE_DIR, folder.name);
    const files = await collectFiles(folderPath);

    if (files.length === 0) {
      continue;
    }

    console.log(`[${code}] ${folder.name} — ${files.length} file(s)`);

    for (const filePath of files) {
      const fileName = path.basename(filePath);
      const ext = path.extname(fileName);
      const title = fileName.replace(/\.[^/.]+$/, '').trim();

      if (!title || !ext) continue;

      // Idempotency: check if already imported
      const existing = await prisma.document.findFirst({
        where: { isTemplate: true, categoryId, title },
      });
      if (existing) {
        skipped++;
        continue;
      }

      // Build subfolder description
      const relativePath = path.relative(folderPath, filePath);
      const subfolderName = path.dirname(relativePath);
      const description = subfolderName !== '.' ? `Abteilung: ${subfolderName}` : null;

      try {
        const uuid = randomUUID();
        const destFileName = `${uuid}${ext.toLowerCase()}`;
        const destPath = path.join(uploadDir, destFileName);

        await copyFile(filePath, destPath);
        const fileStats = await stat(destPath);

        await prisma.document.create({
          data: {
            title,
            description,
            categoryId,
            filePath: `uploads/documents/${code}/${destFileName}`,
            fileType: ext.replace('.', '').toLowerCase(),
            fileSize: fileStats.size,
            isTemplate: true,
            version: 1,
            status: 'active',
            createdById: adminUser.id,
          },
        });
        imported++;
      } catch (err) {
        console.error(`  ERROR importing "${fileName}":`, err);
        errors++;
      }
    }
  }

  console.log('\n========================================');
  console.log(`Import complete!`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped (already exists): ${skipped}`);
  console.log(`  Skipped (no category): ${noCategory}`);
  console.log(`  Errors: ${errors}`);
  console.log('========================================');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
