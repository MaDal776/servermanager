"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Terminal, Edit, Trash2, Copy, Play, Search } from "lucide-react"
import CommandFormModal from "./command-form-modal"

interface CommandInfo {
  id: string
  name: string
  command: string
  description?: string
  category: string
  createdAt: Date
}

const defaultCommands: Omit<CommandInfo, "id" | "createdAt">[] = [
  {
    name: "查看系统信息",
    command: "uname -a",
    description: "显示系统内核信息",
    category: "系统信息",
  },
  {
    name: "查看内存使用",
    command: "free -h",
    description: "显示内存使用情况",
    category: "系统监控",
  },
  {
    name: "查看磁盘空间",
    command: "df -h",
    description: "显示磁盘空间使用情况",
    category: "系统监控",
  },
  {
    name: "查看运行进程",
    command: "ps aux",
    description: "显示所有运行中的进程",
    category: "进程管理",
  },
  {
    name: "查看网络连接",
    command: "netstat -tulpn",
    description: "显示网络连接和监听端口",
    category: "网络管理",
  },
  {
    name: "更新软件包",
    command: "apt update && apt upgrade -y",
    description: "Ubuntu/Debian 系统更新",
    category: "软件管理",
  },
  {
    name: "查看系统负载",
    command: "uptime",
    description: "显示系统运行时间和负载",
    category: "系统监控",
  },
  {
    name: "清理日志文件",
    command: "journalctl --vacuum-time=7d",
    description: "清理7天前的系统日志",
    category: "系统维护",
  },
]

export default function CommandLibrary() {
  const [commands, setCommands] = useState<CommandInfo[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingCommand, setEditingCommand] = useState<CommandInfo | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  useEffect(() => {
    // 从本地存储加载命令库
    const savedCommands = localStorage.getItem("commands")
    if (savedCommands) {
      setCommands(JSON.parse(savedCommands))
    } else {
      // 如果没有保存的命令，初始化默认命令
      const initialCommands = defaultCommands.map((cmd) => ({
        ...cmd,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        createdAt: new Date(),
      }))
      setCommands(initialCommands)
      localStorage.setItem("commands", JSON.stringify(initialCommands))
    }
  }, [])

  const saveCommands = useCallback((commandList: CommandInfo[]) => {
    localStorage.setItem("commands", JSON.stringify(commandList))
    setCommands(commandList)
  }, [])

  const handleSubmit = useCallback(
    (formData: { name: string; command: string; description: string; category: string }) => {
      if (editingCommand) {
        // 编辑现有命令
        const updatedCommands = commands.map((cmd) => (
          cmd.id === editingCommand.id ? { ...cmd, ...formData } : cmd
        ))
        saveCommands(updatedCommands)
        setEditingCommand(null)
      } else {
        // 添加新命令
        const newCommand: CommandInfo = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          ...formData,
          createdAt: new Date(),
        }
        saveCommands([...commands, newCommand])
      }

      setIsAddDialogOpen(false)
    },
    [editingCommand, commands, saveCommands],
  )

  // 处理编辑按钮点击
  const handleEditButtonClick = useCallback((command: CommandInfo) => {
    setEditingCommand(command)
    setIsAddDialogOpen(true)
  }, [])

  const handleEdit = useCallback((command: CommandInfo) => {
    handleEditButtonClick(command)
  }, [handleEditButtonClick])

  const handleDelete = useCallback(
    (commandId: string) => {
      if (confirm("确定要删除这个命令吗？")) {
        const updatedCommands = commands.filter((cmd) => cmd.id !== commandId)
        saveCommands(updatedCommands)
      }
    },
    [commands, saveCommands],
  )

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
  }, [])

  const executeCommand = useCallback((command: CommandInfo) => {
    // 跳转到批量命令页面并预填充命令
    window.dispatchEvent(
      new CustomEvent("navigate", {
        detail: {
          page: "batch-command",
          command: command.command,
          commandName: command.name,
        },
      }),
    )
  }, [])

  const handleDialogClose = useCallback(() => {
    setIsAddDialogOpen(false)
    setEditingCommand(null)
  }, [])
  


  // 获取所有分类
  const categories = ["all", ...Array.from(new Set(commands.map((cmd) => cmd.category)))]

  // 过滤命令
  const filteredCommands = commands.filter((cmd) => {
    const matchesSearch =
      cmd.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cmd.command.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cmd.description && cmd.description.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = selectedCategory === "all" || cmd.category === selectedCategory
    return matchesSearch && matchesCategory
  })



  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">命令库管理</h1>
        <Button 
          className="bg-cyan-500 hover:bg-cyan-600"
          type="button"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          添加命令
        </Button>
        
        <CommandFormModal
          isOpen={isAddDialogOpen}
          onClose={handleDialogClose}
          onSubmit={handleSubmit}
          initialData={editingCommand || undefined}
          title={editingCommand ? "编辑命令" : "添加新命令"}
        />
      </div>

      {/* 搜索和过滤 */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="搜索命令..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-700 border-slate-600 text-white"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {categories.map((category) => (
            <Button
              key={category}
              size="sm"
              variant={selectedCategory === category ? "default" : "outline"}
              onClick={() => setSelectedCategory(category)}
              className={
                selectedCategory === category
                  ? "bg-cyan-500 hover:bg-cyan-600"
                  : "border-slate-600 text-slate-300 hover:bg-slate-700"
              }
            >
              {category === "all" ? "全部" : category}
            </Button>
          ))}
        </div>
      </div>

      {filteredCommands.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Terminal className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-400 mb-2">
              {searchTerm || selectedCategory !== "all" ? "未找到匹配的命令" : "暂无命令"}
            </h3>
            <p className="text-slate-500 mb-4">
              {searchTerm || selectedCategory !== "all"
                ? "尝试调整搜索条件或分类筛选"
                : "点击上方按钮添加您的第一个命令"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCommands.map((command) => (
            <Card key={command.id} className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-white text-lg mb-2">{command.name}</CardTitle>
                    <Badge variant="outline" className="border-cyan-500 text-cyan-400 text-xs">
                      {command.category}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {command.description && <p className="text-slate-400 text-sm">{command.description}</p>}

                <div className="bg-slate-900 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-500 text-xs">命令:</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(command.command)}
                      className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                      title="复制命令"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <code className="text-green-400 text-sm font-mono break-all">{command.command}</code>
                </div>

                <div className="text-xs text-slate-500">创建时间: {new Date(command.createdAt).toLocaleString()}</div>

                <div className="flex justify-between space-x-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => executeCommand(command)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Play className="w-4 h-4 mr-1" />
                    执行
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(command)}
                    className="border-slate-600 text-white font-medium hover:bg-slate-700"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(command.id)}
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
    </div>
  )
}
