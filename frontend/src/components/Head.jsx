import React,{ useState } from 'react';
import './css/Header.css';
import { Link,useNavigate, useLocation } from 'react-router-dom'; // 引入 useLocation

function Head(props) {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation(); // 获取当前 location 对象

  const handleInputChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleSearchClick = () => {
    if (searchQuery.trim() !== '') {
      // 从当前的 location.state 中获取 username，如果不存在则不传递
      const currentUsername = location.state?.username || props.username; // 优先使用 state，其次使用 props

      navigate(`/search2?q=${searchQuery}${currentUsername ? `&username=${currentUsername}` : ''}`);
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">威胁情报共享平台</div>
        <div className="navigation">
          <a href="/depart_list">首页</a>
          <a href="/login">博客</a>
          <a href="/login">资讯</a>
          <Link to={"/fileupload"} state={{username:props.username}}>
          上传
            </Link>
          <Link to={"/myfile"} state={{username:props.username}}>
          我的文件
            </Link>
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
      </div>
    </header>
  );
}

export default Head;