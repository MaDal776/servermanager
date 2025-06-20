"use client"

import React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Cpu, HardDrive, MemoryStick, AlertCircle, Network, Activity } from "lucide-react"
import { ServerInfo, ServerStatus } from "@/types/server"

interface ServerStatusCardProps {
  server: ServerInfo
  status: ServerStatus
  onRefresh: (serverId: string) => void
  isRefreshing: boolean
}

export default function ServerStatusCard({ server, status, onRefresh, isRefreshing }: ServerStatusCardProps) {
  const getStatusColor = (value: number) => {
    if (value < 50) return "text-green-400"
    if (value < 80) return "text-yellow-400"
    return "text-red-400"
  }

  const getProgressColor = (value: number) => {
    if (value < 50) return "bg-green-500"
    if (value < 80) return "bg-yellow-500"
    return "bg-red-500"
  }

  // 生成简单的历史数据图表
  const generateMiniChart = (values: number[], type: "cpu" | "memory" | "disk" | "network") => {
    const height = 20
    const width = 60
    const max = Math.max(...values, 100)
    
    const colorMap = {
      cpu: "#22c55e",
      memory: "#3b82f6",
      disk: "#f97316",
      network: "#8b5cf6"
    }
    
    const color = colorMap[type]
    
    return (
      <svg width={width} height={height} className="ml-2">
        {values.map((value, index) => {
          const barHeight = (value / max) * height
          const barWidth = width / values.length - 1
          const x = index * (barWidth + 1)
          const y = height - barHeight
          
          return (
            <rect 
              key={index} 
              x={x} 
              y={y} 
              width={barWidth} 
              height={barHeight} 
              fill={color}
              opacity={0.7 + (index / values.length) * 0.3}
            />
          )
        })}
      </svg>
    )
  }

  return (
    <Card className="bg-slate-800 border-slate-700 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-lg flex items-center">
            {server.name}
            {status.online && (
              <span className="ml-2 flex items-center text-xs text-slate-400">
                <Activity className="w-3 h-3 mr-1" />
                {status.load ? `负载: ${status.load}` : ""}
              </span>
            )}
          </CardTitle>
          <Badge
            variant={status.online ? "default" : "destructive"}
            className={status.online ? "bg-green-500" : "bg-red-500"}
          >
            {status.online ? "在线" : "离线"}
          </Badge>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-slate-400 text-sm">{server.ip}</p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onRefresh(server.id)}
            disabled={isRefreshing}
            className="h-6 px-2 text-xs text-slate-400 hover:text-white"
          >
            刷新
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {status.online ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">运行时间</span>
              <span className="text-slate-300">{status.uptime}</span>
            </div>

            {/* CPU 使用率 */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <div className="flex items-center">
                  <Cpu className="w-4 h-4 mr-1 text-slate-400" />
                  <span className="text-slate-400">CPU</span>
                </div>
                <div className="flex items-center">
                  <span className={getStatusColor(status.cpu || 0)}>{status.cpu}%</span>
                  {status.cpuHistory && generateMiniChart(status.cpuHistory, "cpu")}
                </div>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getProgressColor(status.cpu || 0)}`}
                  style={{ width: `${status.cpu}%` }}
                />
              </div>
            </div>

            {/* 内存使用率 */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <div className="flex items-center">
                  <MemoryStick className="w-4 h-4 mr-1 text-slate-400" />
                  <span className="text-slate-400">内存</span>
                </div>
                <div className="flex items-center">
                  <span className={getStatusColor(status.memory || 0)}>{status.memory}%</span>
                  {status.memoryHistory && generateMiniChart(status.memoryHistory, "memory")}
                </div>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getProgressColor(status.memory || 0)}`}
                  style={{ width: `${status.memory}%` }}
                />
              </div>
              {status.memoryDetails && (
                <div className="text-xs text-slate-400 mt-1">
                  {status.memoryDetails.used}GB / {status.memoryDetails.total}GB
                </div>
              )}
            </div>

            {/* 磁盘使用率 */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <div className="flex items-center">
                  <HardDrive className="w-4 h-4 mr-1 text-slate-400" />
                  <span className="text-slate-400">磁盘</span>
                </div>
                <div className="flex items-center">
                  <span className={getStatusColor(status.disk || 0)}>{status.disk}%</span>
                  {status.diskHistory && generateMiniChart(status.diskHistory, "disk")}
                </div>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getProgressColor(status.disk || 0)}`}
                  style={{ width: `${status.disk}%` }}
                />
              </div>
              {status.diskDetails && (
                <div className="text-xs text-slate-400 mt-1">
                  {status.diskDetails.used}GB / {status.diskDetails.total}GB
                </div>
              )}
            </div>

            {/* 网络流量 */}
            {status.network && (
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center">
                    <Network className="w-4 h-4 mr-1 text-slate-400" />
                    <span className="text-slate-400">网络</span>
                  </div>
                  <div className="flex items-center">
                    {status.networkHistory && generateMiniChart(status.networkHistory, "network")}
                  </div>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>↑ {status.network.up} KB/s</span>
                  <span>↓ {status.network.down} KB/s</span>
                </div>
              </div>
            )}

            {/* 最后更新时间 */}
            <div className="text-xs text-slate-500 text-right pt-2">
              更新于: {new Date(status.lastCheck).toLocaleString()}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">服务器离线</p>
              <p className="text-xs text-slate-500 mt-2">
                最后检查: {new Date(status.lastCheck).toLocaleString()}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onRefresh(server.id)}
                disabled={isRefreshing}
                className="mt-4 border-slate-600 text-white font-medium hover:bg-slate-700"
              >
                重试连接
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
