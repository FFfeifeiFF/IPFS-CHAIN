import React, { useState, useEffect, useRef } from 'react';
import './css/ArticleList.css';
import { Download, Bell, User, Bookmark, Share2, Activity } from 'lucide-react'; // 引入更多图标
import '../css/ArticleListDashboardLayout.css'; // <<< 使用新的 CSS 文件
import { useNavigate } from 'react-router-dom';
// 模拟获取文章风险等级和标签（实际应来自后端）
const getArticleAttributes = (article) => {
  let riskLevel = 'low'; // 默认低风险
  const tags = [];

  if (article.points >= 15) {
    riskLevel = 'high';
    tags.push({ text: '高危', type: 'risk-high' });
  } else if (article.points >= 5) {
    riskLevel = 'medium';
    tags.push({ text: '中危', type: 'risk-medium' });
  } else {
     tags.push({ text: '提示', type: 'risk-low' });
  }

  // 其他示例标签
  if (article.title && article.title.toLowerCase().includes('confluence')) {
      tags.push({ text: 'Confluence', type: 'product' });
  }
  if (article.author === '官方') {
     tags.push({ text: '官方发布', type: 'official' });
  }
  if (new Date(article.date) > new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)) { // 3天内算最新
     tags.push({ text: '最新', type: 'latest' });
  }


  return { riskLevel, tags };
};


