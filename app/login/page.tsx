'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Login from '@/components/login'
import { isAuthenticated } from '@/services/auth-service'

export default function LoginPage() {
  const router = useRouter()
  
  useEffect(() => {
    // 如果用户已登录，直接跳转到首页
    if (isAuthenticated()) {
      router.push('/')
    }
  }, [router])
  
  return <Login />
}
