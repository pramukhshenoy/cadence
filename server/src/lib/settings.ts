import { PrismaClient, Settings } from '@prisma/client';

// Safety net: return the Settings singleton, creating it if the migration somehow missed it.
// Normal path (migration ran) = findUnique hit; upsert is only reached if row is absent.
export async function getSettings(prisma: PrismaClient): Promise<Settings> {
  const existing = await prisma.settings.findUnique({ where: { id: 'singleton' } });
  if (existing) return existing;
  return prisma.settings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton' },
  });
}
