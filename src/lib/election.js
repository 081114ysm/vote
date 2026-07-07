const STORAGE_KEY = 'vote-election-state-v1';
const CHANNEL_NAME = 'vote-election-updates-v1';
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

function readRawState() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeState(state) {
  if (typeof window === 'undefined') return;
  const nextState = {
    ...normalizeState(state),
    meta: { updatedAt: new Date().toISOString() },
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  window.dispatchEvent(new CustomEvent('vote-state-changed', { detail: nextState }));
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage(nextState);
    channel.close();
  }
}

export function loadState() {
  return normalizeState(readRawState());
}

export function saveState(state) {
  writeState(state);
}

export function resetState() {
  const state = createDefaultState();
  writeState(state);
  return state;
}

export function subscribeToStateChanges(callback) {
  if (typeof window === 'undefined') return () => {};

  const onStorage = (event) => {
    if (event.key !== STORAGE_KEY) return;
    callback(loadState());
  };
  const onCustom = () => callback(loadState());
  window.addEventListener('storage', onStorage);
  window.addEventListener('vote-state-changed', onCustom);

  let channel = null;
  const onBroadcast = (event) => callback(normalizeState(event.data));
  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener('message', onBroadcast);
  }

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('vote-state-changed', onCustom);
    if (channel) {
      channel.removeEventListener('message', onBroadcast);
      channel.close();
    }
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

export function getBarHeight(votes) {
  return Math.max(2, Math.min(100, (votes / MAX_TOTAL_VOTES) * 100));
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

function cloneState(state) {
  return typeof structuredClone === 'function' ? structuredClone(state) : JSON.parse(JSON.stringify(state));
}

export function addCandidate(state, categoryId, name) {
  const next = cloneState(state);
  const category = next.categories.find((entry) => entry.id === categoryId);
  const trimmed = name.trim();
  if (!category || category.mode !== 'multi' || !trimmed) return next;
  if (category.candidates.some((candidate) => candidate.name === trimmed)) return next;

  category.candidates.push({
    id: crypto.randomUUID(),
    name: trimmed,
    votes: 0,
  });

  return next;
}

export function setYesNoCandidateName(state, categoryId, name) {
  const next = cloneState(state);
  const category = next.categories.find((entry) => entry.id === categoryId);
  if (!category || category.mode !== 'yesno') return next;
  category.candidateName = name.trim() || '찬반 투표';
  return next;
}

export function voteCandidate(state, categoryId, candidateId) {
  const next = cloneState(state);
  const category = next.categories.find((entry) => entry.id === categoryId);
  if (!category || category.mode !== 'multi') return next;
  if (getCategorySummary(category).total >= MAX_TOTAL_VOTES) return next;

  const candidate = category.candidates.find((entry) => entry.id === candidateId);
  if (candidate) candidate.votes += 1;
  return next;
}

export function unvoteCandidate(state, categoryId, candidateId) {
  const next = cloneState(state);
  const category = next.categories.find((entry) => entry.id === categoryId);
  if (!category || category.mode !== 'multi') return next;

  const candidate = category.candidates.find((entry) => entry.id === candidateId);
  if (!candidate || candidate.votes <= 0) return next;

  candidate.votes -= 1;
  return next;
}

export function voteYesNo(state, categoryId, choice) {
  const next = cloneState(state);
  const category = next.categories.find((entry) => entry.id === categoryId);
  if (!category || category.mode !== 'yesno') return next;
  if (getCategorySummary(category).total >= MAX_TOTAL_VOTES) return next;

  if (choice === 'yes') category.yesVotes += 1;
  if (choice === 'no') category.noVotes += 1;
  return next;
}

export function unvoteYesNo(state, categoryId, choice) {
  const next = cloneState(state);
  const category = next.categories.find((entry) => entry.id === categoryId);
  if (!category || category.mode !== 'yesno') return next;

  if (choice === 'yes' && category.yesVotes > 0) category.yesVotes -= 1;
  if (choice === 'no' && category.noVotes > 0) category.noVotes -= 1;
  return next;
}

export function voteInvalid(state, categoryId) {
  const next = cloneState(state);
  const category = next.categories.find((entry) => entry.id === categoryId);
  if (!category) return next;
  if (getCategorySummary(category).total >= MAX_TOTAL_VOTES) return next;

  category.invalidVotes += 1;
  return next;
}

export function unvoteInvalid(state, categoryId) {
  const next = cloneState(state);
  const category = next.categories.find((entry) => entry.id === categoryId);
  if (!category || category.invalidVotes <= 0) return next;

  category.invalidVotes -= 1;
  return next;
}
