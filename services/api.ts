// API服务，用于与本地代理服务进行通信
import axios from 'axios';

// 从环境变量获取API端口，如果不存在则使用默认端口3003
//const API_PORT = process.env.NEXT_PUBLIC_API_PORT || '3003';
//const API_BASE_URL = `http://localhost:${API_PORT}/api`; // 使用环境变量配置的端口
// 修改后
const API_PORT = process.env.NEXT_PUBLIC_API_PORT || '3003';
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api'  // 生产环境使用相对路径，依赖Nginx代理
  : `http://localhost:${API_PORT}/api`;  // 开发环境使用localhost
// 创建axios实例
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 添加请求拦截器，在每个请求中添加认证令牌
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      // 使用类型断言来解决TypeScript错误
      (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 通用请求函数
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  try {
    // 获取认证令牌
    const token = localStorage.getItem('auth_token');
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    // 如果有令牌，添加到请求头中
    if (token) {
      // 使用类型断言来解决TypeScript错误
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || data.error || '请求失败');
    }
    
    return data;
  } catch (error) {
    console.error(`API请求错误: ${endpoint}`, error);
    throw error;
  }
}

// 连接到服务器
export async function connectToServer(serverInfo: any) {
  return fetchAPI('/connect', {
    method: 'POST',
    body: JSON.stringify(serverInfo),
  });
}

// 获取服务器状态
export async function getServerStatus(serverId: string) {
  return fetchAPI(`/status/${serverId}`);
}

// 执行命令
export async function executeCommand(serverId: string, command: string) {
  return fetchAPI('/execute', {
    method: 'POST',
    body: JSON.stringify({ serverId, command }),
  });
}

// 批量执行命令
export async function batchExecuteCommand(serverIds: string[], command: string) {
  return fetchAPI('/batch-execute', {
    method: 'POST',
    body: JSON.stringify({ serverIds, command }),
  });
}

// 上传文件
export async function uploadFile(serverId: string, formData: FormData, remotePath: string) {
  // FormData已经包含了serverId和remotePath，不需要再次添加
  return fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
    // 当使用FormData时，不要设置Content-Type，浏览器会自动设置正确的值（包含boundary）
  }).then(response => {
    if (!response.ok) {
      return response.json().then(data => {
        throw new Error(data.message || '请求失败');
      });
    }
    return response.json();
  }).catch(error => {
    console.error(`API请求错误: /upload`, error);
    throw error;
  });
}

// 下载文件
export async function downloadFile(serverId: string, remotePath: string) {
  // 使用浏览器的下载机制，直接下载文件
  const fileName = remotePath.split('/').pop() || 'downloaded_file';
  
  // 创建下载 URL
  const downloadUrl = `${API_BASE_URL}/download?serverId=${encodeURIComponent(serverId)}&remotePath=${encodeURIComponent(remotePath)}`;
  
  // 创建一个链接并模拟点击
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // 返回一个成功的Promise，因为浏览器会处理下载
  return Promise.resolve({ success: true, message: '开始下载文件' });
}

// 断开连接
export async function disconnectFromServer(serverId: string) {
  return fetchAPI(`/disconnect/${serverId}`, {
    method: 'POST',
  });
}

// 断开所有连接
export async function disconnectAllServers() {
  return fetchAPI('/disconnect-all', {
    method: 'POST',
  });
}