function ArticleListDashboardLayout({ username}) {
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
  const [profileError, setProfileError] = useState(null);   // 资料加载错误

      const navigate = useNavigate();
  // --- 获取文章列表的 Effect ---
  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      setError(null);
      setArticles(null); // 清空旧数据
      try {
        const response = await fetch(
          `http://localhost:8080/articles?page=${currentPage}&pageSize=${articlesPerPage}&username=${encodeURIComponent(username || '')}`
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // 为每个文章附加风险等级和标签
        const articlesWithAttributes = data.data.map(article => {
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

      const sseUrl = `http://localhost:8080/subscribe/${encodeURIComponent(username)}`;
      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.onopen = () => console.log("SSE 通知连接已建立。");

      es.addEventListener('downloadNotification', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('收到下载通知:', data);
          const newMessage = `用户 ${data.downloader || '未知'} 下载了 "${data.articleTitle || `ID: ${data.articleId}`}"`;
          setNotifications(prev => [{ id: Date.now(), message: newMessage }, ...prev].slice(0, 20)); // 最多保留20条
        } catch (e) {
          console.error("解析通知数据失败:", e);
        }
      });

       es.onerror = (error) => {
        console.error('SSE 错误:', error);
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
        const response = await fetch(`http://localhost:8080/profile?username=${encodeURIComponent(username)}`);

        // 检查响应是否成功
        if (!response.ok) {
           let errorMsg = `获取用户资料失败: ${response.status}`;
           try {
              // 尝试从响应体中解析更详细的错误信息
              const errData = await response.json();
              errorMsg = errData.error || errorMsg; // 使用后端返回的 error 字段
           } catch(e) {
             // 解析 JSON 失败，使用原始状态码信息
           }
           throw new Error(errorMsg); // 抛出错误
        }

        // 解析响应的 JSON 数据
        const data = await response.json();
        console.log(data)
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


  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    // 可选：翻页后滚动到列表顶部
    const listElement = document.querySelector('.main-content-area');
    if(listElement) listElement.scrollTo(0, 0);
  }

  // --- 处理下载点击的函数 (与之前基本相同) ---
  const handleDownloadClick = async (articleId, suggestedFilename, articlePoints) => {
    if (downloadingId === articleId) return;
    if (!username) {
      alert("请先登录");
      return;
    }
    setDownloadingId(articleId);
    try {
      // 步骤 1: 检查积分
      const checkResponse = await fetch(
        `http://localhost:8080/download?id=${articleId}&username=${encodeURIComponent(username)}&check=true`,
        { method: "POST" }
      );
      const checkData = await checkResponse.json();
      if (!checkResponse.ok) throw new Error(checkData.error || '检查下载权限失败');

      // 步骤 1.5: 确认下载
      const confirmed = window.confirm(
        `下载 "${suggestedFilename}"?\n消耗: ${articlePoints} 积分 (剩余: ${checkData.current_points})`
      );
      if (!confirmed) {
          setDownloadingId(null);
          return;
      }

      // 步骤 2: 执行下载
      const downloadApiUrl = `http://localhost:8080/download?id=${articleId}&username=${encodeURIComponent(username)}&check=false`;
      const response = await fetch(downloadApiUrl, { method: 'POST' });
      if (!response.ok) {
            let errorMsg = `下载文件失败: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.message || errorMsg;
            } catch (jsonError) {
                errorMsg = `下载文件失败: ${response.statusText} (${response.status})`;
                try { const textError = await response.text(); errorMsg += ` - ${textError.substring(0, 100)}`; } catch {}
            }
            throw new Error(errorMsg);
      }

      // 步骤 3: 触发浏览器下载 (与之前相同的文件名处理和 Blob 下载)
        const contentDisposition = response.headers.get('content-disposition');
        let filename = suggestedFilename || `article_${articleId}_file`;
         if (contentDisposition) {
           const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''([^'";]+)/i);
           if (filenameStarMatch && filenameStarMatch[1]) {
               filename = decodeURIComponent(filenameStarMatch[1]);
           } else {
               const filenameBasicMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
               if (filenameBasicMatch && filenameBasicMatch[1]) {
                    try { filename = decodeURIComponent(escape(filenameBasicMatch[1])); }
                    catch { filename = filenameBasicMatch[1]; }
               }
           }
        }
        console.log(`准备下载文件: ${filename}`);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        if(link.parentNode) link.parentNode.removeChild(link); // 更安全的移除
        window.URL.revokeObjectURL(url);
         // --- 可选但推荐: 下载成功后，重新获取用户资料以更新积分显示 ---
          try {
              const profileResponse = await fetch(`http://localhost:8080/user/profile?username=${encodeURIComponent(username)}`);
              if (profileResponse.ok) {
                  const updatedProfile = await profileResponse.json();
                  setUserProfile(updatedProfile); // 更新状态，侧边栏积分会立即变化
                  console.log("用户积分已刷新:", updatedProfile.points);
              } else {
                  console.warn("下载后刷新用户积分失败:", profileResponse.status);
              }
           } catch(profileErr) {
               console.warn("下载后刷新用户积分时出错:", profileErr);
           }

    } catch (error) {
      console.error('下载错误:', error);
      alert(`下载出错: ${error.message || '未知错误'}`);
    } finally {
      setDownloadingId(null);
    }
  };
// --- 新增：辅助函数，用于确定用户等级和样式 ---
    const getUserLevelInfo = () => {
    // 正在加载时显示的信息
    if (profileLoading) {
      return { pointsDisplay: '加载中...', level: '加载中...', pointsClass: 'user-points-loading' };
    }
    // 加载出错或没有资料时显示的信息
    if (profileError || !userProfile) {
      return { pointsDisplay: '错误', level: '未知', pointsClass: 'user-points-error' };
    }

    // 获取积分
    const points = userProfile.points;
    let level = ''; // 等级名称
    let pointsClass = ''; // 对应的 CSS 类名

    // --- 新的积分等级判断逻辑 ---
    if (points >= 500) {
      level = '会员用户';
      pointsClass = 'user-points-member'; // 红色
    } else if (points >= 100) { // 100 到 499
      level = '普通用户';
      pointsClass = 'user-points-normal'; // 蓝色
    } else { // 0 到 99 (以及可能存在的负数)
      level = '新手用户';
      pointsClass = 'user-points-newbie'; // 灰色 (新增)
    }
    // --- 结束新的判断逻辑 ---

    // 返回包含积分、等级和样式类的信息
    return { pointsDisplay: points, level: level, pointsClass: pointsClass };
  };
 const handleEditProfileClick = () => {
    navigate('/changeme',{ state: { username: username }}); // 导航到 /changeme 路由
  };
  // --- 渲染逻辑 ---
  if (!username) {
    return <div className="login-prompt-container"><p>请先登录。</p></div>;
  }
// 调用辅助函数获取要在 UI 上显示的信息
  const { pointsDisplay, level, pointsClass } = getUserLevelInfo();
  const pageNumbers = [];
  for (let i = 1; i <= Math.ceil(totalCount / articlesPerPage); i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="dashboard-layout">
      {/* 主内容区域 (文章列表) */}
      <div className="main-content-area">
        <h2 className="main-content-title">漏洞情报</h2>
        {/* 可以添加搜索/过滤栏 */}
        {/* <div className="filter-bar">...</div> */}

        <div className="article-list-wrapper">
            {loading && <p className="status-message">正在加载数据...</p>}
            {error && <p className="status-message error">加载失败: {error.message}</p>}
            {!loading && !error && articles && articles.length === 0 && <p className="status-message">暂无相关内容。</p>}

            {articles && articles.map(article => (
                <div key={article.id} className={`article-card-layout ${article.riskLevel}`}>
                    <div className="card-icon-area">
                       {/* 根据风险等级显示不同图标或颜色 */}
                       <span className={`risk-indicator ${article.riskLevel}`}>
                         {article.riskLevel === 'high' ? '高' : article.riskLevel === 'medium' ? '中' : '低'}
                       </span>
                       {/* 可以放一个通用图标 */}
                       {/* <Activity size={20} className="activity-icon" /> */}
                    </div>
                    <div className="card-content-layout">
                        <h3 className="card-title-layout">
                            <a href={`/article/${article.id}`} target="_blank" rel="noopener noreferrer">{article.title}</a>
                        </h3>
                        <div className="card-meta-layout">
                            {/* 显示标签 */}
                            {article.tags && article.tags.length > 0 && (
                                <span className="meta-tags">
                                    {article.tags.map(tag => (
                                        <span key={tag.text} className={`tag tag-${tag.type}`}>{tag.text}</span>
                                    ))}
                                </span>
                            )}
                            <span className="meta-item">发布者: {article.author}</span>
                            <span className="meta-item">日期: {article.date}</span>
                            <span className="meta-item">积分: {article.points}</span>
                            {/* 可以添加文章ID或其他元数据 */}
                            {/* <span className="meta-item">ID: {article.id}</span> */}
                        </div>
                    </div>
                    <div className="card-actions-layout">
                        <button
                            title="下载"
                            className={`action-button ${downloadingId === article.id ? 'loading' : ''}`}
                            onClick={() => handleDownloadClick(article.id, article.filename || `${article.title}.bin`, article.points)}
                            disabled={downloadingId === article.id}
                            >
                             {downloadingId === article.id ? <div className="spinner-action"></div> : <Download size={16} />}
                        </button>
                        <button title="收藏" className="action-button"><Bookmark size={16} /></button>
                        <button title="分享" className="action-button"><Share2 size={16} /></button>
                    </div>
                </div>
            ))}
        </div>

        {/* 分页 */}
        {totalCount > articlesPerPage && (
          <nav className="pagination-layout">
            <ul>
              {pageNumbers.map(number => (
                  <li key={number} className={currentPage === number ? 'active' : ''}>
                    <button onClick={() => paginate(number)}>
                      {number}
                    </button>
                  </li>
              ))}
            </ul>
          </nav>
        )}
      </div>

      {/* 侧边栏区域 (已更新) */}
      <div className="sidebar-area">
        {/* 个人信息模块 (已更新) */}
          <div className="sidebar-module user-info-module">
          <h4><User size={16} /> 个人信息</h4>
              <div className="user-info-content">
                  <p>用户名: <strong>{username}</strong></p>
                  {/* --- 更新后的积分显示 --- */}
                  {/* 应用了动态的 CSS 类 (pointsClass) */}
                  <p>积分: <span className={`user-points ${pointsClass}`}>{pointsDisplay}</span></p>
                  {/* --- 更新后的等级显示 --- */}
                  <p>等级: <span className="user-level">{level}</span></p>
                  <button
                      className="sidebar-action-button"
                      onClick={handleEditProfileClick} // 点击时调用处理函数
                  >
                      编辑资料
                  </button>
                  {/*<button className="sidebar-action-button logout-button" onClick={onLogout}>退出登录</button>*/}
              </div>
          </div>


          {/* 通知中心模块 */}
          <div className="sidebar-module notification-module">
              <h4><Bell size={16}/> 通知中心</h4>
              <div className="notification-list-container">
            {notifications.length > 0 ? (
              <ul className="notification-list-sidebar">
                {notifications.map(notif => (
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
           {/* 可以添加“查看全部”链接 */}
           {notifications.length > 0 && <a href="/notifications" className="view-all-link">查看全部 »</a>}
        </div>

        {/* 可以添加其他模块，如排行榜、热门标签等 */}
        {/* <div className="sidebar-module ranking-module"><h4><BarChart2 size={16}/> 排行榜</h4> ... </div> */}

      </div>
    </div>
  );
}

export default ArticleListDashboardLayout;

