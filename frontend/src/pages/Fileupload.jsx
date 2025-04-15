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
  const [points, setPoints] = useState(1); // 积分数值状态，默认值为1
  const [useFileName, setUseFileName] = useState(true); // 是否自动使用文件名
  const [fileType, setFileType] = useState('doc'); // 文件类型筛选
  const [autoDescription, setAutoDescription] = useState(false); // 是否自动生成简介
  const [customFileName, setCustomFileName] = useState(''); // 新增：自定义文件名
  const location = useLocation();
  // 确保能正确获取 username
  const username = location.state?.username;
  
  // 定义允许的文件类型
  const fileTypes = {
    doc: '文档文件 (.doc, .docx, .txt)',
    pdf: 'PDF文件 (.pdf)',
    xml: 'XML文件 (.xml)',
    image: '图片文件 (.jpg, .png, .gif)'
  };
  
  // 根据选择的文件类型返回accept属性值
  const getAcceptTypes = () => {
    switch(fileType) {
      case 'doc':
        return '.doc,.docx,.txt';
      case 'pdf':
        return '.pdf';
      case 'xml':
        return '.xml';
      case 'image':
        return '.jpg,.jpeg,.png,.gif';
        default:
          return '.doc,.docx,.txt,.pdf,.xml,.jpg,.jpeg,.png,.gif';
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    
    if (file) {
      // 检查文件类型是否被允许
      const fileExt = file.name.split('.').pop().toLowerCase();
      const allowedExtensions = getAcceptTypes().split(',').map(ext => ext.replace('.', ''));
      
      if (!allowedExtensions.includes(fileExt)) {
        setUploadError(`不支持的文件类型: ${fileExt}。请上传以下类型的文件: ${getAcceptTypes()}`);
        event.target.value = ''; // 清空文件输入
        return;
      }
      
      setSelectedFile(file);
      setUploadSuccess(false);
      setUploadError(null);
      setIpfsHash(null);

      setFileInfo({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModifiedDate: new Date(file.lastModified).toLocaleDateString(),
      });
      
      // 如果启用了自动使用文件名
      if (useFileName) {
        // 去掉文件扩展名
        const fileName = file.name.split('.').slice(0, -1).join('.');
        setFileDescription(fileName);
        setCustomFileName(fileName);
      } else {
        setFileInfo(null);
        setSelectedFile(null);
      }
      
      // 如果启用了自动生成简介
      if (autoDescription) {
        let autoDesc = `这是一个${file.name}文件`;
        
        if (fileExt === 'pdf') {
          autoDesc += '，包含PDF格式的威胁信息';
        } else if (['doc', 'docx', 'txt'].includes(fileExt)) {
          autoDesc += '，包含文档格式的威胁信息';
        } else if (fileExt === 'xml') {
          autoDesc += '，包含XML格式的结构化威胁数据';
        } else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExt)) {
          autoDesc += '，包含图像格式的威胁信息';
        }
        
        setFileDescription(autoDesc);
      }
    } else {
      setFileInfo(null);
      setSelectedFile(null);
    }
  };


  const handleDescriptionChange = (event) => {
    setFileDescription(event.target.value);
  };
  // 处理自定义文件名变化
  const handleCustomFileNameChange = (event) => {
    setCustomFileName(event.target.value);
  };
  // 处理积分变化的函数
  const handlePointsChange = (event) => {
    const value = parseInt(event.target.value, 10);
    if (value >= 1) { // 确保积分至少为1
      setPoints(value);
    }
  };
  
  // 处理文件类型变化
  const handleFileTypeChange = (event) => {
    setFileType(event.target.value);
  };
  
  // 处理自动使用文件名选项变化
  const handleUseFileNameChange = (event) => {
    setUseFileName(event.target.checked);
  };
  
  // 处理自动生成简介选项变化
  const handleAutoDescriptionChange = (event) => {
    setAutoDescription(event.target.checked);
    
    // 如果启用自动简介且已有文件，则生成简介
    if (event.target.checked && selectedFile) {
      const fileExt = selectedFile.name.split('.').pop().toLowerCase();
      let autoDesc = `这是一个${selectedFile.name}文件`;
      
      if (fileExt === 'pdf') {
        autoDesc += '，包含PDF格式的威胁信息';
      } else if (['doc', 'docx', 'txt'].includes(fileExt)) {
        autoDesc += '，包含文档格式的威胁信息';
      } else if (fileExt === 'xml') {
        autoDesc += '，包含XML格式的结构化威胁数据';
      } else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExt)) {
        autoDesc += '，包含图像格式的威胁信息';
      }
      
      setFileDescription(autoDesc);
    }
  };

  const handleUpload = async () => {
     if (!selectedFile || !username) {
      alert('请选择要上传的文件并确保您已登录。');
      return;
    }
    // 再次验证文件类型（以防文件被篡改）
    const fileExt = selectedFile.name.split('.').pop().toLowerCase();
    const allowedExtensions = getAcceptTypes().split(',').map(ext => ext.replace('.', ''));
    
    if (!allowedExtensions.includes(fileExt)) {
      setUploadError(`不支持的文件类型: ${fileExt}。请上传以下类型的文件: ${getAcceptTypes()}`);
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
      formDataIPFS.append('username', username);
      formDataIPFS.append('fileType', fileType);

      // 如果有自定义文件名，则添加到表单数据
      if (customFileName.trim()) {
        formDataIPFS.append('customFileName', customFileName.trim());
      }
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
        filename: customFileName.trim() || selectedFile.name,
        uploadDate: uploadDate,
        txHash: generatedIpfsHash,
        description: fileDescription,
        points: points,
        fileType:  fileType, // 添加文件类型信息
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
      
     {/* 文件类型选择 */}
     <div className="input-group">
        <label htmlFor="fileType" className="label">选择文件类型:</label>
        <select 
          id="fileType" 
          value={fileType} 
          onChange={handleFileTypeChange}
          className="select-input"
        >
          {Object.entries(fileTypes).map(([key, value]) => (
            <option key={key} value={key}>{value}</option>
          ))}
        </select>
        <p className="file-type-hint">只能上传以下类型的文件: {getAcceptTypes()}</p>
      </div>
      
      <div className="input-group">
        <label htmlFor="file" className="label">选择文件:</label>
        <input 
          type="file" 
          id="file" 
          onChange={handleFileChange} 
          className="input"
          accept={getAcceptTypes()}
        />
      </div>

      {/* 自定义文件名输入框 - 新增 */}
      <div className="input-group">
        <label htmlFor="customFileName" className="label">自定义文件名 (可选):</label>
        <input
          type="text"
          id="customFileName"
          value={customFileName}
          onChange={handleCustomFileNameChange}
          placeholder="留空则使用原文件名"
          className="input"
        />
      </div>

      {fileInfo && (
        <div className="file-info">
          <h3>文件信息:</h3>
          <p>原始文件名: {fileInfo.name}</p>
          <p>文件类型: {fileInfo.type || '未知'}</p>
          <p>文件大小: {(fileInfo.size / 1024).toFixed(2)} KB</p>
          <p>修改时间: {fileInfo.lastModifiedDate}</p>
          <p>选择的文件类型: {fileTypes[fileType]}</p>
        </div>
      )}
      
      {/* 自动使用文件名选项 */}
      <div className="checkbox-group">
        <input
          type="checkbox"
          id="useFileName"
          checked={useFileName}
          onChange={handleUseFileNameChange}
        />
        <label htmlFor="useFileName">自动使用文件名作为简介</label>
      </div>
      
      {/* 自动生成简介选项 */}
      <div className="checkbox-group">
        <input
          type="checkbox"
          id="autoDescription"
          checked={autoDescription}
          onChange={handleAutoDescriptionChange}
        />
        <label htmlFor="autoDescription">自动生成文件简介</label>
      </div>

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