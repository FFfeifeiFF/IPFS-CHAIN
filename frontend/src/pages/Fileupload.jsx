import React, { useState } from 'react';
import '../components/css/FileUpload.css'; // 引入 CSS 文件
import { useLocation } from 'react-router-dom';

function FileUpload() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileDescription, setFileDescription] = useState('');
  const [fileInfo, setFileInfo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [ipfsHash, setIpfsHash] = useState(null);
  const [points, setPoints] = useState(1); // 新增：积分数值状态，默认值为1
 const location = useLocation();
  // 确保能正确获取 username
  const username = location.state?.username;
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setUploadSuccess(false);
    setUploadError(null);
    setIpfsHash(null);

    if (file) {
      setFileInfo({
        name: file.name,
        size: file.size,
        lastModifiedDate: new Date(file.lastModified).toLocaleDateString(),
      });
    } else {
      setFileInfo(null);
    }
  };

  const handleDescriptionChange = (event) => {
    setFileDescription(event.target.value);
  };

  // 新增：处理积分变化的函数
  const handlePointsChange = (event) => {
    const value = parseInt(event.target.value, 10);
    if (value >= 1) { // 确保积分至少为1
      setPoints(value);
    }
  };

  const handleUpload = async () => {
     if (!selectedFile || !username) {
      alert('请选择要上传的文件并确保您已登录。');
      return;
    }

    setUploading(true);
    setUploadSuccess(false);
    setUploadError(null);
    setIpfsHash(null);

    try {
      // 步骤 1: 上传文件到 IPFS
      const formDataIPFS = new FormData();
      formDataIPFS.append('file', selectedFile);
      formDataIPFS.append('file', selectedFile);          // 添加文件，字段名 'file' 需与后端 c.Request.FormFile("file") 匹配
      formDataIPFS.append('username', username);          // 添加用户名，字段名 'username' 需与后端 c.Request.FormValue("username") 匹配

      const ipfsResponse = await fetch('http://localhost:8080/upload', {
        method: 'POST',
        body: formDataIPFS,
      });

      if (!ipfsResponse.ok) {
        const errorData = await ipfsResponse.json();
        throw new Error(`IPFS 上传失败: ${errorData.message || ipfsResponse.statusText}`);
      }

      const ipfsData = await ipfsResponse.json();
      const generatedIpfsHash = ipfsData.tx_hash;
      setIpfsHash(generatedIpfsHash);

      // 步骤 2: 上传文件信息到数据库（包括积分）
      const uploadDate = new Date().toISOString();
      const dbData = {
        user: username,
        filename: selectedFile.name,
        uploadDate: uploadDate,
        txHash: generatedIpfsHash,
        description: fileDescription,
        points: points, // 新增：传递积分数值
      };

      const dbResponse = await fetch('http://localhost:8080/db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dbData),
      });

      if (!dbResponse.ok) {
        const errorData = await dbResponse.json();
        throw new Error(`数据库保存失败: ${errorData.message || dbResponse.statusText}`);
      }

      const dbResult = await dbResponse.json();
      console.log('数据库保存成功:', dbResult);

      setUploading(false);
      setUploadSuccess(true);
      setSelectedFile(null);
      setFileDescription('');
      setFileInfo(null);
      setPoints(1); // 重置积分

    } catch (error) {
      console.error('上传过程中发生错误:', error);
      setUploading(false);
      setUploadError(error.message);
    }
  };

  const handleGoBack = () => {
    window.history.back();
  };


  return (
    <div className="file-upload-container">
      <h2>文件上传</h2>
      <p>欢迎，{username}</p>
      <div className="input-group">
        <label htmlFor="file" className="label">选择文件:</label>
        <input type="file" id="file" onChange={handleFileChange} className="input"/>
      </div>

      {fileInfo && (
        <div className="file-info">
          <h3>文件信息:</h3>
          <p>文件名: {fileInfo.name}</p>
          <p>文件大小: {(fileInfo.size / 1024).toFixed(2)} KB</p>
          <p>修改时间: {fileInfo.lastModifiedDate}</p>
        </div>
      )}

      <div className="input-group">
        <label htmlFor="description" className="label">文件简介:</label>
        <textarea
          id="description"
          value={fileDescription}
          onChange={handleDescriptionChange}
          placeholder="威胁信息简单介绍"
          className="textarea"
        />
      </div>

      {/* 新增：积分数值选择 */}
      <div className="input-group">
        <label htmlFor="points" className="label">积分数值:</label>
        <input
          type="number"
          id="points"
          min="1"
          value={points}
          onChange={handlePointsChange}
          className="input"
        />
      </div>

      <div className="button-group">
        <button
          onClick={handleUpload}
          className={`button ${!selectedFile ? 'button-disabled' : ''}`}
          disabled={!selectedFile || uploading}
        >
          {uploading ? '上传中...' : '上传文件'}
        </button>
        <button onClick={handleGoBack} className="button">
          返回
        </button>
      </div>

      {uploadSuccess && (
        <p className="success-message">
          上传成功! TX Hash: {ipfsHash}
        </p>
      )}
      {uploadError && (
        <p className="error-message">上传失败: {uploadError}</p>
      )}
    </div>
  );
}

export default FileUpload;