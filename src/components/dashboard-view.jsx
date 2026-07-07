'use client';

import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { getCategorySummary, getWinnerKeys } from '@/lib/election-core';
import { useElectionState as useElectionClientState } from '@/lib/election-client';

const valueLabelPlugin = {
  id: 'valueLabelPlugin',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    ctx.save();
    ctx.fillStyle = '#166534';
    ctx.font = '700 12px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      meta.data.forEach((bar, index) => {
        const value = dataset.data[index];
        const y = bar.y - 6;
        ctx.fillText(String(value), bar.x, y);
      });
    });

    ctx.restore();
  },
};

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);
ChartJS.register(valueLabelPlugin);

function useElectionState() {
  const [state] = useElectionClientState();
  return state;
}

function buildChartData(category) {
  const winnerKeys = getWinnerKeys(category);

  if (category.mode === 'yesno') {
    const labels = [category.candidateName || '찬성', '반대'];
    const data = [category.yesVotes, category.noVotes];
    const colors = labels.map((label, index) => {
      const isWinner =
        (index === 0 && winnerKeys.includes('yes')) ||
        (index === 1 && winnerKeys.includes('no'));
      return isWinner ? 'rgba(22, 163, 74, 0.92)' : 'rgba(134, 239, 172, 0.9)';
    });

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderColor: colors.map(() => 'rgba(21, 128, 61, 1)'),
          borderWidth: 1,
          borderRadius: 0,
          borderSkipped: false,
          barPercentage: 0.6,
          categoryPercentage: 0.65,
        },
      ],
    };
  }

  const labels = category.candidates.map((candidate) => candidate.name || '무명 후보');
  const data = category.candidates.map((candidate) => candidate.votes);

  return {
    labels,
    datasets: [
      {
        data,
        backgroundColor: labels.map((_, index) => {
          const candidate = category.candidates[index];
          const isWinner = winnerKeys.includes(candidate?.id);
          return isWinner ? 'rgba(22, 163, 74, 0.92)' : 'rgba(134, 239, 172, 0.88)';
        }),
        borderColor: 'rgba(21, 128, 61, 1)',
        borderWidth: 1,
        borderRadius: 0,
        borderSkipped: false,
        barPercentage: 0.6,
        categoryPercentage: 0.65,
      },
    ],
  };
}

function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 350,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        titleColor: '#fff',
        bodyColor: '#fff',
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#475569',
          font: {
            size: 12,
            weight: '600',
          },
          maxRotation: 0,
          minRotation: 0,
        },
      },
      y: {
        beginAtZero: true,
        max: 197,
        ticks: {
          stepSize: 20,
          color: '#64748b',
          font: {
            size: 11,
          },
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.18)',
        },
        border: {
          display: false,
        },
      },
    },
  };
}

function CandidateChart({ category }) {
  const data = buildChartData(category);
  const options = chartOptions();
  const summary = getCategorySummary(category);
  const winnerKeys = getWinnerKeys(category);
  const winnerLabel =
    category.mode === 'yesno'
      ? winnerKeys.includes('yes')
        ? category.candidateName || '찬성'
        : winnerKeys.includes('no')
          ? '반대'
          : null
      : category.candidates.find((candidate) => winnerKeys.includes(candidate.id))?.name || null;

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-emerald-100 bg-white p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-sm font-bold tracking-tight text-slate-900 md:text-[15px]">{category.label}</div>
        <div className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">총 {summary.total}표</div>
      </div>
      <div className="mx-auto min-h-0 flex-1 w-[84%]">
        <Bar data={data} options={options} />
      </div>
      {winnerLabel ? (
        <div className="mt-1 flex justify-end">
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-900 ring-1 ring-emerald-200">
            현재 1위: {winnerLabel}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export default function DashboardView() {
  const state = useElectionState();
  const topRow = state.categories.slice(0, 2);
  const bottomRow = state.categories.slice(2);

  return (
    <main className="h-screen overflow-hidden p-2 md:p-3">
      <section className="grid h-[calc(100vh-1rem)] grid-rows-[1fr_1fr] gap-2 md:h-[calc(100vh-1.5rem)] md:gap-3">
        <div className="grid min-h-0 gap-2 md:grid-cols-2 md:gap-3">
          {topRow.map((category) => (
            <section key={category.id} className="min-h-0 overflow-hidden rounded-[1rem] border border-emerald-100 bg-white/85 p-2 shadow-soft backdrop-blur">
              <CandidateChart category={category} />
            </section>
          ))}
        </div>
        <div className="grid min-h-0 gap-2 md:grid-cols-3 md:gap-3">
          {bottomRow.map((category) => (
            <section key={category.id} className="min-h-0 overflow-hidden rounded-[1rem] border border-emerald-100 bg-white/85 p-2 shadow-soft backdrop-blur">
              <CandidateChart category={category} />
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
