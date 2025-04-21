import { Link } from 'react-router-dom';
import React, { useState } from 'react';
import '../css/Login.css'; // 引入 CSS 样式文件
import { useNavigate } from 'react-router-dom';
function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate(); // 初始化 useNavigate
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    // 在这里处理登录逻辑，例如发送 API 请求
    if (!username || !password) {
      setError('用户名和密码不能为空');
      return;
    }
    try {
      // const response = await fetch('http://localhost:8080/login', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ username, password }), // 将注册信息作为 JSON 发送
      // });
      const response = await fetch(`${process.env.REACT_APP_API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }), // 将注册信息作为 JSON 发送
      });
       const data = await response.json(); // 解析后端返回的 JSON 数据

      if (response.ok) {
        setSuccess(data.message || '登录成功！'); // 使用后端返回的消息，或者默认消息
        navigate('/depart_list', { state: { username: username } });
      } else {
        setError(data.error || '登录失败，请重试'); // 使用后端返回的错误信息，或者默认错误信息
      }
    }catch (error) {
      console.error('登录过程中发生错误:', error);
      setError('登录失败，请检查网络连接或稍后重试');
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h2>登录</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">用户名</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">{success}</p>}
          <button type="submit" className="login-button">
            登录
          </button>
        </form>
        <div className="login-footer">
          <Link to={"/index"}>忘记密码？</Link>
          <Link to={"/regisiter"}>注册账号</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;