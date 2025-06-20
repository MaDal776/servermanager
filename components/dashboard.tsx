"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Server, RefreshCw, CheckCircle, Clock, AlertCircle, LayoutGrid, List } from "lucide-react"
import { ServerInfo, ServerStatus } from "@/types/server"
import ServerStatusCard from "@/components/server-status-card"
import * as api from "@/services/api"
import { connectToServer, getServerStatus } from "@/services/api"
import { serverApi } from "@/services/api-service"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getViewMode, saveViewMode } from "@/services/view-state"

// 安全的时间格式化函数，处理各种可能的时间格式
const formatTime = (timeValue: any): string => {
  if (!timeValue) return '未知时间';
  
  try {
    // 如果已经是Date对象
    if (timeValue instanceof Date) {
      return timeValue.toLocaleTimeString();
    }
    
    // 如果是字符串或数字，尝试转换为Date
    if (typeof timeValue === 'string' || typeof timeValue === 'number') {
      const date = new Date(timeValue);
      // 检查是否是有效日期
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString();
      }
    }
    
    // 如果是对象但有toJSON方法（如某些日期库的对象）
    if (typeof timeValue === 'object' && timeValue !== null && typeof timeValue.toJSON === 'function') {
      return new Date(timeValue.toJSON()).toLocaleTimeString();
    }
    
    // 其他情况
    return '未知时间';
  } catch (error) {
    console.error('时间格式化错误:', error);
    return '未知时间';
  }
};

