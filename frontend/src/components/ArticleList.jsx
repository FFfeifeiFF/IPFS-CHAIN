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

// --- 移除旧的客户端风险/标签计算 ---
// const getArticleAttributes = (article) => { ... };

// --- 新增：统一的数据获取函数 ---
const fetchArticlesData = async ({ username, page, pageSize, riskLevel = null, setArticles, setTotalCount, setLoading, setError }) => {
  setLoading(true);
  setError(null);
  setArticles([]); // 清空旧数据

  try {
    let url = `${process.env.REACT_APP_API_URL}/articles?page=${page}&pageSize=${pageSize}&username=${encodeURIComponent(username)}`;
    if (riskLevel) {
      url += `&riskLevel=${encodeURIComponent(riskLevel)}`;
    }
    console.log(`Fetching data from: ${url}`); // Debug log

    const response = await fetch(url);
    if (!response.ok) {
      let errorMsg = `HTTP error! status: ${response.status}`;
      try {
        const errData = await response.json();
        errorMsg = errData.error || errData.message || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }
    const data = await response.json();

    // --- 新增：在前端附加风险等级和标签（基于后端返回的points） ---
    const articlesWithAttributes = data.data.map((article) => {
        let riskLevelFrontend = "low"; // 默认低风险
  const tags = [];

  if (article.points >= 15) {
            riskLevelFrontend = "high";
    tags.push({ text: "高危", type: "risk-high" });
  } else if (article.points >= 5) {
            riskLevelFrontend = "medium";
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
        // 注意：这里的"最新"标签判断可能需要调整，因为后端可能没有直接返回日期是否最新
        // 暂且保留之前的逻辑，但理想情况下后端应提供此信息或前端获取完整数据后判断
         if (article.date) { // 确保有日期
            try {
                const articleDate = new Date(article.date);
                if (!isNaN(articleDate) && articleDate > new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)) {
    tags.push({ text: "最新", type: "latest" });
                }
            } catch(e){ console.warn("Error parsing date for 'latest' tag:", article.date, e)}
        }

        return { ...article, riskLevel: riskLevelFrontend, tags }; // 使用计算出的 riskLevel 和 tags
    });


    setArticles(articlesWithAttributes);
    setTotalCount(data.totalCount);
    console.log(`Fetched ${riskLevel || 'all'} articles. Count: ${data.totalCount}, Data:`, articlesWithAttributes); // Debug log
  } catch (err) {
    console.error(`获取 ${riskLevel || '所有'} 文章数据失败:`, err);
    setError(err);
    setArticles([]); // 出错时确保清空
    setTotalCount(0);
  } finally {
    setLoading(false);
  }
};


function ArticleListDashboardLayout({ username }) {
  // --- 移除旧的主文章列表状态 ---
  // const [articles, setArticles] = useState(null);
  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState(null);
  // const [currentPage, setCurrentPage] = useState(1);
  // const [articlesPerPage] = useState(10);
  // const [totalCount, setTotalCount] = useState(0);

  // --- 新增：各区域独立状态 ---
  const [hotspotArticles, setHotspotArticles] = useState([]);
  const [hotspotTotalCount, setHotspotTotalCount] = useState(0);
  const [hotspotLoading, setHotspotLoading] = useState(true);
  const [hotspotError, setHotspotError] = useState(null);
  const [hotspotCurrentPage, setHotspotCurrentPage] = useState(1);
  const hotspotItemsPerPage = 6; // 热点情报一页显示6个

  const [highRiskArticles, setHighRiskArticles] = useState([]);
  const [highRiskTotalCount, setHighRiskTotalCount] = useState(0);
  const [highRiskLoading, setHighRiskLoading] = useState(true);
  const [highRiskError, setHighRiskError] = useState(null);
  const [highRiskCurrentPage, setHighRiskCurrentPage] = useState(1);
  const highRiskItemsPerPage = 6; // 高危情报一页显示6个

  const [mediumLowRiskArticles, setMediumLowRiskArticles] = useState([]);
  const [mediumLowRiskTotalCount, setMediumLowRiskTotalCount] = useState(0);
  const [mediumLowRiskLoading, setMediumLowRiskLoading] = useState(true);
  const [mediumLowRiskError, setMediumLowRiskError] = useState(null);
  const [mediumLowRiskCurrentPage, setMediumLowRiskCurrentPage] = useState(1);
  const mediumLowRiskItemsPerPage = 6; // 中低危情报一页显示6个

  // --- 其他状态 (基本不变) ---
  const [downloadingId, setDownloadingId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const eventSourceRef = useRef(null);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [visibleModal, setVisibleModal] = useState(false);
  const [currentSummary, setCurrentSummary] = useState("");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedArticleForShare, setSelectedArticleForShare] = useState(null);
  const [favoriteStatus, setFavoriteStatus] = useState({});
  const [isToggleFavorite, setIsToggleFavorite] = useState(false);

  // --- 图表状态 ---
  const [riskStats, setRiskStats] = useState([]);
  const [riskStatsLoading, setRiskStatsLoading] = useState(true);
  const [riskStatsError, setRiskStatsError] = useState(null);
  const [fileTypeStats, setFileTypeStats] = useState([]); // 文件类型统计保持不变

      const navigate = useNavigate();

  // --- 新增：获取热点情报的 Effect ---
  useEffect(() => {
    if (username) {
      fetchArticlesData({
        username,
        page: hotspotCurrentPage,
        pageSize: hotspotItemsPerPage,
        riskLevel: null, // 获取所有风险等级
        setArticles: setHotspotArticles,
        setTotalCount: setHotspotTotalCount,
        setLoading: setHotspotLoading,
        setError: setHotspotError,
      });
    } else {
        // 用户未登录时重置状态
        setHotspotArticles([]);
        setHotspotTotalCount(0);
        setHotspotLoading(false);
        setHotspotError(null);
    }
  }, [username, hotspotCurrentPage, hotspotItemsPerPage]); // 依赖项

  // --- 新增：获取高危情报的 Effect ---
  useEffect(() => {
    if (username) {
      fetchArticlesData({
        username,
        page: highRiskCurrentPage,
        pageSize: highRiskItemsPerPage,
        riskLevel: 'high', // 只获取高风险
        setArticles: setHighRiskArticles,
        setTotalCount: setHighRiskTotalCount,
        setLoading: setHighRiskLoading,
        setError: setHighRiskError,
      });
    } else {
        setHighRiskArticles([]);
        setHighRiskTotalCount(0);
        setHighRiskLoading(false);
        setHighRiskError(null);
    }
  }, [username, highRiskCurrentPage, highRiskItemsPerPage]); // 依赖项

  // --- 新增：获取中低危情报的 Effect ---
  useEffect(() => {
    if (username) {
      fetchArticlesData({
        username,
        page: mediumLowRiskCurrentPage,
        pageSize: mediumLowRiskItemsPerPage,
        riskLevel: 'medium,low', // 获取中和低风险
        setArticles: setMediumLowRiskArticles,
        setTotalCount: setMediumLowRiskTotalCount,
        setLoading: setMediumLowRiskLoading,
        setError: setMediumLowRiskError,
      });
    } else {
        setMediumLowRiskArticles([]);
        setMediumLowRiskTotalCount(0);
        setMediumLowRiskLoading(false);
        setMediumLowRiskError(null);
    }
  }, [username, mediumLowRiskCurrentPage, mediumLowRiskItemsPerPage]); // 依赖项

  // --- 处理 SSE 通知的 Effect (不变) ---
   useEffect(() => {
    if (username) {
      console.log(`为用户 ${username} 设置 SSE 连接`);
      if (eventSourceRef.current) eventSourceRef.current.close();

      const sseUrl = `${process.env.REACT_APP_API_URL}/subscribe/${encodeURIComponent(
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

 // --- 获取用户资料的 Effect (不变) ---
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
          `${process.env.REACT_APP_API_URL}/profile?username=${encodeURIComponent(
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
  }, [username]);

  // --- 获取文件类型统计数据 Effect (不变) ---
  // 注意：这个接口可能需要修改，因为它看起来是获取全局统计，可能不依赖于当前文章列表
  useEffect(() => {
    const fetchFileStats = async () => {
      if (!username) return;

      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/file-stats`);
        if (!response.ok) {
          throw new Error("无法获取文件统计数据");
        }
        const data = await response.json();
        setFileTypeStats(data.stats);
        // setFileStatsLoading(false); // 这个状态变量似乎未定义，注释掉
      } catch (err) {
        console.error("获取文件统计数据失败:", err);
        // setFileStatsError(err.message); // 这个状态变量似乎未定义，注释掉
        // setFileStatsLoading(false); // 这个状态变量似乎未定义，注释掉
      }
    };

    fetchFileStats();
  }, [username]);

  // --- 新增：计算风险等级统计 Effect (基于所有热点数据或专门接口) ---
  // 注意：这个统计现在基于 hotspotArticles，可能不代表全局风险分布
  // 更好的方法是后端提供一个专门的统计接口
  useEffect(() => {
    if (hotspotLoading || hotspotError || !hotspotArticles) {
      setRiskStatsLoading(true);
      setRiskStatsError(hotspotError); // 使用 hotspot 的错误状态
      return;
    }

    try {
      // 计算各风险等级的数量 (基于当前页的热点数据)
      const highRiskCount = hotspotArticles.filter(
        (article) => article.riskLevel === "high"
      ).length;
      const mediumRiskCount = hotspotArticles.filter(
        (article) => article.riskLevel === "medium"
      ).length;
      const lowRiskCount = hotspotArticles.filter(
        (article) => article.riskLevel === "low"
      ).length;

      // 创建风险等级统计数据
      const riskData = [
        { riskLevel: "高危", count: highRiskCount, color: "#FF6384" },
        { riskLevel: "中危", count: mediumRiskCount, color: "#FFCE56" },
        { riskLevel: "低危", count: lowRiskCount, color: "#36A2EB" },
      ].filter(stat => stat.count > 0); // 只显示有数据的风险等级

      setRiskStats(riskData);
      setRiskStatsLoading(false);
      setRiskStatsError(null); // 清除错误
    } catch (err) {
      console.error("计算风险等级统计失败:", err);
      setRiskStatsError(err.message);
      setRiskStatsLoading(false);
    }
  }, [hotspotArticles, hotspotLoading, hotspotError]); // 依赖于热点数据状态


 // --- 移除旧的主分页函数 ---
  // const paginate = (pageNumber) => { ... };

  // --- 新增：各区域的分页函数 ---
  const paginateHotspot = (pageNumber) => setHotspotCurrentPage(pageNumber);
  const paginateHighRisk = (pageNumber) => setHighRiskCurrentPage(pageNumber);
  const paginateMediumLowRisk = (pageNumber) => setMediumLowRiskCurrentPage(pageNumber);

  // --- 处理下载点击的函数 (不变) ---
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
        `${process.env.REACT_APP_API_URL}/download?id=${articleId}&username=${encodeURIComponent(
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
      const downloadApiUrl = `${process.env.REACT_APP_API_URL}/download?id=${articleId}&username=${encodeURIComponent(
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
          `${process.env.REACT_APP_API_URL}/profile?username=${encodeURIComponent(
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

  // --- 辅助函数：获取用户等级信息 (不变) ---
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

  // --- 处理编辑资料点击 (不变) ---
 const handleEditProfileClick = () => {
    console.log("Navigating to profile edit with username:", username);
    navigate("/changeprofile", {
      state: { username: username },
      replace: false,
    });
  };

  // --- 移除旧的分页状态和风险分类逻辑 ---
  // const [hotspotCurrentPage, setHotspotCurrentPage] = useState(1);
  // const [highRiskCurrentPage, setHighRiskCurrentPage] = useState(1);
  // const [mediumLowRiskCurrentPage, setMediumLowRiskCurrentPage] = useState(1);
  // const hotspotItemsPerPage = 6;
  // const highRiskItemsPerPage = 6;
  // const mediumLowRiskItemsPerPage = 6;
  // const paginateHotspot = (pageNumber) => { ... };
  // const paginateHighRisk = (pageNumber) => { ... };
  // const paginateMediumLowRisk = (pageNumber) => { ... };
  // const getArticlesByRiskLevel = (level) => { ... };
  // const highRiskArticles = articles ? getArticlesByRiskLevel("high") : [];
  // const mediumRiskArticles = articles ? getArticlesByRiskLevel("medium") : [];
  // const lowRiskArticles = articles ? getArticlesByRiskLevel("low") : [];
  // const mediumLowRiskArticles = [...mediumRiskArticles, ...lowRiskArticles];
  // const getCurrentHotspotArticles = () => { ... };
  // const getCurrentHighRiskArticles = () => { ... };
  // const getCurrentMediumLowRiskArticles = () => { ... };

  // --- 处理"了解更多"点击 (不变) ---
  const handleViewFileStats = () => {
    navigate("/file-stats", { state: { username } });
  };

  // --- 分享对话框状态和处理 (不变) ---
  // const [shareDialogOpen, setShareDialogOpen] = useState(false);
  // const [selectedArticleForShare, setSelectedArticleForShare] = useState(null);
  const handleShareClick = (article) => {
    setSelectedArticleForShare(article);
    setShareDialogOpen(true);
  };
  const handleCloseShareDialog = () => {
    setShareDialogOpen(false);
    setSelectedArticleForShare(null);
  };

  // --- 全局WebSocket连接 (不变) ---
  useEffect(() => {
    // 如果已经存在WebSocket连接，则不再创建
    if (window.chatWebSocket) return;
    
    // 如果没有用户名，则不创建连接
    if (!username) return;
    
    // 创建WebSocket连接并存储在window对象中，以便在整个应用程序中使用
    const ws = new WebSocket(`ws://8.148.71.83:8080/ws/chat?username=${encodeURIComponent(username)}`);
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
  
  // --- 收藏状态和处理 (不变) ---
  // const [favoriteStatus, setFavoriteStatus] = useState({});
  // const [isToggleFavorite, setIsToggleFavorite] = useState(false);

  // --- 检查收藏状态 Effect (现在需要检查所有可见的文章) ---
  useEffect(() => {
    if (!username) return;

    // 合并所有当前可见的文章ID
    const allVisibleArticleIds = [
        ...hotspotArticles,
        ...highRiskArticles,
        ...mediumLowRiskArticles
    ].map(article => article.id)
     .filter((id, index, self) => self.indexOf(id) === index); // 去重

    if (allVisibleArticleIds.length === 0) return;

    const checkFavoriteStatus = async () => {
      try {
        const statusMap = {};
        for (const articleId of allVisibleArticleIds) {
            // 如果这个ID的状态已经被之前的检查设置了，就跳过，避免重复API调用
            if (favoriteStatus.hasOwnProperty(articleId)) {
                statusMap[articleId] = favoriteStatus[articleId];
                continue;
            }
          const response = await fetch(`${process.env.REACT_APP_API_URL}/favorites/check?username=${encodeURIComponent(username)}&articleId=${articleId}`);
          if (response.ok) {
            const data = await response.json();
            statusMap[articleId] = data.isFavorited;
          } else {
             statusMap[articleId] = false; // 获取失败，默认为未收藏
             console.warn(`检查文章 ${articleId} 收藏状态失败: ${response.status}`);
          }
        }
        // 合并新旧状态，避免覆盖还未检查的ID
        setFavoriteStatus(prevStatus => ({ ...prevStatus, ...statusMap }));
      } catch (error) {
        console.error('检查收藏状态失败:', error);
      }
    };
    
    checkFavoriteStatus();
    // 依赖项包含所有文章列表和用户名
  }, [hotspotArticles, highRiskArticles, mediumLowRiskArticles, username]); // 依赖所有文章列表确保状态更新

  // --- 处理收藏点击 (不变) ---
  const handleFavoriteClick = async (article) => {
    if (!username) {
      alert('请先登录');
      return;
    }
    
    // 防止重复点击
    if (isToggleFavorite) return;
    
    setIsToggleFavorite(true);
    
    try {
      const currentStatus = favoriteStatus[article.id] || false;
      const url = `${process.env.REACT_APP_API_URL}/favorites`;
      const method = currentStatus ? 'DELETE' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          articleId: article.id,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // 已经收藏的情况是正常的，不需要弹出错误
        if (errorData.alreadyFavorited) {
          // 只更新状态，不弹窗
           setFavoriteStatus(prev => ({ ...prev, [article.id]: true }));
           console.log(`文章 ${article.id} 已收藏 (重复添加)`);
           setIsToggleFavorite(false); // 记得解除锁定
          return;
        }
        // 其他错误，正常抛出
        throw new Error(errorData.error || '操作失败');
      }
      
      const data = await response.json();
      
      // 更新状态
      setFavoriteStatus(prev => ({
        ...prev,
        [article.id]: data.isFavorited,
      }));
      
      // 显示操作结果 (可选优化：可以用 Toast 通知代替 alert)
      alert(currentStatus ? '已取消收藏' : '收藏成功');
      
    } catch (error) {
      console.error('收藏操作失败:', error);
      alert(`操作失败: ${error.message || '未知错误'}`);
    } finally {
      setIsToggleFavorite(false);
    }
  };

   // --- 统一的点击标题处理 (不变) ---
   const handleTitleClick = (e, summary) => {
       e.preventDefault(); // 阻止可能的默认链接跳转
       setCurrentSummary(summary || "暂无该文件的简介信息");
       setVisibleModal(true);
   };

  // --- 登录提示 (不变) ---
  if (!username) {
    return (
      <div className="login-prompt-container">
        <p>请先登录。</p>
      </div>
    );
  }

  // --- 获取用户等级信息 (不变) ---
  const { pointsDisplay, level, pointsClass } = getUserLevelInfo();

  // --- 新增：通用的渲染分页器函数 ---
  const renderPagination = (currentPage, totalItems, itemsPerPage, paginateFunc) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null; // 如果只有一页或没有数据，不显示分页

    return (
      <nav className="pagination-layout">
        <ul>
          {Array.from({ length: totalPages }, (_, i) => (
            <li key={i + 1} className={currentPage === i + 1 ? "active" : ""}>
              <button onClick={() => paginateFunc(i + 1)}>{i + 1}</button>
            </li>
          ))}
        </ul>
      </nav>
    );
  };

  // --- 新增：通用的渲染文章卡片函数 ---
  // (这个函数本身逻辑不变，但调用它的地方会传入不同的文章列表)
  const renderArticleCard = (article) => (
    <div key={article.id} className={`info-card risk-${article.riskLevel}`}>
                        <div className="info-card-header">
                          <span className={`risk-badge ${article.riskLevel}`}>
          {article.riskLevel === "high" ? "高危" : article.riskLevel === "medium" ? "中危" : "低危"}
                          </span>
                          <span className="info-date">{article.date}</span>
                        </div>
      <h3 className="info-title" onClick={(e) => handleTitleClick(e, article.summary)}>
                          {article.title}
                        </h3>
                        <div className="info-footer">
                          <span>{article.author}</span>
                          <div className="info-actions">
                            <button
            className={`action-button ${downloadingId === article.id ? "loading" : ""}`}
                              title="下载"
            onClick={() => handleDownloadClick(article.id, article.filename || `${article.title}.bin`, article.points)}
            disabled={downloadingId === article.id}
          >
           {downloadingId === article.id ? <div className="spinner-action"></div> : <Download size={16} />}
                            </button>
                            <button 
            className={`action-button ${favoriteStatus[article.id] ? "favorited" : ""}`}
                              title={favoriteStatus[article.id] ? "取消收藏" : "收藏"}
                              onClick={() => handleFavoriteClick(article)}
            disabled={isToggleFavorite} // 防止重复点击
                            >
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
  );


  return (
    <div className="dashboard-layout">
      {/* 主内容区域 */}
      <div className="main-content-area">

        {/* 热点情报分析区域 (更新) */}
        <div className="info-section">
          <h2 className="section-title">热点情报分析</h2>
          {hotspotLoading && <p className="status-message">正在加载热点数据...</p>}
          {hotspotError && <p className="status-message error">加载热点失败: {hotspotError.message}</p>}
          {!hotspotLoading && !hotspotError && hotspotArticles.length === 0 && <p className="no-data-message">暂无热点情报数据</p>}
          {!hotspotLoading && !hotspotError && hotspotArticles.length > 0 && (
            <>
              <div className="info-cards-container">
                {hotspotArticles.map(renderArticleCard)}
              </div>
              {renderPagination(hotspotCurrentPage, hotspotTotalCount, hotspotItemsPerPage, paginateHotspot)}
                </>
              )}
            </div>

        {/* 高危情报区域 (更新) */}
            <div className="info-section">
              <h2 className="section-title">高危情报</h2>
          {highRiskLoading && <p className="status-message">正在加载高危数据...</p>}
          {highRiskError && <p className="status-message error">加载高危失败: {highRiskError.message}</p>}
          {!highRiskLoading && !highRiskError && highRiskArticles.length === 0 && <p className="no-data-message">暂无高危情报</p>}
          {!highRiskLoading && !highRiskError && highRiskArticles.length > 0 && (
                <>
                  <div className="info-cards-container">
                {highRiskArticles.map(renderArticleCard)}
                        </div>
              {renderPagination(highRiskCurrentPage, highRiskTotalCount, highRiskItemsPerPage, paginateHighRisk)}
                </>
              )}
            </div>

        {/* 中低危情报区域 (更新) */}
            <div className="info-section">
              <h2 className="section-title">中低危情报</h2>
          {mediumLowRiskLoading && <p className="status-message">正在加载中低危数据...</p>}
          {mediumLowRiskError && <p className="status-message error">加载中低危失败: {mediumLowRiskError.message}</p>}
          {!mediumLowRiskLoading && !mediumLowRiskError && mediumLowRiskArticles.length === 0 && <p className="no-data-message">暂无中低危情报</p>}
          {!mediumLowRiskLoading && !mediumLowRiskError && mediumLowRiskArticles.length > 0 && (
                <>
                  <div className="info-cards-container">
                {mediumLowRiskArticles.map(renderArticleCard)}
                        </div>
              {renderPagination(mediumLowRiskCurrentPage, mediumLowRiskTotalCount, mediumLowRiskItemsPerPage, paginateMediumLowRisk)}
                </>
              )}
            </div>

        {/* 文件简介 Modal (不变) */}
        <Modal
          title="文件简介"
            visible={visibleModal} // 使用 visibleModal 状态
          onOk={() => setVisibleModal(false)}
          onCancel={() => setVisibleModal(false)}
          footer={null}
          width={600}
          centered
        >
          <div style={{ padding: "20px", maxHeight: "400px", overflowY: "auto" }}>
            <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {currentSummary}
            </p>
          </div>
        </Modal>
      </div>

      {/* 侧边栏区域 (更新风险分布图逻辑) */}
      <div className="sidebar-area">
        {/* 个人信息模块 (不变) */}
          <div className="sidebar-module user-info-module">
             {/* ... (个人信息部分不变) ... */}
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

          {/* 通知中心模块 (不变) */}
          <div className="sidebar-module notification-module">
             {/* ... (通知中心部分不变) ... */}
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

        {/* 风险等级分布模块 (更新数据源提示) */}
        <div className="sidebar-module file-stats-module"> {/* CSS 类名保持不变 */}
          <h4>
            <PieChart size={16} /> 风险等级分布 (当前页热点) {/* 标题说明数据来源 */}
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
                          font: { size: 10 },
                          },
                        },
                      tooltip: { enabled: true },
                    },
                    responsive: true,
                    maintainAspectRatio: true, // 保持宽高比
                    cutout: "65%", // 甜甜圈效果
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 分享对话框 (不变) */}
      {shareDialogOpen && selectedArticleForShare && (
         // ... (分享对话框不变) ...
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


