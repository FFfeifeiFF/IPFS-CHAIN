import React, { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";
import { Pie, Bar, Doughnut } from "react-chartjs-2";
import { useNavigate, useLocation } from "react-router-dom";
import Head from "./Head";
import "./css/FileStats.css";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

function FileStats() {
  const [stats, setStats] = useState([]);
  const [riskStats, setRiskStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const username = location.state?.username || "";

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 获取文件类型统计
        const response = await fetch("http://localhost:8080/file-stats");
        if (!response.ok) {
          throw new Error("Failed to fetch file statistics");
        }
        const data = await response.json();
        setStats(data.stats);

        // 获取或计算风险等级统计
        // 这里我们使用模拟数据，实际应用中应该通过API获取
        const simulatedRiskData = [
          { riskLevel: "高危", count: 25, color: "#FF6384" },
          { riskLevel: "中危", count: 38, color: "#FFCE56" },
          { riskLevel: "低危", count: 47, color: "#36A2EB" },
        ];
        setRiskStats(simulatedRiskData);

        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleBackClick = () => {
    navigate(-1); // 返回上一个页面
  };

  if (loading)
    return (
      <div>
        <Head username={username} />
        <div className="file-stats-container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>正在加载数据...</p>
          </div>
        </div>
      </div>
    );

  if (error)
    return (
      <div>
        <Head username={username} />
        <div className="file-stats-container">
          <div className="error-container">
            <p>错误: {error}</p>
            <button onClick={handleBackClick} className="back-button">
              返回
            </button>
          </div>
        </div>
      </div>
    );

  // 文件类型数据
  const fileTypeData = {
    labels: stats.map((stat) => stat.fileType),
    datasets: [
      {
        data: stats.map((stat) => stat.count),
        backgroundColor: [
          "#FF6384",
          "#36A2EB",
          "#FFCE56",
          "#4BC0C0",
          "#9966FF",
          "#FF9F40",
          "#8AC24A",
          "#FF6B6B",
          "#4ECDC4",
          "#45B7D1",
        ],
        borderWidth: 1,
      },
    ],
  };

  const fileTypeBarData = {
    labels: stats.map((stat) => stat.fileType),
    datasets: [
      {
        label: "文件数量",
        data: stats.map((stat) => stat.count),
        backgroundColor: [
          "#FF6384",
          "#36A2EB",
          "#FFCE56",
          "#4BC0C0",
          "#9966FF",
          "#FF9F40",
          "#8AC24A",
          "#FF6B6B",
          "#4ECDC4",
          "#45B7D1",
        ],
        borderColor: "rgba(0, 0, 0, 0.1)",
        borderWidth: 1,
      },
    ],
  };

  // 风险等级分布数据
  const riskPieData = {
    labels: riskStats.map((stat) => stat.riskLevel),
    datasets: [
      {
        data: riskStats.map((stat) => stat.count),
        backgroundColor: riskStats.map((stat) => stat.color),
        borderWidth: 1,
      },
    ],
  };

  const riskBarData = {
    labels: riskStats.map((stat) => stat.riskLevel),
    datasets: [
      {
        label: "情报数量",
        data: riskStats.map((stat) => stat.count),
        backgroundColor: riskStats.map((stat) => stat.color),
        borderColor: "rgba(0, 0, 0, 0.1)",
        borderWidth: 1,
      },
    ],
  };

  // 风险等级环形图数据（与饼图数据相同）
  const riskDoughnutData = {
    labels: riskStats.map((stat) => stat.riskLevel),
    datasets: [
      {
        data: riskStats.map((stat) => stat.count),
        backgroundColor: riskStats.map((stat) => stat.color),
        borderWidth: 1,
      },
    ],
  };

  // 文件类型环形图数据
  const fileDoughnutData = {
    labels: stats.map((stat) => stat.fileType),
    datasets: [
      {
        data: stats.map((stat) => stat.count),
        backgroundColor: [
          "#FF6384",
          "#36A2EB",
          "#FFCE56",
          "#4BC0C0",
          "#9966FF",
          "#FF9F40",
          "#8AC24A",
          "#FF6B6B",
          "#4ECDC4",
          "#45B7D1",
        ],
        borderWidth: 1,
      },
    ],
  };

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: true,
        text: "文件类型分布 (饼图)",
        font: {
          size: 16,
        },
      },
    },
  };

  const riskPieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: true,
        text: "风险等级分布 (饼图)",
        font: {
          size: 16,
        },
      },
    },
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: "文件类型数量 (柱状图)",
        font: {
          size: 16,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  const riskBarOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: "风险等级分布 (柱状图)",
        font: {
          size: 16,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  // 环形图配置
  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: true,
        text: "文件类型分布 (环形图)",
        font: {
          size: 16,
        },
      },
    },
    cutout: "70%",
  };

  // 风险等级环形图配置
  const riskDoughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: true,
        text: "风险等级分布 (环形图)",
        font: {
          size: 16,
        },
      },
    },
    cutout: "70%",
  };

  const totalRiskCount = riskStats.reduce((sum, stat) => sum + stat.count, 0);
  const totalFileCount = stats.reduce((sum, stat) => sum + stat.count, 0);

  return (
    <div>
      <Head username={username} />
      <div className="file-stats-container">
        <div className="stats-header">
          <h2>数据统计分析</h2>
          <button onClick={handleBackClick} className="back-button">
            返回
          </button>
        </div>

        {/* 风险等级统计部分 */}
        <section className="stats-section">
          <h3 className="section-title">风险等级分布统计</h3>

          <div className="stats-summary">
            <div className="summary-card">
              <h3>总情报数</h3>
              <p className="summary-number">{totalRiskCount}</p>
            </div>
            <div className="summary-card high-risk">
              <h3>高危情报</h3>
              <p className="summary-number">
                {riskStats.find((s) => s.riskLevel === "高危")?.count || 0}
              </p>
            </div>
            <div className="summary-card medium-risk">
              <h3>中危情报</h3>
              <p className="summary-number">
                {riskStats.find((s) => s.riskLevel === "中危")?.count || 0}
              </p>
            </div>
            <div className="summary-card low-risk">
              <h3>低危情报</h3>
              <p className="summary-number">
                {riskStats.find((s) => s.riskLevel === "低危")?.count || 0}
              </p>
            </div>
          </div>

          <div className="legend-container">
            <h3>图例说明</h3>
            <div className="legend-items">
              {riskStats.map((stat) => (
                <div key={stat.riskLevel} className="legend-item">
                  <span
                    className="color-box"
                    style={{ backgroundColor: stat.color }}
                  ></span>
                  <span className="legend-label">{stat.riskLevel}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="charts-container">
            <div className="chart pie-chart">
              <Pie data={riskPieData} options={riskPieOptions} />
            </div>
            <div className="chart bar-chart">
              <Bar data={riskBarData} options={riskBarOptions} />
            </div>
            <div className="chart doughnut-chart">
              <Doughnut data={riskDoughnutData} options={riskDoughnutOptions} />
            </div>
          </div>

          <div className="stats-table-container">
            <h3>风险等级详细数据</h3>
            <div className="stats-table-wrapper">
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>风险等级</th>
                    <th>情报数量</th>
                    <th>占比</th>
                  </tr>
                </thead>
                <tbody>
                  {riskStats.map((stat, index) => {
                    const percentage = (
                      (stat.count / totalRiskCount) *
                      100
                    ).toFixed(1);
                    return (
                      <tr key={index}>
                        <td>
                          <span
                            className="color-dot"
                            style={{ backgroundColor: stat.color }}
                          ></span>
                          {stat.riskLevel}
                        </td>
                        <td>{stat.count}</td>
                        <td>{percentage}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 文件类型统计部分 */}
        <section className="stats-section">
          <h3 className="section-title">文件类型分布统计</h3>

          <div className="stats-summary">
            <div className="summary-card">
              <h3>总文件数</h3>
              <p className="summary-number">{totalFileCount}</p>
            </div>
            <div className="summary-card">
              <h3>文件类型数</h3>
              <p className="summary-number">{stats.length}</p>
            </div>
            <div className="summary-card">
              <h3>最常见类型</h3>
              <p className="summary-text">
                {stats.length > 0
                  ? stats.reduce((max, stat) =>
                      max.count > stat.count ? max : stat
                    ).fileType
                  : "无数据"}
              </p>
            </div>
          </div>

          <div className="charts-container">
            <div className="chart pie-chart">
              <Pie data={fileTypeData} options={pieOptions} />
            </div>
            <div className="chart bar-chart">
              <Bar data={fileTypeBarData} options={barOptions} />
            </div>
            <div className="chart doughnut-chart">
              <Doughnut data={fileDoughnutData} options={doughnutOptions} />
            </div>
          </div>

          <div className="stats-table-container">
            <h3>文件类型详细数据</h3>
            <div className="stats-table-wrapper">
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>文件类型</th>
                    <th>数量</th>
                    <th>占比</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((stat, index) => {
                    const percentage = (
                      (stat.count / totalFileCount) *
                      100
                    ).toFixed(1);
                    return (
                      <tr key={index}>
                        <td>{stat.fileType}</td>
                        <td>{stat.count}</td>
                        <td>{percentage}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default FileStats;
