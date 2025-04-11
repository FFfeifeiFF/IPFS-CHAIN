import React,{ useState } from 'react';
import './css/Header.css';
import { Link,useNavigate } from 'react-router-dom';

function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleSearchClick = () => {
    if (searchQuery.trim() !== '') {
      navigate(`/search?q=${searchQuery}`);
    }
  };



  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">威胁情报共享平台</div>
        <div className="navigation">
          <a href="/">首页</a>
          <a href="/login">博客</a>
          <a href="/login">资讯</a>
          <a href="/login">上传</a>
          {/* 添加更多导航链接 */}
        </div>
      </div>
      <div className="header-right">
        <div className="search-bar">
          <input
              type="text"
              placeholder="搜索..."
              value={searchQuery}
              onChange={handleInputChange}
          />
          <button onClick={handleSearchClick}>搜索</button>
        </div>
        <div className="user-actions">
          <Link to="/login">
            <button>登录</button>
          </Link>
          <Link to={"/regisiter"}>
            <button>注册</button>
          </Link>
        </div>
      </div>
    </header>
  );
}

export default Header;