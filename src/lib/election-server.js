import { prisma } from './prisma';
import { CATEGORY_DEFS, createDefaultState, normalizeState, getCategorySummary } from './election-core';

function canUseDb() {
  return Boolean(process.env.DATABASE_URL);
}

async function ensureSeeded(tx) {
  for (const def of CATEGORY_DEFS) {
    await tx.electionCategory.upsert({
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

async function loadFromDb(tx = prisma) {
  await ensureSeeded(tx);
  const categories = await tx.electionCategory.findMany({
    orderBy: {
      id: 'asc',
    },
    include: {
      candidates: {
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

  const latestUpdatedAt = categories.reduce((latest, category) => {
    const candidateUpdatedAt = category.candidates.reduce((innerLatest, candidate) => {
      const candidateTime = candidate.updatedAt ? new Date(candidate.updatedAt).getTime() : 0;
      return Math.max(innerLatest, candidateTime);
    }, 0);
    const categoryTime = category.updatedAt ? new Date(category.updatedAt).getTime() : 0;
    return Math.max(latest, categoryTime, candidateUpdatedAt);
  }, 0);

  return normalizeState({
    categories: categories.map((category) => ({
      id: category.id,
      label: category.label,
      mode: category.mode,
      candidateName: category.candidateName,
      yesVotes: category.yesVotes,
      noVotes: category.noVotes,
      invalidVotes: category.invalidVotes,
      candidates: category.candidates.map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        votes: candidate.votes,
      })),
    })),
    meta: {
      updatedAt: latestUpdatedAt ? new Date(latestUpdatedAt).toISOString() : createDefaultState().meta.updatedAt,
    },
  });
}

async function mutateDb(mutator) {
  return prisma.$transaction(async (tx) => {
    await ensureSeeded(tx);
    await mutator(tx);
    return loadFromDb(tx);
  });
}

async function resetDb() {
  return mutateDb(async (tx) => {
    await tx.candidate.deleteMany();
    await tx.electionCategory.updateMany({
      data: {
        candidateName: null,
        yesVotes: 0,
        noVotes: 0,
        invalidVotes: 0,
      },
    });
    await ensureSeeded(tx);
  });
}

export async function loadElectionState() {
  if (!canUseDb()) return createDefaultState();
  return loadFromDb();
}

export async function applyElectionAction(action) {
  if (!canUseDb()) {
    // Fallback handled by route-local memory store.
    throw new Error('DATABASE_URL is not configured');
  }

  return mutateDb(async (tx) => {
    switch (action.type) {
      case 'addCandidate': {
        if (!action.categoryId || !action.name?.trim()) break;
        const category = await tx.electionCategory.findUnique({ where: { id: action.categoryId } });
        if (!category || category.mode !== 'multi') break;
        await tx.candidate.create({
          data: {
            categoryId: action.categoryId,
            name: action.name.trim(),
          },
        });
        break;
      }
      case 'setYesNoCandidateName': {
        if (!action.categoryId) break;
        const category = await tx.electionCategory.findUnique({ where: { id: action.categoryId } });
        if (!category || category.mode !== 'yesno') break;
        await tx.electionCategory.update({
          where: { id: action.categoryId },
          data: {
            candidateName: action.name?.trim() || '찬반 투표',
          },
        });
        break;
      }
      case 'voteCandidate': {
        const category = await tx.electionCategory.findUnique({
          where: { id: action.categoryId },
          include: { candidates: true },
        });
        if (!category || category.mode !== 'multi') break;
        if (getCategorySummary({
          mode: category.mode,
          candidates: category.candidates,
          invalidVotes: category.invalidVotes,
        }).total >= 197) break;
        await tx.candidate.update({
          where: { id: action.candidateId },
          data: { votes: { increment: 1 } },
        });
        break;
      }
      case 'unvoteCandidate': {
        const candidate = await tx.candidate.findUnique({ where: { id: action.candidateId } });
        if (!candidate || candidate.votes <= 0) break;
        await tx.candidate.update({
          where: { id: action.candidateId },
          data: { votes: { decrement: 1 } },
        });
        break;
      }
      case 'voteYesNo': {
        const category = await tx.electionCategory.findUnique({ where: { id: action.categoryId } });
        if (!category || category.mode !== 'yesno') break;
        if (category.yesVotes + category.noVotes + category.invalidVotes >= 197) break;
        const data =
          action.choice === 'yes'
            ? { yesVotes: { increment: 1 } }
            : action.choice === 'no'
              ? { noVotes: { increment: 1 } }
              : null;
        if (!data) break;
        await tx.electionCategory.update({
          where: { id: action.categoryId },
          data,
        });
        break;
      }
      case 'unvoteYesNo': {
        const category = await tx.electionCategory.findUnique({ where: { id: action.categoryId } });
        if (!category || category.mode !== 'yesno') break;
        if (action.choice === 'yes' && category.yesVotes > 0) {
          await tx.electionCategory.update({
            where: { id: action.categoryId },
            data: { yesVotes: { decrement: 1 } },
          });
        }
        if (action.choice === 'no' && category.noVotes > 0) {
          await tx.electionCategory.update({
            where: { id: action.categoryId },
            data: { noVotes: { decrement: 1 } },
          });
        }
        break;
      }
      case 'voteInvalid': {
        const category = await tx.electionCategory.findUnique({
          where: { id: action.categoryId },
          include: { candidates: true },
        });
        if (!category) break;
        const total =
          category.mode === 'yesno'
            ? category.yesVotes + category.noVotes + category.invalidVotes
            : category.candidates.reduce((sum, candidate) => sum + candidate.votes, 0) + category.invalidVotes;
        if (total >= 197) break;
        await tx.electionCategory.update({
          where: { id: action.categoryId },
          data: { invalidVotes: { increment: 1 } },
        });
        break;
      }
      case 'unvoteInvalid': {
        const category = await tx.electionCategory.findUnique({ where: { id: action.categoryId } });
        if (!category || category.invalidVotes <= 0) break;
        await tx.electionCategory.update({
          where: { id: action.categoryId },
          data: { invalidVotes: { decrement: 1 } },
        });
        break;
      }
      case 'reset': {
        await tx.candidate.deleteMany();
        await tx.electionCategory.updateMany({
          data: {
            candidateName: null,
            yesVotes: 0,
            noVotes: 0,
            invalidVotes: 0,
          },
        });
        await ensureSeeded(tx);
        break;
      }
      default:
        break;
    }
  });
}

export async function loadElectionStateFallback() {
  return createDefaultState();
}
