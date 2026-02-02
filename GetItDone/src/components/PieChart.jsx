/**
 * Lightweight PieChart component using CSS conic-gradients
 * No external dependencies - zero bundle size impact
 */

import './PieChart.css';

function PieChart({ data, title }) {
  if (!data || data.length === 0 || data.every(item => item.value === 0)) {
    return (
      <div className="piechart-container">
        <h3 className="piechart-title">{title}</h3>
        <div className="piechart-empty">No data</div>
      </div>
    );
  }

  // Calculate total for percentages
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Generate conic-gradient CSS for the pie chart
  const generateConicGradient = () => {
    let gradient = 'conic-gradient(';
    let startAngle = 0;
    
    data.forEach((item, index) => {
      const percentage = (item.value / total) * 100;
      const endAngle = startAngle + (percentage * 3.6); // 3.6 degrees per percent
      
      if (index > 0) {
        gradient += ', ';
      }
      
      gradient += `${item.color} ${startAngle}deg ${endAngle}deg`;
      startAngle = endAngle;
    });
    
    gradient += ')';
    return gradient;
  };

  const gradient = generateConicGradient();

  return (
    <div className="piechart-container">
      <h3 className="piechart-title">{title}</h3>
      <div className="piechart-content">
        {/* Pie Chart */}
        <div 
          className="piechart-visual"
          style={{ background: gradient }}
        >
          <div className="piechart-center">
            <span className="piechart-total">{total}</span>
            <span className="piechart-label">Total</span>
          </div>
        </div>
        
        {/* Legend */}
        <div className="piechart-legend">
          {data.map((item, index) => {
            const percentage = ((item.value / total) * 100).toFixed(0);
            return (
              <div key={index} className="piechart-legend-item">
                <span 
                  className="piechart-legend-color" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="piechart-legend-name">{item.name}</span>
                <span className="piechart-legend-value">{item.value}</span>
                <span className="piechart-legend-percent">({percentage}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PieChart;

