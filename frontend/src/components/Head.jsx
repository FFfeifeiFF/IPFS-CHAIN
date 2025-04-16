import React,{ useState, useRef, useEffect } from 'react';
import { UserPlus } from 'lucide-react'; // 引入好友图标
import './css/Header.css';
import { Link,useNavigate, useLocation } from 'react-router-dom'; // 引入 useLocation
import FriendPopup from './FriendPopup'; // 好友弹窗组件

function Head(props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFriendPopup, setShowFriendPopup] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const friendPopupRef = useRef(null);
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

  const handleLogoClick = () => {
    navigate('/depart_list', { state: { username: props.username } });
  };

  const toggleFriendPopup = () => {
    setShowFriendPopup(!showFriendPopup);
  };

  // 获取好友请求数量
  const fetchFriendRequestCount = async () => {
    if (!props.username) return;
    
    try {
      const response = await fetch(`http://localhost:8080/friend-request-count?username=${encodeURIComponent(props.username)}`);
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setRequestCount(data.count || 0);
    } catch (error) {
      console.error('获取好友请求数量错误:', error);
    }
  };

  // 初始加载和定时刷新请求数量
  useEffect(() => {
    if (props.username) {
      fetchFriendRequestCount();
      
      // 设置定时器，每分钟刷新一次
      const timer = setInterval(fetchFriendRequestCount, 60000);
      
      return () => clearInterval(timer);
    }
  }, [props.username]);

  // 点击外部关闭好友弹窗
  useEffect(() => {
    function handleClickOutside(event) {
      if (friendPopupRef.current && !friendPopupRef.current.contains(event.target)) {
        setShowFriendPopup(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo" onClick={handleLogoClick}>威胁情报共享平台</div>
        <div className="navigation">
          <a href="/depart_list">首页</a>
          <Link to={"/fileupload"} state={{username:props.username}}>
          上传
            </Link>
          <Link to={"/myfile"} state={{username:props.username}}>
          我的文件
            </Link>
          <Link to={"/file-stats"} state={{username:props.username}}>
          文件统计
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
        {props.username && (
          <div className="friend-icon-container" ref={friendPopupRef}>
            <button 
              className={`friend-icon-button ${requestCount > 0 ? 'has-notification' : ''}`}
              onClick={toggleFriendPopup}
              title="我的好友"
            >
              <UserPlus size={20} />
              {requestCount > 0 && <span className="notification-badge">{requestCount}</span>}
            </button>
            {showFriendPopup && (
              <FriendPopup username={props.username} onClose={() => setShowFriendPopup(false)} />
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export default Head;