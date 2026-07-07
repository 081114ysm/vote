import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORY_DEFS = [
  { id: 'president', label: '회장', mode: 'multi' },
  { id: 'vice2', label: '2학년 부회장', mode: 'multi' },
  { id: 'vice1', label: '1학년 부회장', mode: 'multi' },
  { id: 'dorm_f', label: '여기숙사', mode: 'multi' },
  { id: 'dorm_m', label: '남기숙사', mode: 'yesno' },
];

async function main() {
  for (const def of CATEGORY_DEFS) {
    await prisma.electionCategory.upsert({
      where: { id: def.id },
      create: {
        id: def.id,
        label: def.label,
        mode: def.mode,
        candidateName: def.mode === 'yesno' ? '찬반 투표' : null,
      },
      update: {
        label: def.label,
        mode: def.mode,
        candidateName: def.mode === 'yesno' ? '찬반 투표' : null,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
