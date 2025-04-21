import React, { useState } from 'react';
import '../css/Regisiter.css'; // 引入 CSS 样式文件
import { Link } from 'react-router-dom'; // 假设你使用了 react-router-dom

//注册界面
function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!username || !email || !password || !confirmPassword) {
      setError('请填写所有字段');
    }

    if (password !== confirmPassword) {
      setError('两次密码不一致');
      return;
    }

    // 简单验证（可选，但推荐）
    if (!email.includes('@')) {
      setError('请输入有效的邮箱地址');
      return;
    }

    const dataToSend = { username, email, password };

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend), // 将注册信息作为 JSON 发送
      });

      const data = await response.json(); // 解析后端返回的 JSON 数据

      if (response.ok) {
        setSuccess(data.message || '注册成功！'); // 使用后端返回的消息，或者默认消息
        // 可以进行页面跳转或者状态更新，例如：
        // history.push('/login');
      } else {
        setError(data.error || '注册失败，请重试'); // 使用后端返回的错误信息，或者默认错误信息
      }
    } catch (error) {
      console.error('注册过程中发生错误:', error);
      setError('注册失败，请检查网络连接或稍后重试');
    }
  };

  return (
    <div className="register-container">
      <div className="register-form">
        <h2>注册</h2>
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
            <label htmlFor="email">邮箱</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱"
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
          <div className="input-group">
            <label htmlFor="confirmPassword">确认密码</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="请再次输入密码"
              required
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">{success}</p>}
          <button type="submit" className="register-button">
            注册
          </button>
        </form>
        <div className="register-footer">
          <Link to="/Login">已有账号？去登录</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;