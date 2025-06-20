'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/services/auth-service'
import { Loader2 } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // 检查用户是否已登录
    const checkAuth = () => {
      if (!isAuthenticated()) {
        // 如果未登录，重定向到登录页面
        router.push('/login')
      } else {
        setLoading(false)
      }
    }
    
    checkAuth()
  }, [router])
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <p className="text-white text-xl">加载中...</p>
        </div>
      </div>
    )
  }
  
  return <>{children}</>
}
