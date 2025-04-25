import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, BarChart2, Shield, RefreshCw } from 'lucide-react';
import Head from '../components/Head';
import Footer from '../components/Footer';
import '../css/HomePage.css';

function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [popularSearches, setPopularSearches] = useState([
    'Apache Log4j', 'Windows 11', '勒索软件', 'DDOS', 'SQL注入', 'CVE-2023'
  ]);
  const [typingEffect, setTypingEffect] = useState('');
  const [typingIndex, setTypingIndex] = useState(0);
  const placeholderTexts = [
    '搜索威胁情报...',
    '查找最新安全漏洞...',
    '探索安全防护方案...',
    '了解网络攻击技术...'
  ];
  
  const navigate = useNavigate();
  const location = useLocation();
  const username = location.state?.username;

  // 打字机效果
  useEffect(() => {
    const interval = setInterval(() => {
      const currentPlaceholder = placeholderTexts[typingIndex];
      if (typingEffect.length < currentPlaceholder.length) {
        setTypingEffect(currentPlaceholder.substring(0, typingEffect.length + 1));
      } else {
        // 当前文本打完后，等待一段时间后切换到下一个文本
        setTimeout(() => {
          setTypingEffect('');
          setTypingIndex((prevIndex) => (prevIndex + 1) % placeholderTexts.length);
        }, 2000);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [typingEffect, typingIndex]);

  // 处理搜索查询变化
  const handleInputChange = (event) => {
    setSearchQuery(event.target.value);
  };

  // 处理搜索按钮点击 - 与Head组件保持一致
  const handleSearchClick = () => {
    if (searchQuery.trim() !== '') {
      // 与Head.jsx中的搜索逻辑保持一致
      navigate(`/search2?q=${encodeURIComponent(searchQuery)}${username ? `&username=${encodeURIComponent(username)}` : ''}`);
    }
  };

  // 处理回车键搜索
  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && searchQuery.trim() !== '') {
      handleSearchClick();
    }
  };

  // 处理热门搜索标签点击
  const handleTagClick = (tag) => {
    setSearchQuery(tag);
    // 直接调用搜索函数，确保逻辑一致
    navigate(`/search2?q=${encodeURIComponent(tag)}${username ? `&username=${encodeURIComponent(username)}` : ''}`);
  };

  return (
    <div className="homepage-container">
      <Head username={username} />
      
      <main className="homepage-content">
        <div className="search-container">
          <div className="title-section">
            <h1 className="welcome-title">欢迎使用<span className="highlight">威胁情报共享平台</span></h1>
            <p className="welcome-subtitle">一站式查询、分享和管理威胁情报资源，及时掌握最新安全动态</p>
          </div>
          
          <div className="search-box">
            <div className="search-input-container">
              <input
                type="text"
                placeholder={typingEffect}
                value={searchQuery}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                className="search-input"
              />
              <button 
                className="search-button"
                onClick={handleSearchClick}
                disabled={!searchQuery.trim()}
              >
                <Search size={20} />
                搜索
              </button>
            </div>
            
            <div className="search-tips">
              <p>热门搜索: 
                {popularSearches.map((tag, index) => (
                  <span 
                    key={index} 
                    className="search-tag"
                    onClick={() => handleTagClick(tag)}
                  >
                    {tag}
                  </span>
                ))}
              </p>
            </div>
          </div>
          
          <div className="features-container">
            <div className="feature-card">
              <div className="feature-icon">
                <BarChart2 size={36} color="#4285f4" />
              </div>
              <h3>数据分析</h3>
              <p>威胁情报统计分析，快速了解安全态势</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Shield size={36} color="#34a853" />
              </div>
              <h3>安全存储</h3>
              <p>区块链加密存储，确保数据安全可信</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <RefreshCw size={36} color="#fbbc05" />
              </div>
              <h3>及时更新</h3>
              <p>实时同步全球最新安全漏洞和威胁情报</p>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

export default HomePage; 