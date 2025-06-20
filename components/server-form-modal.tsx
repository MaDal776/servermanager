"use client"

import React, { useCallback, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, X } from "lucide-react"

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

interface ServerFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (formData: ServerFormData) => void
  initialData?: ServerInfo
  title: string
}

export default function ServerFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title
}: ServerFormModalProps) {
  // 使用useState管理表单数据
  const [formData, setFormData] = React.useState<ServerFormData>({
    name: "",
    ip: "",
    user: "",
    password: "",
    authType: "password",
    keyPath: "",
  });

  const [mounted, setMounted] = React.useState(false)

  // 当组件挂载时，设置 mounted 为 true
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // 当 initialData 变化时，更新表单数据
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        ip: initialData.ip,
        user: initialData.user,
        password: initialData.password,
        authType: initialData.authType,
        keyPath: initialData.keyPath || "",
      });
    } else {
      setFormData({
        name: "",
        ip: "",
        user: "",
        password: "",
        authType: "password",
        keyPath: "",
      });
    }
  }, [initialData])

  // 使用React.useCallback而非import的useCallback，确保一致性
  const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }, []) // 保持空依赖数组，确保回调函数不会重新创建

  const handleAuthTypeChange = React.useCallback((value: "password" | "key") => {
    setFormData((prev) => ({
      ...prev,
      authType: value,
    }))
  }, [])

  const handleSubmit = React.useCallback((e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }, [formData, onSubmit])

  // 阻止点击模态框内部时的事件冒泡
  const handleModalClick = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  // 如果组件未挂载或对话框未打开，则不渲染
  if (!mounted || !isOpen) return null

  // 使用 createPortal 将模态框渲染到 body 中
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div 
        className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-lg"
        onClick={handleModalClick}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="server-name" className="text-slate-300">
              服务器别名
            </Label>
            <Input
              id="server-name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="例如：生产服务器"
              className="bg-slate-700 border-slate-600 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="server-ip" className="text-slate-300">
              IP 地址
            </Label>
            <Input
              id="server-ip"
              name="ip"
              type="text"
              value={formData.ip}
              onChange={handleInputChange}
              placeholder="例如：192.168.1.100"
              className="bg-slate-700 border-slate-600 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="server-user" className="text-slate-300">
              用户名
            </Label>
            <Input
              id="server-user"
              name="user"
              type="text"
              value={formData.user}
              onChange={handleInputChange}
              placeholder="例如：root"
              className="bg-slate-700 border-slate-600 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="server-auth-type" className="text-slate-300">
              认证方式
            </Label>
            <Select
              value={formData.authType}
              onValueChange={handleAuthTypeChange}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="password">密码认证</SelectItem>
                <SelectItem value="key">SSH 密钥</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.authType === "password" ? (
            <div>
              <Label htmlFor="server-password" className="text-slate-300">
                密码
              </Label>
              <Input
                id="server-password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="请输入密码"
                className="bg-slate-700 border-slate-600 text-white"
                required
              />
              <div className="flex items-center mt-2 p-2 bg-yellow-900/20 border border-yellow-700 rounded">
                <AlertTriangle className="w-4 h-4 text-yellow-500 mr-2" />
                <p className="text-xs text-yellow-400">密码将以明文形式存储在浏览器中，建议使用 SSH 密钥认证</p>
              </div>
            </div>
          ) : (
            <div>
              <Label htmlFor="server-key-path" className="text-slate-300">
                SSH 密钥路径
              </Label>
              <Input
                id="server-key-path"
                name="keyPath"
                type="text"
                value={formData.keyPath}
                onChange={handleInputChange}
                placeholder="例如：~/.ssh/id_rsa"
                className="bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-600 text-white font-medium hover:bg-slate-700"
            >
              取消
            </Button>
            <Button type="submit" className="bg-cyan-500 hover:bg-cyan-600">
              {initialData ? "更新" : "添加"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
