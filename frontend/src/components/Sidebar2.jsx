import React from 'react';
import './css/Sidebar.css';

function Sidebar2(props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <h3>个人信息</h3>
        <div className="user-info">
            用户名：<p>{props.username}</p>
        </div>
      </div>
      <div className="sidebar-section">
        <h3>推荐阅读</h3>
        <ul>
          <li><a href="/">React 教程</a></li>
          <li><a href="/">区块链 高级技巧</a></li>
          <li><a href="/">以太坊</a></li>
          {/* 添加更多推荐阅读 */}
        </ul>
      </div>
      <div className="sidebar-section">
        <h3>热门标签</h3>
        <div className="tags">
          <a href="/">React</a>
          <a href="/">JavaScript</a>
          <a href="/">前端</a>
          <a href="/">Node.js</a>
          {/* 添加更多热门标签 */}
        </div>
      </div>
      {/* 添加更多侧边栏内容 */}
    </aside>
  );
}

export default Sidebar2;