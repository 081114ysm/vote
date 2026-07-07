'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  addCandidate,
  createDefaultState,
  getBarHeight,
  getCategorySummary,
  getRemainingVotes,
  getWinnerKeys,
  loadState,
  resetState,
  saveState,
  setYesNoCandidateName,
  subscribeToStateChanges,
  voteCandidate,
  voteInvalid,
  voteYesNo,
} from '@/lib/election';

function useElectionState() {
  const [state, setState] = useState(() => createDefaultState());

  useEffect(() => {
    setState(loadState());
    return subscribeToStateChanges(setState);
  }, []);

  const update = (nextState) => {
    saveState(nextState);
    setState(nextState);
  };

  return [state, update, setState];
}

function Nav({ active }) {
  return (
    <nav className="flex flex-wrap gap-2">
      <Link
        href="/"
        className={`rounded-full border px-4 py-2 text-sm transition ${
          active === 'dashboard' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white/80'
        }`}
      >
        집계 페이지
      </Link>
      <Link
        href="/admin"
        className={`rounded-full border px-4 py-2 text-sm transition ${
          active === 'admin' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white/80'
        }`}
      >
        관리자 페이지
      </Link>
    </nav>
  );
}

function Shell({ title, description, active, children, right }) {
  return (
    <main className="mx-auto w-[min(1280px,calc(100%-32px))] py-6 pb-10">
      <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          {right}
          <Nav active={active} />
        </div>
      </header>
      {children}
    </main>
  );
}

function CategoryCard({ category, mode, children, footer }) {
  return (
    <section className="rounded-[1.25rem] border border-slate-200 bg-white/85 p-5 shadow-soft backdrop-blur">
      {children}
      {footer}
    </section>
  );
}

