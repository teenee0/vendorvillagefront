import React, { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import { FaLayerGroup, FaPercentage, FaBalanceScale } from 'react-icons/fa';
import styles from './ExpenseSummaryDashboard.module.css';

const PALETTE = [
  '#059669',
  '#0284c7',
  '#7c3aed',
  '#d97706',
  '#db2777',
  '#4f46e5',
  '#0d9488',
  '#ca8a04',
];

function fmtRub(v) {
  const n = parseFloat(v);
  if (Number.isNaN(n)) return '—';
  return (
    n.toLocaleString('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }) + ' ₽'
  );
}

function pickColors(n) {
  const out = [];
  for (let i = 0; i < n; i += 1) out.push(PALETTE[i % PALETTE.length]);
  return out;
}

/**
 * Диаграммы и краткая аналитика по данным сводки (оплаченные суммы по категориям).
 */
const ExpenseSummaryDashboard = ({ summary, formatAmount, theme = 'light' }) => {
  const doughnutRef = useRef(null);
  const barRef = useRef(null);
  const doughnutInst = useRef(null);
  const barInst = useRef(null);

  const categories = summary?.categories || [];
  const total = parseFloat(summary?.total || 0);

  const sorted = [...categories].sort(
    (a, b) => parseFloat(b.total) - parseFloat(a.total),
  );
  const top = sorted[0];
  const topPct =
    total > 0 && top
      ? ((parseFloat(top.total) / total) * 100).toFixed(1)
      : '0';
  const avgPerCat =
    sorted.length > 0 ? total / sorted.length : 0;

  useEffect(() => {
    if (doughnutInst.current) {
      doughnutInst.current.destroy();
      doughnutInst.current = null;
    }
    if (barInst.current) {
      barInst.current.destroy();
      barInst.current = null;
    }

    const cats = summary?.categories || [];
    const sumTotal = parseFloat(summary?.total || 0);

    if (!cats.length || !doughnutRef.current || !barRef.current) {
      return undefined;
    }

    const labels = cats.map((c) => c.category_name);
    const values = cats.map((c) => parseFloat(c.total) || 0);
    const colors = pickColors(labels.length);

    const commonText = theme === 'dark' ? '#94a3b8' : '#64748b';
    const grid =
      theme === 'dark' ? 'rgba(148, 163, 184, 0.15)' : 'rgba(148, 163, 184, 0.25)';
    const doughnutBorder = theme === 'dark' ? '#1a1d24' : '#fff';

    const ctxD = doughnutRef.current.getContext('2d');
    doughnutInst.current = new Chart(ctxD, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: doughnutBorder,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: commonText,
              boxWidth: 12,
              font: { size: 12 },
            },
          },
          tooltip: {
            callbacks: {
              label(ctx) {
                const v = ctx.raw || 0;
                const pct =
                  sumTotal > 0 ? ((v / sumTotal) * 100).toFixed(1) : '0';
                return `${ctx.label}: ${fmtRub(v)} (${pct}%)`;
              },
            },
          },
        },
      },
    });

    const ctxB = barRef.current.getContext('2d');
    barInst.current = new Chart(ctxB, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: '₽',
            data: values,
            backgroundColor: colors,
            borderRadius: 6,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(ctx) {
                return fmtRub(ctx.raw);
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: grid },
            ticks: { color: commonText, font: { size: 11 } },
          },
          y: {
            grid: { display: false },
            ticks: { color: commonText, font: { size: 11 } },
          },
        },
      },
    });

    return () => {
      if (doughnutInst.current) {
        doughnutInst.current.destroy();
        doughnutInst.current = null;
      }
      if (barInst.current) {
        barInst.current.destroy();
        barInst.current = null;
      }
    };
  }, [summary, theme]);

  if (!categories.length) {
    return null;
  }

  return (
    <div
      className={`${styles.wrap} ${theme === 'dark' ? styles.wrapThemeDark : ''}`}
    >
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statIcon} aria-hidden>
            <FaLayerGroup />
          </span>
          <div>
            <div className={styles.statValue}>{categories.length}</div>
            <div className={styles.statLabel}>категорий с оплатами</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon} aria-hidden>
            <FaPercentage />
          </span>
          <div>
            <div className={styles.statValue}>
              {top ? `${topPct}%` : '—'}
            </div>
            <div className={styles.statLabel}>
              доля крупнейшей{top ? ` (${top.category_name})` : ''}
            </div>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon} aria-hidden>
            <FaBalanceScale />
          </span>
          <div>
            <div className={styles.statValue}>{formatAmount(avgPerCat)}</div>
            <div className={styles.statLabel}>в среднем на категорию</div>
          </div>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Структура затрат</h3>
          <p className={styles.chartHint}>Доля каждой категории в сумме периода</p>
          <div className={styles.chartCanvas}>
            <canvas ref={doughnutRef} />
          </div>
        </div>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Сравнение по суммам</h3>
          <p className={styles.chartHint}>Фактические оплаты по категориям</p>
          <div className={styles.chartCanvasTall}>
            <canvas ref={barRef} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseSummaryDashboard;
