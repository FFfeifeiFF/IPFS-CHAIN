import React, { useState, useEffect } from 'react';
import './css/ArticleList.css';

function ArticleList() {
  const [articles, setArticles] = useState(null); // 初始化为 null
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [articlesPerPage] = useState(5);
  const [totalCount, setTotalCount] = useState(0);
  const [downloadingId, setDownloadingId] = useState(null); // null 表示没有文件在下载
  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `http://localhost:8080/articles?page=${currentPage}&pageSize=${articlesPerPage}`
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setArticles(data.data);
        setTotalCount(data.totalCount);
      } catch (error) {
        console.error("获取文章数据失败:", error);
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [currentPage, articlesPerPage]);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

   // --- 新增：处理下载点击的函数 ---
  const handleDownloadClick = async (articleId, suggestedFilename) => {
    if (downloadingId === articleId) return; // 如果当前文件已在下载，则不执行任何操作
    setDownloadingId(articleId); // 设置当前正在下载的文章 ID
    console.log(`请求下载文章 ID: ${articleId}`);

    try {
      const downloadApiUrl = `http://localhost:8080/download?id=${articleId}`; // 假设这是你的下载后端地址

      const response = await fetch(downloadApiUrl, {
        method: 'POST', // 或 POST，取决于你的下载接口设
      });

      if (!response.ok) {
        let errorMsg = `下载文件失败: 服务器错误 ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
        } catch (jsonError) {
          errorMsg = `下载文件失败: ${response.statusText} (${response.status})`;
        }
        throw new Error(errorMsg);
      }

      // --- 触发浏览器下载  ---
      const contentDisposition = response.headers.get('content-disposition');
      let filename = suggestedFilename || `article_${articleId}_file`; // 备用文件名
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?=['"]?([^'";]+)['"]?/i);
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1]);
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
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('下载错误:', error);
      alert(`下载文件时出错: ${error.message || '未知错误'}`); // 显示错误给用户
    } finally {
      setDownloadingId(null); // 无论成功或失败，都重置下载状态
    }
  };


  if (loading) {
    return <p>正在加载文章...</p>;
  }

  if (error) {
    return <p>加载文章失败: {error.message}</p>;
  }

  const pageNumbers = [];
  for (let i = 1; i <= Math.ceil(totalCount / articlesPerPage); i++) {
    pageNumbers.push(i);
  }
  return (
    <main className="article-list">
      <h2>最新文章</h2>
      {articles && articles.map(article => (  // 使用条件渲染
        <div key={article.id} className="article-card">
          <h3><a href={`/article/${article.id}`}>{article.title}</a></h3>
          <p className="article-meta">
            <span>作者：{article.author}</span>
            <span>日期：{article.date}</span>
            <span>积分：{article.points}</span>
          </p>
          <p className="article-summary">{article.summary}</p>
          <div className="article-actions">
            <button
                // 假设你的 article 对象中有 filename 属性
                // 如果没有，你可能需要从其他地方获取或硬编码一个，或者让后端决定
                onClick={() => handleDownloadClick(article.id, article.filename || `${article.title}.ext`)}
                disabled={downloadingId === article.id} // 当这个文件正在下载时禁用按钮
            >
              {downloadingId === article.id ? '下载中...' : '下载文件'}
            </button>
            {/* 添加点赞、评论等功能 */}
          </div>
        </div>

      ))}
      {!articles && !loading && !error && <p>没有找到文章。</p>} {/* 当没有文章时显示提示 */}
      <nav className="pagination">
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
    </main>
  );
}

export default ArticleList;