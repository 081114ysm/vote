import { CATEGORY_DEFS, createDefaultState, getCategorySummary, normalizeState } from './election-core';

let memoryState = createDefaultState();

function cloneState(state) {
  return typeof structuredClone === 'function' ? structuredClone(state) : JSON.parse(JSON.stringify(state));
}

function ensureCategory(state, categoryId) {
  return state.categories.find((entry) => entry.id === categoryId);
}

export function loadMemoryElectionState() {
  return normalizeState(memoryState);
}

export function resetMemoryElectionState() {
  memoryState = createDefaultState();
  return loadMemoryElectionState();
}

export function applyMemoryElectionAction(action) {
  const next = cloneState(memoryState);
  const category = ensureCategory(next, action.categoryId);

  switch (action.type) {
    case 'addCandidate': {
      if (!category || category.mode !== 'multi' || !action.name?.trim()) break;
      if (category.candidates.some((candidate) => candidate.name === action.name.trim())) break;
      category.candidates.push({
        id: crypto.randomUUID(),
        name: action.name.trim(),
        votes: 0,
      });
      break;
    }
    case 'setYesNoCandidateName': {
      if (!category || category.mode !== 'yesno') break;
      category.candidateName = action.name?.trim() || '찬반 투표';
      break;
    }
    case 'voteCandidate': {
      if (!category || category.mode !== 'multi') break;
      if (getCategorySummary(category).total >= 197) break;
      const candidate = category.candidates.find((entry) => entry.id === action.candidateId);
      if (candidate) candidate.votes += 1;
      break;
    }
    case 'unvoteCandidate': {
      if (!category || category.mode !== 'multi') break;
      const candidate = category.candidates.find((entry) => entry.id === action.candidateId);
      if (candidate && candidate.votes > 0) candidate.votes -= 1;
      break;
    }
    case 'deleteCandidate': {
      if (!category || category.mode !== 'multi') break;
      category.candidates = category.candidates.filter((candidate) => candidate.id !== action.candidateId);
      break;
    }
    case 'voteYesNo': {
      if (!category || category.mode !== 'yesno') break;
      if (getCategorySummary(category).total >= 197) break;
      if (action.choice === 'yes') category.yesVotes += 1;
      if (action.choice === 'no') category.noVotes += 1;
      break;
    }
    case 'unvoteYesNo': {
      if (!category || category.mode !== 'yesno') break;
      if (action.choice === 'yes' && category.yesVotes > 0) category.yesVotes -= 1;
      if (action.choice === 'no' && category.noVotes > 0) category.noVotes -= 1;
      break;
    }
    case 'voteInvalid': {
      if (!category) break;
      if (getCategorySummary(category).total >= 197) break;
      category.invalidVotes += 1;
      break;
    }
    case 'unvoteInvalid': {
      if (!category || category.invalidVotes <= 0) break;
      category.invalidVotes -= 1;
      break;
    }
    case 'reset': {
      memoryState = createDefaultState();
      return loadMemoryElectionState();
    }
    default:
      break;
  }

  memoryState = next;
  return loadMemoryElectionState();
}
