export const MAX_TOTAL_VOTES = 197;

export const CATEGORY_DEFS = [
  { id: 'president', label: '회장', mode: 'multi' },
  { id: 'vice2', label: '2학년 부회장', mode: 'multi' },
  { id: 'vice1', label: '1학년 부회장', mode: 'multi' },
  { id: 'dorm_f', label: '여기숙사', mode: 'multi' },
  { id: 'dorm_m', label: '남기숙사', mode: 'yesno' },
];

function createEmptyCategory(def) {
  if (def.mode === 'yesno') {
    return {
      id: def.id,
      label: def.label,
      mode: def.mode,
      candidateName: '찬반 투표',
      yesVotes: 0,
      noVotes: 0,
      invalidVotes: 0,
    };
  }

  return {
    id: def.id,
    label: def.label,
    mode: def.mode,
    candidates: [],
    invalidVotes: 0,
  };
}

export function createDefaultState() {
  return {
    maxTotalVotes: MAX_TOTAL_VOTES,
    categories: CATEGORY_DEFS.map(createEmptyCategory),
    meta: {
      updatedAt: new Date().toISOString(),
    },
  };
}

function normalizeCandidate(candidate) {
  return {
    id: typeof candidate?.id === 'string' ? candidate.id : crypto.randomUUID(),
    name: typeof candidate?.name === 'string' && candidate.name.trim() ? candidate.name.trim() : '무명 후보',
    votes: Number.isFinite(candidate?.votes) ? Math.max(0, Math.floor(candidate.votes)) : 0,
  };
}

export function normalizeState(rawState) {
  const fallback = createDefaultState();
  const source = rawState && typeof rawState === 'object' ? rawState : {};
  const categories = CATEGORY_DEFS.map((def) => {
    const current = Array.isArray(source.categories) ? source.categories.find((entry) => entry?.id === def.id) : null;
    const base = createEmptyCategory(def);

    if (!current) return base;

    if (def.mode === 'yesno') {
      return {
        ...base,
        candidateName:
          typeof current.candidateName === 'string' && current.candidateName.trim()
            ? current.candidateName.trim()
            : base.candidateName,
        yesVotes: Number.isFinite(current.yesVotes) ? Math.max(0, Math.floor(current.yesVotes)) : 0,
        noVotes: Number.isFinite(current.noVotes) ? Math.max(0, Math.floor(current.noVotes)) : 0,
        invalidVotes: Number.isFinite(current.invalidVotes) ? Math.max(0, Math.floor(current.invalidVotes)) : 0,
      };
    }

    return {
      ...base,
      candidates: Array.isArray(current.candidates) ? current.candidates.map(normalizeCandidate) : [],
      invalidVotes: Number.isFinite(current.invalidVotes) ? Math.max(0, Math.floor(current.invalidVotes)) : 0,
    };
  });

  return {
    maxTotalVotes: MAX_TOTAL_VOTES,
    categories,
    meta: {
      updatedAt: typeof source?.meta?.updatedAt === 'string' ? source.meta.updatedAt : fallback.meta.updatedAt,
    },
  };
}

export function getCategorySummary(category) {
  if (category.mode === 'yesno') {
    const total = category.yesVotes + category.noVotes + category.invalidVotes;
    return {
      total,
      invalid: category.invalidVotes,
    };
  }

  const candidateVotes = category.candidates.reduce((sum, candidate) => sum + candidate.votes, 0);
  return {
    total: candidateVotes + category.invalidVotes,
    invalid: category.invalidVotes,
  };
}

export function getRemainingVotes(category) {
  return Math.max(0, MAX_TOTAL_VOTES - getCategorySummary(category).total);
}

export function getWinnerKeys(category) {
  if (category.mode === 'yesno') {
    const top = Math.max(category.yesVotes, category.noVotes);
    if (top <= 0) return [];
    const winners = [];
    if (category.yesVotes === top) winners.push('yes');
    if (category.noVotes === top) winners.push('no');
    return winners;
  }

  const top = category.candidates.reduce((max, candidate) => Math.max(max, candidate.votes), 0);
  if (top <= 0) return [];
  return category.candidates.filter((candidate) => candidate.votes === top).map((candidate) => candidate.id);
}