function BarChart({ category }) {
  const winners = getWinnerKeys(category);
  const summary = getCategorySummary(category);
  const bars =
    category.mode === 'yesno'
      ? [
          { key: 'yes', label: category.candidateName || '찬성', votes: category.yesVotes },
          { key: 'no', label: '반대', votes: category.noVotes, dark: true },
          { key: 'invalid', label: '무효', votes: category.invalidVotes, invalid: true, amber: true },
        ]
      : [
          ...category.candidates.map((candidate) => ({
            key: candidate.id,
            label: candidate.name,
            votes: candidate.votes,
          })),
          { key: 'invalid', label: '무효', votes: category.invalidVotes, invalid: true, amber: true },
        ];

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))' }}>
      {bars.map((bar) => {
        const isWinner = winners.includes(bar.key);
        const height = getBarHeight(bar.votes);
        const classes = [
          'bar-anim flex h-[220px] items-end rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-3',
        ];

        if (bar.invalid) classes.push('items-stretch');

        return (
          <div key={bar.key} className="flex flex-col gap-2">
            <div className={classes.join(' ')}>
              <div
                className={[
                  'bar-anim flex w-full items-start justify-center rounded-t-[14px] rounded-b-[10px] pt-2 font-semibold text-white',
                  isWinner && !bar.invalid ? 'bg-gradient-to-b from-emerald-400 to-emerald-700 shadow-[0_0_0_3px_rgba(34,197,94,0.14)] -translate-y-0.5' : '',
                  bar.dark ? 'bg-gradient-to-b from-slate-400 to-slate-700' : '',
                  bar.invalid ? 'bg-gradient-to-b from-amber-400 to-amber-600' : '',
                  !bar.dark && !bar.invalid && !isWinner ? 'bg-gradient-to-b from-blue-400 to-blue-600' : '',
                ].join(' ')}
                style={{ height: `${height}%` }}
              >
                <span className="pt-2 text-sm">{bar.votes > 0 ? bar.votes : '0'}</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 text-sm text-slate-600">
              <strong className="text-slate-900">{bar.label}</strong>
              <span>{bar.votes}표</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{bar.invalid ? '무효표' : summary.total >= 197 ? '상한 도달' : '집계 중'}</span>
              {isWinner && !bar.invalid ? <span className="font-semibold text-emerald-600">현재 1위</span> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DashboardPage() {
  const [state] = useElectionState();
  const totalVotes = state.categories.reduce((sum, category) => sum + getCategorySummary(category).total, 0);
  const invalidVotes = state.categories.reduce((sum, category) => sum + getCategorySummary(category).invalid, 0);

  return (
    <Shell
      active="dashboard"
      title="선거 집계 현황"
      description="관리자 페이지에서 입력한 투표가 바로 반영됩니다."
    >
      <section className="rounded-[1.25rem] border border-slate-200 bg-white/85 p-5 shadow-soft backdrop-blur">
        <div className="grid gap-3 md:grid-cols-3">
          <Stat label="누적 투표 수" value={totalVotes} />
          <Stat label="무효표" value={invalidVotes} />
          <Stat label="최대 인원" value={197} />
        </div>
        <div className="mt-5 grid gap-4">
          {state.categories.map((category) => {
            const remaining = getRemainingVotes(category);
            const summary = getCategorySummary(category);
            const progress = Math.min(100, (summary.total / 197) * 100);

            return (
              <CategoryCard
                key={category.id}
                category={category}
                footer={
                  <div className="mt-4 text-sm text-slate-500">
                    <span className="mr-3">남은 가능 투표 수 {remaining} / 197</span>
                    <span>실시간 집계</span>
                  </div>
                }
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-slate-900">{category.label}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {category.mode === 'yesno'
                        ? `대상 후보: ${category.candidateName || '찬반 투표'}`
                        : '후보별 막대 그래프와 무효표를 함께 보여줍니다.'}
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                    현재 {summary.total}표
                  </span>
                </div>
                <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400" style={{ width: `${progress}%` }} />
                </div>
                <BarChart category={category} />
              </CategoryCard>
            );
          })}
        </div>
      </section>
    </Shell>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{value}</div>
    </div>
  );
}

export function AdminPage() {
  const [state, update, setState] = useElectionState();
  const [candidateInputs, setCandidateInputs] = useState({});
  const [maleName, setMaleName] = useState('');

  useEffect(() => {
    const maleCategory = state.categories.find((category) => category.id === 'dorm_m');
    setMaleName(maleCategory?.candidateName || '');
  }, [state]);

  const handleAddCandidate = (categoryId) => {
    const name = candidateInputs[categoryId] || '';
    if (!name.trim()) return;
    update(addCandidate(state, categoryId, name));
    setCandidateInputs((prev) => ({ ...prev, [categoryId]: '' }));
  };

  const handleVoteCandidate = (categoryId, candidateId) => update(voteCandidate(state, categoryId, candidateId));
  const handleVoteYesNo = (categoryId, choice) => update(voteYesNo(state, categoryId, choice));
  const handleVoteInvalid = (categoryId) => update(voteInvalid(state, categoryId));
  const handleReset = () => {
    setState(resetState());
  };
  const handleRefresh = () => {
    setState(loadState());
  };
  const handleMaleNameChange = (value) => {
    setMaleName(value);
    update(setYesNoCandidateName(state, 'dorm_m', value));
  };

  return (
    <Shell
      active="admin"
      title="선거 관리자 페이지"
      description="후보 등록, 번호 선택, 찬반 투표, 무효표 입력을 이 화면에서 처리합니다."
      right={
        <div className="flex gap-2">
          <button type="button" onClick={handleRefresh} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold">
            새로고침
          </button>
          <button type="button" onClick={handleReset} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white">
            전체 초기화
          </button>
        </div>
      }
    >
      <section className="grid gap-4">
        {state.categories.map((category) => {
          const summary = getCategorySummary(category);
          const remaining = getRemainingVotes(category);

          return (
            <section key={category.id} className="rounded-[1.25rem] border border-slate-200 bg-white/85 p-5 shadow-soft backdrop-blur">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-900">{category.label}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {category.mode === 'yesno'
                      ? `찬반 투표 방식입니다. 남은 가능 투표 수 ${remaining}`
                      : `후보를 등록한 뒤 번호 버튼으로 투표합니다. 남은 가능 투표 수 ${remaining}`}
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                  현재 {summary.total}표
                </span>
              </div>

              {category.mode === 'yesno' ? (
                <div className="grid gap-3">
                  <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_auto]">
                    <input
                      value={maleName}
                      onChange={(event) => handleMaleNameChange(event.target.value)}
                      placeholder="남기숙사 후보자 이름"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none ring-0 placeholder:text-slate-400"
                    />
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      현재 대상 후보: <span className="font-semibold text-slate-900">{category.candidateName || '찬반 투표'}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => handleVoteYesNo(category.id, 'yes')} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white">
                        찬성
                      </button>
                      <button type="button" onClick={() => handleVoteYesNo(category.id, 'no')} className="rounded-2xl bg-slate-700 px-4 py-3 text-sm font-semibold text-white">
                        반대
                      </button>
                      <button type="button" onClick={() => handleVoteInvalid(category.id)} className="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white">
                        무효
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-slate-500">
                    찬성 {category.yesVotes} / 반대 {category.noVotes} / 무효 {category.invalidVotes}
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                    <input
                      value={candidateInputs[category.id] || ''}
                      onChange={(event) => setCandidateInputs((prev) => ({ ...prev, [category.id]: event.target.value }))}
                      placeholder="후보자 이름 입력"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none ring-0 placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddCandidate(category.id)}
                      className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
                    >
                      후보 등록
                    </button>
                  </div>

                  <div className="grid gap-3">
                    {category.candidates.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                        등록된 후보가 없습니다. 후보를 먼저 추가하세요.
                      </div>
                    ) : null}

                    {category.candidates.map((candidate, index) => (
                      <div
                        key={candidate.id}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <div className="text-sm font-bold text-slate-900">
                            {index + 1}번 {candidate.name}
                          </div>
                          <div className="text-xs text-slate-500">{candidate.votes}표</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleVoteCandidate(category.id, candidate.id)}
                            className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
                          >
                            {index + 1}번 투표
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                    <span className="text-slate-600">무효표</span>
                    <button
                      type="button"
                      onClick={() => handleVoteInvalid(category.id)}
                      className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white"
                    >
                      무효
                    </button>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </section>
    </Shell>
  );
}
