"use client"
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  AlertCircle,
  CheckCircle, 
  ChevronRight,
  Clock, 
  Download, 
  FileText, 
  FolderOpen, 
  History,
  RefreshCw,
  Server, 
  Trash2, 
  Upload, 
  Users,
  X, 
  XCircle 
} from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { connectToServer, uploadFile, downloadFile } from "@/services/api"
import { serverApi } from "@/services/api-service"

interface ServerInfo {
  id: string
  name: string
  ip: string
  user: string
  password?: string
  authType?: string
  keyPath?: string
}

interface FileTransferResult {
  serverId: string
  serverName: string
  success: boolean
  message: string
  path: string
  timestamp: Date
}

interface FileOperation {
  id: string
  type: 'upload' | 'download'
  localPath: string
  remotePath: string
  servers: string[]
  status: 'pending' | 'processing' | 'completed' | 'failed'
  results: FileTransferResult[]
  timestamp: Date
}

interface FileInfo {
  name: string;
  path: string;
  size: number;
  type: string;
}

export default function FileSync() {
  const [servers, setServers] = useState<ServerInfo[]>([])
  const [selectedServers, setSelectedServers] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<string>("upload")
  const [localPath, setLocalPath] = useState<string>("") 
  const [remotePath, setRemotePath] = useState<string>('/home/ubuntu/uploads/') 
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [operations, setOperations] = useState<FileOperation[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const [selectedFileObject, setSelectedFileObject] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [downloadProgress, setDownloadProgress] = useState<number>(0)

  // 从后端API获取服务器列表
  const fetchServers = useCallback(async () => {
    try {
      const serverList = await serverApi.getServers();
      if (serverList && Array.isArray(serverList)) {
        setServers(serverList);
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
    
    // 从本地存储加载历史操作
    const savedOperations = localStorage.getItem("fileOperations")
    if (savedOperations) {
      try {
        const parsed = JSON.parse(savedOperations)
        // 转换字符串日期为Date对象
        const operations = parsed.map((op: any) => ({
          ...op,
          timestamp: new Date(op.timestamp),
          results: op.results.map((r: any) => ({
            ...r,
            timestamp: new Date(r.timestamp)
          }))
        }))
        setOperations(operations)
      } catch (error) {
        console.error("加载文件操作历史失败:", error)
      }
    }
  }, [])

  // 处理服务器选择
  const handleServerToggle = (serverId: string) => {
    setSelectedServers(prev => 
      prev.includes(serverId) ? prev.filter(id => id !== serverId) : [...prev, serverId]
    )
  }

  // 全选/取消全选服务器
  const handleSelectAll = () => {
    if (selectedServers.length === servers.length) {
      setSelectedServers([])
    } else {
      setSelectedServers(servers.map(s => s.id))
    }
  }
  
  // 处理文件拖拽
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      // 在Web环境中，我们只能获取文件名，而不是完整路径
      // 使用文件名作为本地路径的显示
      setLocalPath(file.name)
      setSelectedFile({
        name: file.name,
        path: file.name, // 使用文件名作为路径
        size: file.size,
        type: file.type
      })
    }
  }, [])
  
  // 处理文件选择
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      const file = files[0]
      setSelectedFileObject(file)
      setLocalPath(file.name)
      setSelectedFile({
        name: file.name,
        path: file.name,
        size: file.size,
        type: file.type || '未知'
      })
    }
  }

  // 处理文件夹选择
  // 由于浏览器安全限制，无法直接获取用户选择的文件夹完整路径
  // 我们使用对话框让用户输入或选择一个文件夹名称
  const handleChooseFolder = () => {
    // 使用浏览器的prompt对话框让用户输入文件夹路径
    const folderPath = prompt('请输入或选择一个文件夹路径（例如：/Users/Downloads/my_folder/）', localPath || '/Users/Downloads/');
    
    if (folderPath) {
      // 确保路径以斜杠结尾
      const normalizedPath = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
      setLocalPath(normalizedPath);
    }
  }

  // 清除已选文件
  const clearSelectedFile = () => {
    setSelectedFile(null)
    setSelectedFileObject(null)
    setLocalPath('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 处理文件上传
  const handleUpload = async () => {
    if (selectedServers.length === 0 || !selectedFileObject || !remotePath) {
      alert('请选择服务器、文件和远程路径')
      return
    }

    setIsProcessing(true)
    setUploadProgress(0)
    
    // 创建新的操作记录
    const operationId = Date.now().toString()
    const newOperation: FileOperation = {
      id: operationId,
      type: 'upload',
      localPath,
      remotePath,
      servers: selectedServers,
      status: 'processing',
      results: [],
      timestamp: new Date()
    }
    
    setOperations(prev => [newOperation, ...prev])
    
    // 连接服务器并上传文件
    const results: FileTransferResult[] = []
    const selectedServerList = servers.filter(s => selectedServers.includes(s.id))
    
    for (let i = 0; i < selectedServerList.length; i++) {
      const server = selectedServerList[i]
      // 更新进度
      const progressPerServer = 100 / selectedServerList.length
      const baseProgress = Math.floor((i / selectedServerList.length) * 100)
      setUploadProgress(baseProgress)
      
      try {
        // 先连接服务器
        await connectToServer(server)
        setUploadProgress(baseProgress + Math.floor(progressPerServer * 0.3))
        
        // 上传文件
        // 创建FormData对象用于文件上传
        const formData = new FormData()
        formData.append('file', selectedFileObject)
        formData.append('serverId', server.id)
        formData.append('remotePath', remotePath)
        
        // 调用修改后的上传API
        const response = await uploadFile(server.id, formData, remotePath)
        setUploadProgress(baseProgress + Math.floor(progressPerServer * 0.9))
        
        results.push({
          serverId: server.id,
          serverName: server.name,
          success: response.success,
          message: response.message || '上传成功',
          path: remotePath,
          timestamp: new Date()
        })
      } catch (error) {
        console.error(`上传到服务器 ${server.name} 失败:`, error)
        
        results.push({
          serverId: server.id,
          serverName: server.name,
          success: false,
          message: error instanceof Error ? error.message : '未知错误',
          path: remotePath,
          timestamp: new Date()
        })
      }
    }
    
    // 设置最终进度为100%
    setUploadProgress(100)
    
    // 更新操作状态
    const updatedOperation: FileOperation = {
      ...newOperation,
      status: results.every(r => r.success) ? 'completed' as const : 
              results.every(r => !r.success) ? 'failed' as const : 'completed' as const,
      results
    }
    
    setOperations(prev => {
      const updated = prev.map(op => op.id === operationId ? updatedOperation : op)
      // 保存到本地存储
      localStorage.setItem('fileOperations', JSON.stringify(updated))
      return updated
    })
    
    // 如果上传成功，清除选中文件
    if (results.some(r => r.success)) {
      setTimeout(() => {
        if (selectedFile) {
          clearSelectedFile()
        }
      }, 1000)
    }
    
    // 延迟一秒后完成，让用户看到100%进度
    setTimeout(() => {
      setIsProcessing(false)
    }, 1000)
  }

  // 处理文件下载
  const handleDownload = async () => {
    if (selectedServers.length === 0 || !remotePath) {
      alert('请选择服务器并指定远程路径')
      return
    }

    setIsProcessing(true)
    setDownloadProgress(0)
    
    // 创建新的操作记录
    const operationId = Date.now().toString()
    const newOperation: FileOperation = {
      id: operationId,
      type: 'download',
      localPath,
      remotePath,
      servers: selectedServers,
      status: 'processing',
      results: [],
      timestamp: new Date()
    }
    
    setOperations(prev => [newOperation, ...prev])
    
    // 连接服务器并下载文件
    const results: FileTransferResult[] = []
    const selectedServerList = servers.filter(s => selectedServers.includes(s.id))
    
    for (let i = 0; i < selectedServerList.length; i++) {
      const server = selectedServerList[i]
      // 更新进度
      const progressPerServer = 100 / selectedServerList.length
      const baseProgress = Math.floor((i / selectedServerList.length) * 100)
      setDownloadProgress(baseProgress)
      
      try {
        // 先连接服务器
        await connectToServer(server)
        setDownloadProgress(baseProgress + Math.floor(progressPerServer * 0.3))
        
        // 下载文件 - 使用浏览器直接下载机制
        const response = await downloadFile(server.id, remotePath)
        setDownloadProgress(baseProgress + Math.floor(progressPerServer * 0.9))
        
        // 构建下载文件的本地路径，添加服务器名称作为后缀
        const remoteFileName = remotePath.split('/').pop() || 'file'
        const localFilePath = `${localPath}/${server.name}_${remoteFileName}`
        
        results.push({
          serverId: server.id,
          serverName: server.name,
          success: response.success,
          message: response.message || '下载成功',
          path: localFilePath,
          timestamp: new Date()
        })
      } catch (error) {
        console.error(`从服务器 ${server.name} 下载失败:`, error)
        
        results.push({
          serverId: server.id,
          serverName: server.name,
          success: false,
          message: error instanceof Error ? error.message : '未知错误',
          path: remotePath,
          timestamp: new Date()
        })
      }
    }
    
    // 设置最终进度为100%
    setDownloadProgress(100)
    
    // 更新操作状态
    const updatedOperation: FileOperation = {
      ...newOperation,
      status: results.every(r => r.success) ? 'completed' as const : 
              results.every(r => !r.success) ? 'failed' as const : 'completed' as const,
      results
    }
    
    setOperations(prev => {
      const updated = prev.map(op => op.id === operationId ? updatedOperation : op)
      // 保存到本地存储
      localStorage.setItem('fileOperations', JSON.stringify(updated))
      return updated
    })
    
    // 延迟一秒后完成，让用户看到100%进度
    setTimeout(() => {
      setIsProcessing(false)
    }, 1000)
  }

  // 清除历史记录
  const clearHistory = () => {
    if (confirm('确定要清除所有历史记录吗？')) {
      setOperations([])
      localStorage.removeItem('fileOperations')
    }
  }

  if (servers.length === 0) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">批量文件同步</h1>
        </div>

        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Upload className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-400 mb-2">暂无服务器</h3>
            <p className="text-slate-500 mb-4">请先添加服务器以进行文件同步</p>
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
        <h1 className="text-3xl font-bold text-white">批量文件同步</h1>
      </div>

      <div className="mb-6 p-4 bg-green-900/20 border border-green-700 rounded-lg">
        <p className="text-green-400 text-sm">
          <strong>提示：</strong> 文件同步功能已开放，可以通过SSH在多台服务器间传输文件。请确保服务器连接信息正确，并指定正确的文件路径。
        </p>
      </div>

      <Tabs defaultValue="upload" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="upload" className="data-[state=active]:bg-cyan-600">
            <Upload className="w-4 h-4 mr-2" />
            上传文件
          </TabsTrigger>
          <TabsTrigger value="download" className="data-[state=active]:bg-cyan-600">
            <Download className="w-4 h-4 mr-2" />
            下载文件
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧：服务器选择 */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">选择目标服务器</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSelectAll}
                    className="border-slate-600 text-white font-medium hover:bg-slate-700"
                  >
                    {selectedServers.length === servers.length ? "取消全选" : "全选"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  {servers.map((server) => (
                    <div
                      key={server.id}
                      className="flex items-center space-x-3 p-3 rounded-lg border border-slate-600 hover:border-slate-500 transition-colors"
                    >
                      <Checkbox
                        checked={selectedServers.includes(server.id)}
                        onCheckedChange={() => handleServerToggle(server.id)}
                        className="border-slate-300 data-[state=checked]:bg-cyan-400 data-[state=checked]:border-cyan-400"
                      />
                      <div className="flex-1">
                        <p className="text-white font-medium">{server.name}</p>
                        <p className="text-slate-400 text-sm">{server.ip}</p>
                      </div>
                      <Server className="w-4 h-4 text-slate-400" />
                    </div>
                  ))}
                </div>

                {selectedServers.length > 0 && (
                  <div className="mt-4 p-3 bg-cyan-900/20 border border-cyan-700 rounded-lg">
                    <p className="text-cyan-400 text-sm">已选择 {selectedServers.length} 台服务器</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 右侧：文件路径和操作 */}
          <div className="lg:col-span-3 space-y-6">
            <TabsContent value="upload" className="m-0">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">上传文件</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-slate-300 text-sm mb-2 block">本地文件</label>
                    
                    {selectedFile ? (
                      <div className="p-4 bg-slate-700 border border-slate-600 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <FileText className="w-5 h-5 text-cyan-400 mr-2" />
                            <span className="text-white font-medium">{selectedFile.name}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={clearSelectedFile}
                            className="text-slate-400 hover:text-white hover:bg-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="text-xs text-slate-400 mb-1">
                          类型: {selectedFile.type || '未知'} | 大小: {(selectedFile.size / 1024).toFixed(2)} KB
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDragging ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-600 hover:border-slate-500'}`}
                        onDragEnter={handleDragEnter}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        <Upload className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                        <p className="text-slate-300 mb-1">拖放文件到此处，或</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-slate-600 text-white font-medium hover:bg-slate-700 mt-2"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <FolderOpen className="w-4 h-4 mr-2" />
                          选择文件
                        </Button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          onChange={handleFileChange}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-slate-300 text-sm mb-2 block">远程目标路径</label>
                    <div className="relative">
                      <Input
                        value={remotePath}
                        onChange={(e) => setRemotePath(e.target.value)}
                        placeholder="/path/on/remote/server/"
                        className="bg-slate-700 border-slate-600 text-white pl-9"
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Server className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                    {remotePath && !remotePath.startsWith('/') && (
                      <div className="mt-1 flex items-center text-xs text-amber-400">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        远程路径应以 / 开头
                      </div>
                    )}
                    <div className="mt-1 text-xs text-slate-400">
                      指定文件将上传到所选服务器的此路径
                    </div>
                  </div>

                  {isProcessing && activeTab === 'upload' ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-slate-300 mb-1">
                        <span>上传中...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2 bg-slate-700" />
                      <p className="text-xs text-slate-400 text-center mt-1">正在上传文件到 {selectedServers.length} 台服务器</p>
                    </div>
                  ) : (
                    <Button
                      onClick={handleUpload}
                      disabled={!localPath || !remotePath || selectedServers.length === 0 || isProcessing}
                      className="w-full bg-cyan-500 hover:bg-cyan-600"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      上传文件
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="download" className="m-0">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">下载文件</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="mb-4">
                    <label htmlFor="remotePath" className="block text-sm font-medium mb-1">
                      远程路径
                    </label>
                    <input
                      type="text"
                      id="remotePath"
                      className="w-full p-2 border rounded"
                      value={remotePath}
                      onChange={(e) => setRemotePath(e.target.value)}
                      placeholder="/home/ubuntu/uploads/"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      可以只指定目录路径（以 / 结尾），系统将自动使用原始文件名
                    </p>
                    {remotePath && !remotePath.startsWith('/') && (
                      <div className="mt-1 flex items-center text-xs text-amber-400">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        远程路径应以 / 开头
                      </div>
                    )}
                    <div className="mt-1 text-xs text-slate-400">
                      指定要从服务器下载的文件路径
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 text-sm mb-2 block">本地保存路径</label>
                    <div className="relative">
                      <Input
                        value={localPath}
                        onChange={(e) => setLocalPath(e.target.value)}
                        placeholder="/path/to/save/locally/"
                        className="bg-slate-700 border-slate-600 text-white pl-9"
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <FolderOpen className="h-4 w-4 text-slate-400" />
                      </div>
                      <Button
                        variant="outline"
                        className="absolute inset-y-0 right-0 px-3 border-slate-600 text-white font-medium hover:bg-slate-700"
                        onClick={handleChooseFolder}
                      >
                        选择文件夹
                      </Button>
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      指定文件将保存到本地的此路径，每个服务器的文件将自动添加服务器名称后缀
                    </div>
                  </div>

                  {isProcessing && activeTab === 'download' ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-slate-300 mb-1">
                        <span>下载中...</span>
                        <span>{downloadProgress}%</span>
                      </div>
                      <Progress value={downloadProgress} className="h-2 bg-slate-700" />
                      <p className="text-xs text-slate-400 text-center mt-1">正在从 {selectedServers.length} 台服务器下载文件</p>
                    </div>
                  ) : (
                    <Button
                      onClick={handleDownload}
                      disabled={!localPath || !remotePath || selectedServers.length === 0 || isProcessing}
                      className="w-full bg-cyan-500 hover:bg-cyan-600"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      下载文件
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="m-0">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-white">传输历史</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-white font-medium hover:bg-slate-700"
                      onClick={() => {
                        // 刷新历史记录，从 localStorage 重新加载
                        const savedOperations = localStorage.getItem('fileOperations')
                        if (savedOperations) {
                          setOperations(JSON.parse(savedOperations))
                        }
                      }}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      刷新
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-red-300 hover:bg-red-900/20 hover:text-red-200"
                      onClick={clearHistory}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      清除历史
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {operations.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <div className="w-12 h-12 mx-auto mb-4 text-slate-500 opacity-50">
                        <History size={48} />
                      </div>
                      <p>暂无传输历史记录</p>
                      <p className="text-sm text-slate-500 mt-1">文件上传或下载后将在此显示</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                      {operations.map((op) => (
                        <div key={op.id} className="border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              {op.type === 'upload' ? (
                                <Upload className="w-4 h-4 text-cyan-500 mr-2" />
                              ) : (
                                <Download className="w-4 h-4 text-cyan-500 mr-2" />
                              )}
                              <span className="text-white font-medium">
                                {op.type === 'upload' ? '上传' : '下载'} - {new Date(op.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <Badge
                              className={`${op.status === 'completed' ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30' : 
                                op.status === 'failed' ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 
                                'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'}`}
                            >
                              {op.status === 'completed' ? '完成' : op.status === 'failed' ? '失败' : '处理中'}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-slate-400 mb-2 grid grid-cols-1 md:grid-cols-2 gap-1">
                            <div className="flex items-center">
                              <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                              <span>本地: </span>
                              <span className="ml-1 text-slate-300 truncate">{op.localPath}</span>
                            </div>
                            <div className="flex items-center">
                              <Server className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                              <span>远程: </span>
                              <span className="ml-1 text-slate-300 truncate">{op.remotePath}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center text-xs text-slate-500 mb-2">
                            <Users className="w-3.5 h-3.5 mr-1.5" />
                            <span>服务器: </span>
                            <span className="ml-1">{op.servers.length} 台</span>
                            <span className="mx-1">|</span>
                            <span>成功: </span>
                            <span className="ml-1 text-green-400">{op.results.filter(r => r.success).length}</span>
                            <span className="mx-1">|</span>
                            <span>失败: </span>
                            <span className="ml-1 text-red-400">{op.results.filter(r => !r.success).length}</span>
                          </div>
                          
                          <div className="mt-2">
                            <Collapsible>
                              <CollapsibleTrigger className="flex items-center text-sm text-cyan-500 hover:text-cyan-400">
                                <ChevronRight className="w-4 h-4 mr-1" />
                                查看详情
                              </CollapsibleTrigger>
                              <CollapsibleContent className="pt-2">
                                <div className="space-y-2">
                                  {op.results.map((result, idx) => (
                                    <div
                                      key={idx}
                                      className={`text-sm p-2 rounded ${result.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                          {result.success ? (
                                            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                                          ) : (
                                            <XCircle className="w-4 h-4 text-red-500 mr-2" />
                                          )}
                                          <span className={`font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                                            {result.serverName}
                                          </span>
                                        </div>
                                        <span className="text-xs text-slate-500">
                                          {new Date(result.timestamp).toLocaleTimeString()}
                                        </span>
                                      </div>
                                      <div className="ml-6 text-slate-300 mt-1">{result.message}</div>
                                      <div className="ml-6 text-slate-400 mt-0.5 flex items-center">
                                        <FolderOpen className="w-3.5 h-3.5 mr-1 text-slate-500" />
                                        <span className="truncate">{result.path}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  )
}
