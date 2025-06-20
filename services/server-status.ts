import { ServerInfo, ServerStatus } from "@/types/server"

// 保存历史数据的最大长度
const MAX_HISTORY_LENGTH = 10

// 本地存储键名
const SERVER_STATUS_KEY = "server-statuses"

// 获取随机数，在指定范围内波动
const getRandomWithVariation = (base: number, variation: number): number => {
  const min = Math.max(0, base - variation)
  const max = Math.min(100, base + variation)
  return Math.floor(Math.random() * (max - min + 1) + min)
}

// 生成模拟的服务器状态数据
export const generateServerStatus = (serverId: string, previousStatus?: ServerStatus): ServerStatus => {
  // 模拟80%的在线率
  const online = Math.random() > 0.2

  // 如果离线，返回简单状态
  if (!online) {
    return {
      id: serverId,
      online: false,
      lastCheck: new Date()
    }
  }

  // 如果有之前的状态，基于它生成新状态（有一定波动）
  if (previousStatus && previousStatus.online) {
    const cpu = getRandomWithVariation(previousStatus.cpu || 50, 10)
    const memory = getRandomWithVariation(previousStatus.memory || 50, 8)
    const disk = getRandomWithVariation(previousStatus.disk || 50, 5)
    
    // 更新历史数据
    const cpuHistory = [...(previousStatus.cpuHistory || []), cpu].slice(-MAX_HISTORY_LENGTH)
    const memoryHistory = [...(previousStatus.memoryHistory || []), memory].slice(-MAX_HISTORY_LENGTH)
    const diskHistory = [...(previousStatus.diskHistory || []), disk].slice(-MAX_HISTORY_LENGTH)
    
    // 网络流量
    const networkUp = Math.floor(Math.random() * 1000)
    const networkDown = Math.floor(Math.random() * 2000)
    const networkHistory = [...(previousStatus.networkHistory || []), 
      Math.floor((networkUp + networkDown) / 30)].slice(-MAX_HISTORY_LENGTH)

    // 计算负载
    const load = (cpu / 100 * (Math.random() * 2 + 2)).toFixed(2)

    return {
      id: serverId,
      online: true,
      uptime: previousStatus.uptime || `${Math.floor(Math.random() * 30)}天 ${Math.floor(Math.random() * 24)}小时`,
      cpu,
      memory,
      disk,
      load,
      cpuHistory,
      memoryHistory,
      diskHistory,
      networkHistory,
      memoryDetails: {
        used: Math.floor(memory / 100 * 16),
        total: 16
      },
      diskDetails: {
        used: Math.floor(disk / 100 * 500),
        total: 500
      },
      network: {
        up: networkUp,
        down: networkDown
      },
      lastCheck: new Date()
    }
  }

  // 全新状态
  const cpu = Math.floor(Math.random() * 100)
  const memory = Math.floor(Math.random() * 100)
  const disk = Math.floor(Math.random() * 100)
  
  return {
    id: serverId,
    online: true,
    uptime: `${Math.floor(Math.random() * 30)}天 ${Math.floor(Math.random() * 24)}小时`,
    cpu,
    memory,
    disk,
    load: (cpu / 100 * (Math.random() * 2 + 2)).toFixed(2),
    cpuHistory: [cpu],
    memoryHistory: [memory],
    diskHistory: [disk],
    networkHistory: [Math.floor(Math.random() * 100)],
    memoryDetails: {
      used: Math.floor(memory / 100 * 16),
      total: 16
    },
    diskDetails: {
      used: Math.floor(disk / 100 * 500),
      total: 500
    },
    network: {
      up: Math.floor(Math.random() * 1000),
      down: Math.floor(Math.random() * 2000)
    },
    lastCheck: new Date()
  }
}

// 初始化服务器状态
export const initializeServerStatuses = (servers: ServerInfo[]): ServerStatus[] => {
  // 尝试从本地存储加载现有状态
  const savedStatusesStr = localStorage.getItem(SERVER_STATUS_KEY)
  let savedStatuses: ServerStatus[] = []
  
  if (savedStatusesStr) {
    try {
      savedStatuses = JSON.parse(savedStatusesStr)
    } catch (e) {
      console.error("Failed to parse saved server statuses", e)
    }
  }
  
  // 为每个服务器生成或更新状态
  const statuses = servers.map(server => {
    const existingStatus = savedStatuses.find(s => s.id === server.id)
    return generateServerStatus(server.id, existingStatus)
  })
  
  // 保存到本地存储
  localStorage.setItem(SERVER_STATUS_KEY, JSON.stringify(statuses))
  
  return statuses
}

// 刷新单个服务器状态
export const refreshServerStatus = (serverId: string, currentStatuses: ServerStatus[]): ServerStatus[] => {
  const updatedStatuses = currentStatuses.map(status => {
    if (status.id === serverId) {
      return generateServerStatus(serverId, status)
    }
    return status
  })
  
  // 保存到本地存储
  localStorage.setItem(SERVER_STATUS_KEY, JSON.stringify(updatedStatuses))
  
  return updatedStatuses
}

// 刷新所有服务器状态
export const refreshAllServerStatuses = (currentStatuses: ServerStatus[]): ServerStatus[] => {
  const updatedStatuses = currentStatuses.map(status => 
    generateServerStatus(status.id, status)
  )
  
  // 保存到本地存储
  localStorage.setItem(SERVER_STATUS_KEY, JSON.stringify(updatedStatuses))
  
  return updatedStatuses
}
