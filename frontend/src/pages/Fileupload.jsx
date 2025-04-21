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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pointsExplanation, setPointsExplanation] = useState(''); // 积分计算说明
  const [fileComplexity, setFileComplexity] = useState('medium'); // 系统自动判断的文件复杂度
  const location = useLocation();
  // 确保能正确获取 username
  const username = location.state?.username;
  
  // 定义允许的文件类型
  const fileTypes = {
    doc: '文档文件 (.doc, .docx, .txt)',
    pdf: 'PDF文件 (.pdf)',
    xml: '通用XML文件 (.xml)',
    image: '图片文件 (.jpg, .png, .gif)',
    stix: 'STIX格式 (.json, .xml)'  // 添加STIX格式
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
      case 'stix':
        return '.json,.xml';  // STIX格式支持JSON和XML
      default:
        return '.doc,.docx,.txt,.pdf,.xml,.jpg,.jpeg,.png,.gif,.json';
    }
  };

  // 根据文件大小自动判断复杂度
  const determineComplexity = (fileSize, fileType) => {
    // 文件大小（MB）
    const sizeInMB = fileSize / (1024 * 1024);
    
    // 根据不同文件类型设置不同的阈值
    let lowThreshold = 0.5;  // 默认低复杂度阈值 (MB)
    let highThreshold = 5.0; // 默认高复杂度阈值 (MB)
    
    // 根据文件类型调整阈值
    switch(fileType) {
      case 'doc':
        // 文档文件通常文本较多，所以较小文件也可能有复杂内容
        lowThreshold = 0.2;
        highThreshold = 2.0;
        break;
      case 'pdf':
        // PDF可能包含图像，因此阈值设置较大
        lowThreshold = 1.0;
        highThreshold = 8.0;
        break;
      case 'xml':
        // XML文件通常是结构化数据，大小直接关联复杂度
        lowThreshold = 0.1;
        highThreshold = 1.0;
        break;
      case 'stix':
        // STIX文件是高度结构化的威胁情报数据
        lowThreshold = 0.05;
        highThreshold = 0.5;
        break;
      case 'image':
        // 图像文件大小与内容复杂度关联性较弱，但仍可作为参考
        lowThreshold = 1.0;
        highThreshold = 10.0;
        break;
    }
    
    // 确定复杂度等级
    if (sizeInMB < lowThreshold) {
      return 'low';
    } else if (sizeInMB >= highThreshold) {
      return 'high';
    } else {
      return 'medium';
    }
  };

  // 严谨的文件积分计算方法
  const calculatePoints = (file, type, complexity) => {
    if (!file) return 1;
    
    // 1. 基础积分（根据文件类型）
    let basePoints = 0;
    switch(type) {
      case 'pdf':
        basePoints = 3; // PDF文件基础积分为3
        break;
      case 'doc':
        basePoints = 2; // 文档文件基础积分为2
        break;
      case 'xml':
        basePoints = 4; // XML文件基础积分为4（结构化数据可能更有价值）
        break;
      case 'image':
        basePoints = 2; // 图片文件基础积分为2
        break;
      case 'stix':
        basePoints = 6; // STIX格式基础积分为6（结构化威胁情报数据，价值很高）
        break;
      default:
        basePoints = 1;
    }
    
    // 2. 文件大小积分（每MB增加0.5积分，最多5分）
    // 同时对不同类型有不同的大小系数
    const sizeInMB = file.size / (1024 * 1024);
    let sizeCoefficient = 1.0;
    
    switch(type) {
      case 'pdf': 
        sizeCoefficient = 0.7; // PDF文件可能含有图片，所以大小因子较小
        break;
      case 'doc':
        sizeCoefficient = 0.9; // 文档文件的大小通常与内容量成正比
        break;
      case 'xml':
      case 'stix':
        sizeCoefficient = 1.2; // 结构化数据，大小通常意味着更多的信息
        break;
      case 'image':
        sizeCoefficient = 0.5; // 图片大小与价值关系不大
        break;
      default:
        sizeCoefficient = 1.0;
    }
    
    // 计算大小积分，使用对数比例以避免大文件过度积分
    let sizePoints = 0;
    if (sizeInMB > 0) {
      sizePoints = Math.min(Math.floor(Math.log(sizeInMB + 1) * 2 * sizeCoefficient), 5);
    }
    
    // 3. 关键词积分（最多3分）
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.split('.').pop();
    let keywordPoints = 0;
    
    // 高价值关键词
    const highValueKeywords = [
      'threat', 'security', 'vulnerability', 'attack', 'malware', 'exploit', 
      'cve', 'cyber', 'intelligence', 'apt', 'ransomware', 'backdoor',
      '威胁', '安全', '漏洞', '攻击', '恶意软件', '后门', '情报'
    ];
    
    // 中等价值关键词
    const mediumValueKeywords = [
      'network', 'system', 'analysis', 'report', 'detection', 'prevention',
      'protection', 'defense', '报告', '分析', '检测', '防御', '系统'
    ];
    
    // 根据文件名中的关键词计算积分
    let highValueMatches = 0;
    for (const keyword of highValueKeywords) {
      if (fileName.includes(keyword)) {
        highValueMatches++;
      }
    }
    
    let mediumValueMatches = 0;
    for (const keyword of mediumValueKeywords) {
      if (fileName.includes(keyword)) {
        mediumValueMatches++;
      }
    }
    
    // 最多计算3个高价值关键词和3个中等价值关键词
    keywordPoints = Math.min(highValueMatches, 3) + Math.min(mediumValueMatches, 3) * 0.5;
    
    // 4. 复杂度积分（根据自动判断的复杂度）
    let complexityPoints = 0;
    switch(complexity) {
      case 'low':
        complexityPoints = 1;
        break;
      case 'medium':
        complexityPoints = 2;
        break;
      case 'high':
        complexityPoints = 3;
        break;
      default:
        complexityPoints = 2;
    }
    
    // 5. STIX格式特殊加分
    let stixFormatPoints = 0;
    if (type === 'stix') {
      // STIX格式特殊加分
      stixFormatPoints = 2;
      
      // 尝试验证STIX格式 (只对JSON文件)
      if (fileExtension === 'json') {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target.result.substring(0, 1000).toLowerCase();
            if (
              content.includes('"type":') && 
              content.includes('"id":') && 
              (content.includes('"spec_version":') || content.includes('"objects":'))
            ) {
              // 看起来确实是STIX格式
              stixFormatPoints += 2;
              // 重新计算总积分
              const newTotal = Math.round(basePoints + sizePoints + keywordPoints + complexityPoints + stixFormatPoints);
              setPoints(newTotal);
              
              // 更新说明
              let explanation = `基础积分(${basePoints})`;
              if (sizePoints > 0) explanation += ` + 文件大小加分(${sizePoints})`;
              if (keywordPoints > 0) explanation += ` + 关键词加分(${keywordPoints.toFixed(1)})`;
              if (complexityPoints > 0) explanation += ` + 复杂度加分(${complexityPoints})`;
              if (stixFormatPoints > 0) explanation += ` + STIX格式加分(${stixFormatPoints})`;
              explanation += ` = 总积分(${newTotal})`;
              
              setPointsExplanation(explanation);
            }
          } catch (error) {
            console.log('读取STIX文件时出错:', error);
          }
        };
        reader.readAsText(file);
      }
    }
    
    // 计算总积分 (四舍五入)
    const totalPoints = Math.round(basePoints + sizePoints + keywordPoints + complexityPoints + stixFormatPoints);
    
    // 生成积分计算说明
    let explanation = `基础积分(${basePoints})`;
    if (sizePoints > 0) explanation += ` + 文件大小加分(${sizePoints})`;
    if (keywordPoints > 0) explanation += ` + 关键词加分(${keywordPoints.toFixed(1)})`;
    if (complexityPoints > 0) explanation += ` + 复杂度加分(${complexityPoints})`;
    if (stixFormatPoints > 0) explanation += ` + STIX格式加分(${stixFormatPoints})`;
    explanation += ` = 总积分(${totalPoints})`;
    
    setPointsExplanation(explanation);
    
    return totalPoints;
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
      
      // 根据文件大小自动判断复杂度
      const complexity = determineComplexity(file.size, fileType);
      setFileComplexity(complexity);
      
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
        } else if (['json', 'xml'].includes(fileExt) && fileType === 'stix') {
          autoDesc += '，包含STIX格式的结构化威胁情报数据';
          
          // STIX格式特殊处理 - 可以尝试读取并验证文件内容
          if (fileExt === 'json') {
            // 为JSON格式的STIX文件读取前100个字符，检查是否包含STIX关键字
            const reader = new FileReader();
            reader.onload = (e) => {
              try {
                const content = e.target.result.substring(0, 100).toLowerCase();
                if (content.includes('stix') || content.includes('threat') || content.includes('indicator')) {
                  setFileDescription(autoDesc + '，初步验证符合STIX格式');
                }
              } catch (error) {
                console.log('读取STIX文件时出错:', error);
              }
            };
            reader.readAsText(file);
          }
        }
        
        setFileDescription(autoDesc);
      }
      
      // 自动计算积分（基于文件类型、大小和自动判断的复杂度）
      const calculatedPoints = calculatePoints(file, fileType, complexity);
      setPoints(calculatedPoints);
    } else {
      setFileInfo(null);
      setSelectedFile(null);
      setPointsExplanation('');
    }
  };

  const handleDescriptionChange = (event) => {
    setFileDescription(event.target.value);
  };
  
  // 处理自定义文件名变化
  const handleCustomFileNameChange = (event) => {
    setCustomFileName(event.target.value);
  };
  
  // 处理文件类型变化
  const handleFileTypeChange = (event) => {
    setFileType(event.target.value);
    
    // 如果有文件，根据新的文件类型重新计算复杂度和积分
    if (selectedFile) {
      const newComplexity = determineComplexity(selectedFile.size, event.target.value);
      setFileComplexity(newComplexity);
      const calculatedPoints = calculatePoints(selectedFile, event.target.value, newComplexity);
      setPoints(calculatedPoints);
    }
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
      } else if (['json', 'xml'].includes(fileExt) && fileType === 'stix') {
        autoDesc += '，包含STIX格式的结构化威胁情报数据';
      }
      
      setFileDescription(autoDesc);
    }
  };

  // 验证STIX格式内容
  const validateStixContent = (content) => {
    try {
      // 简单检查JSON内容是否包含STIX必需的字段
      const data = JSON.parse(content);
      
      // 检查是否包含STIX 2.x必需的字段
      if (data.type && data.id && data.spec_version) {
        return true;
      }
      
      // 检查是否包含多个STIX对象的数组
      if (Array.isArray(data.objects) && data.objects.length > 0) {
        return data.objects.some(obj => obj.type && obj.id);
      }
      
      return false;
    } catch (e) {
      console.error('STIX验证错误:', e);
      return false;
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
    
    // 对STIX格式进行特殊验证
    if (fileType === 'stix' && ['json', 'xml'].includes(fileExt)) {
      if (fileExt === 'json') {
        try {
          const reader = new FileReader();
          const validatePromise = new Promise((resolve, reject) => {
            reader.onload = (e) => {
              try {
                const isValid = validateStixContent(e.target.result);
                resolve(isValid);
              } catch (error) {
                reject(error);
              }
            };
            reader.onerror = (error) => reject(error);
          });
          
          reader.readAsText(selectedFile);
          
          // 等待验证完成
          const isValidStix = await validatePromise.catch(err => {
            console.error('STIX验证过程出错:', err);
            return false;
          });
          
          if (!isValidStix) {
            // 文件不是有效的STIX格式，但仍允许上传，只是给出警告
            if (!window.confirm('该文件可能不是标准的STIX格式。是否仍要上传？')) {
              return; // 用户取消上传
            }
          }
        } catch (error) {
          console.error('STIX验证错误:', error);
          // 继续上传，但记录错误
        }
      }
    }
    
    setUploading(true);
    setUploadSuccess(false);
    setUploadError(null);
    setIpfsHash(null);
    setUploadProgress(0);

    try {
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      // 步骤 1: 上传文件到 IPFS
      const formDataIPFS = new FormData();
      formDataIPFS.append('file', selectedFile);
      formDataIPFS.append('username', username);
      formDataIPFS.append('fileType', fileType);

      // 如果有自定义文件名，则添加到表单数据
      if (customFileName.trim()) {
        formDataIPFS.append('customFileName', customFileName.trim());
      }
      const ipfsResponse = await fetch(`${process.env.REACT_APP_API_URL}/upload`, {
        method: 'POST',
        body: formDataIPFS,
      });

      if (!ipfsResponse.ok) {
        clearInterval(progressInterval);
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
        fileType: fileType,
        complexity: fileComplexity  // 添加复杂度信息
      };

      const dbResponse = await fetch(`${process.env.REACT_APP_API_URL}/db`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dbData),
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

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
      setPoints(1);
      setPointsExplanation('');

    } catch (error) {
      console.error('上传过程中发生错误:', error);
      setUploading(false);
      setUploadError(error.message);
      setUploadProgress(0);
    }
  };

  const handleGoBack = () => {
    window.history.back();
  };

  // 渲染文件类型图标
  const getFileTypeIcon = () => {
    return `file-icon-${fileType}`;
  };

  // 获取复杂度的中文描述
  const getComplexityText = (complexity) => {
    switch(complexity) {
      case 'low': return '低 (简单IOC)';
      case 'medium': return '中 (标准威胁报告)';
      case 'high': return '高 (全面分析/高价值情报)';
      default: return '中 (标准威胁报告)';
    }
  };

  return (
    <div className="upload-page-container">
      <div className="upload-header">
        <h1>文件上传</h1>
        <div className="user-welcome">
          <div className="user-avatar">
            {username?.charAt(0).toUpperCase() || '?'}
          </div>
          <span className="user-name">欢迎，{username}</span>
        </div>
      </div>

      <div className="upload-content">
        <div className="upload-card">
          <div className="card-header">
            <h2>上传新文件</h2>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">文件类型</label>
              <div className="select-wrapper">
                <select 
                  className="form-select"
                  value={fileType} 
                  onChange={handleFileTypeChange}
                >
                  {Object.entries(fileTypes).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
              </div>
              <div className="field-hint">支持格式: {getAcceptTypes()}</div>
              
              {fileType === 'stix' && (
                <div className="info-box stix-info">
                  <div className="info-icon"></div>
                  <div className="info-content">
                    <p className="info-title">STIX格式 - 结构化威胁信息表达</p>
                    <p className="info-text">STIX是一种标准化的网络威胁情报格式，上传此类文件会获得更高积分。系统会验证STIX文件的格式有效性。</p>
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">选择文件</label>
              <div className="file-input-container">
                <input 
                  type="file" 
                  className="file-input"
                  accept={getAcceptTypes()}
                  onChange={handleFileChange}
                />
                <div className="file-input-overlay">
                  <div className="file-input-button">选择文件</div>
                  <div className="file-input-text">
                    {selectedFile ? selectedFile.name : '未选择文件'}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">自定义文件名 (可选)</label>
              <input
                type="text"
                className="form-input"
                value={customFileName}
                onChange={handleCustomFileNameChange}
                placeholder="留空则使用原文件名"
              />
            </div>
            
            <div className="checkbox-options">
              <div className="checkbox-group modern">
                <input
                  type="checkbox"
                  id="useFileName"
                  checked={useFileName}
                  onChange={handleUseFileNameChange}
                />
                <label htmlFor="useFileName">自动使用文件名作为简介</label>
              </div>
              
              <div className="checkbox-group modern">
                <input
                  type="checkbox"
                  id="autoDescription"
                  checked={autoDescription}
                  onChange={handleAutoDescriptionChange}
                />
                <label htmlFor="autoDescription">自动生成文件简介</label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">文件简介</label>
              <textarea
                className="form-textarea"
                value={fileDescription}
                onChange={handleDescriptionChange}
                placeholder="请输入威胁信息简介，帮助他人了解文件内容..."
                rows="4"
              />
            </div>

            <div className="form-group">
              <label className="form-label">积分设置（自动计算）</label>
              <div className="points-input-container">
                <div className="form-input points-input disabled">
                  {points}
                </div>
                <div className="points-badge">{points} 积分</div>
              </div>
              {pointsExplanation && (
                <div className="points-explanation">
                  <div className="explanation-icon"></div>
                  <p>{pointsExplanation}</p>
                </div>
              )}
              {!pointsExplanation && (
                <div className="field-hint">
                  积分根据文件类型、大小和内容自动计算。高质量文件将获得更高积分值。
                </div>
              )}
            </div>
          </div>

          {uploading && (
            <div className="upload-progress-container">
              <div className="upload-progress-bar">
                <div className="upload-progress-fill" style={{width: `${uploadProgress}%`}}></div>
              </div>
              <div className="upload-progress-text">{uploadProgress}%</div>
            </div>
          )}

          {uploadSuccess && (
            <div className="upload-result success">
              <div className="result-icon success-icon"></div>
              <div className="result-content">
                <h3>上传成功！</h3>
                <p>您的文件已成功上传并保存到区块链。</p>
                <p>TX Hash: <span className="hash-text">{ipfsHash}</span></p>
              </div>
            </div>
          )}

          {uploadError && (
            <div className="upload-result error">
              <div className="result-icon error-icon"></div>
              <div className="result-content">
                <h3>上传失败</h3>
                <p>{uploadError}</p>
              </div>
            </div>
          )}

          <div className="card-footer">
            <button
              className={`upload-button ${!selectedFile || uploading ? 'disabled' : ''}`}
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <div className="upload-status">
                  <div className="loading-spinner"></div>
                  <span>上传中...</span>
                </div>
              ) : '上传文件'}
            </button>
            <button className="back-button" onClick={handleGoBack}>
              返回
            </button>
          </div>
        </div>

        {fileInfo && (
          <div className="upload-card">
            <div className="card-header">
              <h2>文件信息</h2>
            </div>
            <div className="card-body">
              <div className="file-preview">
                <div className={`file-preview-icon ${getFileTypeIcon()}`}></div>
                <div className="file-preview-name">{customFileName.trim() || fileInfo.name}</div>
              </div>
              <div className="file-details">
                <div className="file-detail-item">
                  <span className="detail-label">原始文件名</span>
                  <span className="detail-value">{fileInfo.name}</span>
                </div>
                <div className="file-detail-item">
                  <span className="detail-label">文件类型</span>
                  <span className="detail-value">{fileInfo.type || '未知'}</span>
                </div>
                <div className="file-detail-item">
                  <span className="detail-label">文件大小</span>
                  <span className="detail-value">{(fileInfo.size / 1024).toFixed(2)} KB</span>
                </div>
                <div className="file-detail-item">
                  <span className="detail-label">修改时间</span>
                  <span className="detail-value">{fileInfo.lastModifiedDate}</span>
                </div>
                <div className="file-detail-item">
                  <span className="detail-label">文件分类</span>
                  <span className="detail-value">{fileTypes[fileType]}</span>
                </div>
                <div className="file-detail-item">
                  <span className="detail-label">文件复杂度</span>
                  <span className="detail-value">
                    {getComplexityText(fileComplexity)}
                  </span>
                </div>
                <div className="file-detail-item">
                  <span className="detail-label">积分</span>
                  <span className="detail-value points-value">{points} 积分</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FileUpload;