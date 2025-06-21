import { useRef, useEffect } from 'react';
import styles from './BusinessMainPage.module.css';
import { Chart } from 'chart.js/auto';

const BusinessMainPage = () => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Инициализация графика
  useEffect(() => {
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext('2d');
    
    // Уничтожаем предыдущий график если он существует
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Создаем новый график
    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн'],
        datasets: [{
          label: 'Продажи ($)',
          data: [12000, 19000, 15000, 22000, 25000, 30000],
          borderColor: '#2daf9f',
          backgroundColor: 'rgba(45, 175, 159, 0.1)',
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: 'rgba(255, 255, 255, 0.1)' } },
          x: { grid: { display: false } }
        }
      }
    });

    // Очистка при размонтировании компонента
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, []);

  return (
    <div className={styles.app}>
      {/* Main Content */}
      <main className={styles.mainContent}>
        <h3 className={styles.pageTitle}>
          <i className={`fas fa-tachometer-alt ${styles.icon}`}></i>Главная панель
        </h3>
        
        {/* Stats Cards */}
        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} ${styles.success}`}>
            <h6>Общий доход</h6>
            <h3>$124,590</h3>
            <span className={styles.success}>
              <i className={`fas fa-arrow-up ${styles.icon}`}></i>12%
            </span>
          </div>
          
          <div className={`${styles.statCard} ${styles.warning}`}>
            <h6>Новые клиенты</h6>
            <h3>1,240</h3>
            <span className={styles.warning}>
              <i className={`fas fa-arrow-up ${styles.icon}`}></i>5%
            </span>
          </div>
          
          <div className={`${styles.statCard} ${styles.success}`}>
            <h6>Заказы</h6>
            <h3>856</h3>
            <span className={styles.success}>
              <i className={`fas fa-arrow-up ${styles.icon}`}></i>8%
            </span>
          </div>
          
          <div className={`${styles.statCard} ${styles.danger}`}>
            <h6>Возвраты</h6>
            <h3>32</h3>
            <span className={styles.danger}>
              <i className={`fas fa-arrow-down ${styles.icon}`}></i>2%
            </span>
          </div>
        </div>

        {/* Charts & Recent Activity */}
        <div className={styles.contentRow}>
          <div className={styles.chartContainer}>
            <h5>Продажи за месяц</h5>
            <canvas ref={chartRef} height="250"></canvas> {/* Исправлено здесь */}
          </div>
          
          <div className={styles.transactions}>
            <h5>Последние транзакции</h5>
            <div className={styles.transactionList}>
              <div className={styles.transactionItem}>
                <div className={styles.transactionHeader}>
                  <span>#ORD-5842</span>
                  <span className={styles.success}>+$1,250</span>
                </div>
                <small>2 часа назад</small>
              </div>
              
              <div className={styles.transactionItem}>
                <div className={styles.transactionHeader}>
                  <span>#ORD-5841</span>
                  <span className={styles.success}>+$890</span>
                </div>
                <small>5 часов назад</small>
              </div>
              
              <div className={styles.transactionItem}>
                <div className={styles.transactionHeader}>
                  <span>#ORD-5840</span>
                  <span className={styles.danger}>-$320</span>
                </div>
                <small>Вчера</small>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Projects */}
        <div className={styles.projects}>
          <div className={styles.projectsHeader}>
            <h5>Активные проекты</h5>
            <button className={styles.goldButton}>+ Добавить</button>
          </div>
          
          <div className={styles.tableContainer}>
            <table className={styles.projectsTable}>
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Ответственный</th>
                  <th>Статус</th>
                  <th>Прогресс</th>
                  <th>Дедлайн</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Запуск маркетплейса</td>
                  <td>Иван Петров</td>
                  <td><span className={`${styles.badge} ${styles.success}`}>В работе</span></td>
                  <td>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{width: '75%'}}></div>
                    </div>
                  </td>
                  <td>15.07.2023</td>
                </tr>
                
                <tr>
                  <td>Ребрендинг</td>
                  <td>Анна Смирнова</td>
                  <td><span className={`${styles.badge} ${styles.warning}`}>На паузе</span></td>
                  <td>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFillWarning} style={{width: '30%'}}></div>
                    </div>
                  </td>
                  <td>30.08.2023</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BusinessMainPage;