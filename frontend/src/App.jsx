import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Loader2, Rocket, Crown, Shield, Star, Target, TrendingUp, Activity, Layers, Wallet, PieChart, BarChart3, LineChart } from 'lucide-react';
import { optimizePortfolio } from './api';

function App() {
  const [assets, setAssets] = useState([
    { name: 'AAPL', ret: 0.15, risk: 0.25 },
    { name: 'GOOGL', ret: 0.12, risk: 0.22 },
    { name: 'MSFT', ret: 0.14, risk: 0.20 }
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const generateCovMatrix = () => {
    const n = assets.length;
    const cov = Array(n).fill().map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const correlation = i === j ? 1 : 0.3;
        cov[i][j] = correlation * assets[i].risk * assets[j].risk;
      }
    }
    return cov;
  };

  const handleOptimize = async () => {
    setLoading(true);
    setTimeout(async () => {
      try {
        const expectedReturns = assets.map(a => a.ret);
        const covMatrix = generateCovMatrix();
        const assetNames = assets.map(a => a.name);

        const data = await optimizePortfolio(expectedReturns, covMatrix, assetNames);
        setResult(data);
      } catch (error) {
        alert('Ошибка оптимизации: ' + error.message);
      } finally {
        setLoading(false);
      }
    }, 800);
  };

  const addAsset = () => {
    if (assets.length < 8) {
      setAssets([...assets, { name: `Asset ${assets.length + 1}`, ret: 0.10, risk: 0.18 }]);
    }
  };

  const updateAsset = (index, field, value) => {
    const newAssets = [...assets];
    newAssets[index][field] = field === 'name' ? value : parseFloat(value);
    setAssets(newAssets);
  };

  const removeAsset = (index) => {
    setAssets(assets.filter((_, i) => i !== index));
  };

  const totalReturn = assets.reduce((sum, a) => sum + a.ret, 0) / assets.length;
  const totalRisk = assets.reduce((sum, a) => sum + a.risk, 0) / assets.length;


  // Компонент графика эффективной границы
  const EfficientFrontierChart = ({ frontier, maxSharpe, minRisk }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    
    // Функция отрисовки графика
    const drawChart = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container || !frontier || frontier.length === 0) return;
      
      // Получаем реальные размеры контейнера
      const containerWidth = container.clientWidth;
      const containerHeight = 280; // Фиксированная высота
      
      // Устанавливаем размеры canvas
      canvas.width = containerWidth;
      canvas.height = containerHeight;
      
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);
      
      const risks = frontier.map(p => p.risk * 100);
      const returns = frontier.map(p => p.returns * 100);
      const minRiskVal = Math.min(...risks, 0);
      const maxRiskVal = Math.max(...risks, (maxSharpe?.risk * 100) || 0, (minRisk?.risk * 100) || 0);
      const minReturnVal = Math.min(...returns, 0);
      const maxReturnVal = Math.max(...returns, (maxSharpe?.returns * 100) || 0, (minRisk?.returns * 100) || 0);
      
      // Адаптивные отступы в зависимости от ширины
      const padding = { 
        left: Math.max(35, width * 0.08), 
        right: Math.max(15, width * 0.03), 
        top: 20, 
        bottom: 35 
      };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;
      
      const toX = (risk) => padding.left + (risk - minRiskVal) / (maxRiskVal - minRiskVal) * chartWidth;
      const toY = (ret) => padding.top + chartHeight - (ret - minReturnVal) / (maxReturnVal - minReturnVal) * chartHeight;
      
      // Сетка
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= 4; i++) {
        const x = padding.left + (i / 4) * chartWidth;
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartHeight);
        ctx.stroke();
        
        const y = padding.top + (i / 4) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();
      }
      
      // Оси
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top);
      ctx.lineTo(padding.left, padding.top + chartHeight);
      ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
      ctx.stroke();
      
      // Подписи осей
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px Inter';
      ctx.fillText('Риск (%)', padding.left + chartWidth / 2 - 25, padding.top + chartHeight + 22);
      ctx.save();
      ctx.translate(15, padding.top + chartHeight / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Доходность (%)', -25, 0);
      ctx.restore();
      
      // Рисуем эффективную границу
      if (frontier.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
        for (let i = 0; i < frontier.length; i++) {
          const x = toX(risks[i]);
          const y = toY(returns[i]);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      
      const pointSize = Math.max(2, Math.min(4, width / 120));
      ctx.fillStyle = '#3b82f6';
      for (let i = 0; i < frontier.length; i++) {
        const x = toX(risks[i]);
        const y = toY(returns[i]);
        ctx.beginPath();
        ctx.arc(x, y, pointSize, 0, 2 * Math.PI);
        ctx.fill();
      }
      
      if (maxSharpe) {
        const x = toX(maxSharpe.risk * 100);
        const y = toY(maxSharpe.returns * 100);
        const markerSize = Math.max(5, Math.min(8, width / 70));
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(x, y, markerSize, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(x, y, markerSize / 2, 0, 2 * Math.PI);
        ctx.fill();
      }
      
      if (minRisk) {
        const x = toX(minRisk.risk * 100);
        const y = toY(minRisk.returns * 100);
        const markerSize = Math.max(5, Math.min(8, width / 70));
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(x, y, markerSize, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(x, y, markerSize / 2, 0, 2 * Math.PI);
        ctx.fill();
      }
    };
    
    // Отрисовка при монтировании и изменении размера окна
    useEffect(() => {
      drawChart();
      window.addEventListener('resize', drawChart);
      return () => window.removeEventListener('resize', drawChart);
    }, [frontier, maxSharpe, minRisk]);
    
    // Перерисовка при изменении размера контейнера
    useEffect(() => {
      const resizeObserver = new ResizeObserver(() => drawChart());
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }
      return () => resizeObserver.disconnect();
    }, [frontier, maxSharpe, minRisk]);
    
    return (
      <div ref={containerRef} style={{ width: '100%', minHeight: '280px' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '280px', background: 'white', borderRadius: '12px' }}
        />
      </div>
    );
  };
  
  const PieChartComponent = ({ weights, assetsList, title }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];
    
    const drawChart = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container || !weights || weights.length === 0) return;
      
      const containerWidth = container.clientWidth;
      const containerHeight = 250;
      
      canvas.width = containerWidth;
      canvas.height = containerHeight;
      
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2 - 15;
      const radius = Math.min(width, height) / 2 - 40;
      
      ctx.clearRect(0, 0, width, height);
      
      let startAngle = -Math.PI / 2;
      const total = weights.reduce((sum, w) => sum + w, 0);
      
      for (let i = 0; i < weights.length; i++) {
        const angle = (weights[i] / total) * 2 * Math.PI;
        const endAngle = startAngle + angle;
        
        ctx.beginPath();
        ctx.fillStyle = colors[i % colors.length];
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.fill();
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        const midAngle = startAngle + angle / 2;
        const textX = centerX + Math.cos(midAngle) * (radius * 0.65);
        const textY = centerY + Math.sin(midAngle) * (radius * 0.65);
        const percent = ((weights[i] / total) * 100).toFixed(1);
        
        if (parseFloat(percent) > 5 && width > 200) {
          ctx.fillStyle = 'white';
          ctx.font = `bold ${Math.max(9, Math.min(11, width / 35))}px Inter`;
          ctx.shadowBlur = 0;
          ctx.fillText(`${percent}%`, textX - 10, textY + 4);
        }
        
        startAngle = endAngle;
      }
      
      // Легенда внизу
      let legendX = 10;
      let legendY = height - 45;
      for (let i = 0; i < Math.min(weights.length, 4); i++) {
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(legendX, legendY, 10, 10);
        ctx.fillStyle = '#374151';
        ctx.font = `${Math.max(8, Math.min(10, width / 45))}px Inter`;
        ctx.fillText(`${assetsList[i]?.name || `A${i+1}`}`, legendX + 14, legendY + 9);
        legendX += 65;
        if (legendX > width - 65 && i < weights.length - 1) {
          legendX = 10;
          legendY += 16;
        }
      }
    };
    
    useEffect(() => {
      drawChart();
      window.addEventListener('resize', drawChart);
      return () => window.removeEventListener('resize', drawChart);
    }, [weights, assetsList]);
    
    useEffect(() => {
      const resizeObserver = new ResizeObserver(() => drawChart());
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }
      return () => resizeObserver.disconnect();
    }, [weights, assetsList]);
    
    return (
      <div ref={containerRef} style={{ width: '100%' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#1f2937', textAlign: 'center' }}>{title}</h3>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '250px', background: 'white', borderRadius: '12px' }}
        />
      </div>
    );
  };
  
  const ComparisonChart = ({ maxSharpe, minRisk }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    
    const drawChart = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container || !maxSharpe || !minRisk) return;
      
      const containerWidth = container.clientWidth;
      const containerHeight = 250;
      
      canvas.width = containerWidth;
      canvas.height = containerHeight;
      
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);
      
      const categories = ['Доходность', 'Риск', 'Шарп'];
      const maxSharpeValues = [
        maxSharpe.returns * 100,
        maxSharpe.risk * 100,
        maxSharpe.sharpe * 1.5
      ];
      const minRiskValues = [
        minRisk.returns * 100,
        minRisk.risk * 100,
        minRisk.sharpe * 1.5
      ];
      
      const maxValue = Math.max(...maxSharpeValues, ...minRiskValues);
      
      // Адаптивная ширина столбцов
      const categorySpacing = width / 4;
      const barWidth = Math.min(35, categorySpacing * 0.3);
      const startX = categorySpacing - barWidth;
      
      for (let i = 0; i < categories.length; i++) {
        const x = startX + i * categorySpacing;
        
        const maxSharpeHeight = (maxSharpeValues[i] / maxValue) * 140;
        ctx.fillStyle = '#10b981';
        ctx.fillRect(x, height - 55 - maxSharpeHeight, barWidth, maxSharpeHeight);
        
        const minRiskHeight = (minRiskValues[i] / maxValue) * 140;
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(x + barWidth + 5, height - 55 - minRiskHeight, barWidth, minRiskHeight);
        
        ctx.fillStyle = '#374151';
        ctx.font = `${Math.max(9, Math.min(11, width / 45))}px Inter`;
        ctx.fillText(categories[i], x + barWidth/2 - 12, height - 38);
        
        ctx.fillStyle = '#10b981';
        ctx.font = `bold ${Math.max(8, Math.min(10, width / 50))}px Inter`;
        ctx.fillText(maxSharpeValues[i].toFixed(1), x + barWidth/2 - 10, height - 57 - maxSharpeHeight);
        
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(minRiskValues[i].toFixed(1), x + barWidth + 5 + barWidth/2 - 10, height - 57 - minRiskHeight);
      }
      
      // Легенда
      const legendX = width - 95;
      ctx.fillStyle = '#10b981';
      ctx.fillRect(legendX, 12, 12, 12);
      ctx.fillStyle = '#374151';
      ctx.font = `${Math.max(8, Math.min(10, width / 50))}px Inter`;
      ctx.fillText('Макс. Шарп', legendX + 16, 22);
      
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(legendX, 32, 12, 12);
      ctx.fillStyle = '#374151';
      ctx.fillText('Мин. Риск', legendX + 16, 42);
    };
    
    useEffect(() => {
      drawChart();
      window.addEventListener('resize', drawChart);
      return () => window.removeEventListener('resize', drawChart);
    }, [maxSharpe, minRisk]);
    
    useEffect(() => {
      const resizeObserver = new ResizeObserver(() => drawChart());
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }
      return () => resizeObserver.disconnect();
    }, [maxSharpe, minRisk]);
    
    return (
      <div ref={containerRef} style={{ width: '100%' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#1f2937', textAlign: 'center' }}>Сравнение портфелей</h3>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '250px', background: 'white', borderRadius: '12px' }}
        />
      </div>
    );
  };

  const styles = {
    container: {
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #f0fdf4 100%)',
      overflow: 'auto',
      position: 'fixed',
      top: 0,
      left: 0,
    },
    content: {
      width: '100%',
      minHeight: '100vh',
      padding: '30px 40px',
      position: 'relative',
    },
    header: {
      textAlign: 'center',
      marginBottom: '30px',
    },
    iconWrapper: {
      display: 'inline-block',
      marginBottom: '15px',
    },
    iconBox: {
      background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
      padding: '12px',
      borderRadius: '50%',
      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
    },
    title: {
      fontSize: '48px',
      fontWeight: 'bold',
      marginBottom: '10px',
      background: 'linear-gradient(135deg, #2563eb, #0891b2, #2563eb)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    subtitle: {
      fontSize: '16px',
      color: '#6b7280',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '20px',
      marginBottom: '30px',
      maxWidth: '900px',
      margin: '0 auto 30px auto',
    },
    statCard: {
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
      border: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statValue: {
      fontSize: '32px',
      fontWeight: 'bold',
      color: '#1f2937',
    },
    mainGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '24px',
      width: '100%',
    },
    card: {
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
      border: '1px solid #f3f4f6',
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
    },
    cardTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    cardTitleText: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#1f2937',
    },
    addButton: {
      background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
      color: 'white',
      border: 'none',
      padding: '8px 16px',
      borderRadius: '8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      fontWeight: '500',
    },
    assetItem: {
      background: '#f9fafb',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '12px',
      border: '1px solid #e5e7eb',
    },
    assetHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px',
    },
    assetInput: {
      background: 'transparent',
      border: 'none',
      borderBottom: '2px solid #e5e7eb',
      fontSize: '18px',
      fontWeight: '600',
      color: '#1f2937',
      width: '100px',
      outline: 'none',
    },
    deleteButton: {
      background: 'none',
      border: 'none',
      color: '#f87171',
      cursor: 'pointer',
    },
    inputGroup: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px',
    },
    label: {
      fontSize: '14px',
      color: '#6b7280',
      marginBottom: '4px',
      display: 'block',
    },
    numberInput: {
      width: '100%',
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '8px 12px',
      fontSize: '14px',
      outline: 'none',
    },
    optimizeButton: {
      width: '100%',
      marginTop: '24px',
      background: 'linear-gradient(135deg, #2563eb, #0891b2)',
      color: 'white',
      border: 'none',
      padding: '12px',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
    },
    resultCard: {
      background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '16px',
      border: '1px solid #a7f3d0',
    },
    resultCardBlue: {
      background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '16px',
      border: '1px solid #bfdbfe',
    },
    resultTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '12px',
    },
    resultGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '16px',
      marginBottom: '16px',
      textAlign: 'center',
    },
    resultValue: {
      fontSize: '24px',
      fontWeight: 'bold',
    },
    weightBadge: {
      background: 'white',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '14px',
      marginRight: '8px',
      marginBottom: '8px',
      display: 'inline-block',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: '#9ca3af',
    },
    footer: {
      textAlign: 'center',
      marginTop: '40px',
      paddingBottom: '20px',
      color: '#9ca3af',
      fontSize: '14px',
    },
    assetList: {
      maxHeight: '450px',
      overflowY: 'auto',
    },
    scrollArea: {
      maxHeight: '450px',
      overflowY: 'auto',
    }
  };

  return (
    <div style = {styles.container}>
      <div style = {styles.content}>

        {/* Шапка */}
        <div style = {styles.header}>
          <div style = {styles.iconWrapper}>
            <div style = {styles.iconBox}>
              <Wallet size = {32} color = "white" />
            </div>
          </div>
          <h1 style = {styles.title}>Портфельный Оптимизатор</h1>
          <p style = {styles.subtitle}><b>Построение эффективной границы Марковица с помощью современных алгоритмов оптимизации</b></p>
        </div>

        {/* Статистика */}
        <div style = {styles.statsGrid}>
          <div style = {styles.statCard}>
            <div>
              <p style = {{ color: '#9ca3af', fontSize: '14px' }}>Активов в портфеле</p>
              <p style = {styles.statValue}>{assets.length}</p>
            </div>
            <div style = {{ background: '#dbeafe', padding: '8px', borderRadius: '50%' }}>
              <Layers size = {20} color = "#3b82f6" />
            </div>
          </div>
          <div style = {styles.statCard}>
            <div>
              <p style = {{ color: '#9ca3af', fontSize: '14px' }}>Средняя доходность</p>
              <p style = {{ ...styles.statValue, color: '#059669' }}>{(totalReturn * 100).toFixed(1)}%</p>
            </div>
            <div style = {{ background: '#d1fae5', padding: '8px', borderRadius: '50%' }}>
              <TrendingUp size = {20} color = "#059669" />
            </div>
          </div>
          <div style = {styles.statCard}>
            <div>
              <p style = {{ color: '#9ca3af', fontSize: '14px' }}>Средний риск</p>
              <p style = {{ ...styles.statValue, color: '#ea580c' }}>{(totalRisk * 100).toFixed(1)}%</p>
            </div>
            <div style = {{ background: '#ffedd5', padding: '8px', borderRadius: '50%' }}>
              <Activity size = {20} color = "#ea580c" />
            </div>
          </div>
        </div>

        <div style = {styles.mainGrid}>

          {/* Левая панель */}
          <div style = {styles.card}>
            <div style = {styles.cardHeader}>
              <div style = {styles.cardTitle}>
                {/* <div style = {{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', padding: '8px', borderRadius: '12px' }}>
                  <PieChart size = {20} color = "white" />
                </div> */}
                <span style = {styles.cardTitleText}>Ваши активы</span>
              </div>
              <button onClick = {addAsset} disabled={assets.length >= 8} style = {styles.addButton}>
                <Plus size = {16} /> Добавить актив
              </button>
            </div>

            <div style = {styles.scrollArea}>
              {assets.map((asset, idx) => (
                <div key = {idx} style={styles.assetItem}>
                  <div style = {styles.assetHeader}>
                    <input
                      type = "text"
                      value = {asset.name}
                      onChange = {(e) => updateAsset(idx, 'name', e.target.value)}
                      style = {styles.assetInput}
                    />
                    <button onClick = {() => removeAsset(idx)} style={styles.deleteButton}>
                      <Trash2 size = {16} />
                    </button>
                  </div>
                  <div style = {styles.inputGroup}>
                    <div>
                      <label style = {styles.label}>Доходность (%)</label>
                      <input
                        type = "number"
                        value = {(asset.ret * 100).toFixed(1)}
                        onChange = {(e) => updateAsset(idx, 'ret', e.target.value / 100)}
                        style = {styles.numberInput}
                        step = "0.1"
                      />
                    </div>
                    <div>
                      <label style = {styles.label}>Риск (%)</label>
                      <input
                        type = "number"
                        value = {(asset.risk * 100).toFixed(1)}
                        onChange = {(e) => updateAsset(idx, 'risk', e.target.value / 100)}
                        style = {styles.numberInput}
                        step = "0.1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick = {handleOptimize} disabled = {loading} style = {styles.optimizeButton}>
              {loading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <Rocket size={20} />}
              {loading ? 'Оптимизация...' : 'Оптимизировать портфель'}
            </button>
          </div>

          {/* Правая панель */}
          <div style = {styles.card}>
            <div style = {styles.cardTitle}>
              {/* <div style = {{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)', padding: '8px', borderRadius: '12px' }}>
                <Target size = {20} color = "white" />
              </div> */}
              <span style = {styles.cardTitleText}>Результаты оптимизации</span>
            </div>

            {result ? (
              <div>
                <div style = {styles.resultCard}>
                  <div style = {styles.resultTitle}>
                    <div style = {{ background: '#10b981', padding: '6px', borderRadius: '8px' }}>
                      <Crown size = {14} color = "white" />
                    </div>
                    <h3 style = {{ fontWeight: 'bold', color: '#065f46' }}>Максимальный Коэффициент Шарпа</h3>
                  </div>
                  <div style = {styles.resultGrid}>
                    <div>
                      <p style = {{ fontSize: '12px', color: '#6b7280' }}>Доходность</p>
                      <p style = {{ ...styles.resultValue, color: '#059669' }}>{(result.max_sharpe.returns * 100).toFixed(2)}%</p>
                    </div>
                    <div>
                      <p style = {{ fontSize: '12px', color: '#6b7280' }}>Риск</p>
                      <p style = {styles.resultValue}>{(result.max_sharpe.risk * 100).toFixed(2)}%</p>
                    </div>
                    <div>
                      <p style = {{ fontSize: '12px', color: '#6b7280' }}>Шарп</p>
                      <p style = {{ ...styles.resultValue, color: '#2563eb' }}>{result.max_sharpe.sharpe.toFixed(3)}</p>
                    </div>
                  </div>
                  <div>
                    {result.max_sharpe.weights.map((w, i) => (
                      <span key = {i} style={styles.weightBadge}>
                        {assets[i]?.name}: <strong>{(w * 100).toFixed(1)}%</strong>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Мин. Риск */}
                <div style = {styles.resultCardBlue}>
                  <div style = {styles.resultTitle}>
                    <div style = {{ background: '#3b82f6', padding: '6px', borderRadius: '8px' }}>
                      <Shield size = {14} color = "white" />
                    </div>
                    <h3 style = {{ fontWeight: 'bold', color: '#1e40af' }}>Минимальный риск</h3>
                  </div>
                  <div style = {styles.resultGrid}>
                    <div>
                      <p style = {{ fontSize: '12px', color: '#6b7280' }}>Доходность</p>
                      <p style = {{ ...styles.resultValue, color: '#2563eb' }}>{(result.min_risk.returns * 100).toFixed(2)}%</p>
                    </div>
                    <div>
                      <p style = {{ fontSize: '12px', color: '#6b7280' }}>Риск</p>
                      <p style = {styles.resultValue}>{(result.min_risk.risk * 100).toFixed(2)}%</p>
                    </div>
                    <div>
                      <p style = {{ fontSize: '12px', color: '#6b7280' }}>Шарп</p>
                      <p style = {{ ...styles.resultValue, color: '#0891b2' }}>{result.min_risk.sharpe.toFixed(3)}</p>
                    </div>
                  </div>
                  <div>
                    {result.min_risk.weights.map((w, i) => (
                      <span key = {i} style = {styles.weightBadge}>
                        {assets[i]?.name}: <strong>{(w * 100).toFixed(1)}%</strong>
                      </span>
                    ))}
                  </div>
                </div>

                <div style = {{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', borderRadius: '12px', padding: '16px', border: '1px solid #fcd34d' }}>
                  <div style = {{ display: 'flex', gap: '12px' }}>
                    <Star size = {20} color="#d97706" />
                    <div>
                      <p style = {{ fontWeight: '500', color: '#92400e', fontSize: '14px' }}>Совет по оптимизации</p>
                      <p style = {{ fontSize: '12px', color: '#78350f', marginTop: '4px' }}>Портфель с максимальным Коэффициентом Шарпа обеспечивает наилучшее соотношение риск/доходность!!!</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style = {styles.emptyState}>
                <div style = {{ background: '#f3f4f6', padding: '16px', borderRadius: '50%', width: '64px', height: '64px', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PieChart size = {32} color = "#9ca3af" />
                </div>
                <p>Введите данные активов</p>
                <p style = {{ fontSize: '14px', marginTop: '4px' }}>и нажмите "Оптимизировать портфель"</p>
              </div>
            )}
          </div>
        </div>

        {result && (
          <div style={styles.chartsGrid}>
            <div style={styles.chartCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937' }}>Эффективная граница</h3>
              </div>
              <EfficientFrontierChart 
                frontier={result.efficient_frontier}
                maxSharpe={result.max_sharpe}
                minRisk={result.min_risk}
              />
            </div>
            
            <div style={styles.chartCard}>
              <PieChartComponent 
                weights={result.max_sharpe.weights}
                assetsList={assets}
                title="Распределение Максимального Шарпа"
              />
            </div>
            
            <div style={styles.chartCard}>
              <ComparisonChart 
                maxSharpe={result.max_sharpe}
                minRisk={result.min_risk}
              />
            </div>
          </div>
        )}

        {/* Подвал */}
        <div style = {styles.footer}>
          <p><b>Портфельный оптимизатор по Марковицу | Razor_Z_Pi(Павел Попов)</b></p>
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            overflow: hidden;
          }

                    @media (max-width: 1024px) {
            /* Уменьшаем отступы контента */
            [style*="padding: 30px 40px"] {
              padding: 20px 25px !important;
            }
            
            /* Уменьшаем размер заголовка */
            [style*="font-size: 48px"] {
              font-size: 38px !important;
            }
            
            /* Статистика - 3 колонки, но с меньшими отступами */
            [style*="grid-template-columns: repeat(3, 1fr)"] {
              gap: 15px !important;
            }
            
            /* Уменьшаем размер цифр в статистике */
            [style*="font-size: 32px"] {
              font-size: 26px !important;
            }
            
            /* Основная сетка остается 2 колонки */
            [style*="grid-template-columns: 1fr 1fr"] {
              gap: 20px !important;
            }
          }

          /* Мобильные устройства (до 768px) */
          @media (max-width: 768px) {
            /* Уменьшаем отступы контента */
            [style*="padding: 30px 40px"] {
              padding: 15px 16px !important;
            }
            
            /* Заголовок на мобильных */
            [style*="font-size: 48px"] {
              font-size: 28px !important;
            }
            
            /* Подзаголовок */
            [style*="font-size: 16px"][style*="color: #6b7280"] {
              font-size: 13px !important;
            }
            
            /* Статистика - переключаем в вертикальную колонку на мобильных */
            [style*="grid-template-columns: repeat(3, 1fr)"][style*="margin: 0 auto 30px auto"] {
              grid-template-columns: 1fr !important;
              gap: 12px !important;
              max-width: 100% !important;
            }
            
            /* Статистические карточки - горизонтальное расположение */
            [style*="display: flex"][style*="justify-content: space-between"] {
              padding: 14px 16px !important;
            }
            
            /* Цифры статистики */
            [style*="font-size: 32px"] {
              font-size: 24px !important;
            }
            
            /* ОСНОВНАЯ СЕТКА - на мобильных переключаем в 1 колонку */
            [style*="grid-template-columns: 1fr 1fr"] {
              grid-template-columns: 1fr !important;
              gap: 16px !important;
            }
            
            /* Карточки активов и результатов */
            [style*="padding: 24px"] {
              padding: 16px !important;
            }
            
            /* Заголовки карточек */
            [style*="font-size: 20px"] {
              font-size: 18px !important;
            }
            
            /* Кнопка добавления актива */
            [style*="padding: 8px 16px"] {
              padding: 6px 12px !important;
              font-size: 12px !important;
            }
            
            /* Группа полей ввода - на мобильных в колонку */
            [style*="display: grid"][style*="grid-template-columns: 1fr 1fr"] {
              grid-template-columns: 1fr !important;
              gap: 12px !important;
            }
            
            /* Название актива */
            [style*="font-size: 18px"][style*="font-weight: 600"] {
              font-size: 16px !important;
              width: 80px !important;
            }
            
            /* Результаты оптимизации - сетка 3 колонки на мобильных */
            [style*="display: grid"][style*="grid-template-columns: repeat(3, 1fr)"][style*="margin-bottom: 16px"] {
              gap: 8px !important;
            }
            
            /* Значения в результатах */
            [style*="font-size: 24px"][style*="font-weight: bold"] {
              font-size: 18px !important;
            }
            
            /* Бейджи весов */
            [style*="padding: 4px 12px"][style*="border-radius: 20px"] {
              padding: 3px 8px !important;
              font-size: 11px !important;
            }
            
            /* Кнопка оптимизации */
            [style*="padding: 12px"] {
              padding: 10px !important;
              font-size: 14px !important;
            }
            
            /* Footer */
            [style*="margin-top: 40px"] {
              margin-top: 24px !important;
              font-size: 11px !important;
            }
            
            /* Пустое состояние */
            [style*="padding: 60px 20px"] {
              padding: 40px 16px !important;
            }
            
            /* Иконка в пустом состоянии */
            [style*="width: 64px"][style*="height: 64px"] {
              width: 48px !important;
              height: 48px !important;
            }
          }

          /* Очень маленькие телефоны (до 480px) */
          @media (max-width: 480px) {
            /* Еще меньше отступы */
            [style*="padding: 15px 16px"] {
              padding: 12px 12px !important;
            }
            
            /* Заголовок еще меньше */
            [style*="font-size: 28px"] {
              font-size: 24px !important;
            }
            
            /* Иконка в шапке */
            [style*="padding: 12px"][style*="border-radius: 16px"] {
              padding: 8px !important;
            }
            
            /* Размер иконки */
            svg[width="32"][height="32"] {
              width: 24px !important;
              height: 24px !important;
            }
            
            /* Статистика */
            [style*="padding: 14px 16px"] {
              padding: 12px !important;
            }
            
            /* Результаты - текст поменьше */
            [style*="font-size: 12px"][style*="color: #6b7280"] {
              font-size: 10px !important;
            }
          }

          /* Горизонтальная ориентация на мобильных (альбомный режим) */
          @media (max-width: 900px) and (orientation: landscape) {
            [style*="padding: 15px 16px"] {
              padding: 10px 20px !important;
            }
            
            /* В альбомном режиме показываем 2 колонки */
            [style*="grid-template-columns: 1fr 1fr"] {
              grid-template-columns: 1fr 1fr !important;
            }
            
            /* Уменьшаем высоту скролла */
            [style*="maxHeight: 450px"] {
              max-height: 250px !important;
            }
          }

          /* Планшеты в портретной ориентации */
          @media (min-width: 769px) and (max-width: 1024px) and (orientation: portrait) {
            [style*="padding: 20px 25px"] {
              padding: 20px 30px !important;
            }
            
            [style*="font-size: 38px"] {
              font-size: 42px !important;
            }
          }

          /* Большие десктопы (от 1440px) */
          @media (min-width: 1440px) {
            [style*="padding: 30px 40px"] {
              padding: 40px 60px !important;
            }
            
            [style*="font-size: 48px"] {
              font-size: 56px !important;
            }
            
            [style*="gap: 24px"] {
              gap: 32px !important;
            }
            
            [style*="padding: 24px"] {
              padding: 32px !important;
            }
          }

          /* Ультраширокие мониторы (от 1920px) */
          @media (min-width: 1920px) {
            [style*="padding: 40px 60px"] {
              padding: 50px 80px !important;
            }
            
            [style*="max-width: 900px"] {
              max-width: 1100px !important;
            }
            
            [style*="gap: 32px"] {
              gap: 40px !important;
            }
          }
        `}
      </style>
    </div>
  );
}

export default App;