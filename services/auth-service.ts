// 认证服务
import { api } from './api';
import axios from 'axios';

// 从环境变量获取API端口，如果不存在则使用默认端口3003
//const API_PORT = process.env.NEXT_PUBLIC_API_PORT || '3003';

//const API_BASE_URL = `http://localhost:${API_PORT}/api`;

// 修改后
const API_PORT = process.env.NEXT_PUBLIC_API_PORT || '3003';
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? '/api'  // 生产环境使用相对路径，依赖Nginx代理
  : `http://localhost:${API_PORT}/api`;  // 开发环境使用localhost
interface LoginResponse {
  token: string;
  username: string;
}

console.log(process.env.NODE_ENV)
console.log(API_BASE_URL)
interface LoginError {
  error: string;
}

/**
 * 登录服务
 * @param username 用户名
 * @param password 密码
 * @returns 登录结果
 */
export const login = async (username: string, password: string): Promise<LoginResponse> => {
  try {
    const response = await api.post<LoginResponse>('/auth/login', { username, password });
    
    // 保存令牌到本地存储
    localStorage.setItem('auth_token', response.data.token);
    localStorage.setItem('username', response.data.username);
    
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || '登录失败，请检查网络连接';
    throw new Error(errorMessage);
  }
};

/**
 * 登出
 */
export const logout = (): void => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('username');
};

/**
 * 获取当前用户信息
 * @returns 用户信息或null
 */
export const getCurrentUser = (): { username: string; token: string } | null => {
  const token = localStorage.getItem('auth_token');
  const username = localStorage.getItem('username');
  
  if (token && username) {
    return { username, token };
  }
  
  return null;
};

/**
 * 检查用户是否已登录
 * @returns 是否已登录
 */
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('auth_token');
};

/**
 * 获取认证令牌
 * @returns 认证令牌
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};