export default function Dashboard() {
  const [servers, setServers] = useState<ServerInfo[]>([])
  const [serverStatuses, setServerStatuses] = useState<ServerStatus[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshingServer, setRefreshingServer] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false)
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(30)
  // 使用view-state服务获取保存的视图模式
  const [viewMode, setViewMode] = useState<"card" | "list">(() => {
    return getViewMode('dashboard') as "card" | "list";
  })

  // 从API获取服务器列表
  const fetchServers = useCallback(async () => {
    try {
      // 使用serverApi.getServers()从后端获取服务器列表
      const serverList = await serverApi.getServers();
      if (serverList && Array.isArray(serverList)) {
        setServers(serverList);
        // 初始化服务器状态
        initializeServerStatuses(serverList);
      } else {
        console.error('获取服务器列表失败: 无效的响应格式');
      }
    } catch (error) {
      console.error('获取服务器列表失败:', error);
    }
  }, []);
  
  // 在组件挂载时和认证令牌变化时获取服务器列表
  useEffect(() => {
    // 检查认证令牌
    const authToken = localStorage.getItem('auth_token');
    if (authToken) {
      fetchServers();
    }
  }, [fetchServers])
  
  // 自动刷新效果
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (autoRefresh && servers.length > 0) {
      intervalId = setInterval(() => {
        refreshAllStatuses();
      }, autoRefreshInterval * 1000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, autoRefreshInterval, servers]);

  const initializeServerStatuses = async (serverList: ServerInfo[]) => {
    setIsRefreshing(true);
    const statuses: ServerStatus[] = [];
    
    for (const server of serverList) {
      try {
        // 尝试连接到服务器
        await connectToServer(server);
        
        // 获取服务器状态
        const response = await getServerStatus(server.id);
        if (response.success && response.data) {
          statuses.push(response.data);
        } else {
          // 如果获取失败，添加离线状态
          statuses.push({
            id: server.id,
            online: false,
            lastCheck: new Date()
          });
        }
      } catch (error) {
        console.error(`获取服务器 ${server.name} 状态失败:`, error);
        // 添加离线状态
        statuses.push({
          id: server.id,
          online: false,
          lastCheck: new Date()
        });
      }
    }
    
    setServerStatuses(statuses);
    setIsRefreshing(false);
  }

  const refreshAllStatuses = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    const updatedStatuses: ServerStatus[] = [];
    
    for (const server of servers) {
      try {
        // 获取服务器状态
        const response = await getServerStatus(server.id);
        if (response.success && response.data) {
          updatedStatuses.push(response.data);
        } else {
          // 如果获取失败，添加离线状态或保留原状态
          const existingStatus = serverStatuses.find(s => s.id === server.id);
          updatedStatuses.push({
            id: server.id,
            online: false,
            lastCheck: new Date(),
            ...(existingStatus || {})
          });
        }
      } catch (error) {
        console.error(`刷新服务器 ${server.name} 状态失败:`, error);
        // 添加离线状态或保留原状态
        const existingStatus = serverStatuses.find(s => s.id === server.id);
        updatedStatuses.push({
          id: server.id,
          online: false,
          lastCheck: new Date(),
          ...(existingStatus || {})
        });
      }
    }
    
    setServerStatuses(updatedStatuses);
    setIsRefreshing(false);
  }

  // 刷新单个服务器状态
  const refreshServerStatus = useCallback(async (serverId: string) => {
    setRefreshingServer(serverId);
    
    try {
      // 获取服务器状态
      const response = await getServerStatus(serverId);
      
      if (response.success && response.data) {
        // 更新状态列表中的特定服务器状态
        setServerStatuses(prev => 
          prev.map(status => 
            status.id === serverId ? response.data : status
          )
        );
      } else {
        // 如果获取失败，标记为离线
        setServerStatuses(prev => 
          prev.map(status => 
            status.id === serverId ? {
              ...status,
              online: false,
              lastCheck: new Date()
            } : status
          )
        );
      }
    } catch (error) {
      console.error(`刷新服务器 ${serverId} 状态失败:`, error);
      // 标记为离线
      setServerStatuses(prev => 
        prev.map(status => 
          status.id === serverId ? {
            ...status,
            online: false,
            lastCheck: new Date()
          } : status
        )
      );
    }
    
    setRefreshingServer(null);
  }, []);

  if (servers.length === 0) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">仪表盘</h1>
        </div>

        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Server className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-400 mb-2">暂无服务器</h3>
            <p className="text-slate-500 mb-4">请先添加服务器以查看监控状态</p>
            <Button
              onClick={() => {
                window.dispatchEvent(new CustomEvent("navigate", { detail: "servers" }))
              }}
              className="bg-cyan-500 hover:bg-cyan-600"
            >
              添加服务器
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">仪表盘</h1>
        <div className="flex items-center space-x-3">
          <div className="bg-slate-800 rounded-lg p-1 flex mr-2">
            <Button
              variant={viewMode === "card" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setViewMode("card");
                saveViewMode('dashboard', 'card');
              }}
              className={viewMode === "card" ? "bg-cyan-600" : "text-slate-400"}
              title="卡片视图"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setViewMode("list");
                saveViewMode('dashboard', 'list');
              }}
              className={viewMode === "list" ? "bg-cyan-600" : "text-slate-400"}
              title="列表视图"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={refreshAllStatuses} disabled={isRefreshing} className="bg-cyan-500 hover:bg-cyan-600">
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            刷新状态
          </Button>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">总服务器</p>
                <p className="text-2xl font-bold text-white">{servers.length}</p>
              </div>
              <Server className="w-8 h-8 text-cyan-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">在线服务器</p>
                <p className="text-2xl font-bold text-green-400">{serverStatuses.filter((s) => s.online).length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">离线服务器</p>
                <p className="text-2xl font-bold text-red-400">{serverStatuses.filter((s) => !s.online).length}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">最后更新</p>
                <p className="text-sm text-slate-300">
                  {serverStatuses.length > 0 ? formatTime(serverStatuses[0].lastCheck) : "--:--:--"}
                </p>
              </div>
              <Clock className="w-8 h-8 text-cyan-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 自动刷新控制 */}
      <div className="flex items-center mb-6 space-x-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="autoRefresh"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
          />
          <label htmlFor="autoRefresh" className="text-slate-300 text-sm">
            自动刷新
          </label>
        </div>
        
        {autoRefresh && (
          <div className="flex items-center space-x-2">
            <label htmlFor="refreshInterval" className="text-slate-300 text-sm">
              刷新间隔:
            </label>
            <select
              id="refreshInterval"
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded text-slate-300 text-sm py-1 px-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="10">10秒</option>
              <option value="30">30秒</option>
              <option value="60">1分钟</option>
              <option value="300">5分钟</option>
            </select>
          </div>
        )}
      </div>
      
      {/* 服务器状态视图 */}
      {viewMode === "card" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servers.map((server) => {
            const status = serverStatuses.find((s) => s.id === server.id) || {
              id: server.id,
              online: false,
              lastCheck: new Date()
            }
            
            return (
              <ServerStatusCard 
                key={server.id}
                server={server}
                status={status}
                onRefresh={refreshServerStatus}
                isRefreshing={refreshingServer === server.id}
              />
            )
          })}
        </div>
      ) : (
        <div className="rounded-md border border-slate-700 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-800">
              <TableRow className="hover:bg-slate-800 border-slate-700">
                <TableHead className="text-slate-300 w-10">#</TableHead>
                <TableHead className="text-slate-300">服务器</TableHead>
                <TableHead className="text-slate-300">IP地址</TableHead>
                <TableHead className="text-slate-300">状态</TableHead>
                <TableHead className="text-slate-300">最后检查</TableHead>
                <TableHead className="text-slate-300 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servers.map((server, index) => {
                const status = serverStatuses.find((s) => s.id === server.id) || {
                  id: server.id,
                  online: false,
                  lastCheck: new Date()
                }
                
                return (
                  <TableRow key={server.id} className="hover:bg-slate-800 border-slate-700">
                    <TableCell className="text-slate-400">{index + 1}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-slate-200">{server.name}</div>
                        <div className="text-xs text-slate-500">{server.user}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-400">{server.ip}</TableCell>
                    <TableCell>
                      <Badge className={status.online ? "bg-green-600" : "bg-red-600"}>
                        {status.online ? "在线" : "离线"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {formatTime(status.lastCheck)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => refreshServerStatus(server.id)}
                        disabled={refreshingServer === server.id}
                        className="text-slate-400 hover:text-slate-100"
                      >
                        <RefreshCw className={`w-4 h-4 ${refreshingServer === server.id ? "animate-spin" : ""}`} />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

