"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { serverApi } from "@/services/api-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Plus, 
  Server, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  LayoutGrid, 
  List, 
  Layers, 
  Search,
  X,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import ServerFormModal from "./server-form-modal"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getViewMode, saveViewMode } from "@/services/view-state"

interface ServerFormData {
  name: string
  ip: string
  user: string
  password: string
  authType: "password" | "key"
  keyPath: string
}

interface ServerInfo extends ServerFormData {
  id: string
  createdAt: Date
}

export default function ServerManagement() {
  const [servers, setServers] = useState<ServerInfo[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingServer, setEditingServer] = useState<ServerInfo | null>(null)
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({})
  // 使用view-state服务获取保存的视图模式
  const [viewMode, setViewMode] = useState<"card" | "list" | "group">(() => {
    return getViewMode('server-management') as "card" | "list" | "group";
  })
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [expandedGroups, setExpandedGroups] = useState<{[key: string]: boolean}>({})
  const [groupBy, setGroupBy] = useState<"authType" | "none">("none")

  useEffect(() => {
    // 从后端API加载服务器列表并迁移本地数据
    const loadAndMigrateServers = async () => {
      try {
        // 尝试从后端加载服务器列表
        const serverList = await serverApi.getServers();
        
        // 如果后端没有数据，则检查本地存储并迁移
        if (serverList.length === 0) {
          const localServers = localStorage.getItem('servers');
          if (localServers) {
            const parsedServers = JSON.parse(localServers);
            if (parsedServers.length > 0) {
              console.log('从本地存储迁移服务器数据到后端...');
              await serverApi.saveServers(parsedServers);
              console.log('服务器数据迁移完成');
              // 重新加载数据
              const migratedList = await serverApi.getServers();
              processServerList(migratedList);
              return;
            }
          }
        }
        
        // 处理服务器列表
        processServerList(serverList);
      } catch (error) {
        console.error('加载或迁移服务器列表失败:', error);
        // 如果后端加载失败，尝试从本地存储加载
        const localServers = localStorage.getItem('servers');
        if (localServers) {
          const parsedServers = JSON.parse(localServers);
          processServerList(parsedServers);
        }
      }
    };
    
    // 处理服务器列表的公共函数
    const processServerList = (serverList: any[]) => {
      // 确保createdAt字段是Date对象并处理keyPath类型兼容性
      const formattedServers = serverList.map(server => ({
        ...server,
        keyPath: server.keyPath || '',  // 确保keyPath不为undefined
        createdAt: typeof server.createdAt === 'string' ? new Date(server.createdAt) : server.createdAt
      }));
      setServers(formattedServers);
    };
    
    loadAndMigrateServers();
  }, [])

  const saveServers = useCallback(async (serverList: ServerInfo[]) => {
    try {
      await serverApi.saveServers(serverList);
      setServers(serverList);
    } catch (error) {
      console.error('保存服务器列表失败:', error);
    }
  }, [])

  const handleFormSubmit = useCallback(
    async (formData: ServerFormData) => {
      if (editingServer) {
        // 编辑现有服务器
        const updatedServer = {
          ...editingServer,
          ...formData,
          authType: formData.authType || "password",
        }
        
        try {
          // 使用API更新服务器
          await serverApi.updateServer(editingServer.id, updatedServer)
          
          // 更新本地状态
          const updatedServers = servers.map((server) =>
            server.id === editingServer.id ? updatedServer : server
          )
          setServers(updatedServers)
        } catch (error) {
          console.error('更新服务器失败:', error)
        }
      } else {
        // 添加新服务器
        const newServer: ServerInfo = {
          ...formData,
          //id: crypto.randomUUID(),
          id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),

          authType: formData.authType || "password",
          createdAt: new Date(),
        }
        
        try {
          // 使用API添加服务器
          await serverApi.addServer(newServer)
          
          // 更新本地状态
          setServers([...servers, newServer])
        } catch (error) {
          console.error('添加服务器失败:', error)
        }
      }
      setIsModalOpen(false)
      setEditingServer(null)
    },
    [editingServer, servers]
  )

  const handleEdit = useCallback((server: ServerInfo) => {
    setEditingServer(server)
    setIsModalOpen(true)
  }, [])

  const handleDeleteServer = useCallback(
    async (id: string) => {
      if (confirm("确定要删除这个服务器吗？")) {
        try {
          // 使用API删除服务器
          await serverApi.deleteServer(id);
          
          // 更新本地状态
          const updatedServers = servers.filter((server) => server.id !== id);
          setServers(updatedServers);
        } catch (error) {
          console.error('删除服务器失败:', error);
        }
      }
    },
    [servers]
  )

  const togglePasswordVisibility = useCallback((serverId: string) => {
    setShowPasswords((prev) => ({
      ...prev,
      [serverId]: !prev[serverId],
    }))
  }, [])

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false)
    setEditingServer(null)
  }, [])



  // 过滤服务器列表
  const filteredServers = servers.filter(server => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      server.name.toLowerCase().includes(query) ||
      server.ip.toLowerCase().includes(query) ||
      server.user.toLowerCase().includes(query)
    );
  });

  // 分组服务器
  const groupedServers = groupBy === 'none' 
    ? { '所有服务器': filteredServers } 
    : filteredServers.reduce((groups: {[key: string]: ServerInfo[]}, server) => {
        const key = server.authType === 'password' ? '密码认证' : 'SSH密钥认证';
        if (!groups[key]) groups[key] = [];
        groups[key].push(server);
        return groups;
      }, {});
  
  // 切换分组展开状态
  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">服务器管理</h1>
        <Button className="bg-cyan-500 hover:bg-cyan-600" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          添加服务器
        </Button>
        
        <ServerFormModal 
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSubmit={handleFormSubmit}
          initialData={editingServer || undefined}
          title={editingServer ? "编辑服务器" : "添加新服务器"}
        />
      </div>
      
      {/* 搜索和视图控制 */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索服务器..."
            className="pl-8 bg-slate-700 border-slate-600 text-white w-full"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-slate-400"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="bg-slate-800 rounded-lg p-1 flex">
            <Button
              variant={viewMode === "card" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setViewMode("card");
                saveViewMode('server-management', 'card');
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
                saveViewMode('server-management', 'list');
              }}
              className={viewMode === "list" ? "bg-cyan-600" : "text-slate-400"}
              title="列表视图"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "group" ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setViewMode("group");
                saveViewMode('server-management', 'group');
                if (groupBy === "none") setGroupBy("authType");
              }}
              className={viewMode === "group" ? "bg-cyan-600" : "text-slate-400"}
              title="分组视图"
            >
              <Layers className="h-4 w-4" />
            </Button>
          </div>
          
          {viewMode === "group" && (
            <select 
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as "authType" | "none")}
              className="bg-slate-700 border-slate-600 text-white rounded-md text-sm h-9 px-3"
            >
              <option value="authType">按认证类型分组</option>
              <option value="none">不分组</option>
            </select>
          )}
        </div>
      </div>

      {filteredServers.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            {searchQuery ? (
              <>
                <Search className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-400 mb-2">未找到服务器</h3>
                <p className="text-slate-500 mb-4">没有与“{searchQuery}”匹配的服务器</p>
              </>
            ) : (
              <>
                <Server className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-400 mb-2">暂无服务器</h3>
                <p className="text-slate-500 mb-4">点击上方按钮添加您的第一台服务器</p>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* 卡片视图 */}
          {viewMode === "card" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServers.map((server) => (
                <Card key={server.id} className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white text-lg">{server.name}</CardTitle>
                      <Badge variant="outline" className="border-cyan-500 text-cyan-400">
                        {server.authType === "password" ? "密码" : "SSH密钥"}
                      </Badge>
                    </div>
                  </CardHeader>
    
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-slate-400 text-sm">IP 地址</p>
                      <p className="text-slate-200">{server.ip}</p>
                    </div>
    
                    <div>
                      <p className="text-slate-400 text-sm">用户名</p>
                      <p className="text-slate-200">{server.user}</p>
                    </div>
    
                    {server.authType === "password" ? (
                      <div>
                        <p className="text-slate-400 text-sm">密码</p>
                        <div className="flex items-center space-x-2">
                          <p className="text-slate-200 flex-1">{showPasswords[server.id] ? server.password : "••••••••"}</p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => togglePasswordVisibility(server.id)}
                            className="text-slate-400 hover:text-white"
                          >
                            {showPasswords[server.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-slate-400 text-sm">密钥路径</p>
                        <p className="text-slate-200">{server.keyPath}</p>
                      </div>
                    )}
    
                    <div>
                      <p className="text-slate-400 text-sm">创建时间</p>
                      <p className="text-slate-200 text-sm">{new Date(server.createdAt).toLocaleString()}</p>
                    </div>
    
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(server)}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteServer(server.id)}
                        className="border-red-600 text-red-400 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* 列表视图 */}
          {viewMode === "list" && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-slate-700 border-slate-700">
                    <TableHead className="text-slate-300 w-1/4">名称</TableHead>
                    <TableHead className="text-slate-300 w-1/6">IP 地址</TableHead>
                    <TableHead className="text-slate-300 w-1/6">用户名</TableHead>
                    <TableHead className="text-slate-300 w-1/6">认证方式</TableHead>
                    <TableHead className="text-slate-300 w-1/6">创建时间</TableHead>
                    <TableHead className="text-right w-1/6">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServers.map((server) => (
                    <TableRow key={server.id} className="hover:bg-slate-700 border-slate-700">
                      <TableCell className="font-medium text-white">{server.name}</TableCell>
                      <TableCell className="text-slate-300">{server.ip}</TableCell>
                      <TableCell className="text-slate-300">{server.user}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-cyan-500 text-cyan-400">
                          {server.authType === "password" ? "密码" : "SSH密钥"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm">{new Date(server.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(server)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteServer(server.id)}
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* 分组视图 */}
          {viewMode === "group" && (
            <div className="space-y-6">
              {Object.entries(groupedServers).map(([groupName, groupServers]) => (
                <div key={groupName} className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-750"
                    onClick={() => toggleGroup(groupName)}
                  >
                    <div className="flex items-center">
                      {expandedGroups[groupName] ? 
                        <ChevronDown className="w-5 h-5 text-slate-400 mr-2" /> : 
                        <ChevronUp className="w-5 h-5 text-slate-400 mr-2" />}
                      <h3 className="text-lg font-medium text-white">{groupName}</h3>
                      <Badge className="ml-3 bg-slate-700 text-slate-300">{groupServers.length}</Badge>
                    </div>
                  </div>
                  
                  {expandedGroups[groupName] !== false && (
                    <div className="p-4 pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {groupServers.map(server => (
                          <div 
                            key={server.id} 
                            className="p-4 bg-slate-750 border border-slate-600 rounded-lg hover:border-slate-500 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-white">{server.name}</h4>
                              <Badge variant="outline" className="border-cyan-500 text-cyan-400">
                                {server.authType === "password" ? "密码" : "SSH密钥"}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                              <div>
                                <p className="text-slate-400">服务器 IP</p>
                                <p className="text-slate-200">{server.ip}</p>
                              </div>
                              <div>
                                <p className="text-slate-400">用户名</p>
                                <p className="text-slate-200">{server.user}</p>
                              </div>
                            </div>
                            
                            <div className="flex justify-end space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(server)}
                                className="border-slate-600 text-slate-300 hover:bg-slate-700 h-8"
                              >
                                <Edit className="w-3 h-3 mr-1" /> 编辑
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteServer(server.id)}
                                className="border-red-600 text-red-400 hover:bg-red-900/20 h-8"
                              >
                                <Trash2 className="w-3 h-3 mr-1" /> 删除
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
