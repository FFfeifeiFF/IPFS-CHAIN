import React, { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import './css/ChatDialog.css';

const ChatDialog = ({ username, friend, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const webSocketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // 建立WebSocket连接
  useEffect(() => {
    if (!username) return;
    
    // 创建WebSocket连接
    const apiUrl = process.env.REACT_APP_API_URL; 
    const wsUrlBase = apiUrl.replace(/^http/, 'ws');
    const wsUrl = `${wsUrlBase}/ws/chat?username=${encodeURIComponent(username)}`;
    const ws = new WebSocket(wsUrl); 
    webSocketRef.current = ws;
    
    // 连接建立时
    ws.onopen = () => {
      console.log('WebSocket连接已建立');
      setIsConnected(true);
      setError(null); // 清除任何现有的错误消息
    };
    
    // 接收消息
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('收到WebSocket消息:', data);
        
        // 如果收到消息，说明连接是好的
        setIsConnected(true);
        setError(null);
        
        // 处理不同类型的消息
        switch (data.type) {
          case 'new_message':
            // 仅处理与当前聊天对象相关的消息
            if (data.data.sender.username === friend.username || 
                data.data.receiver.username === friend.username) {
              setMessages(prev => [...prev, data.data]);
            }
            break;
          case 'message_sent':
            // 添加发送成功的消息到列表
            if (data.data.receiver.username === friend.username) {
              setMessages(prev => [...prev, data.data]);
            }
            break;
          default:
            break;
        }
      } catch (error) {
        console.error('解析WebSocket消息错误:', error);
      }
    };
    
    // 连接关闭
    ws.onclose = (event) => {
      console.log('WebSocket连接已关闭', event);
      
      // 如果是正常关闭(1000或1001)，不显示错误
      if (event.code !== 1000 && event.code !== 1001) {
        setError('聊天服务连接已断开，请刷新页面重试');
      }
      
      setIsConnected(false);
      
      // 尝试重连
      setTimeout(() => {
        if (webSocketRef.current?.readyState === WebSocket.CLOSED) {
          console.log('尝试重新连接WebSocket...');
          const newWs = new WebSocket(wsUrl);
          webSocketRef.current = newWs;
          
          // 为新的WebSocket连接配置事件处理
          newWs.onopen = ws.onopen;
          newWs.onmessage = ws.onmessage;
          newWs.onclose = ws.onclose;
          newWs.onerror = ws.onerror;
        }
      }, 3000); // 3秒后尝试重连
    };
    
    // 连接错误
    ws.onerror = (error) => {
      console.error('WebSocket错误详情:', error);
      console.log('WebSocket当前状态:', ws.readyState);
      
      // 只有在没有已建立连接的情况下才设置错误
      if (ws.readyState !== WebSocket.OPEN) {
        setError('聊天服务连接失败，正在尝试重连...');
      }
    };
    
    // 清理函数
    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [username]);
  
  // 获取历史消息
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/messages?username=${encodeURIComponent(username)}&friendUsername=${encodeURIComponent(friend.username)}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setMessages(data.messages || []);
      } catch (error) {
        console.error('获取消息错误:', error);
        setError('无法加载消息历史，请稍后再试');
      } finally {
        setLoading(false);
      }
    };
    
    if (username && friend.username) {
      fetchMessages();
    }
  }, [username, friend.username]);
  
  // 自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // 发送消息
  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !isConnected) return;
    
    try {
      // 通过WebSocket发送消息
      const messageData = {
        type: 'chat',
        data: {
          receiverUsername: friend.username,
          content: newMessage,
        }
      };
      
      webSocketRef.current.send(JSON.stringify(messageData));
      
      // 清空输入框
      setNewMessage('');
    } catch (error) {
      console.error('发送消息错误:', error);
      setError('发送消息失败，请稍后再试');
    }
  };
  
  // 格式化时间
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };
  
  return (
    <div className="chat-dialog-overlay">
      <div className="chat-dialog">
        <div className="chat-dialog-header">
          <h3>
            {friend.username} 
            {!isConnected && <span className="connection-status">(连接中...)</span>}
          </h3>
          <button className="close-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        
        <div className="chat-messages">
          {error && (
            <div className="connection-error">
              <div className="error-message">{error}</div>
            </div>
          )}
          
          {loading && messages.length === 0 ? (
            <div className="loading-messages">加载消息中...</div>
          ) : messages.length === 0 ? (
            <div className="no-messages">没有消息记录，开始聊天吧！</div>
          ) : (
            messages.map((message) => (
              <div 
                key={message.id} 
                className={`message ${message.sender.username === username ? 'sent' : 'received'}`}
              >
                <div className="message-content">
                  {message.content}
                  <span className="message-time">
                    {formatTime(message.created_at)}
                  </span>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <form className="chat-input-form" onSubmit={sendMessage}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={isConnected ? "输入消息..." : "正在连接聊天服务..."}
            className="chat-input"
            disabled={!isConnected}
          />
          <button type="submit" className="send-button" disabled={!newMessage.trim() || !isConnected}>
            <Send size={18} />
          </button>
        </form>
        
        {!isConnected && !error && (
          <div className="connecting-indicator">
            正在连接聊天服务...
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatDialog; 