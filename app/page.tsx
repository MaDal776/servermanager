"use client"

import { useState, useEffect } from "react"
import Dashboard from "@/components/dashboard"
import ServerManagement from "@/components/server-management"
import CommandLibrary from "@/components/command-library"
import FileSync from "@/components/file-sync"
import BatchCommand from "@/components/batch-command"
import BatchCommandTest from "@/components/batch-command-test"
import { Monitor, Server, Terminal, FolderSync, Command, LogOut, Settings, TestTube } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import SettingsPage from "@/components/settings"
import AuthGuard from "@/components/auth-guard"
import { useRouter } from "next/navigation"
import { logout, getCurrentUser } from "@/services/auth-service"

interface User {
  name: string
  email: string
  picture: string
}

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>({
    name: "管理员",
    email: "admin@example.com",
    picture: "/placeholder.svg?height=40&width=40",
  })
  const [activeTab, setActiveTab] = useState("dashboard")

  useEffect(() => {
    // 监听自定义导航事件
    const handleNavigate = (event: any) => {
      if (event.detail) {
        if (typeof event.detail === "string") {
          setActiveTab(event.detail)
        } else if (event.detail.page) {
          setActiveTab(event.detail.page)
          // 如果有命令信息，存储到sessionStorage供批量命令页面使用
          if (event.detail.command) {
            sessionStorage.setItem(
              "presetCommand",
              JSON.stringify({
                command: event.detail.command,
                name: event.detail.commandName,
              }),
            )
          }
        }
      }
    }
    
    window.addEventListener('navigate', handleNavigate)
    
    // 从本地存储获取用户信息
    const currentUser = getCurrentUser()
    if (currentUser) {
      setUser({
        name: currentUser.username,
        email: `${currentUser.username}@example.com`,
        picture: "/placeholder.svg?height=40&width=40",
      })
    }
    
    return () => {
      window.removeEventListener('navigate', handleNavigate)
    }
  }, [])

  const handleLogout = () => {
    logout()
    router.push('/login')
    localStorage.removeItem("user")
    // 清除所有相关数据
    localStorage.removeItem("servers")
    localStorage.removeItem("commands")
  }

  const navigationItems = [
    { id: "dashboard", label: "仪表盘", icon: Monitor },
    { id: "servers", label: "服务器", icon: Server },
    { id: "batch-command", label: "批量命令", icon: Command },
    { id: "command-library", label: "命令库", icon: Terminal },
    { id: "file-sync", label: "文件同步", icon: FolderSync },
    { id: "settings", label: "设置", icon: Settings },
  ]

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />
      case "servers":
        return <ServerManagement />
      case "batch-command":
        return <BatchCommand />
      case "command-library":
        return <CommandLibrary />
      case "file-sync":
        return <FileSync />
      case "batch-command-test":
        return <BatchCommandTest />
      case "settings":
        return <SettingsPage />
      default:
        return <Dashboard />
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-900 flex">
        {/* 右侧导航栏 */}
        <div className="w-20 bg-slate-800 border-l border-slate-700 flex flex-col items-center py-6 fixed right-0 top-0 h-full z-10">
        {/* 用户头像 */}
        <div className="mb-8">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user?.picture || "/placeholder.svg?height=40&width=40"} alt={user?.name} />
            <AvatarFallback className="bg-cyan-500 text-white">{user?.name.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 flex flex-col space-y-4">
          {navigationItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors group relative ${
                  activeTab === item.id
                    ? "bg-cyan-500 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
                title={item.label}
              >
                <Icon className="w-5 h-5" />
                <span className="absolute right-full mr-2 px-2 py-1 bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            )
          })}
        </nav>

        {/* 底部按钮 */}
        <div className="space-y-4">
          <button
            onClick={handleLogout}
            className="w-12 h-12 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors group relative"
            title="退出登录"
          >
            <LogOut className="w-5 h-5" />
            <span className="absolute right-full mr-2 px-2 py-1 bg-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              退出登录
            </span>
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 pr-20">{renderContent()}</div>
    </div>
    </AuthGuard>
  )
}
