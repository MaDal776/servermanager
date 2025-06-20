"use client"

import React, { useCallback, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { X } from "lucide-react"

interface CommandFormData {
  name: string
  command: string
  description: string
  category: string
}

interface CommandInfo extends CommandFormData {
  id: string
  createdAt: Date
}

interface CommandFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (formData: CommandFormData) => void
  initialData?: CommandInfo
  title: string
}

export default function CommandFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title
}: CommandFormModalProps) {
  // 使用useState管理表单数据
  const [formData, setFormData] = React.useState<CommandFormData>({
    name: "",
    command: "",
    description: "",
    category: "自定义",
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
        command: initialData.command,
        description: initialData.description || "",
        category: initialData.category,
      });
    } else {
      setFormData({
        name: "",
        command: "",
        description: "",
        category: "自定义",
      });
    }
  }, [initialData])

  // 使用React.useCallback而非import的useCallback，确保一致性
  const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }, []) // 保持空依赖数组，确保回调函数不会重新创建

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
            <Label htmlFor="command-name" className="text-slate-300">
              命令名称
            </Label>
            <Input
              id="command-name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="例如：查看系统信息"
              className="bg-slate-700 border-slate-600 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="command-content" className="text-slate-300">
              命令内容
            </Label>
            <Textarea
              id="command-content"
              name="command"
              value={formData.command}
              onChange={handleInputChange}
              placeholder="例如：uname -a"
              className="bg-slate-700 border-slate-600 text-white font-mono"
              required
            />
          </div>

          <div>
            <Label htmlFor="command-description" className="text-slate-300">
              描述（可选）
            </Label>
            <Input
              id="command-description"
              name="description"
              type="text"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="简要描述命令的作用"
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          <div>
            <Label htmlFor="command-category" className="text-slate-300">
              分类
            </Label>
            <Input
              id="command-category"
              name="category"
              type="text"
              value={formData.category}
              onChange={handleInputChange}
              placeholder="例如：系统监控"
              className="bg-slate-700 border-slate-600 text-white"
              required
            />
          </div>

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
