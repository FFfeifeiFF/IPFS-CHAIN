import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download, BookmarkX, Share2 } from 'lucide-react';
import Head from '../components/Head';
import Footer from '../components/Footer';
import '../css/MyFavorites.css';
import ShareDialog from '../components/ShareDialog';

const MyFavorites = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const username = location.state?.username;
  
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [removingId, setRemovingId] = useState(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedArticleForShare, setSelectedArticleForShare] = useState(null);
  
  // 获取收藏列表
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!username) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/favorites?username=${encodeURIComponent(username)}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setFavorites(data.favorites || []);
      } catch (error) {
        console.error('获取收藏列表错误:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFavorites();
  }, [username]);
  
  // 处理下载点击
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
    } catch (error) {
      console.error("下载错误:", error);
      alert(`下载出错: ${error.message || "未知错误"}`);
    } finally {
      setDownloadingId(null);
    }
  };
  
  // 取消收藏
  const handleRemoveFavorite = async (article) => {
    if (removingId === article.id) return;
    
    setRemovingId(article.id);
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/favorites`, {
        method: 'DELETE',
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
        throw new Error(errorData.error || '取消收藏失败');
      }
      
      // 从列表中移除
      setFavorites(favorites.filter(f => f.id !== article.id));
      
    } catch (error) {
      console.error('取消收藏错误:', error);
      alert(`取消收藏失败: ${error.message || '未知错误'}`);
    } finally {
      setRemovingId(null);
    }
  };
  
  // 分享文章
  const handleShareClick = (article) => {
    setSelectedArticleForShare(article);
    setShareDialogOpen(true);
  };
  
  // 关闭分享对话框
  const handleCloseShareDialog = () => {
    setShareDialogOpen(false);
    setSelectedArticleForShare(null);
  };
  
  // 风险等级计算
  const getRiskLevel = (points) => {
    if (points >= 15) return "high";
    if (points >= 5) return "medium";
    return "low";
  };
  
  // 处理标题点击，查看文章简介
  const handleTitleClick = (e, summary) => {
    e.preventDefault();
    alert(summary || "暂无该文件的简介信息");
  };
  
  // 获取当前页的收藏
  const getCurrentFavorites = () => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return favorites.slice(indexOfFirstItem, indexOfLastItem);
  };
  
  // 分页
  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };
  
  if (!username) {
    return (
      <div className="login-prompt-container">
        <p>请先登录。</p>
      </div>
    );
  }
  
  return (
    <div className="app-container">
      <Head username={username} />
      <div className="main-container">
        <div className="favorites-container">
          <h1 className="page-title">我的收藏</h1>
          
          {loading ? (
            <div className="loading-message">正在加载收藏列表...</div>
          ) : error ? (
            <div className="error-message">获取收藏失败: {error}</div>
          ) : favorites.length === 0 ? (
            <div className="empty-message">
              <p>您还没有收藏任何文章</p>
              <button 
                className="go-to-explore" 
                onClick={() => navigate('/depart_list', { state: { username } })}
              >
                浏览文章
              </button>
            </div>
          ) : (
            <>
              <div className="favorites-list">
                {getCurrentFavorites().map(article => {
                  const riskLevel = getRiskLevel(article.points);
                  
                  return (
                    <div key={article.id} className={`favorite-item risk-${riskLevel}`}>
                      <div className="favorite-content">
                        <div className="favorite-header">
                          <h3 className="favorite-title">
                            <a 
                              href="#" 
                              onClick={(e) => handleTitleClick(e, article.summary)}
                            >
                              {article.title}
                            </a>
                          </h3>
                          <span className={`risk-badge ${riskLevel}`}>
                            {riskLevel === "high" ? "高危" : 
                             riskLevel === "medium" ? "中危" : "低危"}
                          </span>
                        </div>
                        
                        <div className="favorite-meta">
                          <span>作者: {article.author}</span>
                          <span>日期: {article.date}</span>
                          <span>积分: {article.points}</span>
                        </div>
                        
                        {article.summary && (
                          <div className="favorite-summary">
                            <p>{article.summary}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="favorite-actions">
                        <button
                          className={`action-button ${downloadingId === article.id ? 'loading' : ''}`}
                          title="下载"
                          onClick={() => handleDownloadClick(
                            article.id, 
                            article.title || `article_${article.id}.bin`,
                            article.points
                          )}
                          disabled={downloadingId === article.id}
                        >
                          {downloadingId === article.id ? (
                            <div className="spinner"></div>
                          ) : (
                            <Download size={18} />
                          )}
                        </button>
                        
                        <button
                          className={`action-button ${removingId === article.id ? 'loading' : ''}`}
                          title="取消收藏"
                          onClick={() => handleRemoveFavorite(article)}
                          disabled={removingId === article.id}
                        >
                          {removingId === article.id ? (
                            <div className="spinner"></div>
                          ) : (
                            <BookmarkX size={18} />
                          )}
                        </button>
                        
                        <button
                          className="action-button"
                          title="分享"
                          onClick={() => handleShareClick(article)}
                        >
                          <Share2 size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* 分页 */}
              {favorites.length > itemsPerPage && (
                <div className="pagination">
                  <ul>
                    {Array.from({ length: Math.ceil(favorites.length / itemsPerPage) }, (_, i) => (
                      <li key={i + 1} className={currentPage === i + 1 ? 'active' : ''}>
                        <button onClick={() => paginate(i + 1)}>{i + 1}</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Footer />
      
      {/* 分享对话框 */}
      {shareDialogOpen && selectedArticleForShare && (
        <ShareDialog
          username={username}
          article={{
            ...selectedArticleForShare,
            riskLevel: getRiskLevel(selectedArticleForShare.points)
          }}
          onClose={handleCloseShareDialog}
        />
      )}
    </div>
  );
};

export default MyFavorites; 