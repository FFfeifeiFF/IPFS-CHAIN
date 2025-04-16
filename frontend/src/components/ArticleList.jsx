import React, { useState, useEffect, useRef } from "react";
import {
  Download,
  Bell,
  User,
  Bookmark,
  Share2,
  Activity,
  PieChart,
} from "lucide-react"; // 引入更多图标
import "../css/ArticleListDashboardLayout.css"; // <<< 使用新的 CSS 文件
import { useNavigate } from "react-router-dom";
import { Modal } from "antd";
import { Pie, Doughnut } from "react-chartjs-2"; // 导入 Pie 和 Doughnut 组件
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js"; // 导入 Chart.js 相关组件
import ShareDialog from './ShareDialog'; // 导入ShareDialog组件
// 注册 Chart.js 组件
ChartJS.register(ArcElement, Tooltip, Legend);

// 模拟获取文章风险等级和标签（实际应来自后端）
const getArticleAttributes = (article) => {
  let riskLevel = "low"; // 默认低风险
  const tags = [];

  if (article.points >= 15) {
    riskLevel = "high";
    tags.push({ text: "高危", type: "risk-high" });
  } else if (article.points >= 5) {
    riskLevel = "medium";
    tags.push({ text: "中危", type: "risk-medium" });
  } else {
    tags.push({ text: "提示", type: "risk-low" });
  }

  // 其他示例标签
  if (article.title && article.title.toLowerCase().includes("confluence")) {
    tags.push({ text: "Confluence", type: "product" });
  }
  if (article.author === "官方") {
    tags.push({ text: "官方发布", type: "official" });
  }
  if (new Date(article.date) > new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)) {
    // 3天内算最新
    tags.push({ text: "最新", type: "latest" });
  }

  return { riskLevel, tags };
};

