import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Modal } from "antd";
import { Download, Bookmark, Share2 } from "lucide-react"; // 引入图标
import "./css/SearchResults2.css";

function SearchResults2() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const resultsPerPage = 8; // 每页显示8个结果
  const [visibleModal, setVisibleModal] = useState(false);
  const [currentSummary, setCurrentSummary] = useState("");

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get("q");
  const username = searchParams.get("username");

  // 获取搜索结果的 Effect
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `http://localhost:8080/search?q=${encodeURIComponent(
            query
          )}&page=${currentPage}&pageSize=${resultsPerPage}&username=${encodeURIComponent(
            username || ""
          )}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Search results:", data);

        // 检查API返回数据结构
        if (!data || (!Array.isArray(data) && !Array.isArray(data.data))) {
          console.error("API返回的数据结构不正确:", data);
          setResults([]);
          setTotalResults(0);
          setError("API返回的数据结构不正确");
          return;
        }

        // 处理不同的API返回结构
        let resultsArray = Array.isArray(data)
          ? data
          : Array.isArray(data.data)
          ? data.data
          : [];

        // 为每个结果添加风险等级和标签
        const resultsWithAttributes = resultsArray.map((result) => {
          return {
            ...result,
            ...getArticleAttributes(result),
          };
        });

        setResults(resultsWithAttributes);
        setTotalResults(data.totalCount || resultsWithAttributes.length || 0);
      } catch (err) {
        console.error("获取搜索结果失败:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [query, currentPage, username]);

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
    if (
      new Date(article.date) > new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    ) {
      // 3天内算最新
      tags.push({ text: "最新", type: "latest" });
    }

    return { riskLevel, tags };
  };

  // 点击文章标题显示摘要
  const handleTitleClick = (e, summary) => {
    e.preventDefault();
    setCurrentSummary(summary || "暂无该文件的简介信息");
    setVisibleModal(true);
  };

  // 处理下载点击
  const handleDownloadClick = async (
    articleId,
    suggestedFilename,
    articlePoints
  ) => {
    // 这里可以实现下载逻辑，与ArticleList组件中的类似
    console.log(
      `下载文件: ID=${articleId}, 文件名=${suggestedFilename}, 积分=${articlePoints}`
    );
    alert(`将下载: ${suggestedFilename}`);
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
                <p className="result-author">发布者: {result.author}</p>
                <p className="result-points">积分: {result.points}</p>
              </div>
              <div className="result-actions">
                <button
                  className="action-button"
                  title="下载"
                  onClick={() =>
                    handleDownloadClick(
                      result.id,
                      result.filename || `${result.title}.bin`,
                      result.points
                    )
                  }
                >
                  <Download size={16} />
                </button>
                <button className="action-button" title="收藏">
                  <Bookmark size={16} />
                </button>
                <button className="action-button" title="分享">
                  <Share2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && pageCount > 1 && (
        <div className="pagination">
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
        </div>
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
    </div>
  );
}

export default SearchResults2;
