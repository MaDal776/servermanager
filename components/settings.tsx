"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Save, RotateCcw } from "lucide-react"

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    timeout: 30,
    autoRefresh: true,
    refreshInterval: 30,
    maxHistory: 10,
    theme: "dark",
  })

  const handleSave = () => {
    localStorage.setItem("appSettings", JSON.stringify(settings))
    alert("设置已保存")
  }

  const handleReset = () => {
    const defaultSettings = {
      timeout: 30,
      autoRefresh: true,
      refreshInterval: 30,
      maxHistory: 10,
      theme: "dark",
    }
    setSettings(defaultSettings)
    localStorage.removeItem("appSettings")
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">系统设置</h1>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* 连接设置 */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">连接设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="timeout" className="text-slate-300">
                连接超时时间 (秒)
              </Label>
              <Input
                id="timeout"
                type="number"
                value={settings.timeout}
                onChange={(e) => setSettings({ ...settings, timeout: Number.parseInt(e.target.value) })}
                className="bg-slate-700 border-slate-600 text-white"
                min="5"
                max="300"
              />
            </div>
          </CardContent>
        </Card>

        {/* 界面设置 */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">界面设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto-refresh"
                checked={settings.autoRefresh}
                onCheckedChange={(checked) => setSettings({ ...settings, autoRefresh: !!checked })}
                className="data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
              />
              <Label htmlFor="auto-refresh" className="text-slate-300">
                自动刷新服务器状态
              </Label>
            </div>

            {settings.autoRefresh && (
              <div>
                <Label htmlFor="refresh-interval" className="text-slate-300">
                  刷新间隔 (秒)
                </Label>
                <Input
                  id="refresh-interval"
                  type="number"
                  value={settings.refreshInterval}
                  onChange={(e) => setSettings({ ...settings, refreshInterval: Number.parseInt(e.target.value) })}
                  className="bg-slate-700 border-slate-600 text-white"
                  min="10"
                  max="300"
                />
              </div>
            )}

            <div>
              <Label htmlFor="max-history" className="text-slate-300">
                最大历史记录数
              </Label>
              <Input
                id="max-history"
                type="number"
                value={settings.maxHistory}
                onChange={(e) => setSettings({ ...settings, maxHistory: Number.parseInt(e.target.value) })}
                className="bg-slate-700 border-slate-600 text-white"
                min="5"
                max="100"
              />
            </div>
          </CardContent>
        </Card>

        {/* 数据管理 */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">数据管理</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => {
                  const data = {
                    servers: localStorage.getItem("servers"),
                    commands: localStorage.getItem("commands"),
                    settings: localStorage.getItem("appSettings"),
                  }
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = "server-management-backup.json"
                  a.click()
                }}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                导出数据
              </Button>

              <Button
                onClick={() => {
                  if (confirm("确定要清除所有数据吗？此操作不可恢复！")) {
                    localStorage.clear()
                    window.location.reload()
                  }
                }}
                variant="outline"
                className="border-red-600 text-red-400 hover:bg-red-900/20"
              >
                清除所有数据
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-4">
          <Button
            onClick={handleReset}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            重置默认
          </Button>
          <Button onClick={handleSave} className="bg-cyan-500 hover:bg-cyan-600">
            <Save className="w-4 h-4 mr-2" />
            保存设置
          </Button>
        </div>
      </div>
    </div>
  )
}