function ArticleListDashboardLayout({ username }) {
  const [articles, setArticles] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [articlesPerPage] = useState(10); // 每页显示更多项
  const [totalCount, setTotalCount] = useState(0);
  const [downloadingId, setDownloadingId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const eventSourceRef = useRef(null);

    // --- 新增：用户资料（积分）的状态 ---
  const [userProfile, setUserProfile] = useState(null); // 存储 { username: '...', points: ... }
  const [profileLoading, setProfileLoading] = useState(true); // 资料加载状态
  const [profileError, setProfileError] = useState(null); // 资料加载错误
  const [visibleModal, setVisibleModal] = useState(false);
  const [currentSummary, setCurrentSummary] = useState("");
  
  // 新增点击处理函数
  const handleTitleClick = (e, summary) => {
    e.preventDefault();
    setCurrentSummary(summary || "暂无该文件的简介信息");
    setVisibleModal(true);
  };
      const navigate = useNavigate();
  // --- 获取文章列表的 Effect ---
  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      setError(null);
      setArticles(null); // 清空旧数据
      try {
        const response = await fetch(
          `http://localhost:8080/articles?page=${currentPage}&pageSize=${articlesPerPage}&username=${encodeURIComponent(
            username || ""
          )}`
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // 为每个文章附加风险等级和标签
        const articlesWithAttributes = data.data.map((article) => {
            const attributes = getArticleAttributes(article);
            return { ...article, ...attributes }; // 合并文章数据和属性
        });
        setArticles(articlesWithAttributes);
        setTotalCount(data.totalCount);
      } catch (err) {
        console.error("获取文章数据失败:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchArticles();
    } else {
      setLoading(false);
      setArticles([]);
      setTotalCount(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, articlesPerPage, username]);

  // --- 处理 SSE 通知的 Effect ---
   useEffect(() => {
    if (username) {
      console.log(`为用户 ${username} 设置 SSE 连接`);
      if (eventSourceRef.current) eventSourceRef.current.close();

      const sseUrl = `http://localhost:8080/subscribe/${encodeURIComponent(
        username
      )}`;
      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.onopen = () => console.log("SSE 通知连接已建立。");

      es.addEventListener("downloadNotification", (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("收到下载通知:", data);
          const newMessage = `用户 ${data.downloader || "未知"} 下载了 "${
            data.articleTitle || `ID: ${data.articleId}`
          }"`;
          setNotifications((prev) =>
            [{ id: Date.now(), message: newMessage }, ...prev].slice(0, 20)
          ); // 最多保留20条
        } catch (e) {
          console.error("解析通知数据失败:", e);
        }
      });

       es.onerror = (error) => {
        console.error("SSE 错误:", error);
        if (es.readyState === EventSource.CLOSED) {
            console.log("SSE connection was closed.");
        }
        es.close();
        eventSourceRef.current = null;
      };

      return () => {
        if (eventSourceRef.current) {
           console.log(`关闭用户 ${username} 的 SSE 连接`);
           eventSourceRef.current.close();
           eventSourceRef.current = null;
        }
      };
    } else {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
    }
  }, [username]);
 // --- 新增：获取用户资料的 Effect ---
  useEffect(() => {
    // 定义获取用户资料的异步函数
    const fetchUserProfile = async () => {
      // 如果没有用户名，则不执行获取，并重置状态
      if (!username) {
        setProfileLoading(false);
        setUserProfile(null);
        setProfileError(null);
        return;
      }

      // 开始获取，设置加载状态，清空错误和旧数据
      setProfileLoading(true);
      setProfileError(null);
      setUserProfile(null);

      try {
        // 调用后端接口获取用户资料
        const response = await fetch(
          `http://localhost:8080/profile?username=${encodeURIComponent(
            username
          )}`
        );

        // 检查响应是否成功
        if (!response.ok) {
           let errorMsg = `获取用户资料失败: ${response.status}`;
           try {
              // 尝试从响应体中解析更详细的错误信息
              const errData = await response.json();
              errorMsg = errData.error || errorMsg; // 使用后端返回的 error 字段
          } catch (e) {
             // 解析 JSON 失败，使用原始状态码信息
           }
           throw new Error(errorMsg); // 抛出错误
        }

        // 解析响应的 JSON 数据
        const data = await response.json();
        console.log(data);
        // 更新用户资料状态
        setUserProfile(data);
      } catch (err) {
        // 捕获并记录错误
        console.error("获取用户资料失败:", err);
        setProfileError(err); // 更新错误状态
      } finally {
        // 无论成功或失败，最后都设置加载状态为 false
        setProfileLoading(false);
      }
    };

    // 执行获取用户资料的函数
    fetchUserProfile();

    // 这个 effect 依赖于 username，当 username 变化时会重新执行
  }, [username]);

  // 添加风险等级统计数据状态
  const [riskStats, setRiskStats] = useState([]);
  const [riskStatsLoading, setRiskStatsLoading] = useState(true);
  const [riskStatsError, setRiskStatsError] = useState(null);

  // 添加文件类型统计数据状态
  const [fileTypeStats, setFileTypeStats] = useState([]);
  const [fileStatsLoading, setFileStatsLoading] = useState(true);
  const [fileStatsError, setFileStatsError] = useState(null);

  // 获取文件类型统计数据
  useEffect(() => {
    const fetchFileStats = async () => {
      if (!username) return;

      try {
        const response = await fetch("http://localhost:8080/file-stats");
        if (!response.ok) {
          throw new Error("无法获取文件统计数据");
        }
        const data = await response.json();
        setFileTypeStats(data.stats);
        setFileStatsLoading(false);
      } catch (err) {
        console.error("获取文件统计数据失败:", err);
        setFileStatsError(err.message);
        setFileStatsLoading(false);
      }
    };

    fetchFileStats();
  }, [username]);

  // 计算风险等级统计
  useEffect(() => {
    if (!articles) {
      setRiskStatsLoading(true);
      return;
    }

    try {
      // 计算各风险等级的数量
      const highRiskCount = articles.filter(
        (article) => article.riskLevel === "high"
      ).length;
      const mediumRiskCount = articles.filter(
        (article) => article.riskLevel === "medium"
      ).length;
      const lowRiskCount = articles.filter(
        (article) => article.riskLevel === "low"
      ).length;

      // 创建风险等级统计数据
      const riskData = [
        { riskLevel: "高危", count: highRiskCount, color: "#FF6384" },
        { riskLevel: "中危", count: mediumRiskCount, color: "#FFCE56" },
        { riskLevel: "低危", count: lowRiskCount, color: "#36A2EB" },
      ];

      setRiskStats(riskData);
      setRiskStatsLoading(false);
    } catch (err) {
      console.error("计算风险等级统计失败:", err);
      setRiskStatsError(err.message);
      setRiskStatsLoading(false);
    }
  }, [articles]);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    // 可选：翻页后滚动到列表顶部
    const listElement = document.querySelector(".main-content-area");
    if (listElement) listElement.scrollTo(0, 0);
  };

  // --- 处理下载点击的函数 (与之前基本相同) ---
  const handleDownloadClick = async (
    articleId,
    suggestedFilename,
    articlePoints
  ) => {
    if (downloadingId === articleId) return;
    if (!username) {
      alert("请先登录");
      return;
    }
    setDownloadingId(articleId);
    try {
      // 步骤 1: 检查积分
      const checkResponse = await fetch(
        `http://localhost:8080/download?id=${articleId}&username=${encodeURIComponent(
          username
        )}&check=true`,
        { method: "POST" }
      );
      const checkData = await checkResponse.json();
      if (!checkResponse.ok)
        throw new Error(checkData.error || "检查下载权限失败");

      // 步骤 1.5: 确认下载
      const confirmed = window.confirm(
        `下载 "${suggestedFilename}"?\n消耗: ${articlePoints} 积分 (剩余: ${checkData.current_points})`
      );
      if (!confirmed) {
          setDownloadingId(null);
          return;
      }

      // 步骤 2: 执行下载
      const downloadApiUrl = `http://localhost:8080/download?id=${articleId}&username=${encodeURIComponent(
        username
      )}&check=false`;
      const response = await fetch(downloadApiUrl, { method: "POST" });
      if (!response.ok) {
            let errorMsg = `下载文件失败: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.message || errorMsg;
            } catch (jsonError) {
                errorMsg = `下载文件失败: ${response.statusText} (${response.status})`;
          try {
            const textError = await response.text();
            errorMsg += ` - ${textError.substring(0, 100)}`;
          } catch {}
            }
            throw new Error(errorMsg);
      }

      // 步骤 3: 触发浏览器下载 (与之前相同的文件名处理和 Blob 下载)
      const contentDisposition = response.headers.get("content-disposition");
        let filename = suggestedFilename || `article_${articleId}_file`;
         if (contentDisposition) {
        const filenameStarMatch = contentDisposition.match(
          /filename\*=UTF-8''([^'";]+)/i
        );
           if (filenameStarMatch && filenameStarMatch[1]) {
               filename = decodeURIComponent(filenameStarMatch[1]);
           } else {
          const filenameBasicMatch =
            contentDisposition.match(/filename="?([^"]+)"?/i);
               if (filenameBasicMatch && filenameBasicMatch[1]) {
            try {
              filename = decodeURIComponent(escape(filenameBasicMatch[1]));
            } catch {
              filename = filenameBasicMatch[1];
            }
               }
           }
        }
        console.log(`准备下载文件: ${filename}`);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
        link.href = url;
      link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
      if (link.parentNode) link.parentNode.removeChild(link); // 更安全的移除
        window.URL.revokeObjectURL(url);
         // --- 可选但推荐: 下载成功后，重新获取用户资料以更新积分显示 ---
          try {
        const profileResponse = await fetch(
          `http://localhost:8080/user/profile?username=${encodeURIComponent(
            username
          )}`
        );
              if (profileResponse.ok) {
                  const updatedProfile = await profileResponse.json();
                  setUserProfile(updatedProfile); // 更新状态，侧边栏积分会立即变化
                  console.log("用户积分已刷新:", updatedProfile.points);
              } else {
                  console.warn("下载后刷新用户积分失败:", profileResponse.status);
              }
      } catch (profileErr) {
               console.warn("下载后刷新用户积分时出错:", profileErr);
           }
    } catch (error) {
      console.error("下载错误:", error);
      alert(`下载出错: ${error.message || "未知错误"}`);
    } finally {
      setDownloadingId(null);
    }
  };
// --- 新增：辅助函数，用于确定用户等级和样式 ---
    const getUserLevelInfo = () => {
    // 正在加载时显示的信息
    if (profileLoading) {
      return {
        pointsDisplay: "加载中...",
        level: "加载中...",
        pointsClass: "user-points-loading",
      };
    }
    // 加载出错或没有资料时显示的信息
    if (profileError || !userProfile) {
      return {
        pointsDisplay: "错误",
        level: "未知",
        pointsClass: "user-points-error",
      };
    }

    // 获取积分
    const points = userProfile.points;
    let level = ""; // 等级名称
    let pointsClass = ""; // 对应的 CSS 类名

    // --- 新的积分等级判断逻辑 ---
    if (points >= 500) {
      level = "会员用户";
      pointsClass = "user-points-member"; // 红色
    } else if (points >= 100) {
      // 100 到 499
      level = "普通用户";
      pointsClass = "user-points-normal"; // 蓝色
    } else {
      // 0 到 99 (以及可能存在的负数)
      level = "新手用户";
      pointsClass = "user-points-newbie"; // 灰色 (新增)
    }
    // --- 结束新的判断逻辑 ---

    // 返回包含积分、等级和样式类的信息
    return { pointsDisplay: points, level: level, pointsClass: pointsClass };
  };
 const handleEditProfileClick = () => {
    console.log("Navigating to profile edit with username:", username);
    navigate("/changeprofile", {
      state: { username: username },
      replace: false,
    });
  };

  // 分页状态
  const [hotspotCurrentPage, setHotspotCurrentPage] = useState(1);
  const [highRiskCurrentPage, setHighRiskCurrentPage] = useState(1);
  const [mediumLowRiskCurrentPage, setMediumLowRiskCurrentPage] = useState(1);

  // 每页显示数量
  const hotspotItemsPerPage = 6; // 热点情报一页显示6个 (2行，每行3个)
  const highRiskItemsPerPage = 6; // 高危情报一页显示6个 (2行，每行3个)
  const mediumLowRiskItemsPerPage = 6; // 中低危情报一页显示6个 (2行，每行3个)

  // 分页函数
  const paginateHotspot = (pageNumber) => {
    setHotspotCurrentPage(pageNumber);
  };

  const paginateHighRisk = (pageNumber) => {
    setHighRiskCurrentPage(pageNumber);
  };

  const paginateMediumLowRisk = (pageNumber) => {
    setMediumLowRiskCurrentPage(pageNumber);
  };

  // 根据风险等级分类文章
  const getArticlesByRiskLevel = (level) => {
    if (!articles) return [];
    return articles.filter((article) => article.riskLevel === level);
  };

  const highRiskArticles = articles ? getArticlesByRiskLevel("high") : [];
  const mediumRiskArticles = articles ? getArticlesByRiskLevel("medium") : [];
  const lowRiskArticles = articles ? getArticlesByRiskLevel("low") : [];
  const mediumLowRiskArticles = [...mediumRiskArticles, ...lowRiskArticles];

  // 获取当前页的热点文章
  const getCurrentHotspotArticles = () => {
    const indexOfLastItem = hotspotCurrentPage * hotspotItemsPerPage;
    const indexOfFirstItem = indexOfLastItem - hotspotItemsPerPage;
    return articles ? articles.slice(indexOfFirstItem, indexOfLastItem) : [];
  };

  // 获取当前页的高危文章
  const getCurrentHighRiskArticles = () => {
    const indexOfLastItem = highRiskCurrentPage * highRiskItemsPerPage;
    const indexOfFirstItem = indexOfLastItem - highRiskItemsPerPage;
    return highRiskArticles.slice(indexOfFirstItem, indexOfLastItem);
  };

  // 获取当前页的中低危文章
  const getCurrentMediumLowRiskArticles = () => {
    const indexOfLastItem =
      mediumLowRiskCurrentPage * mediumLowRiskItemsPerPage;
    const indexOfFirstItem = indexOfLastItem - mediumLowRiskItemsPerPage;
    return mediumLowRiskArticles.slice(indexOfFirstItem, indexOfLastItem);
  };

  // 处理"了解更多"点击，导航到文件统计页面
  const handleViewFileStats = () => {
    navigate("/file-stats", { state: { username } });
  };

  // 添加分享对话框状态
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedArticleForShare, setSelectedArticleForShare] = useState(null);
  
  // 全局WebSocket连接
  useEffect(() => {
    // 如果已经存在WebSocket连接，则不再创建
    if (window.chatWebSocket) return;
    
    // 如果没有用户名，则不创建连接
    if (!username) return;
    
    // 创建WebSocket连接并存储在window对象中，以便在整个应用程序中使用
    const ws = new WebSocket(`ws://localhost:8080/ws/chat?username=${encodeURIComponent(username)}`);
    window.chatWebSocket = ws;
    
    // 设置WebSocket事件处理
    ws.onopen = () => {
      console.log('全局WebSocket连接已建立');
    };
    
    ws.onclose = () => {
      console.log('全局WebSocket连接已关闭');
      // 清除引用
      window.chatWebSocket = null;
    };
    
    ws.onerror = (error) => {
      console.error('全局WebSocket错误:', error);
    };
    
    // 组件卸载时关闭连接
    return () => {
      if (window.chatWebSocket) {
        window.chatWebSocket.close();
        window.chatWebSocket = null;
      }
    };
  }, [username]);
  
  // 处理分享点击
  const handleShareClick = (article) => {
    setSelectedArticleForShare(article);
    setShareDialogOpen(true);
  };
  
  // 关闭分享对话框
  const handleCloseShareDialog = () => {
    setShareDialogOpen(false);
    setSelectedArticleForShare(null);
  };

  // --- 渲染逻辑 ---
  if (!username) {
    return (
      <div className="login-prompt-container">
        <p>请先登录。</p>
      </div>
    );
  }
// 调用辅助函数获取要在 UI 上显示的信息
  const { pointsDisplay, level, pointsClass } = getUserLevelInfo();
  const pageNumbers = [];
  for (let i = 1; i <= Math.ceil(totalCount / articlesPerPage); i++) {
    pageNumbers.push(i);
  }

  // 渲染文章卡片
  const renderArticleCard = (article) => (
    <div
      key={article.id}
      className={`article-card-layout ${article.riskLevel}`}
    >
                    <div className="card-icon-area">
                       <span className={`risk-indicator ${article.riskLevel}`}>
          {article.riskLevel === "high"
            ? "高"
            : article.riskLevel === "medium"
            ? "中"
            : "低"}
                       </span>
                    </div>
                    <div className="card-content-layout">
                    <h3 className="card-title-layout">
                              <a 
                                  href={`/article/${article.id}`} 
                                  onClick={(e) => handleTitleClick(e, article.summary)}
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="article-title-link"
                                  title="点击查看简介"
                              >
                                  {article.title || "未命名文件"}
                              </a>
                        </h3>
                        <div className="card-meta-layout">
                            {article.tags && article.tags.length > 0 && (
                                <span className="meta-tags">
              {article.tags.map((tag) => (
                <span key={tag.text} className={`tag tag-${tag.type}`}>
                  {tag.text}
                </span>
                                    ))}
                                </span>
                            )}
                            <span className="meta-item">发布者: {article.author}</span>
                            <span className="meta-item">日期: {article.date}</span>
                            <span className="meta-item">积分: {article.points}</span>
                        </div>
                    </div>
                    <div className="card-actions-layout">
                        <button
                            title="下载"
          className={`action-button ${
            downloadingId === article.id ? "loading" : ""
          }`}
          onClick={() =>
            handleDownloadClick(
              article.id,
              article.filename || `${article.title}.bin`,
              article.points
            )
          }
                            disabled={downloadingId === article.id}
        >
          {downloadingId === article.id ? (
            <div className="spinner-action"></div>
          ) : (
            <Download size={16} />
          )}
        </button>
        <button title="收藏" className="action-button">
          <Bookmark size={16} />
        </button>
        <button 
          title="分享" 
          className="action-button"
          onClick={() => handleShareClick(article)}
        >
          <Share2 size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="dashboard-layout">
      {/* 主内容区域 (文章列表) */}
      <div className="main-content-area">
        {loading && <p className="status-message">正在加载数据...</p>}
        {error && (
          <p className="status-message error">加载失败: {error.message}</p>
        )}

        {!loading && !error && articles && (
          <>
            {/* 热点情报分析区域 */}
            <div className="info-section">
              <h2 className="section-title">热点情报分析</h2>
              {articles && articles.length === 0 ? (
                <p className="no-data-message">暂无情报数据</p>
              ) : (
                <>
                  <div className="info-cards-container">
                    {getCurrentHotspotArticles().map((article, index) => (
                      <div
                        key={article.id}
                        className={`info-card risk-${article.riskLevel}`}
                      >
                        <div className="info-card-header">
                          <span className={`risk-badge ${article.riskLevel}`}>
                            {article.riskLevel === "high"
                              ? "高危"
                              : article.riskLevel === "medium"
                              ? "中危"
                              : "低危"}
                          </span>
                          <span className="info-date">{article.date}</span>
                        </div>
                        <h3
                          className="info-title"
                          onClick={(e) => handleTitleClick(e, article.summary)}
                        >
                          {article.title}
                        </h3>
                        <div className="info-footer">
                          <span>{article.author}</span>
                          <div className="info-actions">
                            <button
                              className="action-button"
                              title="下载"
                              onClick={() =>
                                handleDownloadClick(
                                  article.id,
                                  article.filename || `${article.title}.bin`,
                                  article.points
                                )
                              }
                            >
                              <Download size={16} />
                            </button>
                            <button className="action-button" title="收藏">
                              <Bookmark size={16} />
                            </button>
                            <button 
                              className="action-button" 
                              title="分享"
                              onClick={() => handleShareClick(article)}
                            >
                              <Share2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 热点情报分页 */}
                  {articles && articles.length > hotspotItemsPerPage && (
                    <nav className="pagination-layout">
                      <ul>
                        {Array.from(
                          {
                            length: Math.ceil(
                              (articles ? articles.length : 0) /
                                hotspotItemsPerPage
                            ),
                          },
                          (_, i) => (
                            <li
                              key={i + 1}
                              className={
                                hotspotCurrentPage === i + 1 ? "active" : ""
                              }
                            >
                              <button onClick={() => paginateHotspot(i + 1)}>
                                {i + 1}
                              </button>
                            </li>
                          )
                        )}
                      </ul>
                    </nav>
                  )}
                </>
              )}
            </div>

            {/* 最近高危情报区域 */}
            <div className="info-section">
              <h2 className="section-title">高危情报</h2>
              {highRiskArticles.length === 0 ? (
                <p className="no-data-message">暂无高危情报</p>
              ) : (
                <>
                  <div className="info-cards-container">
                    {getCurrentHighRiskArticles().map((article, index) => (
                      <div
                        key={article.id}
                        className={`info-card risk-${article.riskLevel}`}
                      >
                        <div className="info-card-header">
                          <span className={`risk-badge ${article.riskLevel}`}>
                            {article.riskLevel === "high"
                              ? "高危"
                              : article.riskLevel === "medium"
                              ? "中危"
                              : "低危"}
                          </span>
                          <span className="info-date">{article.date}</span>
                        </div>
                        <h3
                          className="info-title"
                          onClick={(e) => handleTitleClick(e, article.summary)}
                        >
                          {article.title}
                        </h3>
                        <div className="info-footer">
                          <span>{article.author}</span>
                          <div className="info-actions">
                            <button
                              className="action-button"
                              title="下载"
                              onClick={() =>
                                handleDownloadClick(
                                  article.id,
                                  article.filename || `${article.title}.bin`,
                                  article.points
                                )
                              }
                            >
                              <Download size={16} />
                            </button>
                            <button className="action-button" title="收藏">
                              <Bookmark size={16} />
                            </button>
                            <button 
                              className="action-button" 
                              title="分享"
                              onClick={() => handleShareClick(article)}
                            >
                              <Share2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 高危情报分页 */}
                  {highRiskArticles.length > highRiskItemsPerPage && (
                    <nav className="pagination-layout">
                      <ul>
                        {Array.from(
                          {
                            length: Math.ceil(
                              highRiskArticles.length / highRiskItemsPerPage
                            ),
                          },
                          (_, i) => (
                            <li
                              key={i + 1}
                              className={
                                highRiskCurrentPage === i + 1 ? "active" : ""
                              }
                            >
                              <button onClick={() => paginateHighRisk(i + 1)}>
                                {i + 1}
                              </button>
                            </li>
                          )
                        )}
                      </ul>
                    </nav>
                  )}
                </>
              )}
            </div>

            {/* 最近中低危情报区域 */}
            <div className="info-section">
              <h2 className="section-title">中低危情报</h2>
              {mediumLowRiskArticles.length === 0 ? (
                <p className="no-data-message">暂无中低危情报</p>
              ) : (
                <>
                  <div className="info-cards-container">
                    {getCurrentMediumLowRiskArticles().map((article, index) => (
                      <div
                        key={article.id}
                        className={`info-card risk-${article.riskLevel}`}
                      >
                        <div className="info-card-header">
                          <span className={`risk-badge ${article.riskLevel}`}>
                            {article.riskLevel === "high"
                              ? "高危"
                              : article.riskLevel === "medium"
                              ? "中危"
                              : "低危"}
                          </span>
                          <span className="info-date">{article.date}</span>
                        </div>
                        <h3
                          className="info-title"
                          onClick={(e) => handleTitleClick(e, article.summary)}
                        >
                          {article.title}
                        </h3>
                        <div className="info-footer">
                          <span>{article.author}</span>
                          <div className="info-actions">
                            <button
                              className="action-button"
                              title="下载"
                              onClick={() =>
                                handleDownloadClick(
                                  article.id,
                                  article.filename || `${article.title}.bin`,
                                  article.points
                                )
                              }
                            >
                              <Download size={16} />
                            </button>
                            <button className="action-button" title="收藏">
                              <Bookmark size={16} />
                            </button>
                            <button 
                              className="action-button" 
                              title="分享"
                              onClick={() => handleShareClick(article)}
                            >
                              <Share2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 中低危情报分页 */}
                  {mediumLowRiskArticles.length > mediumLowRiskItemsPerPage && (
                    <nav className="pagination-layout">
                      <ul>
                        {Array.from(
                          {
                            length: Math.ceil(
                              mediumLowRiskArticles.length /
                                mediumLowRiskItemsPerPage
                            ),
                          },
                          (_, i) => (
                            <li
                              key={i + 1}
                              className={
                                mediumLowRiskCurrentPage === i + 1
                                  ? "active"
                                  : ""
                              }
                            >
                              <button
                                onClick={() => paginateMediumLowRisk(i + 1)}
                              >
                                {i + 1}
                              </button>
                            </li>
                          )
                        )}
                      </ul>
                    </nav>
                  )}
                </>
              )}
            </div>
          </>
        )}

        <Modal
          title="文件简介"
          visible={visibleModal}
          onOk={() => setVisibleModal(false)}
          onCancel={() => setVisibleModal(false)}
          footer={null}
          width={600}
          centered
        >
          <div
            style={{ padding: "20px", maxHeight: "400px", overflowY: "auto" }}
          >
            <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {currentSummary}
            </p>
          </div>
        </Modal>
      </div>

      {/* 侧边栏区域 (已更新) */}
      <div className="sidebar-area">
        {/* 个人信息模块 (已更新) */}
          <div className="sidebar-module user-info-module">
          <h4>
            <User size={16} /> 个人信息
          </h4>
              <div className="user-info-content">
            <p>
              用户名: <strong>{username}</strong>
            </p>
            <p>
              积分:{" "}
              <span className={`user-points ${pointsClass}`}>
                {pointsDisplay}
              </span>
            </p>
            <p>
              等级: <span className="user-level">{level}</span>
            </p>
                  <button
                      className="sidebar-action-button"
              onClick={handleEditProfileClick}
                  >
                      编辑资料
                  </button>
          </div>
        </div>

          {/* 通知中心模块 */}
          <div className="sidebar-module notification-module">
          <h4>
            <Bell size={16} /> 通知中心
          </h4>
              <div className="notification-list-container">
            {notifications.length > 0 ? (
              <ul className="notification-list-sidebar">
                {notifications.map((notif) => (
                  <li key={notif.id}>
                    <span className="notification-dot-sidebar"></span>
                    {notif.message}
                   </li>
                ))}
              </ul>
            ) : (
              <p className="no-notifications-sidebar">暂无新通知。</p>
            )}
          </div>
          {notifications.length > 0 && (
            <a href="/notifications" className="view-all-link">
              查看全部 »
            </a>
          )}
        </div>

        {/* 文件类型统计模块 */}
        <div className="sidebar-module file-stats-module">
          <h4>
            <PieChart size={16} /> 风险等级分布
          </h4>
          <div className="mini-chart-container">
            {riskStatsLoading ? (
              <div className="mini-chart-loading">加载中...</div>
            ) : riskStatsError ? (
              <div className="mini-chart-error">获取数据失败</div>
            ) : riskStats.length === 0 ? (
              <div className="mini-chart-empty">暂无数据</div>
            ) : (
              <div className="mini-pie-chart">
                <Doughnut
                  data={{
                    labels: riskStats.map((stat) => stat.riskLevel),
                    datasets: [
                      {
                        data: riskStats.map((stat) => stat.count),
                        backgroundColor: riskStats.map((stat) => stat.color),
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{
                    plugins: {
                      legend: {
                        display: true,
                        position: "bottom",
                        labels: {
                          boxWidth: 10,
                          padding: 5,
                          font: {
                            size: 10,
                          },
                        },
                      },
                      tooltip: {
                        enabled: true,
                      },
                    },
                    responsive: true,
                    maintainAspectRatio: true,
                    cutout: "65%",
                  }}
                />
              </div>
            )}
            <div className="mini-chart-footer">
              <button
                onClick={handleViewFileStats}
                className="view-stats-button"
              >
                了解更多 »
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 在return的最后添加ShareDialog组件 */}
      {shareDialogOpen && selectedArticleForShare && (
        <ShareDialog
          username={username}
          article={selectedArticleForShare}
          onClose={handleCloseShareDialog}
        />
      )}
    </div>
  );
}

export default ArticleListDashboardLayout;
