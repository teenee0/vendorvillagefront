import React, { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import styles from './AnimatedChart.module.css';

const AnimatedChart = ({ data, title, height = 300 }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!data || !chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    const chartData = data;
    
    console.log('AnimatedChart: Creating chart with data', chartData);

    const labels = chartData.map(item => dayjs(item.date).format('DD MMM'));
    const revenueData = chartData.map(item => parseFloat(item.amount || 0));
    const ordersData = chartData.map(item => parseInt(item.orders || 0));
    const variantsData = chartData.map(item => parseInt(item.variants || 0));
    const refundData = chartData.map(item => parseFloat(item.refund_amount || 0));

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Доход (₸)',
            data: revenueData,
            borderColor: '#2daf9f',
            backgroundColor: 'rgba(45, 175, 159, 0.1)',
            tension: 0.4,
            yAxisID: 'y',
            pointBackgroundColor: '#2daf9f',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: 'Заказы',
            data: ordersData,
            borderColor: '#ff9f40',
            backgroundColor: 'rgba(255, 159, 64, 0.1)',
            borderDash: [5, 5],
            tension: 0.3,
            yAxisID: 'y1',
            pointBackgroundColor: '#ff9f40',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: 'Проданные товары',
            data: variantsData,
            borderColor: '#9966ff',
            backgroundColor: 'rgba(153, 102, 255, 0.1)',
            borderDash: [5, 5],
            tension: 0.3,
            yAxisID: 'y1',
            pointBackgroundColor: '#9966ff',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: 'Возвраты (₸)',
            data: refundData,
            borderColor: '#ff4757',
            backgroundColor: 'rgba(255, 71, 87, 0.1)',
            borderDash: [10, 5],
            tension: 0.3,
            yAxisID: 'y',
            pointBackgroundColor: '#ff4757',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 2000,
          easing: 'easeInOutQuart'
        },
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#ffffff',
              font: {
                family: 'inherit',
                size: 12
              },
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: '#2daf9f',
            borderWidth: 1,
            cornerRadius: 8,
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.datasetIndex === 0 || context.datasetIndex === 3) {
                  label += context.parsed.y.toLocaleString('ru-RU') + ' ₸';
                } else {
                  label += context.parsed.y.toLocaleString('ru-RU');
                }
                return label;
              }
            }
          }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            grid: { 
              color: 'rgba(255, 255, 255, 0.1)',
              drawBorder: false
            },
            beginAtZero: true,
            ticks: {
              color: '#2daf9f',
              font: { size: 10 },
              callback: function (value) {
                return value.toLocaleString('ru-RU') + ' ₸';
              }
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: { 
              drawOnChartArea: false,
              drawBorder: false
            },
            beginAtZero: true,
            ticks: {
              color: '#ff9f40',
              font: { size: 10 },
              callback: function (value) {
                return value.toLocaleString('ru-RU');
              }
            }
          },
          x: {
            grid: { 
              display: false,
              drawBorder: false
            },
            ticks: {
              color: '#ffffff',
              font: { size: 10 }
            }
          }
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  // Если нет данных, показываем сообщение
  if (!data || data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={styles.chartContainer}
      >
        {title && (
          <h5 className={styles.chartTitle}>
            {title}
          </h5>
        )}
        <div className={styles.noDataMessage}>
          <p>Нет данных для отображения графика</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={styles.chartContainer}
    >
      {title && (
        <h5 className={styles.chartTitle}>
          {title}
        </h5>
      )}
      <div className={styles.chartWrapper} style={{ height }}>
        <canvas ref={chartRef}></canvas>
      </div>
    </motion.div>
  );
};

export default AnimatedChart;
