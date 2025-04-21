import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Modal } from "antd";
import { Download, Bookmark, BookmarkX, Share2 } from "lucide-react";
import ShareDialog from './ShareDialog';
import "./css/SearchResults2.css";

function SearchResults2({ username, query }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const resultsPerPage = 8; // 每页显示8个结果
  const [visibleModal, setVisibleModal] = useState(false);
  const [currentSummary, setCurrentSummary] = useState("");

  // --- State for actions ---
  const [downloadingId, setDownloadingId] = useState(null);
  const [favoriteStatus, setFavoriteStatus] = useState({});
  const [isToggleFavorite, setIsToggleFavorite] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedArticleForShare, setSelectedArticleForShare] = useState(null);

  const navigate = useNavigate();

  // 获取搜索结果的 Effect
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query) {
        setResults([]);
        setLoading(false);
        setTotalResults(0);
        setError("请输入搜索关键词");
        return;
      }

      setLoading(true);
      setError(null);
      setResults([]);

      try {
        const apiUrl = `${process.env.REACT_APP_API_URL}/search?q=${encodeURIComponent(
          query
        )}&page=${currentPage}&pageSize=${resultsPerPage}&username=${encodeURIComponent(
          username || ""
        )}`;
        console.log("Fetching search results from:", apiUrl);
        const response = await fetch(apiUrl);

        if (!response.ok) {
            let errorMsg = `HTTP error! status: ${response.status}`;
            try {
                const errData = await response.json();
                errorMsg = errData.error || errData.message || errorMsg;
            } catch {}
            throw new Error(errorMsg);
        }

        const data = await response.json();
        console.log("Search results received:", data);

        // 检查API返回数据结构 - 现在期望是数组
        if (!Array.isArray(data)) {
          console.error("API返回的数据结构不正确 (期望数组):", data);
          setResults([]);
          setTotalResults(0);
          setError("无法解析搜索结果 (期望数组)");
          return;
        }

        // 为每个结果添加风险等级和标签 - 直接 map data
        const resultsWithAttributes = data.map((result) => {
          return {
            ...result,
            ...getArticleAttributes(result),
          };
        });

        setResults(resultsWithAttributes);
        // **** 临时方案：使用当前页结果数量估算 totalResults ****
        // 注意：这会导致分页不准确，因为它不知道真正的总数
        // 理想情况下，后端 /search 应返回 { data: [...], totalCount: ... }
        setTotalResults(data.length);

      } catch (err) {
        console.error("获取搜索结果失败:", err);
        setError(err.message || "获取搜索结果时发生错误");
        setResults([]);
        setTotalResults(0);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [query, currentPage, username]);

  // --- Effect to check favorite status ---
  useEffect(() => {
    if (!username || results.length === 0) return;

    const checkFavoriteStatus = async () => {
      const articleIds = results.map(result => result.id).filter(id => id !== undefined);
      if (articleIds.length === 0) return;

      console.log("Checking favorite status for IDs:", articleIds);
      const statusMap = { ...favoriteStatus }; // Copy existing status
      let changed = false;

      for (const articleId of articleIds) {
          // Only check if status is not already known
          if (!statusMap.hasOwnProperty(articleId)) {
              try {
                  const response = await fetch(`${process.env.REACT_APP_API_URL}/favorites/check?username=${encodeURIComponent(username)}&articleId=${articleId}`);
                  if (response.ok) {
                      const data = await response.json();
                      statusMap[articleId] = data.isFavorited;
                      changed = true;
                  } else {
                      console.warn(`检查文章 ${articleId} 收藏状态失败: ${response.status}`);
                  }
              } catch (error) {
                  console.error(`检查收藏状态错误 (ID: ${articleId}):`, error);
              }
          }
      }
      if(changed) {
          console.log("Updating favorite status map:", statusMap);
          setFavoriteStatus(statusMap);
      }
    };

    checkFavoriteStatus();
  }, [results, username]);

  // 模拟获取文章风险等级和标签（实际应来自后端）
  const getArticleAttributes = (article) => {
    let riskLevel = "low"; // 默认低风险
    const tags = [];

    // Ensure article and points exist
    if (!article || typeof article.points === 'undefined') {
        return { riskLevel: 'low', tags: [{ text: "提示", type: "risk-low" }] };
    }

    if (article.points >= 15) {
        riskLevel = "high";
        tags.push({ text: "高危", type: "risk-high" });
    } else if (article.points >= 5) {
        riskLevel = "medium";
        tags.push({ text: "中危", type: "risk-medium" });
    } else {
        tags.push({ text: "提示", type: "risk-low" });
    }

    // Other example tags
    if (article.title && article.title.toLowerCase().includes("confluence")) {
        tags.push({ text: "Confluence", type: "product" });
    }
    if (article.author === "官方") {
        tags.push({ text: "官方发布", type: "official" });
    }
    // Simplified 'latest' tag check - ideally backend provides this
    if (article.date) { 
        try {
            const articleDate = new Date(article.date);
            if (!isNaN(articleDate) && articleDate > new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)) {
                tags.push({ text: "最新", type: "latest" });
            }
        } catch(e){ console.warn("Error parsing date for 'latest' tag:", article.date, e)}
    }

    return { riskLevel, tags };
  };

  // 点击文章标题显示摘要
  const handleTitleClick = (e, summary) => {
    e.preventDefault();
    setCurrentSummary(summary || "暂无该文件的简介信息");
    setVisibleModal(true);
  };

  // 处理下载点击 (Adapted from ArticleListDashboardLayout)
  const handleDownloadClick = async (
    articleId,
    suggestedFilename,
    articlePoints
  ) => {
      if (downloadingId === articleId) return;
      if (!username) {
        alert("请先登录才能下载");
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

        // 步骤 3: 触发浏览器下载
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
      } catch (error) {
        console.error("下载错误:", error);
        alert(`下载出错: ${error.message || "未知错误"}`);
      } finally {
        setDownloadingId(null);
      }
  };

  // 处理收藏/取消收藏点击 (Adapted from ArticleListDashboardLayout)
  const handleFavoriteClick = async (article) => {
      if (!username) {
        alert('请先登录才能收藏');
        return;
      }
      if (isToggleFavorite) return;
      setIsToggleFavorite(true);

      const articleId = article.id;
      if (typeof articleId === 'undefined') {
          console.error("收藏操作失败: 文章ID未定义", article);
          alert("收藏操作失败: 无效的文章ID");
          setIsToggleFavorite(false);
          return;
      }

      try {
        const currentStatus = favoriteStatus[articleId] || false;
        const url = `${process.env.REACT_APP_API_URL}/favorites`;
        const method = currentStatus ? 'DELETE' : 'POST';

        console.log(`Favorite Action: ${method} for article ${articleId}, user ${username}`);

        const response = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: username,
            articleId: articleId,
          }),
        });

        if (!response.ok) {
          let errorMsg = '操作失败';
          let alreadyFavorited = false;
          try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorMsg;
            alreadyFavorited = errorData.alreadyFavorited || false;
          } catch {}

          if (alreadyFavorited) {
             setFavoriteStatus(prev => ({ ...prev, [articleId]: true }));
             console.log(`文章 ${articleId} 已收藏 (重复添加)`);
          } else {
             throw new Error(errorMsg);
          }
        } else {
            const data = await response.json();
             // 更新状态
            setFavoriteStatus(prev => ({
                ...prev,
                [articleId]: data.isFavorited,
            }));
            // 显示操作结果
            alert(currentStatus ? '已取消收藏' : '收藏成功');
        }

      } catch (error) {
        console.error('收藏操作失败:', error);
        alert(`操作失败: ${error.message || '未知错误'}`);
      } finally {
        setIsToggleFavorite(false);
      }
    };

  // 处理分享点击 (Adapted from ArticleListDashboardLayout)
  const handleShareClick = (article) => {
      setSelectedArticleForShare(article);
      setShareDialogOpen(true);
    };

  // 关闭分享对话框 (Adapted from ArticleListDashboardLayout)
  const handleCloseShareDialog = () => {
      setShareDialogOpen(false);
      setSelectedArticleForShare(null);
    };

  // 分页处理
  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0);
  };

  const pageCount = Math.ceil(totalResults / resultsPerPage);
  const pageNumbers = [];
  for (let i = 1; i <= pageCount; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="search-results-container">
      <div className="search-info">
        {query ? (
          <h2>
            "{query}" 的搜索结果 ({totalResults})
          </h2>
        ) : (
          <h2>请输入搜索关键词</h2>
        )}
      </div>

      {loading && <div className="loading-message">正在加载搜索结果...</div>}

      {error && <div className="error-message">搜索出错: {error}</div>}

      {!loading && !error && results.length === 0 && query && (
        <div className="no-results-message">没有找到匹配的结果</div>
      )}

      {!loading && !error && results.length > 0 && (
        <>
          <div className="search-results-list">
            {results.map((result) => (
              <div
                key={result.id}
                className={`search-result-card risk-${result.riskLevel}`}
              >
                <div className="search-result-header">
                  <span className={`risk-badge ${result.riskLevel}`}>
                    {result.riskLevel === "high"
                      ? "高危"
                      : result.riskLevel === "medium"
                      ? "中危"
                      : "低危"}
                  </span>
                  <span className="result-date">{result.date}</span>
                </div>
                <h3
                  className="result-title"
                  onClick={(e) => handleTitleClick(e, result.summary)}
                >
                  {result.title}
                </h3>
                <div className="result-meta">
                  {result.tags && result.tags.length > 0 && (
                    <div className="result-tags">
                      {result.tags.map((tag) => (
                        <span key={tag.text} className={`tag tag-${tag.type}`}>
                          {tag.text}
                        </span>
                      ))}
                    </div>
                  )}
                  <span className="meta-item">发布者: {result.author}</span>
                  <span className="meta-item">日期: {result.date}</span>
                  <span className="meta-item">积分: {result.points}</span>
                </div>

                <div className="search-result-actions">
                  <button
                    title="下载"
                    className={`action-button ${downloadingId === result.id ? "loading" : ""}`}
                    onClick={() =>
                      handleDownloadClick(
                        result.id,
                        result.filename || `${result.title}.bin`,
                        result.points
                      )
                    }
                    disabled={downloadingId === result.id}
                  >
                    {downloadingId === result.id ? (
                      <div className="spinner-action"></div>
                    ) : (
                      <Download size={16} />
                    )}
                  </button>
                  <button
                    title={favoriteStatus[result.id] ? "取消收藏" : "收藏"}
                    className={`action-button ${favoriteStatus[result.id] ? "favorited" : ""} ${isToggleFavorite ? "disabled" : ""}`}
                    onClick={() => handleFavoriteClick(result)}
                    disabled={isToggleFavorite}
                  >
                    {favoriteStatus[result.id] ? (
                        <BookmarkX size={16} />
                    ) : (
                        <Bookmark size={16} />
                    )}
                  </button>
                  <button
                    title="分享"
                    className="action-button"
                    onClick={() => handleShareClick(result)}
                  >
                    <Share2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {pageCount > 1 && (
            <nav className="pagination-layout">
              <ul>
                {pageNumbers.map((number) => (
                  <li
                    key={number}
                    className={currentPage === number ? "active" : ""}
                  >
                    <button onClick={() => paginate(number)}>{number}</button>
                  </li>
                ))}
              </ul>
            </nav>
          )}
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
        <div style={{ padding: "20px", maxHeight: "400px", overflowY: "auto" }}>
          <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
            {currentSummary}
          </p>
        </div>
      </Modal>

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

export default SearchResults2;
