export interface ServerInfo {
  id: string
  name: string
  ip: string
  user: string
  password: string
  authType: "password" | "key"
  keyPath?: string
  createdAt: string | Date
}

export interface MemoryDetails {
  used: number
  total: number
}

export interface DiskDetails {
  used: number
  total: number
}

export interface NetworkTraffic {
  up: number
  down: number
}

export interface ServerStatus {
  id: string
  online: boolean
  uptime?: string
  cpu?: number
  memory?: number
  disk?: number
  load?: string
  lastCheck: Date
  cpuHistory?: number[]
  memoryHistory?: number[]
  diskHistory?: number[]
  networkHistory?: number[]
  memoryDetails?: MemoryDetails
  diskDetails?: DiskDetails
  network?: NetworkTraffic
}
