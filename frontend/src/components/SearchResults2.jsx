import React, { useState, useEffect } from 'react';
import './css/ArticleList.css';
import { useLocation } from 'react-router-dom';


function SearchResults2() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const searchQuery = searchParams.get('q');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://localhost:8080/search?q=${searchQuery}`); // 确保你的 Go 后端接口是 /api/search
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setSearchResults(data);
      } catch (error) {
        console.error("Error fetching search results:", error);
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    if (searchQuery) {
      fetchData();
    }
  }, [searchQuery]);

  if (!searchQuery) {
    return <div>请输入搜索关键词。</div>;
  }

  if (loading) {
    return <div>加载中...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
      <div>
          <h2>搜索结果 for: "{searchQuery}"</h2>
          {searchResults && Array.isArray(searchResults) && searchResults.length > 0 ? (
               searchResults.map(article => (
          <div key={article.id} className="article-card">
            <h3><a href={`/article/${article.id}`}>{article.title}</a></h3>
            <p className="article-meta">
              <span>作者：{article.author}</span>
              <span>日期：{article.date}</span>
              <span>积分：{article.points}</span>
            </p>
            <p className="article-summary">{article.summary}</p>
            <div className="article-actions">
              <a>下载文件</a>
              {/* 添加点赞、评论等功能 */}
            </div>
          </div>
               ))
          ) : (
              <p>没有找到相关结果。</p>
          )}
      </div>
  );
}

export default SearchResults2;