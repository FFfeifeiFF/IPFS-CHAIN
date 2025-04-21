import React, { useState, useEffect } from 'react';
import { X, Send, Search } from 'lucide-react';
import './css/ShareDialog.css';

const ShareDialog = ({ username, article, onClose }) => {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  
  // 获取好友列表
  useEffect(() => {
    const fetchFriends = async () => {
      if (!username) return;
      
      setLoading(true);
      setError('');
      
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/friends?username=${encodeURIComponent(username)}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setFriends(data.friends || []);
      } catch (error) {
        console.error('获取好友列表错误:', error);
        setError('无法加载好友列表，请稍后再试');
      } finally {
        setLoading(false);
      }
    };
    
    fetchFriends();
  }, [username]);
  
  // 搜索好友
  const filteredFriends = friends.filter(friend => 
    friend.username.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // 处理选择好友
  const handleSelectFriend = (friend) => {
    setSelectedFriend(friend);
  };
  
  // 处理分享文章信息
  const handleShare = async () => {
    if (!selectedFriend) return;
    
    setIsSending(true);
    setError(null);
    
    try {
      // 构建要分享的消息
      const shareMessage = `分享文件: ${article.title}\n\n风险等级: ${
        article.riskLevel === "high" ? "高危" : 
        article.riskLevel === "medium" ? "中危" : "低危"
      }\n发布者: ${article.author}\n日期: ${article.date}\n所需积分: ${article.points}\n\n简介: ${article.summary || "暂无简介"}`;
      
      // 发送WebSocket消息
      if (window.chatWebSocket && window.chatWebSocket.readyState === WebSocket.OPEN) {
        const messageData = {
          type: 'chat',
          data: {
            receiverUsername: selectedFriend.username,
            content: shareMessage,
          }
        };
        
        window.chatWebSocket.send(JSON.stringify(messageData));
        setShareSuccess(true);
        
        // 3秒后自动关闭
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        // 如果WebSocket未连接，则使用HTTP API发送
        const response = await fetch(`${process.env.REACT_APP_API_URL}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            senderUsername: username,
            receiverUsername: selectedFriend.username,
            content: shareMessage,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '发送消息失败');
        }
        
        setShareSuccess(true);
        
        // 3秒后自动关闭
        setTimeout(() => {
          onClose();
        }, 3000);
      }
    } catch (error) {
      console.error('分享文章错误:', error);
      setError(error.message || '分享失败，请稍后再试');
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <div className="share-dialog-overlay">
      <div className="share-dialog">
        <div className="share-dialog-header">
          <h3>分享文章</h3>
          <button className="close-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        
        <div className="share-dialog-content">
          {shareSuccess ? (
            <div className="share-success">
              <p>已成功分享给 {selectedFriend.username}</p>
            </div>
          ) : (
            <>
              <div className="article-info">
                <h4>{article.title || "未命名文件"}</h4>
                <div className="article-meta">
                  <span className={`risk-badge ${article.riskLevel}`}>
                    {article.riskLevel === "high" ? "高危" : 
                     article.riskLevel === "medium" ? "中危" : "低危"}
                  </span>
                  <span>作者: {article.author}</span>
                  <span>日期: {article.date}</span>
                  <span>积分: {article.points}</span>
                </div>
                {article.summary && (
                  <div className="article-summary">
                    <p>{article.summary}</p>
                  </div>
                )}
              </div>
              
              <div className="friend-selection">
                <div className="search-container">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="搜索好友..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
                
                {loading ? (
                  <div className="loading-message">加载好友列表中...</div>
                ) : error ? (
                  <div className="error-message">{error}</div>
                ) : friends.length === 0 ? (
                  <div className="no-friends-message">您还没有添加任何好友</div>
                ) : filteredFriends.length === 0 ? (
                  <div className="no-results-message">没有找到匹配的好友</div>
                ) : (
                  <div className="friends-list">
                    {filteredFriends.map((friend) => (
                      <div
                        key={friend.id}
                        className={`friend-item ${selectedFriend && selectedFriend.id === friend.id ? 'selected' : ''}`}
                        onClick={() => handleSelectFriend(friend)}
                      >
                        <div className="friend-avatar">
                          <div className="avatar-placeholder">{friend.username.charAt(0).toUpperCase()}</div>
                        </div>
                        <div className="friend-name">{friend.username}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="share-actions">
                <button
                  className="share-button"
                  disabled={!selectedFriend || isSending}
                  onClick={handleShare}
                >
                  {isSending ? '分享中...' : '分享'}
                  {!isSending && <Send size={16} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareDialog; 