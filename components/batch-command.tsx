"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Play, Server, Terminal, Clock, CheckCircle, XCircle, Copy } from "lucide-react"
import { connectToServer, batchExecuteCommand } from "@/services/api"
import { serverApi } from "@/services/api-service"

interface ServerInfo {
  id: string
  name: string
  ip: string
  user: string
  password: string
}

interface CommandInfo {
  id: string
  name: string
  command: string
}

interface ExecutionResult {
  serverId: string
  serverName: string
  success: boolean
  output: string
  error?: string
  executionTime: number
}

interface HistoryEntry {
  timestamp: Date
  command: string
  servers: string[]
  results: ExecutionResult[]
}

export default function BatchCommand() {
  const [servers, setServers] = useState<ServerInfo[]>([])
  const [commands, setCommands] = useState<CommandInfo[]>([])
  const [selectedServers, setSelectedServers] = useState<string[]>([])
  const [command, setCommand] = useState("")
  const [selectedCommand, setSelectedCommand] = useState("")
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionResults, setExecutionResults] = useState<ExecutionResult[]>([])
  const [showSelectionPanel, setShowSelectionPanel] = useState<boolean>(true)
  const [executionHistory, setExecutionHistory] = useState<HistoryEntry[]>([])

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
    
    // 从本地存储加载命令和历史记录
    const savedCommands = localStorage.getItem("commands")
    const savedHistory = localStorage.getItem("executionHistory")

    if (savedCommands) {
      const commandList = JSON.parse(savedCommands)
      setCommands(commandList)

      // 检查是否有预设命令
      const presetCommand = sessionStorage.getItem("presetCommand")
      if (presetCommand) {
        const { command: presetCmd, name } = JSON.parse(presetCommand)
        setCommand(presetCmd)

        // 找到对应的命令ID并设置选中状态
        const matchingCommand = commandList.find((cmd: CommandInfo) => cmd.command === presetCmd)
        if (matchingCommand) {
          setSelectedCommand(matchingCommand.id)
        }

        sessionStorage.removeItem("presetCommand") // 使用后清除
      }
    }
    
    // 加载执行历史
    if (savedHistory) {
      try {
        const history = JSON.parse(savedHistory)
        setExecutionHistory(history)
      } catch (error) {
        console.error("解析执行历史出错:", error)
      }
    }
  }, [])

  const handleServerToggle = (serverId: string) => {
    setSelectedServers((prev) => (prev.includes(serverId) ? prev.filter((id) => id !== serverId) : [...prev, serverId]))
  }

  const handleSelectAll = () => {
    if (selectedServers.length === servers.length) {
      setSelectedServers([])
    } else {
      setSelectedServers(servers.map((s) => s.id))
    }
  }

  const handleCommandSelect = (commandId: string) => {
    const selectedCmd = commands.find((cmd) => cmd.id === commandId)
    if (selectedCmd) {
      setCommand(selectedCmd.command)
      setSelectedCommand(commandId)
    }
  }

  const generateMockOutput = (cmd: string): string => {
    if (cmd.includes("ls")) {
      return `total 24
drwxr-xr-x 2 root root 4096 Jan 15 10:30 bin
drwxr-xr-x 3 root root 4096 Jan 15 10:30 etc  
drwxr-xr-x 2 root root 4096 Jan 15 10:30 home
drwxr-xr-x 2 root root 4096 Jan 15 10:30 var
-rw-r--r-- 1 root root  220 Jan 15 10:30 .bashrc
-rw-r--r-- 1 root root  807 Jan 15 10:30 .profile`
    }
    if (cmd.includes("ps")) {
      return `  PID TTY          TIME CMD
1234 pts/0    00:00:01 bash
5678 pts/0    00:00:00 nginx
9012 pts/0    00:00:02 mysql
3456 pts/0    00:00:00 ps`
    }
    if (cmd.includes("df")) {
      return `Filesystem     1K-blocks    Used Available Use% Mounted on
/dev/sda1       20971520 8388608  11534336  43% /
/dev/sda2        5242880 1048576   4194304  20% /var
tmpfs            1048576   12288   1036288   2% /tmp`
    }
    if (cmd.includes("uptime")) {
      return ` 10:30:15 up 15 days,  3:42,  2 users,  load average: 0.15, 0.10, 0.05`
    }
    if (cmd.includes("free")) {
      return `              total        used        free      shared  buff/cache   available
Mem:        8192000     2048000     4096000      256000     2048000     5888000
Swap:       2048000           0     2048000`
    }
    if (cmd.includes("top")) {
      return `top - 10:30:15 up 15 days,  3:42,  2 users,  load average: 0.15, 0.10, 0.05
Tasks: 156 total,   1 running, 155 sleeping,   0 stopped,   0 zombie
%Cpu(s):  2.3 us,  1.2 sy,  0.0 ni, 96.5 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
MiB Mem :   8000.0 total,   4000.0 free,   2000.0 used,   2000.0 buff/cache
MiB Swap:   2000.0 total,   2000.0 free,      0.0 used.   5750.0 avail Mem`
    }
    return `Command: ${cmd}
Status: Executed successfully
Output: Command completed with exit code 0
Timestamp: ${new Date().toLocaleString()}
User: root
Working Directory: /root`
  }

  const generateMockError = (): string => {
    const errors = [
      "bash: command not found",
      "Permission denied",
      "No such file or directory",
      "Connection timeout",
      "Authentication failed",
    ]
    return errors[Math.floor(Math.random() * errors.length)]
  }

  const executeCommand = async () => {
    if (!command.trim() || selectedServers.length === 0) return

    setIsExecuting(true)
    setExecutionResults([])
    // Only collapse selection panel on small screens
    if (window.innerWidth < 1024) {
      setShowSelectionPanel(false)
    }

    const results: ExecutionResult[] = []
    const selectedServerList = servers.filter((s) => selectedServers.includes(s.id))

    try {
      // 首先尝试连接到所有服务器
      for (const server of selectedServerList) {
        try {
          await connectToServer(server)
        } catch (error) {
          console.error(`连接到服务器 ${server.name} 失败:`, error)
          // 如果连接失败，添加错误结果
          results.push({
            serverId: server.id,
            serverName: server.name,
            success: false,
            output: "",
            error: `连接失败: ${error instanceof Error ? error.message : '未知错误'}`,
            executionTime: 0,
          })
          setExecutionResults([...results]) // 实时更新结果
        }
      }

      // 批量执行命令
      const startTime = Date.now()
      const response = await batchExecuteCommand(selectedServers, command)
      const executionTime = Date.now() - startTime

      if (response.success && response.data) {
        // 处理每个服务器的执行结果
        for (const server of selectedServerList) {
          const serverResult = response.data[server.id]
          
          if (serverResult) {
            results.push({
              serverId: server.id,
              serverName: server.name,
              success: serverResult.success,
              output: serverResult.success ? serverResult.stdout : "",
              error: serverResult.success ? undefined : (serverResult.stderr || serverResult.message || "执行失败"),
              executionTime,
            })
          } else {
            // 如果没有找到服务器结果，可能是因为连接已经失败
            if (!results.some(r => r.serverId === server.id)) {
              results.push({
                serverId: server.id,
                serverName: server.name,
                success: false,
                output: "",
                error: "未收到执行结果",
                executionTime,
              })
            }
          }
          
          setExecutionResults([...results]) // 实时更新结果
        }
      } else {
        // 如果批量执行失败，为每个服务器添加错误结果
        for (const server of selectedServerList) {
          // 如果该服务器还没有结果（例如，之前的连接步骤没有失败）
          if (!results.some(r => r.serverId === server.id)) {
            results.push({
              serverId: server.id,
              serverName: server.name,
              success: false,
              output: "",
              error: response.message || "批量执行命令失败",
              executionTime,
            })
          }
        }
        
        setExecutionResults([...results])
      }
    } catch (error) {
      console.error("执行命令时发生错误:", error)
      
      // 如果有任何服务器还没有结果，添加错误结果
      for (const server of selectedServerList) {
        if (!results.some(r => r.serverId === server.id)) {
          results.push({
            serverId: server.id,
            serverName: server.name,
            success: false,
            output: "",
            error: `执行错误: ${error instanceof Error ? error.message : '未知错误'}`,
            executionTime: 0,
          })
        }
      }
      
      setExecutionResults([...results])
    }

    // 保存到历史记录
    const historyEntry = {
      timestamp: new Date(),
      command,
      servers: selectedServerList.map((s) => s.name),
      results: [...results],
    }

    const newHistory = [historyEntry, ...executionHistory.slice(0, 9)]
    setExecutionHistory(newHistory)
    localStorage.setItem("executionHistory", JSON.stringify(newHistory))

    setIsExecuting(false)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getSuccessCount = (): number => {
    return executionResults.filter((r) => r.success).length
  }

  const getFailureCount = (): number => {
    return executionResults.filter((result) => !result.success).length
  }
  
  const getAverageExecutionTime = (): number => {
    if (executionResults.length === 0) return 0
    const totalTime = executionResults.reduce((sum, result) => sum + result.executionTime, 0)
    return Math.round(totalTime / executionResults.length)
  }

  if (servers.length === 0) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">批量命令执行</h1>
        </div>

        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Terminal className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-400 mb-2">暂无服务器</h3>
            <p className="text-slate-500 mb-4">请先添加服务器以执行批量命令</p>
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
        <h1 className="text-3xl font-bold text-white">批量命令执行</h1>
      </div>

      <div className="mb-6 p-4 bg-green-900/20 border border-green-700 rounded-lg">
        <p className="text-green-400 text-sm">
          <strong>提示：</strong> 批量命令执行功能已开放，命令将通过SSH在目标服务器上真实执行。请确保服务器连接信息正确，并谨慎执行命令。
        </p>
      </div>

      {/* 重新设计的布局，使用两列布局，左侧为服务器选择，右侧为命令输入和结果显示 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 transition-all duration-300">
        {/* 左侧：服务器选择面板 - 始终显示但可折叠 */}
        <div className={`${showSelectionPanel ? 'lg:col-span-3' : 'lg:col-span-1'}`}>
          <Card className="bg-slate-800 border-slate-700 h-full sticky top-4">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-lg">
                  {showSelectionPanel ? '选择目标服务器' : ''}
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowSelectionPanel(!showSelectionPanel)}
                  className="text-slate-300 hover:bg-slate-700"
                  title={showSelectionPanel ? "折叠面板" : "展开面板"}
                >
                  {showSelectionPanel ? '←' : '→'}
                </Button>
              </div>
            </CardHeader>
            {showSelectionPanel && (
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-slate-300 text-sm">
                    {servers.length} 台服务器可用
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSelectAll}
                    className="border-slate-600 text-white font-medium hover:bg-slate-700 text-xs py-1 h-7"
                  >
                    {selectedServers.length === servers.length ? "取消全选" : "全选"}
                  </Button>
                </div>
                
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
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
            )}
          </Card>
        </div>
        
        {/* 右侧：命令输入和执行结果 */}
        <div className={`${showSelectionPanel ? 'lg:col-span-9' : 'lg:col-span-11'} space-y-6 transition-all duration-300`}>
          {/* 命令输入区域 */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">命令输入</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* 命令库选择 */}
                <div className="lg:col-span-1">
                  <label className="text-slate-300 text-sm mb-2 block">从命令库选择</label>
                  <Select key={selectedCommand} value={selectedCommand} onValueChange={handleCommandSelect}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="选择常用命令..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {commands.map((cmd) => (
                        <SelectItem key={cmd.id} value={cmd.id}>
                          {cmd.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 命令输入框 */}
                <div className="lg:col-span-3">
                  <label className="text-slate-300 text-sm mb-2 block">输入命令</label>
                  <Textarea
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder="在此输入要执行的命令..."
                    className="bg-slate-700 border-slate-600 text-white min-h-[100px]"
                  />
                </div>

                {/* 执行按钮 */}
                <div className="lg:col-span-4 flex justify-between items-center">
                  <div className="text-slate-400 text-sm">
                    {selectedServers.length > 0 && (
                      <span>将在 <strong className="text-cyan-400">{selectedServers.length}</strong> 台服务器上执行</span>
                    )}
                  </div>
                  <Button
                    onClick={executeCommand}
                    disabled={isExecuting || !command.trim() || selectedServers.length === 0}
                    className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 px-6"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    执行命令
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 执行结果区域 */}
          {(isExecuting || executionResults.length > 0) && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">执行结果</CardTitle>
                  {executionResults.length > 0 && (
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setExecutionResults([]);
                          setCommand("");
                          setSelectedCommand("");
                        }}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        清除结果
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* 执行状态指示器 */}
                {isExecuting && (
                  <div className="p-4 bg-slate-750 rounded-lg mb-4 flex items-center">
                    <div className="animate-spin mr-3">
                      <Clock className="h-5 w-5 text-cyan-400" />
                    </div>
                    <p className="text-cyan-400">正在执行命令，请稍候...</p>
                  </div>
                )}

                {/* 执行统计信息 */}
                {executionResults.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    {/* 命令信息 */}
                    <div className="lg:col-span-3 p-4 bg-slate-750 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-slate-300 text-sm">执行的命令</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigator.clipboard.writeText(command)}
                          className="h-7 text-xs text-slate-400 hover:text-white"
                        >
                          <Copy className="h-3 w-3 mr-1" /> 复制
                        </Button>
                      </div>
                      <p className="text-white font-mono bg-slate-900 p-3 rounded overflow-x-auto">{command}</p>
                    </div>

                    {/* 成功/失败统计 */}
                    <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
                      <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                        <div>
                          <p className="text-green-400 text-xs">成功执行</p>
                          <p className="text-green-300 text-xl font-bold">{getSuccessCount()} / {selectedServers.length}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
                      <div className="flex items-center">
                        <XCircle className="h-5 w-5 text-red-400 mr-2" />
                        <div>
                          <p className="text-red-400 text-xs">执行失败</p>
                          <p className="text-red-300 text-xl font-bold">{getFailureCount()} / {selectedServers.length}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-750 rounded-lg">
                      <div className="flex items-center">
                        <Clock className="h-5 w-5 text-slate-400 mr-2" />
                        <div>
                          <p className="text-slate-400 text-xs">平均执行时间</p>
                          <p className="text-slate-300 text-xl font-bold">{getAverageExecutionTime()} ms</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 详细执行结果 */}
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {executionResults.map((result) => (
                    <div key={result.serverId} className="p-4 bg-slate-750 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <Server className="h-4 w-4 text-slate-400 mr-2" />
                          <p className="text-white font-medium">{result.serverName}</p>
                        </div>
                        <Badge className={result.success ? "bg-green-600" : "bg-red-600"}>
                          {result.success ? "成功" : "失败"}
                        </Badge>
                      </div>
                      
                      <div className="bg-slate-900 p-3 rounded-lg mt-2 overflow-x-auto">
                        <pre className="text-slate-300 font-mono text-sm whitespace-pre-wrap">
                          {result.success ? result.output : result.error}
                        </pre>
                      </div>
                      
                      <div className="flex justify-between items-center mt-2 text-xs text-slate-400">
                        <span>执行时间: {result.executionTime} ms</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(result.success ? result.output : result.error || "")}
                          className="h-6 text-xs text-slate-400 hover:text-white"
                        >
                          <Copy className="h-3 w-3 mr-1" /> 复制输出
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 执行历史 */}
          {executionHistory.length > 0 && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white">执行历史</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setExecutionHistory([])}
                  className="border-slate-600 text-white font-medium hover:bg-slate-700"
                >
                  清除历史
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {executionHistory.map((entry, index) => (
                    <div key={index} className="p-4 bg-slate-750 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-white font-medium">命令执行</p>
                          <p className="text-slate-400 text-xs">
                            {new Date(entry.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <Badge className="bg-slate-600">
                          {entry.servers.length} 台服务器
                        </Badge>
                      </div>
                      
                      <div className="bg-slate-900 p-3 rounded-lg mt-2">
                        <p className="text-slate-300 font-mono text-sm">{entry.command}</p>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex space-x-3">
                          <div className="flex items-center">
                            <CheckCircle className="h-4 w-4 text-green-400 mr-1" />
                            <span className="text-green-400 text-xs">
                              {entry.results.filter((r: ExecutionResult) => r.success).length} 成功
                            </span>
                          </div>
                          <div className="flex items-center">
                            <XCircle className="h-4 w-4 text-red-400 mr-1" />
                            <span className="text-red-400 text-xs">
                              {entry.results.filter((r: ExecutionResult) => !r.success).length} 失败
                            </span>
                          </div>
                        </div>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCommand(entry.command);
                            // 找到对应的命令并设置选中状态
                            const matchingCommand = commands.find((cmd) => cmd.command === entry.command);
                            if (matchingCommand) {
                              setSelectedCommand(matchingCommand.id);
                            } else {
                              setSelectedCommand("");
                            }
                            // 设置选中的服务器
                            const serverIds = servers
                              .filter(server => entry.servers.includes(server.name))
                              .map(server => server.id);
                            setSelectedServers(serverIds);
                            setShowSelectionPanel(true);
                          }}
                          className="text-xs border-slate-600 text-white font-medium hover:bg-slate-700"
                        >
                          重新执行
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
