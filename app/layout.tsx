import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "../utils/uuid-polyfill.js"


const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "服务器管理平台",
  description: "基于Web UI + 本地代理架构的服务器管理平台",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
