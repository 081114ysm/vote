'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  addCandidate,
  createDefaultState,
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

const BAR_COLORS = ['#f9685d', '#1fab54', '#11accd', '#ca337c', '#aa87ff'];

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

function Shell({ children, onReset }) {
  return (
    <main className="mx-auto w-[min(1440px,calc(100%-24px))] py-5 md:w-[min(1440px,calc(100%-32px))] md:py-6">
      <header className="mb-5 flex flex-col gap-4 rounded-[1.4rem] border border-slate-200 bg-white/85 p-4 shadow-soft backdrop-blur md:flex-row md:items-center md:justify-between md:p-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">선거 집계</h1>
          <p className="mt-1 text-sm text-slate-600">
            관리 기능과 그래프를 한 페이지에 넣고, 그래프는 `sitckgraph.svg` 느낌으로 단순하게 그렸습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className="rounded-full border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            집계
          </Link>
          <button
            type="button"
            onClick={onReset}
            className="rounded-full border border-rose-200 bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
          >
            전체 초기화
          </button>
        </div>
      </header>
      {children}
    </main>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{value}</div>
    </div>
  );
}

function CandidateChart({ category }) {
  const winnerKeys = getWinnerKeys(category);
  const summary = getCategorySummary(category);
  const bars =
    category.mode === 'yesno'
      ? [
          { key: 'yes', label: category.candidateName || '찬성', votes: category.yesVotes },
          { key: 'no', label: '반대', votes: category.noVotes },
          { key: 'invalid', label: '무효', votes: category.invalidVotes, invalid: true },
        ]
      : [
          ...category.candidates.map((candidate) => ({
            key: candidate.id,
            label: candidate.name,
            votes: candidate.votes,
          })),
          { key: 'invalid', label: '무효', votes: category.invalidVotes, invalid: true },
        ];

  const chartWidth = 333;
  const chartHeight = 310;
  const plotTop = 20;
  const plotBottom = 260;
  const plotLeft = 50;
  const plotRight = 330;
  const plotHeight = plotBottom - plotTop;
  const plotWidth = plotRight - plotLeft;
  const step = plotHeight / 10;
  const barStep = bars.length > 0 ? plotWidth / bars.length : plotWidth;
  const barWidth = Math.min(36, barStep * 0.48);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        막대 그래프
      </div>
      <div className="p-3">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-[290px] w-full">
          {Array.from({ length: 11 }, (_, index) => {
            const y = 260 - index * step;
            return (
              <g key={index}>
                <line x1={50} y1={y} x2={330} y2={y} stroke="#000" strokeOpacity="0.18" />
                <text x={42} y={y + 4} textAnchor="end" fontSize="10" fill="#64748b">
                  {197 - Math.round((197 / 10) * index)}
                </text>
              </g>
            );
          })}

          <line x1={50} y1={260} x2={330} y2={260} stroke="#000" strokeWidth="2" />
          <line x1={50} y1={260} x2={50} y2={20} stroke="#000" strokeWidth="2" />

          {bars.map((bar, index) => {
            const xCenter = plotLeft + barStep * index + barStep / 2;
            const height = Math.max(6, (bar.votes / 197) * plotHeight);
            const y = 260 - height;
            const x = xCenter - barWidth / 2;
            const color = bar.invalid ? '#c7a007' : BAR_COLORS[index % BAR_COLORS.length];
            const isWinner = winnerKeys.includes(bar.key);

            return (
              <g key={bar.key}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={height}
                  fill={color}
                  stroke={isWinner && !bar.invalid ? '#111827' : 'none'}
                  strokeWidth={isWinner && !bar.invalid ? 2 : 0}
                  rx="0"
                />
                <text x={xCenter} y={y - 8} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0f172a">
                  {bar.votes}
                </text>
                <text x={xCenter} y={278} textAnchor="middle" fontSize="10" fill="#0f172a">
                  {bar.label}
                </text>
                {isWinner && !bar.invalid ? (
                  <text x={xCenter} y={292} textAnchor="middle" fontSize="10" fontWeight="700" fill="#059669">
                    1위
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
        현재 {summary.total}표 · 남은 가능 투표 수 {getRemainingVotes(category)} / 197
      </div>
    </div>
  );
}

function CategoryPanel({ category, state, update, candidateInputs, setCandidateInputs, maleName, setMaleName }) {
  const summary = getCategorySummary(category);

  const handleAddCandidate = () => {
    const name = candidateInputs[category.id] || '';
    if (!name.trim()) return;
    update(addCandidate(state, category.id, name));
    setCandidateInputs((prev) => ({ ...prev, [category.id]: '' }));
  };

  const handleVoteInvalid = () => update(voteInvalid(state, category.id));

  return (
    <section className="rounded-[1.4rem] border border-slate-200 bg-white/85 p-4 shadow-soft backdrop-blur md:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">{category.label}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {category.mode === 'yesno' ? '찬반 투표' : '후보 등록 후 번호 투표'} · 현재 {summary.total}표
          </p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">실시간</span>
      </div>

      <CandidateChart category={category} />

      <div className="mt-4 grid gap-3">
        {category.mode === 'yesno' ? (
          <div className="grid gap-3">
            <input
              value={maleName}
              onChange={(event) => setMaleName(event.target.value)}
              onBlur={() => update(setYesNoCandidateName(state, category.id, maleName))}
              placeholder="남기숙사 후보자 이름"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => update(voteYesNo(state, category.id, 'yes'))}
                className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
              >
                찬성
              </button>
              <button
                type="button"
                onClick={() => update(voteYesNo(state, category.id, 'no'))}
                className="rounded-2xl bg-slate-700 px-4 py-3 text-sm font-semibold text-white"
              >
                반대
              </button>
              <button
                type="button"
                onClick={handleVoteInvalid}
                className="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white"
              >
                무효
              </button>
            </div>
            <div className="text-sm text-slate-500">
              찬성 {category.yesVotes} / 반대 {category.noVotes} / 무효 {category.invalidVotes}
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-[1fr_170px]">
              <input
                value={candidateInputs[category.id] || ''}
                onChange={(event) => setCandidateInputs((prev) => ({ ...prev, [category.id]: event.target.value }))}
                placeholder="후보자 이름 입력"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400"
              />
              <button type="button" onClick={handleAddCandidate} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
                후보 등록
              </button>
            </div>

            <div className="grid gap-2">
              {category.candidates.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  등록된 후보가 없습니다. 후보를 먼저 추가하세요.
                </div>
              ) : null}

              {category.candidates.map((candidate, index) => (
                <div
                  key={candidate.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:flex-row md:items-center md:justify-between"
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
                      onClick={() => update(voteCandidate(state, category.id, candidate.id))}
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
              <button type="button" onClick={handleVoteInvalid} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white">
                무효
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function VotingBoard() {
  const [state, update, setState] = useElectionState();
  const [candidateInputs, setCandidateInputs] = useState({});
  const [maleName, setMaleName] = useState('');

  useEffect(() => {
    const maleCategory = state.categories.find((category) => category.id === 'dorm_m');
    setMaleName(maleCategory?.candidateName || '');
  }, [state]);

  const totalVotes = state.categories.reduce((sum, category) => sum + getCategorySummary(category).total, 0);
  const invalidVotes = state.categories.reduce((sum, category) => sum + getCategorySummary(category).invalid, 0);

  const handleReset = () => {
    setState(resetState());
  };

  const topRow = state.categories.slice(0, 2);
  const bottomRow = state.categories.slice(2);

  return (
    <Shell onReset={handleReset}>
      <section className="rounded-[1.4rem] border border-slate-200 bg-white/85 p-4 shadow-soft backdrop-blur md:p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <StatCard label="누적 투표 수" value={totalVotes} />
          <StatCard label="무효표" value={invalidVotes} />
          <StatCard label="최대 인원" value={197} />
        </div>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2">
        {topRow.map((category) => (
          <CategoryPanel
            key={category.id}
            category={category}
            state={state}
            update={update}
            candidateInputs={candidateInputs}
            setCandidateInputs={setCandidateInputs}
            maleName={maleName}
            setMaleName={setMaleName}
          />
        ))}
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-3">
        {bottomRow.map((category) => (
          <CategoryPanel
            key={category.id}
            category={category}
            state={state}
            update={update}
            candidateInputs={candidateInputs}
            setCandidateInputs={setCandidateInputs}
            maleName={maleName}
            setMaleName={setMaleName}
          />
        ))}
      </section>
    </Shell>
  );
}
