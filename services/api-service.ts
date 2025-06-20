import axios from 'axios';
import { ServerInfo } from '@/types/server';
import { CommandInfo } from '@/types/command';

// 从环境变量获取API端口，如果不存在则使用默认端口3003
//const API_PORT = process.env.NEXT_PUBLIC_API_PORT || '3003';
// API基础URL
//const API_BASE_URL = `http://localhost:${API_PORT}/api`;

// 修改后
const API_PORT = process.env.NEXT_PUBLIC_API_PORT || '3003';
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api'  // 生产环境使用相对路径，依赖Nginx代理
  : `http://localhost:${API_PORT}/api`;  // 开发环境使用localhost

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
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

// 服务器信息相关API
export const serverApi = {
  // 获取所有服务器信息
  async getServers(): Promise<ServerInfo[]> {
    try {
      const response = await api.get('/servers');
      if (response.data.success) {
        return response.data.data || [];
      }
      throw new Error(response.data.message || '获取服务器信息失败');
    } catch (error: any) {
      console.error('获取服务器信息失败:', error);
      // 如果API请求失败，尝试从localStorage获取（兼容旧数据）
      const savedServers = localStorage.getItem('servers');
      if (savedServers) {
        return JSON.parse(savedServers);
      }
      return [];
    }
  },

  // 保存所有服务器信息
  async saveServers(servers: ServerInfo[]): Promise<boolean> {
    try {
      const response = await api.post('/servers', servers);
      if (response.data.success) {
        // 同时更新localStorage（兼容旧版本）
        localStorage.setItem('servers', JSON.stringify(servers));
        return true;
      }
      throw new Error(response.data.message || '保存服务器信息失败');
    } catch (error: any) {
      console.error('保存服务器信息失败:', error);
      // 如果API请求失败，仍然保存到localStorage（兼容旧版本）
      localStorage.setItem('servers', JSON.stringify(servers));
      return false;
    }
  },

  // 添加单个服务器
  async addServer(server: ServerInfo): Promise<boolean> {
    try {
      // 修正API端点路径，移除多余的'/api'前缀
      const response = await api.post('/servers/add', server);
      if (response.data.success) {
        // 添加成功后，刷新本地存储的服务器列表
        const servers = await this.getServers();
        localStorage.setItem('servers', JSON.stringify(servers));
        return true;
      }
      return response.data.success;
    } catch (error: any) {
      console.error('添加服务器失败:', error);
      return false;
    }
  },

  // 更新单个服务器
  async updateServer(serverId: string, server: ServerInfo): Promise<boolean> {
    try {
      const response = await api.put(`/servers/${serverId}`, server);
      return response.data.success;
    } catch (error: any) {
      console.error('更新服务器失败:', error);
      return false;
    }
  },

  // 删除单个服务器
  async deleteServer(serverId: string): Promise<boolean> {
    try {
      const response = await api.delete(`/servers/${serverId}`);
      return response.data.success;
    } catch (error: any) {
      console.error('删除服务器失败:', error);
      return false;
    }
  }
};

// 命令库相关API
export const commandApi = {
  // 获取所有命令
  async getCommands(): Promise<CommandInfo[]> {
    try {
      const response = await api.get('/commands');
      if (response.data.success) {
        return response.data.data || [];
      }
      throw new Error(response.data.message || '获取命令库失败');
    } catch (error: any) {
      console.error('获取命令库失败:', error);
      // 如果API请求失败，尝试从localStorage获取（兼容旧数据）
      const savedCommands = localStorage.getItem('commands');
      if (savedCommands) {
        return JSON.parse(savedCommands);
      }
      return [];
    }
  },

  // 保存所有命令
  async saveCommands(commands: CommandInfo[]): Promise<boolean> {
    try {
      const response = await api.post('/commands', commands);
      if (response.data.success) {
        // 同时更新localStorage（兼容旧版本）
        localStorage.setItem('commands', JSON.stringify(commands));
        return true;
      }
      throw new Error(response.data.message || '保存命令库失败');
    } catch (error: any) {
      console.error('保存命令库失败:', error);
      // 如果API请求失败，仍然保存到localStorage（兼容旧版本）
      localStorage.setItem('commands', JSON.stringify(commands));
      return false;
    }
  }
};

