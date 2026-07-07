'use client';

import { useEffect, useState } from 'react';
import {
  getCategorySummary,
  getRemainingVotes,
} from '@/lib/election-core';
import { useElectionState } from '@/lib/election-client';

function CategoryAdminCard({ category, dispatch, candidateInputs, setCandidateInputs, maleName, setMaleName }) {
  const summary = getCategorySummary(category);
  const remaining = getRemainingVotes(category);

  const handleAddCandidate = async () => {
    const name = candidateInputs[category.id] || '';
    if (!name.trim()) return;
    await dispatch({ type: 'addCandidate', categoryId: category.id, name });
    setCandidateInputs((prev) => ({ ...prev, [category.id]: '' }));
  };

  const sharedUndoButtonClass =
    'rounded-lg bg-slate-200 px-2.5 py-1.5 text-[10px] font-semibold leading-none text-slate-800 transition hover:bg-slate-300';

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1rem] border border-slate-200 bg-white/85 p-3 shadow-soft backdrop-blur md:p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-bold tracking-tight text-slate-900 md:text-base">{category.label}</h2>
          <p className="mt-0.5 text-[11px] text-slate-600">남은 가능 투표 수 {remaining}</p>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
          현재 {summary.total}표
        </span>
      </div>

      {category.mode === 'yesno' ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <input
            value={maleName}
            onChange={(event) => setMaleName(event.target.value)}
            onBlur={() => {
              void dispatch({ type: 'setYesNoCandidateName', categoryId: category.id, name: maleName });
            }}
            placeholder="남기숙사 후보 이름"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void dispatch({ type: 'voteYesNo', categoryId: category.id, choice: 'yes' })}
              className="rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              찬성
            </button>
            <button
              type="button"
              onClick={() => void dispatch({ type: 'voteYesNo', categoryId: category.id, choice: 'no' })}
              className="rounded-xl bg-slate-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-600"
            >
              반대
            </button>
            <button
              type="button"
              onClick={() => void dispatch({ type: 'voteInvalid', categoryId: category.id })}
              className="rounded-xl bg-amber-500 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-amber-400"
            >
              무효
            </button>

            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => void dispatch({ type: 'unvoteYesNo', categoryId: category.id, choice: 'yes' })}
                className={sharedUndoButtonClass}
              >
                -1
              </button>
              <button
                type="button"
                onClick={() => void dispatch({ type: 'unvoteYesNo', categoryId: category.id, choice: 'no' })}
                className={sharedUndoButtonClass}
              >
                -1
              </button>
              <button
                type="button"
                onClick={() => void dispatch({ type: 'unvoteInvalid', categoryId: category.id })}
                className={sharedUndoButtonClass}
              >
                -1
              </button>
            </div>
          </div>

          <div className="mt-auto text-[11px] text-slate-500">
            찬성 {category.yesVotes} / 반대 {category.noVotes} / 무효 {category.invalidVotes}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="grid gap-2 md:grid-cols-[1fr_88px]">
            <input
              value={candidateInputs[category.id] || ''}
              onChange={(event) => setCandidateInputs((prev) => ({ ...prev, [category.id]: event.target.value }))}
              placeholder="후보자 이름"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={handleAddCandidate}
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              등록
            </button>
          </div>

          <div className="grid gap-2">
            {category.candidates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-xs text-slate-500">
                후보가 없습니다.
              </div>
            ) : null}

            {category.candidates.map((candidate, index) => (
              <div
                key={candidate.id}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-bold text-slate-900 md:text-sm">
                    {index + 1}번 {candidate.name}
                  </div>
                  <div className="text-[11px] text-slate-500">{candidate.votes}표</div>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void dispatch({ type: 'voteCandidate', categoryId: category.id, candidateId: candidate.id })}
                    className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                  >
                    투표
                  </button>
                  <button
                    type="button"
                    onClick={() => void dispatch({ type: 'unvoteCandidate', categoryId: category.id, candidateId: candidate.id })}
                    className="rounded-lg bg-slate-200 px-2.5 py-1.5 text-[10px] font-semibold leading-none text-slate-800 transition hover:bg-slate-300"
                  >
                    -1
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-600">무효표</span>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => void dispatch({ type: 'voteInvalid', categoryId: category.id })}
                className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-400"
              >
                무효
              </button>
              <button
                type="button"
                onClick={() => void dispatch({ type: 'unvoteInvalid', categoryId: category.id })}
                className="rounded-lg bg-slate-200 px-2.5 py-1.5 text-[10px] font-semibold leading-none text-slate-800 transition hover:bg-slate-300"
              >
                -1
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default function AdminView() {
  const [state, dispatch, refresh, error] = useElectionState();
  const [candidateInputs, setCandidateInputs] = useState({});
  const [maleName, setMaleName] = useState('');

  useEffect(() => {
    const maleCategory = state.categories.find((category) => category.id === 'dorm_m');
    setMaleName(maleCategory?.candidateName || '');
  }, [state]);

  const handleReset = async () => {
    await dispatch({ type: 'reset' });
    await refresh();
  };

  const topRow = state.categories.slice(0, 2);
  const bottomRow = state.categories.slice(2);

  return (
    <main className="h-screen overflow-hidden p-2 md:p-3">
      <header className="mb-2 flex items-center justify-between rounded-[1rem] border border-slate-200 bg-white/85 px-3 py-2.5 shadow-soft backdrop-blur md:px-4">
        <div className="min-w-0">
          <h1 className="text-base font-bold tracking-tight text-slate-900">관리자</h1>
          <p className="text-[11px] text-slate-600">후보 등록, 투표, 무효표</p>
        </div>
        <div className="flex items-center gap-2">
          {error ? <span className="hidden rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-rose-700 md:inline">연결 확인 필요</span> : null}
          <button type="button" onClick={handleReset} className="rounded-full bg-rose-600 px-3 py-2 text-xs font-semibold text-white">
            초기화
          </button>
        </div>
      </header>

      <section className="grid h-[calc(100vh-4.75rem)] grid-rows-[1fr_1fr] gap-2 md:h-[calc(100vh-5rem)] md:gap-3">
        <div className="grid min-h-0 gap-2 md:grid-cols-2 md:gap-3">
          {topRow.map((category) => (
            <CategoryAdminCard
              key={category.id}
              category={category}
              dispatch={dispatch}
              candidateInputs={candidateInputs}
              setCandidateInputs={setCandidateInputs}
              maleName={maleName}
              setMaleName={setMaleName}
            />
          ))}
        </div>
        <div className="grid min-h-0 gap-2 md:grid-cols-3 md:gap-3">
          {bottomRow.map((category) => (
            <CategoryAdminCard
              key={category.id}
              category={category}
              dispatch={dispatch}
              candidateInputs={candidateInputs}
              setCandidateInputs={setCandidateInputs}
              maleName={maleName}
              setMaleName={setMaleName}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
