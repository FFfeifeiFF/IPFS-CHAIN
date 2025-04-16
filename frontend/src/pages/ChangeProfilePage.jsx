import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom'; // 确保导入 useLocation
import '../css/ChangeProfilePage.css'; // 确保 CSS 文件存在
import { Search } from 'lucide-react';


function ChangeProfilePage() {
  const location = useLocation(); // 获取 location 对象 
  const navigate = useNavigate();
  const username = location.state?.username || '默认用户名';
  console.log('ChangeProfilePage mounted with username:', username);
  console.log('Location state:', location.state);

  // 状态：存储从后端获取的当前用户信息
  const [currentUser, setCurrentUser] = useState({ username: `${username}`, email: 'email' });
  // 状态：标记是否正在从后端加载用户信息
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);

  // 状态：表单数据
  const [formData, setFormData] = useState({
    newUsername: '',
    newEmail: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // 状态：错误、成功消息、提交加载状态
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false); // 提交表单时的加载状态

  // --- 组件挂载时，从后端获取当前用户信息 ---
  useEffect(() => {
    console.log('Fetching profile for username:', username);
    const fetchUserProfile = async () => {
      setIsFetchingProfile(true);
      setError(null); // 清除之前的错误 

      try {
        console.log('Making request to:', `http://localhost:8080/changeprofile?username=${encodeURIComponent(username)}`);
        // 假设获取用户信息的接口是 GET /user/profile
        const response = await fetch(`http://localhost:8080/changeprofile?username=${encodeURIComponent(username)}`, {
          method: 'GET',
        });
        const data = await response.json();
        console.log('Response data:', data);
        if (!response.ok) {
          throw new Error(data.error || `获取用户信息失败 (${response.status})`);
        }
        // 使用从后端获取的数据更新状态
        setCurrentUser({ username: data.username, email: data.email });

      } catch (err) {
        console.error('获取用户信息错误:', err);
        setError(err.message || '无法加载用户信息，请稍后重试。');
        // 发生错误时，可以尝试使用 location.state 中的用户名作为备用显示
        const fallbackUsername = location.state?.username || '用户';
        setCurrentUser({ username: fallbackUsername, email: '加载失败' });
      } finally {
        setIsFetchingProfile(false); // 加载完成
      }
    };

    if (username) {
      fetchUserProfile();
    }
  }, [username, location.state]); // 添加 username 和 location.state 作为依赖


  // --- 处理表单输入变化 ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null); // 清除旧错误
    setSuccessMessage(''); // 清除旧成功消息
     // 实时验证密码一致性
  if (name === 'newPassword' || name === 'confirmPassword') {
    const newPassword = name === 'newPassword' ? value : formData.newPassword;
    const confirmPassword = name === 'confirmPassword' ? value : formData.confirmPassword;
    
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
    } else if (error === '两次输入的新密码不一致') {
      setError(null);
    }
  }
  };

  // --- 处理表单提交 ---
  const handleSubmit = async (e) => {
     e.preventDefault();
    setError(null);
    setSuccessMessage('');

    // --- 客户端验证 ---
    if (!formData.currentPassword) {
      setError('当前密码不能为空');
      return;
    }
    if (formData.newEmail && !/\S+@\S+\.\S+/.test(formData.newEmail)) {
        setError('请输入有效的邮箱地址');
        return;
    }
    if (formData.newPassword && formData.newPassword.length < 6) {
      setError('新密码长度不能少于6位');
      return;
    }
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }

    // 检查是否至少修改了一项 (与从服务器获取的当前值比较)
    const usernameChanged = formData.newUsername && formData.newUsername !== currentUser.username;
    const emailChanged = formData.newEmail && formData.newEmail !== currentUser.email;
    const passwordChanged = !!formData.newPassword; // 只要输入了新密码就算改变

    if (!usernameChanged && !emailChanged && !passwordChanged) {
        setError('请输入与当前不同的新用户名、新邮箱或新密码');
        return;
    }

    setIsLoading(true); // 开始提交

    // 构建请求体，只包含需要更改的字段和当前密码
    const requestBody = {
      currentPassword: formData.currentPassword,
    };
    requestBody.username=username;
    if (usernameChanged) {
      requestBody.newUsername = formData.newUsername;
    }
    if (emailChanged) {
      requestBody.newEmail = formData.newEmail;
    }
    if (passwordChanged) {
      requestBody.newPassword = formData.newPassword;
    }

    try {
        // 注意：这里的 URL 是你原来代码中的 /changeprofile
        // 确认后端更新接口是否就是这个路径，通常建议使用 /user/profile/update 或类似RESTful路径
        const response = await fetch(`http://localhost:8080/changeprofile?username=${encodeURIComponent(username)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json(); // 尝试解析所有响应的 JSON

        if (!response.ok) {
            // 使用后端返回的错误消息
            throw new Error(data.error || `更新失败 (${response.status})`);
        }

        setSuccessMessage(data.message || '个人资料更新成功！');

        // 更新成功后：
        // 1. 更新显示的当前用户信息 (使用后端返回的数据)
        const updatedUser = { ...currentUser };
        if (data.newUsername) {
            updatedUser.username = data.newUsername;
            localStorage.setItem('username', data.newUsername); // 更新 localStorage
            window.dispatchEvent(new Event('storage')); // 通知其他组件
        }
        if (data.newEmail) {
            updatedUser.email = data.newEmail;
            // 如果需要，也可以更新 localStorage 或全局状态中的 email
            // localStorage.setItem('email', data.newEmail);
        }
        setCurrentUser(updatedUser); // 更新页面显示

        // 2. 清空表单输入（特别是密码字段）
        setFormData({
            newUsername: '', // 清空输入框
            newEmail: '',    // 清空输入框
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        });

    } catch (err) {
        console.error('更新资料错误:', err);
        // 显示从 Error 对象中提取的消息
        setError(err.message || '发生未知错误，请稍后再试。');
    } finally {
        setIsLoading(false); // 结束提交
    }
  };

  // --- 处理返回按钮 ---
  const handleGoBack = () => {
    navigate(-1); // 返回上一页
  };

  // --- 渲染逻辑 ---
  // 添加加载状态显示
  if (isFetchingProfile) {
    return (
      <div className="change-profile-container">
        <div className="change-profile-card">
          <h2>修改个人资料</h2>
          <p>正在加载用户信息...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="change-profile-container">
      <div className="change-profile-card">
        <h2>修改个人资料</h2>

        {/* 显示从 state 获取的当前用户名和邮箱 */}
        <div className="current-user-info">
            <p>当前用户名: <strong>{currentUser.username || '未知'}</strong></p>
            <p>当前邮箱: <strong>{currentUser.email || '未知'}</strong></p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* 新用户名输入 */}
          <div className="form-group">
            <label htmlFor="newUsername">新用户名 (可选)</label>
            <input
              type="text"
              id="newUsername"
              name="newUsername"
              value={formData.newUsername}
              onChange={handleChange}
              placeholder="留空则不修改用户名"
              disabled={isLoading} // 提交时禁用
            />
          </div>

        {/* 新邮箱 */}
        <div className="form-group">
            <label htmlFor="newEmail">新邮箱 (可选)</label>
            <input
              type="email" // 使用 type="email" 以便利用浏览器内置验证（虽然我们也有自己的验证）
              id="newEmail"
              name="newEmail"
              value={formData.newEmail}
              onChange={handleChange}
              placeholder="留空则不修改邮箱"
              disabled={isLoading}
            />
          </div>

          {/* 当前密码输入 (必填) */}
          <div className="form-group">
            <label htmlFor="currentPassword">当前密码 <span className="required">*</span></label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              required
              disabled={isLoading} // 提交时禁用
            />
          </div>

          {/* 新密码输入 (可选) */}
          <div className="form-group">
            <label htmlFor="newPassword">新密码 (可选, 至少6位)</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="留空则不修改密码"
              minLength="6"
              disabled={isLoading} // 提交时禁用
            />
          </div>

       {/* 确认新密码 */}
          <div className="form-group">
            <label htmlFor="confirmPassword">
              确认新密码
              {formData.newPassword && <span className="required">*</span>}
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder={formData.newPassword ? '请再次输入新密码' : '无需输入'}
              required={!!formData.newPassword}
              disabled={isLoading || !formData.newPassword}
            />
            {formData.newPassword && formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
              <p className="password-mismatch">两次输入的密码不一致</p>
            )}
          </div>
          {/* 错误消息显示区域 */}
          {error && <p className="error-message">{error}</p>}

          {/* 成功消息显示区域 */}
          {successMessage && <p className="success-message">{successMessage}</p>}

          {/* 操作按钮 */}
          <div className="form-actions">
            <button type="submit" className="submit-button" disabled={isLoading}>
              {isLoading ? '正在保存...' : '保存更改'}
            </button>
            <button
              type="button"
              onClick={handleGoBack}
              // 使用与提交按钮相同的类名
              className="submit-button secondary-action" // 添加 secondary-action 用于区分，但样式由 submit-button 控制
              disabled={isLoading}
              // 可选：为次要按钮添加一点视觉区分，如果需要的话 (见 CSS 修改)
              style={{ backgroundColor: '#6c757d', marginTop: '10px' }} // 示例：灰色背景, 添加间距 (或者在CSS中为 .secondary-action 定义)
            >
              返回
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChangeProfilePage;