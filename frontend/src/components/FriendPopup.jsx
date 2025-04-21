import React, { useState, useEffect } from 'react';
import { UserPlus, UserCheck, UserX, Bell, Search, Trash2, MessageCircle } from 'lucide-react';
import './css/FriendPopup.css';
import ChatDialog from './ChatDialog';

const FriendPopup = ({ username, onClose }) => {
  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const [error, setError] = useState(null);
  const [friendToDelete, setFriendToDelete] = useState(null); // 要删除的好友
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // 显示删除确认对话框
  const [chatFriend, setChatFriend] = useState(null); // 当前聊天的好友
  const [loading, setLoading] = useState(false);

  // 获取好友列表
  const fetchFriends = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/friends?username=${encodeURIComponent(username)}`);
      if (!response.ok) throw new Error('获取好友列表失败');
      const data = await response.json();
      setFriends(data.friends || []);
    } catch (error) {
      console.error('获取好友列表错误:', error);
      setError('获取好友列表失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  // 获取好友请求列表
  const fetchFriendRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/friend-requests?username=${encodeURIComponent(username)}`);
      if (!response.ok) throw new Error('获取好友请求失败');
      const data = await response.json();
      setFriendRequests(data.requests || []);
      setRequestCount(data.count || 0);
    } catch (error) {
      console.error('获取好友请求错误:', error);
      setError('获取好友请求失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  // 获取好友请求数量
  const fetchRequestCount = async () => {
    if (!username) return;
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/friend-request-count?username=${encodeURIComponent(username)}`);
      if (!response.ok) throw new Error('获取请求数量失败');
      const data = await response.json();
      setRequestCount(data.count || 0);
    } catch (error) {
      console.error('获取请求数量错误:', error);
    }
  };

  // 初始加载
  useEffect(() => {
    if (username) {
      fetchFriends();
      fetchFriendRequests();
    }
  }, [username]);

  // 搜索用户
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setError(null);
    
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/users/search?query=${encodeURIComponent(searchQuery)}&username=${encodeURIComponent(username)}`);
      if (!response.ok) throw new Error('搜索用户失败');
      const data = await response.json();
      setSearchResults(data.users || []);
    } catch (error) {
      console.error('搜索用户错误:', error);
      setError('搜索用户失败，请稍后再试');
    } finally {
      setIsSearching(false);
      setLoading(false);
    }
  };

  // 发送好友请求
  const sendFriendRequest = async (targetUsername) => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/friend-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          targetUsername: targetUsername,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '发送好友请求失败');
      }

      // 更新搜索结果，将状态改为pending
      setSearchResults(searchResults.map(user => 
        user.username === targetUsername 
          ? { ...user, friendStatus: 'pending' } 
          : user
      ));
    } catch (error) {
      console.error('发送好友请求错误:', error);
      setError(error.message || '发送好友请求失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  // 响应好友请求
  const respondToFriendRequest = async (requestId, accept) => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/friend-requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accept: accept,
          username: username,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '处理好友请求失败');
      }

      // 刷新好友请求列表和好友列表
      fetchFriendRequests();
      if (accept) { // 如果接受了请求，也刷新好友列表
        fetchFriends();
      }
    } catch (error) {
      console.error('处理好友请求错误:', error);
      setError(error.message || '处理好友请求失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  // 处理删除好友点击
  const handleDeleteClick = (friend) => {
    setFriendToDelete(friend);
    setShowDeleteConfirm(true);
  };

  // 确认删除好友
  const confirmDeleteFriend = async () => {
    if (!friendToDelete) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/friend`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          friendUsername: friendToDelete.username,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '删除好友关系失败');
      }

      // 刷新好友列表
      fetchFriends();
      // 关闭确认对话框
      setShowDeleteConfirm(false);
      setFriendToDelete(null);
    } catch (error) {
      console.error('删除好友错误:', error);
      setError(error.message || '删除好友关系失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  // 取消删除好友
  const cancelDeleteFriend = () => {
    setShowDeleteConfirm(false);
    setFriendToDelete(null);
  };

  // 处理打开聊天对话框
  const handleChatClick = (friend) => {
    setChatFriend(friend);
  };

  // 关闭聊天对话框
  const closeChatDialog = () => {
    setChatFriend(null);
  };

  return (
    <>
      <div className="friend-popup">
        <div className="friend-popup-tabs">
          <button 
            className={`tab-button ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            <UserCheck size={16} />
            <span>我的好友</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            <Bell size={16} />
            <span>好友请求 {requestCount > 0 && <span className="request-count">{requestCount}</span>}</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'add' ? 'active' : ''}`}
            onClick={() => setActiveTab('add')}
          >
            <UserPlus size={16} />
            <span>添加好友</span>
          </button>
        </div>

        <div className="friend-popup-content">
          {error && (
            <div className="error-message">{error}</div>
          )}

          {/* 删除好友确认对话框 */}
          {showDeleteConfirm && friendToDelete && (
            <div className="delete-confirm-dialog">
              <p>确定要删除好友 <strong>{friendToDelete.username}</strong> 吗？</p>
              <div className="dialog-actions">
                <button className="cancel-button" onClick={cancelDeleteFriend}>取消</button>
                <button className="confirm-button" onClick={confirmDeleteFriend}>确定</button>
              </div>
            </div>
          )}

          {activeTab === 'friends' && (
            <div className="friends-list">
              <h3>我的好友</h3>
              {friends.length === 0 ? (
                <p className="empty-state">您还没有任何好友。</p>
              ) : (
                <ul>
                  {friends.map((friend) => (
                    <li key={friend.id} className="friend-item">
                      <div className="friend-avatar">
                        <div className="avatar-placeholder">{friend.username.charAt(0).toUpperCase()}</div>
                      </div>
                      <div className="friend-info">
                        <span className="friend-name">{friend.username}</span>
                      </div>
                      <div className="friend-actions">
                        <button
                          className="chat-button"
                          title="聊天"
                          onClick={() => handleChatClick(friend)}
                        >
                          <MessageCircle size={16} />
                        </button>
                        <button
                          className="delete-button"
                          title="删除好友"
                          onClick={() => handleDeleteClick(friend)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="friend-requests">
              <h3>好友请求</h3>
              {friendRequests.length === 0 ? (
                <p className="empty-state">没有新的好友请求。</p>
              ) : (
                <ul>
                  {friendRequests.map((request) => (
                    <li key={request.id} className="request-item">
                      <div className="friend-avatar">
                        <div className="avatar-placeholder">{request.requester.username.charAt(0).toUpperCase()}</div>
                      </div>
                      <div className="friend-info">
                        <span className="friend-name">{request.requester.username}</span>
                      </div>
                      <div className="request-actions">
                        <button 
                          className="accept-button" 
                          onClick={() => respondToFriendRequest(request.id, true)}
                          title="接受请求"
                        >
                          <UserCheck size={18} />
                        </button>
                        <button 
                          className="reject-button" 
                          onClick={() => respondToFriendRequest(request.id, false)}
                          title="拒绝请求"
                        >
                          <UserX size={18} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {activeTab === 'add' && (
            <div className="add-friend">
              <h3>添加好友</h3>
              <form onSubmit={handleSearch} className="search-form">
                <div className="search-input-container">
                  <input
                    type="text"
                    placeholder="输入用户名搜索"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                  <button type="submit" className="search-button">
                    <Search size={16} />
                  </button>
                </div>
              </form>

              {isSearching ? (
                <p className="loading-state">搜索中...</p>
              ) : searchResults.length > 0 ? (
                <ul className="search-results">
                  {searchResults.map((user) => (
                    <li key={user.id} className="search-result-item">
                      <div className="friend-avatar">
                        <div className="avatar-placeholder">{user.username.charAt(0).toUpperCase()}</div>
                      </div>
                      <div className="friend-info">
                        <span className="friend-name">{user.username}</span>
                      </div>
                      <div className="add-friend-action">
                        {user.friendStatus === 'none' && (
                          <button 
                            className="add-friend-button" 
                            onClick={() => sendFriendRequest(user.username)}
                            title="添加好友"
                          >
                            <UserPlus size={18} />
                          </button>
                        )}
                        {user.friendStatus === 'pending' && (
                          <span className="pending-status">请求已发送</span>
                        )}
                        {user.friendStatus === 'request' && (
                          <span className="pending-status">对方已发送请求</span>
                        )}
                        {user.friendStatus === 'friends' && (
                          <span className="friend-status"><UserCheck size={18} /></span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : searchQuery && !isSearching ? (
                <p className="empty-state">未找到匹配的用户。</p>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* 聊天对话框 */}
      {chatFriend && (
        <ChatDialog 
          username={username} 
          friend={chatFriend} 
          onClose={closeChatDialog} 
        />
      )}
    </>
  );
};

export default FriendPopup; 