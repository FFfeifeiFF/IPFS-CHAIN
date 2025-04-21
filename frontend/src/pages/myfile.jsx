import React, { useState, useEffect, useCallback } from 'react'; // Import useCallback
import { useLocation, useNavigate } from 'react-router-dom';
import {Table, Button, Modal, message, Input, Space, Card, Form, InputNumber, Avatar} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  SearchOutlined,
  ContainerOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import '../css/FileManager.css';

const { Search } = Input;
const { TextArea } = Input;

const FileManager = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const location = useLocation();
  const username = location.state?.username;

  // --- 1. Define fetchArticles using useCallback ---
  const fetchArticles = useCallback(async () => {
    // Don't fetch if username is not available yet
    if (!username) {
        setArticles([]);
        setTotalCount(0);
        return;
    }

    setLoading(true);
    setError(null);
    console.log(`Fetching page: ${currentPage}, size: ${pageSize}, search: ${searchText}, user: ${username}`); // Debug log
    try {
      const apiUrl = `${process.env.REACT_APP_API_URL}/fileupdate?page=${currentPage}&pageSize=${pageSize}&username=${encodeURIComponent(username)}&search=${encodeURIComponent(searchText)}`
      const response = await fetch(apiUrl);
      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
            const errorData = await response.json(); // Try to parse backend error
            errorMsg = errorData.error || errorMsg;
        } catch(e) {
            const textData = await response.text(); // Fallback to text
            errorMsg = textData || errorMsg;
        }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      setArticles(data.data || []);
      setTotalCount(data.totalCount || 0);

      // --- Optional: Handle empty page after delete ---
      // If current page becomes empty after fetch (and it's not page 1), go to previous page
      if (currentPage > 1 && data.data.length === 0 && data.totalCount > 0) {
          console.log(`Current page ${currentPage} is empty after fetch, going to page ${currentPage - 1}`);
          setCurrentPage(currentPage - 1); // This will trigger useEffect again to fetch the previous page
      }
      // --- End Optional ---

    } catch (error) {
      console.error("获取文章数据失败:", error);
      setError(`获取数据失败: ${error.message}`);
      setArticles([]); // Clear articles on error
      setTotalCount(0); // Clear total count on error
    } finally {
      setLoading(false);
    }
    // Dependencies for useCallback: fetchArticles needs to be redefined if these change
  }, [currentPage, pageSize, username, searchText]); // Add username and searchText

  // --- 2. useEffect now just calls fetchArticles ---
  useEffect(() => {
    // 当 username 首次可用时触发 fetch
    if (username) {
        fetchArticles();
    } else {
        // 如果 username 丢失，可能需要提示用户或重定向
        console.warn("FileManager: Username is not available in location state.");
        setError("无法获取用户信息，请确保您已正确登录并导航至此页面。");
        setArticles([]);
        setTotalCount(0);
    }
  }, [fetchArticles, username]); // 添加 username 作为依赖项，确保 username 变化时重新获取


  const handleDelete = async (articleId) => {
      // 确保 username 存在
     if (!username) {
        message.error("无法获取用户信息，无法执行删除操作。");
        return;
     }

     Modal.confirm({
      title: '确认删除',
      content: '您确定要删除这篇文章吗？此操作不可撤销。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/fileupdate/${articleId}?username=${encodeURIComponent(username)}`, {
            method: 'DELETE',
            headers: {
              // DELETE 通常不需要 Content-Type，除非你发送了 body (不推荐)
              // 'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
             // Use improved error handling
             let errorMessage = `HTTP error! status: ${response.status}`;
             try {
               const errorData = await response.json();
               if (errorData && errorData.error) {
                 errorMessage = errorData.error;
               } else {
                 const fallbackText = await response.text();
                 errorMessage = fallbackText || errorMessage;
               }
             } catch (e) {
                try {
                 const fallbackText = await response.text();
                 errorMessage = fallbackText || errorMessage;
               } catch (textErr) {}
             }
             throw new Error(errorMessage);
          }
          message.success('文章删除成功');

          // --- 3. Call fetchArticles directly after successful delete ---
          // No need to call setCurrentPage(1) unless you specifically want to go to page 1
          // Calling fetchArticles() will reload the *current* page's data.
          // If the current page becomes empty, the logic inside fetchArticles will handle going back.
          fetchArticles();

        } catch (error) {
          console.error("删除文章失败:", error);
          message.error(`文章删除失败: ${error.message}`);
        }
      },
    });
  };

  const handleEdit = (article) => {
    setEditingArticle(article);
    form.setFieldsValue({
      title: article.title,
      points: article.points,
      summary: article.summary,
    });
    setIsEditModalVisible(true);
  };

  const handleEditConfirm = async () => {
    if (!editingArticle) return;

    // 确保 username 存在
    if (!username) {
       message.error("无法获取用户信息，无法执行更新操作。");
       return;
    }

    try {
      const values = await form.validateFields();
      const payload = {
        title: values.title,
        points: values.points,
        summary: values.summary,
        username: username, // 将 username 添加到请求体中
      };

      // 使用新的 API 端点和 PUT 方法
      console.log("Updating article with ID:", editingArticle.id);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/fileupdate/${editingArticle.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
          // Use improved error handling
          let errorMessage = `HTTP error! status: ${response.status}`;
          try {
              const errorData = await response.json();
              errorMessage = errorData.error || errorMessage;
          } catch(e) {
              const textData = await response.text();
              errorMessage = textData || errorMessage;
          }
          throw new Error(errorMessage);
      }

      message.success('文章更新成功');
      setIsEditModalVisible(false);
      setEditingArticle(null); // Clear editing state
      form.resetFields(); // Reset form fields

      // --- 4. Call fetchArticles directly after successful update ---
      // Remove the locally defined fetchArticles function here
      fetchArticles(); // Reload current page data

    } catch (error) {
      // Handle form validation or fetch errors
      if (error.response) {
          console.error("更新文章失败 (API):", error);
          message.error(`文章更新失败: ${error.message}`);
      } else if (error.errorFields) {
          console.log('Form Validation Failed:', error);
          // Don't show generic message if validation fails, Antd highlights fields
      } else {
          console.error("更新文章失败:", error);
          message.error(`文章更新失败: ${error.message || '请稍后重试'}`);
      }
    }
  };

  const columns = [
    // ... your columns definition remains the same ...
     {
      title: '标题', dataIndex: 'title', key: 'title',
      render: (text) => (<Space><Avatar icon={<ContainerOutlined />} /><span>{text}</span></Space>),
    },
    { title: '积分', dataIndex: 'points', key: 'points', render: (points) => points ?? '-', width: 100, align: 'center', },
    { title: '介绍', dataIndex: 'summary', key: 'summary', ellipsis: true, width: 300, render: (summary) => summary || '-', },
    {
      title: '上传时间', dataIndex: 'date', key: 'date',
      render: (time) => { try { return time ? new Date(time).toLocaleString() : '-'; } catch (e) { return time || '-'; } },
      sorter: (a, b) => new Date(a.date) - new Date(b.date), width: 180,
    },
    {
      title: '操作', key: 'action', fixed: 'right', width: 180,
      render: (_, record) => (
        <Space size="middle">
          <Button type="primary" icon={<EditOutlined />} onClick={() => handleEdit(record)} size="small">编辑</Button>
          <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} size="small">删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="file-manager-container">
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: '16px' }}>
        返回
      </Button>

      <Card title="我的文章" extra={ /* ... Card extra content ... */
         <Space>
            <Search
              placeholder="搜索标题或摘要"
              allowClear
              enterButton={<SearchOutlined />}
              size="middle"
              onSearch={(value) => {
                setSearchText(value);
                setCurrentPage(1); // Go to first page on new search
              }}
              style={{ width: 250 }}
            />
          </Space>
       }>
        {error && <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>错误: {error}</div>}

        <Table
          columns={columns}
          dataSource={articles}
          rowKey="id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: totalCount,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (page, size) => {
              // Important: Update both page and size state if size changes
              setCurrentPage(page);
              if (size !== pageSize) { // Only update pageSize if it actually changed
                setPageSize(size);
                // Often good to go back to page 1 when page size changes
                // setCurrentPage(1);
              }
            },
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条 / 共 ${total} 条`,
          }}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <Modal
        title="编辑文章信息"
        visible={isEditModalVisible}
        onOk={handleEditConfirm}
        onCancel={() => {
            setIsEditModalVisible(false);
            setEditingArticle(null); // Clear editing state on cancel
            form.resetFields(); // Reset form on cancel
        }}
        okText="确认更新"
        cancelText="取消"
        destroyOnClose
        forceRender
      >
        <Form form={form} layout="vertical" name="editArticleForm">
            {/* ... Form Items remain the same ... */}
             <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入文章标题!' }]}>
                <Input placeholder="请输入文章标题" />
            </Form.Item>
            <Form.Item name="points" label="积分" rules={[{ required: true, message: '请输入积分!' }]}>
                <InputNumber placeholder="请输入积分" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="summary" label="介绍" rules={[{ required: true, message: '请输入文章介绍!' }]}>
                <TextArea rows={4} placeholder="请输入文章介绍" />
            </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FileManager;