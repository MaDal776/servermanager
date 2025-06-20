// 本地代理服务器 - 用于实现真实的SSH和文件传输功能
const express = require("express")
const cors = require("cors")
const multer = require("multer")
const { Client } = require("ssh2")
const fs = require("fs")
const path = require("path")

const app = express()
const port = 3001

// 中间件
app.use(cors())
app.use(express.json())

// 文件上传配置
const upload = multer({ dest: "uploads/" })

// SSH连接池
const connections = new Map()

// 创建SSH连接
async function createSSHConnection(serverInfo) {
  return new Promise((resolve, reject) => {
    const conn = new Client()

    conn.on("ready", () => {
      console.log(`SSH连接成功: ${serverInfo.ip}`)
      resolve(conn)
    })

    conn.on("error", (err) => {
      console.error(`SSH连接失败: ${serverInfo.ip}`, err)
      reject(err)
    })

    // 连接配置
    const config = {
      host: serverInfo.ip,
      username: serverInfo.user,
      port: 22,
    }

    if (serverInfo.authType === "password") {
      config.password = serverInfo.password
    } else {
      config.privateKey = fs.readFileSync(serverInfo.keyPath)
    }

    conn.connect(config)
  })
}

// 执行SSH命令
app.post("/api/execute-command", async (req, res) => {
  const { servers, command } = req.body
  const results = []

  try {
    for (const server of servers) {
      const startTime = Date.now()

      try {
        const conn = await createSSHConnection(server)

        const result = await new Promise((resolve, reject) => {
          conn.exec(command, (err, stream) => {
            if (err) {
              reject(err)
              return
            }

            let stdout = ""
            let stderr = ""

            stream.on("close", (code, signal) => {
              conn.end()
              resolve({
                success: code === 0,
                output: stdout,
                error: stderr,
                exitCode: code,
              })
            })

            stream.on("data", (data) => {
              stdout += data.toString()
            })

            stream.stderr.on("data", (data) => {
              stderr += data.toString()
            })
          })
        })

        results.push({
          serverId: server.id,
          serverName: server.name,
          success: result.success,
          output: result.output,
          error: result.error,
          executionTime: Date.now() - startTime,
        })
      } catch (error) {
        results.push({
          serverId: server.id,
          serverName: server.name,
          success: false,
          output: "",
          error: error.message,
          executionTime: Date.now() - startTime,
        })
      }
    }

    res.json({ success: true, results })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 文件上传
app.post("/api/upload-files", upload.array("files"), async (req, res) => {
  const { servers, targetPath } = req.body
  const files = req.files
  const results = []

  try {
    const serverList = JSON.parse(servers)

    for (const server of serverList) {
      for (const file of files) {
        try {
          const conn = await createSSHConnection(server)

          // 使用SFTP上传文件
          const sftp = await new Promise((resolve, reject) => {
            conn.sftp((err, sftp) => {
              if (err) reject(err)
              else resolve(sftp)
            })
          })

          const remotePath = path.posix.join(targetPath, file.originalname)

          await new Promise((resolve, reject) => {
            sftp.fastPut(file.path, remotePath, (err) => {
              if (err) reject(err)
              else resolve()
            })
          })

          conn.end()

          // 删除临时文件
          fs.unlinkSync(file.path)

          results.push({
            serverId: server.id,
            serverName: server.name,
            fileName: file.originalname,
            success: true,
            progress: 100,
          })
        } catch (error) {
          results.push({
            serverId: server.id,
            serverName: server.name,
            fileName: file.originalname,
            success: false,
            error: error.message,
            progress: 100,
          })
        }
      }
    }

    res.json({ success: true, results })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 获取服务器状态
app.post("/api/server-status", async (req, res) => {
  const { servers } = req.body
  const results = []

  try {
    for (const server of servers) {
      try {
        const conn = await createSSHConnection(server)

        // 获取系统信息
        const commands = {
          uptime: "uptime",
          memory: "free -m | grep Mem",
          disk: "df -h / | tail -1",
          cpu: 'top -bn1 | grep "Cpu(s)" | sed "s/.*, *$$[0-9.]*$$%* id.*/\\1/" | awk \'{print 100 - $1}\'',
        }

        const status = { online: true }

        for (const [key, cmd] of Object.entries(commands)) {
          try {
            const result = await new Promise((resolve, reject) => {
              conn.exec(cmd, (err, stream) => {
                if (err) {
                  reject(err)
                  return
                }

                let output = ""
                stream.on("data", (data) => {
                  output += data.toString()
                })

                stream.on("close", () => {
                  resolve(output.trim())
                })
              })
            })

            // 解析结果
            if (key === "uptime") {
              const match = result.match(/up\s+(.+?),/)
              status.uptime = match ? match[1] : "Unknown"
            } else if (key === "memory") {
              const parts = result.split(/\s+/)
              const total = Number.parseInt(parts[1])
              const used = Number.parseInt(parts[2])
              status.memory = Math.round((used / total) * 100)
            } else if (key === "disk") {
              const match = result.match(/(\d+)%/)
              status.disk = match ? Number.parseInt(match[1]) : 0
            } else if (key === "cpu") {
              status.cpu = Math.round(Number.parseFloat(result) || 0)
            }
          } catch (cmdError) {
            console.error(`命令执行失败 ${key}:`, cmdError)
          }
        }

        conn.end()

        results.push({
          id: server.id,
          ...status,
          lastCheck: new Date(),
        })
      } catch (error) {
        results.push({
          id: server.id,
          online: false,
          lastCheck: new Date(),
        })
      }
    }

    res.json({ success: true, results })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 健康检查
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
})

app.listen(port, () => {
  console.log(`本地代理服务器运行在 http://localhost:${port}`)
  console.log("请确保已安装依赖: npm install express cors multer ssh2")
})

// 优雅关闭
process.on("SIGINT", () => {
  console.log("\n正在关闭服务器...")
  // 关闭所有SSH连接
  for (const conn of connections.values()) {
    conn.end()
  }
  process.exit(0)
})