// 命令执行历史相关API
export const commandHistoryApi = {
  // 获取命令执行历史
  async getCommandHistory(): Promise<any[]> {
    try {
      const response = await api.get('/command-history');
      if (response.data.success) {
        return response.data.data || [];
      }
      throw new Error(response.data.message || '获取命令执行历史失败');
    } catch (error: any) {
      console.error('获取命令执行历史失败:', error);
      // 如果API请求失败，尝试从localStorage获取（兼容旧数据）
      const savedHistory = localStorage.getItem('commandHistory');
      if (savedHistory) {
        return JSON.parse(savedHistory);
      }
      return [];
    }
  },

  // 保存命令执行历史
  async saveCommandHistory(history: any[]): Promise<boolean> {
    try {
      const response = await api.post('/command-history', history);
      if (response.data.success) {
        // 同时更新localStorage（兼容旧版本）
        localStorage.setItem('commandHistory', JSON.stringify(history));
        return true;
      }
      throw new Error(response.data.message || '保存命令执行历史失败');
    } catch (error: any) {
      console.error('保存命令执行历史失败:', error);
      // 如果API请求失败，仍然保存到localStorage（兼容旧版本）
      localStorage.setItem('commandHistory', JSON.stringify(history));
      return false;
    }
  },

  // 添加命令执行记录
  async addCommandExecution(execution: any): Promise<boolean> {
    try {
      const response = await api.post('/command-history/add', execution);
      return response.data.success;
    } catch (error: any) {
      console.error('添加命令执行记录失败:', error);
      return false;
    }
  },

  // 清除命令执行历史
  async clearCommandHistory(): Promise<boolean> {
    try {
      const response = await api.delete('/command-history');
      return response.data.success;
    } catch (error: any) {
      console.error('清除命令执行历史失败:', error);
      return false;
    }
  }
};

// 文件操作历史相关API
export const fileOperationsApi = {
  // 获取文件操作历史
  async getFileOperations(): Promise<any[]> {
    try {
      const response = await api.get('/file-operations');
      if (response.data.success) {
        return response.data.data || [];
      }
      throw new Error(response.data.message || '获取文件操作历史失败');
    } catch (error: any) {
      console.error('获取文件操作历史失败:', error);
      // 如果API请求失败，尝试从localStorage获取（兼容旧数据）
      const savedOperations = localStorage.getItem('fileOperations');
      if (savedOperations) {
        return JSON.parse(savedOperations);
      }
      return [];
    }
  },

  // 保存文件操作历史
  async saveFileOperations(operations: any[]): Promise<boolean> {
    try {
      const response = await api.post('/file-operations', operations);
      if (response.data.success) {
        // 同时更新localStorage（兼容旧版本）
        localStorage.setItem('fileOperations', JSON.stringify(operations));
        return true;
      }
      throw new Error(response.data.message || '保存文件操作历史失败');
    } catch (error: any) {
      console.error('保存文件操作历史失败:', error);
      // 如果API请求失败，仍然保存到localStorage（兼容旧版本）
      localStorage.setItem('fileOperations', JSON.stringify(operations));
      return false;
    }
  },

  // 添加文件操作记录
  async addFileOperation(operation: any): Promise<boolean> {
    try {
      const response = await api.post('/file-operations/add', operation);
      return response.data.success;
    } catch (error: any) {
      console.error('添加文件操作记录失败:', error);
      return false;
    }
  },

  // 清除文件操作历史
  async clearFileOperations(): Promise<boolean> {
    try {
      const response = await api.delete('/file-operations');
      return response.data.success;
    } catch (error: any) {
      console.error('清除文件操作历史失败:', error);
      return false;
    }
  }
};

export default {
  serverApi,
  commandApi,
  commandHistoryApi,
  fileOperationsApi
};
