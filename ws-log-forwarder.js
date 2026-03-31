/**
 * WebSocket 日志转发器
 *
 * 在开发环境下，将 console.log 等日志转发到 Metro bundler 的 logger WebSocket 端点
 * 这样可以在 storeverserepo-web 的调试页面中查看日志
 */

// ==================== 常量配置 ====================

const CONFIG = {
  METRO_PORT: 8081,
  LOG_SERVER_PORT: 8082,
  RECONNECT_DELAY: 5000,
  REINSTALL_CHECK_INTERVAL: 2000,
  STATUS_CHECK_DELAY: 3000,
  LOG_SAMPLE_RATE: 0.1,
  MAX_QUEUE_SIZE: 500,
  // Set to Infinity to disable "[truncated ... chars]" markers.
  // NOTE: This can make WebSocket messages very large and may impact performance.
  MAX_PAYLOAD_PREVIEW_LENGTH: Infinity,
}

const WS_READY_STATES = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}

const WS_READY_STATE_NAMES = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']

const DEFAULT_HOSTS = {
  IOS_SIMULATOR: 'localhost',
  ANDROID_EMULATOR: '10.0.2.2',
}

const NATIVE_IP_METHODS = ['getHotspotGatewayIp', 'getLocalIpAddress', 'getLocalIP', 'getDeviceIP']

// ==================== 工具函数 ====================

/**
 * 安全执行函数，捕获所有错误并静默处理
 * @template T
 * @param {() => T} fn - 要执行的函数
 * @param {T} fallback - 失败时的默认返回值
 * @returns {T}
 */
const safeExecute = (fn, fallback = undefined) => {
  try {
    return fn()
  } catch {
    return fallback
  }
}

/**
 * 安全调用 console 方法，避免循环调用
 * @param {keyof Console} method - console 方法名
 * @param {...any} args - 参数
 */
const safeConsoleCall = (method, ...args) => {
  safeExecute(() => {
    if (originalConsole[method]) {
      originalConsole[method](...args)
    }
  })
}

/**
 * 安全序列化对象，避免循环引用
 * @param {any} value - 要序列化的值
 * @returns {string}
 */
const safeStringify = (value) => {
  if (value === undefined || value === null) {
    return String(value)
  }

  if (typeof value === 'object') {
    try {
      const seen = new WeakSet()
      return JSON.stringify(
        value,
        (key, val) => {
          if (typeof val === 'function' || val === undefined) {
            return '[Function]'
          }
          if (typeof val === 'object' && val !== null) {
            if (seen.has(val)) {
              return '[Circular]'
            }
            seen.add(val)
          }
          return val
        },
        2
      )
    } catch {
      return safeExecute(() => String(value), '[无法序列化的对象]')
    }
  }

  return String(value)
}

/**
 * 格式化日志消息
 * @param {...any} args - 日志参数
 * @returns {string}
 */
const formatLogMessage = (...args) => {
  return args.map(safeStringify).join(' ')
}

/**
 * 估算字符串字节长度
 * @param {string} value
 * @returns {number}
 */
const getStringByteSize = (value) => {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value).length
  }

  let size = 0
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i)
    size += char > 127 ? 3 : 1
  }
  return size
}

const isFormDataInstance = (value) => typeof FormData !== 'undefined' && value instanceof FormData

const isBlobInstance = (value) => typeof Blob !== 'undefined' && value instanceof Blob

const isFileInstance = (value) => typeof File !== 'undefined' && value instanceof File

/**
 * 截断过长字符串，避免消息体过大
 * @param {string} value
 * @returns {string}
 */
const truncateString = (value) => {
  if (typeof value !== 'string') {
    return value
  }

  if (value.length <= CONFIG.MAX_PAYLOAD_PREVIEW_LENGTH) {
    return value
  }

  return `${value.slice(0, CONFIG.MAX_PAYLOAD_PREVIEW_LENGTH)}... [truncated ${
    value.length - CONFIG.MAX_PAYLOAD_PREVIEW_LENGTH
  } chars]`
}

/**
 * 归一化 header 值，消费端约定为 Record<string, string>
 * @param {Record<string, any>} headers
 * @returns {Record<string, string>}
 */
const normalizeHeaders = (headers) => {
  if (!headers || typeof headers !== 'object') {
    return {}
  }

  return Object.keys(headers).reduce((acc, key) => {
    const value = headers[key]
    if (value === undefined || value === null) {
      return acc
    }

    acc[String(key)] = Array.isArray(value)
      ? value.map((item) => String(item)).join(', ')
      : String(value)
    return acc
  }, {})
}

/**
 * 压缩请求/响应体，避免向桌面端发送超大 payload
 * @param {any} value
 * @returns {any}
 */
const serializePayloadPreview = (value) => {
  if (value === undefined || value === null) {
    return value
  }

  if (typeof value === 'string') {
    return truncateString(value)
  }

  if (isFormDataInstance(value)) {
    return '[FormData]'
  }

  if (isBlobInstance(value)) {
    return `[${value.constructor.name}]`
  }

  if (value instanceof ArrayBuffer) {
    return '[ArrayBuffer]'
  }

  if (typeof value === 'object') {
    const serialized = truncateString(safeStringify(value))

    try {
      return JSON.parse(serialized)
    } catch {
      return serialized
    }
  }

  return value
}

// ==================== 原始 Console 保存 ====================

/**
 * 保存原始的 console 方法引用（在安装拦截器之前保存，避免循环调用）
 */
const originalConsole = (() => {
  const methods = ['log', 'info', 'warn', 'error', 'debug']
  return methods.reduce((acc, method) => {
    const fn = console[method]
    acc[method] = typeof fn === 'function' ? fn.bind(console) : undefined
    return acc
  }, {})
})()

// ==================== IP 地址获取器 ====================

/**
 * IP 地址获取器
 * 提供多种策略获取开发服务器 IP 地址
 */
class IPAddressResolver {
  constructor() {
    this.cachedIp = null
    this.fetchPromise = null
  }

  /**
   * 从全局配置获取 IP
   * @returns {string | null}
   */
  getFromGlobalConfig() {
    if (typeof global === 'undefined') return null
    return global.__LOG_SERVER_IP__ || global.__DEV_SERVER_IP__ || null
  }

  /**
   * 从 DevSettings 获取 IP
   * @returns {string | null}
   */
  getFromDevSettings() {
    return safeExecute(() => {
      const { DevSettings } = require('react-native')
      const ip = DevSettings && DevSettings.getIPAddress ? DevSettings.getIPAddress() : null
      return typeof ip === 'string' ? ip.trim() : null
    })
  }

  /**
   * 从原生模块获取 IP
   * @returns {Promise<string | null>}
   */
  async getFromNativeModule() {
    return safeExecute(async () => {
      const { NativeModules } = require('react-native')
      const module = NativeModules.NetworkUtilModule || NativeModules.NetworkModule
      if (!module) return null

      for (const methodName of NATIVE_IP_METHODS) {
        if (module[methodName]) {
          try {
            const ip = await new Promise((resolve, reject) => {
              try {
                module[methodName]((result) => {
                  const trimmed =
                    typeof result === 'string'
                      ? result.trim()
                      : result
                        ? String(result).trim()
                        : null
                  trimmed ? resolve(trimmed) : reject(new Error('无法获取本地 IP'))
                })
              } catch (err) {
                reject(err)
              }
            })
            if (ip) return ip
          } catch {
            // 继续尝试下一个方法
          }
        }
      }
      return null
    }, null)
  }

  /**
   * 获取平台默认主机
   * @returns {string | null}
   */
  getPlatformDefault() {
    return safeExecute(() => {
      const { Platform } = require('react-native')
      if (Platform.OS === 'android') {
        return DEFAULT_HOSTS.ANDROID_EMULATOR
      }
      return DEFAULT_HOSTS.IOS_SIMULATOR
    }, DEFAULT_HOSTS.IOS_SIMULATOR)
  }

  /**
   * 异步获取本地 IP 地址
   * @returns {Promise<string | null>}
   */
  async getLocalIpAddress() {
    if (this.cachedIp) {
      return this.cachedIp
    }

    if (this.fetchPromise) {
      return this.fetchPromise
    }

    this.fetchPromise = (async () => {
      try {
        // 策略1: DevSettings
        const devSettingsIp = this.getFromDevSettings()
        if (devSettingsIp) {
          this.cachedIp = devSettingsIp
          safeConsoleCall('log', '[WS Logger] 从 DevSettings 获取到 IP:', this.cachedIp)
          return this.cachedIp
        }

        // 策略2: 原生模块
        const nativeIp = await this.getFromNativeModule()
        if (nativeIp) {
          this.cachedIp = nativeIp
          safeConsoleCall('log', `[WS Logger] 从原生模块获取到本地 IP:`, this.cachedIp)
          return this.cachedIp
        }
      } catch (error) {
        safeConsoleCall('debug', '[WS Logger] 获取本地 IP 失败（将使用默认策略）:', error)
      }

      return null
    })()

    const result = await this.fetchPromise
    this.fetchPromise = null
    return result
  }

  /**
   * 获取开发服务器主机地址（同步）
   * @returns {string | null}
   */
  getDevServerHost() {
    // 优先级1: 全局配置
    const globalIp = this.getFromGlobalConfig()
    if (globalIp) return globalIp

    // 优先级2: DevSettings
    const devSettingsIp = this.getFromDevSettings()
    if (devSettingsIp) return devSettingsIp

    // 优先级3: 平台默认
    return this.getPlatformDefault()
  }
}

// ==================== WebSocket 连接管理器 ====================

/**
 * WebSocket 连接管理器
 * 负责 WebSocket 连接的创建、维护和重连
 */
class WebSocketManager {
  constructor(ipResolver) {
    this.ipResolver = ipResolver
    this.ws = null
    this.connected = false
    this.reconnecting = false
    this.reconnectTimer = null
    this.messageQueue = []
    this.connectPromise = null
    this.manuallyClosed = false
    this.destroyed = false
  }

  /**
   * 构建 WebSocket URL
   * @param {string} host - 主机地址
   * @returns {string}
   */
  buildWebSocketUrl(host) {
    // 支持 `host` 或 `host:port`（例如 `192.168.1.100` 或 `192.168.1.100:8081`）
    // 当传入 Metro 端口时自动改写为日志服务端口；显式指定其他端口时保留原值。
    let wsHost = host
    let port = CONFIG.LOG_SERVER_PORT
    let parsedPort = null

    if (typeof host === 'string') {
      // IPv6: [::1]:8081
      const bracketPortMatch = host.match(/^\[([0-9a-fA-F:]+)\]:(\d+)$/)
      if (bracketPortMatch) {
        wsHost = `[${bracketPortMatch[1]}]`
        parsedPort = Number(bracketPortMatch[2])
      } else {
        // IPv4/域名: host:8081
        const simplePortMatch = host.match(/^([^:]+):(\d+)$/)
        if (simplePortMatch) {
          wsHost = simplePortMatch[1]
          parsedPort = Number(simplePortMatch[2])
        }
      }
    }

    if (parsedPort && Number.isFinite(parsedPort)) {
      port = parsedPort === CONFIG.METRO_PORT ? CONFIG.LOG_SERVER_PORT : parsedPort
    }

    return `ws://${wsHost}:${port}/logs`
  }

  /**
   * 获取 WebSocket URL（异步）
   * @returns {Promise<string>}
   */
  async getWebSocketUrlAsync() {
    // 优先级1: 全局配置
    const globalIp = this.ipResolver.getFromGlobalConfig()
    if (globalIp) {
      safeConsoleCall('log', '[WS Logger] 使用配置的日志服务器 IP:', globalIp)
      return this.buildWebSocketUrl(globalIp)
    }

    // 优先级2: 自动获取本地 IP
    try {
      const localIp = await this.ipResolver.getLocalIpAddress()
      if (localIp) {
        safeConsoleCall('log', '[WS Logger] 使用自动获取的本地 IP:', localIp)
        return this.buildWebSocketUrl(localIp)
      }
    } catch {
      safeConsoleCall('debug', '[WS Logger] 自动获取本地 IP 失败，使用默认策略')
    }

    // 优先级3: 开发服务器主机
    const devServerHost = this.ipResolver.getDevServerHost()
    if (!devServerHost) {
      // Android 真机且未配置，尝试再次获取本地IP
      try {
        const localIp = await this.ipResolver.getLocalIpAddress()
        if (localIp) {
          return this.buildWebSocketUrl(localIp)
        }
      } catch {
        // 忽略错误
      }

      safeConsoleCall('warn', '[WS Logger] 无法获取开发服务器 IP，请设置 global.__LOG_SERVER_IP__')
      safeConsoleCall('warn', '[WS Logger] 示例: global.__LOG_SERVER_IP__ = "192.168.1.100"')
      return this.buildWebSocketUrl('<请配置IP>')
    }

    return this.buildWebSocketUrl(devServerHost)
  }

  /**
   * 获取 WebSocket URL（同步）
   * @returns {string}
   */
  getWebSocketUrl() {
    const globalIp = this.ipResolver.getFromGlobalConfig()
    if (globalIp) {
      return this.buildWebSocketUrl(globalIp)
    }

    if (this.ipResolver.cachedIp) {
      return this.buildWebSocketUrl(this.ipResolver.cachedIp)
    }

    const devServerHost = this.ipResolver.getDevServerHost()
    return this.buildWebSocketUrl(devServerHost || '<请配置IP>')
  }

  /**
   * 关闭现有连接
   */
  closeConnection(manuallyClosed = true) {
    this.manuallyClosed = manuallyClosed
    if (this.ws) {
      safeExecute(() => this.ws.close())
      this.ws = null
    }
    this.connected = false
    this.connectPromise = null
  }

  enqueueMessage(payload) {
    if (this.messageQueue.length >= CONFIG.MAX_QUEUE_SIZE) {
      this.messageQueue.shift()
      safeConsoleCall(
        'warn',
        '[WS Logger] 日志队列已满，已丢弃最早的一条消息，当前上限:',
        CONFIG.MAX_QUEUE_SIZE
      )
    }
    this.messageQueue.push(payload)
  }

  /**
   * 发送队列中的消息
   */
  flushQueue() {
    if (!this.connected || !this.ws || this.ws.readyState !== WS_READY_STATES.OPEN) {
      return
    }

    const queue = [...this.messageQueue]
    this.messageQueue.length = 0

    queue.forEach((msg) => {
      safeExecute(() => {
        if (this.ws && this.ws.readyState === WS_READY_STATES.OPEN) {
          this.ws.send(msg)
        } else {
          this.messageQueue.push(msg)
        }
      })
    })
  }

  /**
   * 初始化 WebSocket 连接
   * @returns {Promise<void>}
   */
  async connect() {
    if (!__DEV__ || this.destroyed) return

    if (this.ws && this.ws.readyState === WS_READY_STATES.OPEN) {
      return
    }

    if (this.ws && this.ws.readyState === WS_READY_STATES.CONNECTING) {
      return this.connectPromise
    }

    if (this.connectPromise) {
      return this.connectPromise
    }

    this.connectPromise = (async () => {
      try {
        if (this.ws && this.ws.readyState !== WS_READY_STATES.CLOSED) {
          this.closeConnection(true)
        }

        this.manuallyClosed = false

        const url = await this.getWebSocketUrlAsync()
        if (this.destroyed) {
          return
        }

        safeConsoleCall('log', '[WS Logger] 尝试连接到:', url)

        const socket = new WebSocket(url)
        this.ws = socket

        socket.onopen = () => {
          if (this.ws !== socket || this.destroyed) return

          this.connected = true
          this.reconnecting = false
          this.connectPromise = null

          safeConsoleCall('log', '[WS Logger] ✓ 已连接到日志服务器:', url)
          safeConsoleCall('log', '[WS Logger] 队列中有', this.messageQueue.length, '条消息待发送')

          this.flushQueue()
        }

        socket.onclose = (event) => {
          const shouldReconnect = !this.manuallyClosed && !this.destroyed && __DEV__
          if (this.ws === socket) {
            this.connected = false
            this.ws = null
          }
          this.connectPromise = null

          safeConsoleCall('warn', '[WS Logger] 连接已关闭:', event.code, event.reason || '')

          this.clearReconnectTimer()

          if (shouldReconnect && !this.reconnecting) {
            this.scheduleReconnect()
          }
        }

        socket.onerror = (error) => {
          if (this.ws !== socket) return

          this.connected = false
          this.reconnecting = false

          safeConsoleCall('error', '[WS Logger] ✗ 连接错误:', error)
          safeConsoleCall('error', '[WS Logger] 连接 URL:', url)
          safeConsoleCall(
            'error',
            '[WS Logger] 提示: 如果使用真机，请确保使用开发机的实际 IP 地址（而不是 localhost）'
          )
        }

        socket.onmessage = () => {
          // 接收服务器消息（可选，用于确认连接）
        }
      } catch (error) {
        this.reconnecting = false
        this.connectPromise = null
        safeConsoleCall('error', '[WS Logger] ✗ 初始化失败:', error)
        safeConsoleCall(
          'error',
          '[WS Logger] 错误详情:',
          error && error.message ? error.message : error
        )
      }
    })()

    return this.connectPromise
  }

  /**
   * 清除重连定时器
   */
  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  /**
   * 安排重连
   */
  scheduleReconnect() {
    if (this.destroyed) return

    this.clearReconnectTimer()

    this.reconnectTimer = setTimeout(() => {
      if (__DEV__ && !this.destroyed && !this.ws && !this.reconnecting) {
        this.reconnecting = true
        safeConsoleCall('log', '[WS Logger] 尝试重新连接...')
        this.connect()
          .then(() => {
            this.reconnecting = false
          })
          .catch(() => {
            this.reconnecting = false
          })
      }
      this.reconnectTimer = null
    }, CONFIG.RECONNECT_DELAY)
  }

  /**
   * 发送消息
   * @param {string} payload - 消息负载
   */
  send(payload) {
    if (!__DEV__) return

    if (this.connected && this.ws && this.ws.readyState === WS_READY_STATES.OPEN) {
      try {
        this.ws.send(payload)
        // 采样日志输出
        if (Math.random() < CONFIG.LOG_SAMPLE_RATE) {
          safeConsoleCall('log', '[WS Logger] 已发送日志 (sample)')
        }
      } catch (err) {
        safeConsoleCall('error', '[WS Logger] 发送日志失败:', err)
        this.enqueueMessage(payload)
      }
    } else {
      this.enqueueMessage(payload)
      if (this.messageQueue.length === 1) {
        safeConsoleCall(
          'log',
          '[WS Logger] 连接未建立，日志已加入队列，当前队列长度:',
          this.messageQueue.length
        )
      }

      if (!this.ws && !this.reconnecting) {
        this.connect().catch((err) => {
          safeConsoleCall('error', '[WS Logger] 初始化 WebSocket 失败:', err)
        })
      }
    }
  }

  /**
   * 获取连接状态
   * @returns {object}
   */
  getStatus() {
    return {
      connected: this.connected,
      readyState: this.ws ? this.ws.readyState : null,
      readyStateText: this.ws
        ? WS_READY_STATE_NAMES[this.ws.readyState] || 'UNKNOWN'
        : 'NULL',
      queueLength: this.messageQueue.length,
      wsUrl: this.getWebSocketUrl(),
    }
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.destroyed = true
    this.clearReconnectTimer()
    this.reconnecting = false
    this.closeConnection()
    this.messageQueue.length = 0
  }
}

// ==================== Console 包装器 ====================

/**
 * Console 包装器
 * 包装原生 console 方法，添加日志转发功能
 */
class ConsoleWrapper {
  constructor(wsManager) {
    this.wsManager = wsManager
    this.wrappedMethods = null
    this.baseConsole = null // 保存基础 console 引用，避免递归
  }

  /**
   * 创建包装方法
   */
  createWrappedMethods() {
    // 如果 baseConsole 已存在，使用它；否则保存当前的 console（可能是原始或已被其他工具修改的）
    // 这样可以避免在重新安装时使用已经被包装的方法，导致无限递归
    if (!this.baseConsole) {
      this.baseConsole = {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error,
        debug: console.debug,
      }
    }

    const createWrapper = (level) => {
      return (...args) => {
        // 使用 baseConsole 而不是当前的 console，避免递归
        this.baseConsole[level](...args)
        this.forwardLog(level, ...args)
      }
    }

    this.wrappedMethods = {
      log: createWrapper('log'),
      info: createWrapper('info'),
      warn: createWrapper('warn'),
      error: createWrapper('error'),
      debug: createWrapper('debug'),
    }

    return this.wrappedMethods
  }

  /**
   * 转发日志
   * @param {string} level - 日志级别
   * @param {...any} args - 日志参数
   */
  forwardLog(level, ...args) {
    if (!__DEV__) return

    try {
      const message = truncateString(formatLogMessage(...args))
      const payload = JSON.stringify({
        type: 'js-log',
        level: level.toLowerCase(),
        message,
        timestamp: new Date().toISOString(),
        context: null,
      })

      this.wsManager.send(payload)
    } catch (error) {
      safeConsoleCall('error', '[WS Logger] 转发日志失败:', error)
    }
  }

  /**
   * 安装包装器
   */
  install() {
    if (!this.wrappedMethods) {
      this.createWrappedMethods()
    }

    Object.assign(console, this.wrappedMethods)
  }

  /**
   * 检查并重新安装（如果 console 被修改）
   * @returns {boolean} 是否重新安装了
   */
  reinstallIfNeeded() {
    if (!this.wrappedMethods || !this.baseConsole) return false

    const needsReinstall = Object.keys(this.wrappedMethods).some(
      (method) => console[method] !== this.wrappedMethods[method]
    )

    if (needsReinstall) {
      // 重要：不更新 baseConsole，始终使用首次安装时保存的引用
      // 这样可以避免在 console 已被替换为包装方法时导致无限递归
      // 如果 console 被其他工具修改，baseConsole 仍然指向修改前的版本，这是安全的
      this.createWrappedMethods()
      this.install()
      safeConsoleCall('log', '[WS Logger] 检测到 console 被修改，已重新安装转发器')
      return true
    }

    return false
  }

  /**
   * 卸载包装器
   */
  uninstall() {
    if (originalConsole.log) {
      Object.assign(console, originalConsole)
    }
  }
}

// ==================== 网络请求拦截器 ====================

/**
 * 网络请求拦截器
 * 拦截 fetch 和 XMLHttpRequest，记录网络请求日志
 */
class NetworkInterceptor {
  constructor(wsManager) {
    this.wsManager = wsManager
    this.requestIdCounter = 0
    this.originalFetch = null
    this.originalXHROpen = null
    this.originalXHRSend = null
    this.originalXHRSetRequestHeader = null
    this.installed = false
    this.requestMap = new Map() // 存储请求信息
  }

  /**
   * 生成请求 ID
   * @returns {string}
   */
  generateRequestId() {
    return `req-${Date.now()}-${++this.requestIdCounter}`
  }

  /**
   * 获取请求大小（字节）
   * @param {any} data - 请求数据
   * @returns {number}
   */
  getRequestSize(data) {
    if (!data) return 0
    try {
      if (typeof data === 'string') {
        if (typeof Blob !== 'undefined') {
          return new Blob([data]).size
        }
        return getStringByteSize(data)
      }
      if (isFormDataInstance(data)) {
        // FormData 大小估算
        let size = 0
        for (const [key, value] of data.entries()) {
          size += getStringByteSize(key)
          if (isFileInstance(value)) {
            size += value.size
          } else {
            size += getStringByteSize(String(value))
          }
        }
        return size
      }
      if (isBlobInstance(data)) {
        return data.size || 0
      }
      if (data instanceof ArrayBuffer) {
        return data.byteLength || 0
      }
      return JSON.stringify(data).length
    } catch {
      return 0
    }
  }

  /**
   * 获取响应大小（字节）
   * @param {any} data - 响应数据
   * @returns {number}
   */
  getResponseSize(data) {
    if (!data) return 0
    try {
      if (typeof data === 'string') {
        if (typeof Blob !== 'undefined') {
          return new Blob([data]).size
        }
        return getStringByteSize(data)
      }
      if (isBlobInstance(data)) {
        return data.size || 0
      }
      if (data instanceof ArrayBuffer) {
        return data.byteLength || 0
      }
      return JSON.stringify(data).length
    } catch {
      return 0
    }
  }

  /**
   * 解析 URL，提取基础 URL 和路径
   * @param {string} url - 完整 URL
   * @returns {{baseURL: string, originalUrl: string}}
   */
  parseUrl(url) {
    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const urlObj = new URL(url)
        return {
          baseURL: `${urlObj.protocol}//${urlObj.host}`,
          originalUrl: urlObj.pathname + urlObj.search,
        }
      }
      return {
        baseURL: '',
        originalUrl: url,
      }
    } catch {
      return {
        baseURL: '',
        originalUrl: url,
      }
    }
  }

  /**
   * 解析查询参数
   * @param {string} url - URL
   * @returns {Record<string, string>}
   */
  parseQueryParams(url) {
    try {
      const urlObj = new URL(url, 'http://dummy.com')
      const params = {}
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value
      })
      return params
    } catch {
      return {}
    }
  }

  /**
   * 发送网络请求消息
   * @param {string} type - 消息类型 (network-request, network-response, network-error)
   * @param {object} data - 消息数据
   */
  sendNetworkMessage(type, data) {
    if (!__DEV__) return

    try {
      const payload = JSON.stringify({
        type,
        data: {
          ...data,
          timestamp: new Date().toISOString(),
        },
      })

      this.wsManager.send(payload)
    } catch (error) {
      safeConsoleCall('error', '[WS Logger] 发送网络请求日志失败:', error)
    }
  }

  /**
   * 拦截 fetch API
   *
   * 注意：
   * - 捕获所有手动设置的请求头（包括 Request 对象和 options 中的 headers）
   * - 捕获请求配置（credentials, mode, cache 等）
   * - React Native 可能会自动添加一些默认请求头（如 User-Agent），这些在发送前无法获取
   */
  interceptFetch() {
    if (this.originalFetch) return

    this.originalFetch = global.fetch
    const self = this

    global.fetch = async function (url, options = {}) {
      const requestId = self.generateRequestId()
      const startTime = Date.now()

      // 处理 Request 对象
      let requestUrl = url
      let requestOptions = options
      let requestMethod = 'GET'
      let requestHeaders = {}
      let requestBody = null
      let requestData = null

      // 如果 url 是 Request 对象，从中提取信息
      if (url && typeof url === 'object' && 'url' in url) {
        requestUrl = url.url
        requestMethod = url.method || 'GET'

        // 从 Request 对象中提取 headers
        if (url.headers) {
          if (url.headers instanceof Headers) {
            url.headers.forEach((value, key) => {
              requestHeaders[key] = value
            })
          } else if (typeof url.headers === 'object') {
            Object.assign(requestHeaders, url.headers)
          }
        }

        // 从 Request 对象中提取 body（如果存在）
        if (url.body) {
          try {
            if (typeof url.body === 'string') {
              requestBody = url.body
              try {
                requestData = JSON.parse(url.body)
              } catch {
                requestData = url.body
              }
            } else if (isFormDataInstance(url.body)) {
              requestBody = '[FormData]'
              requestData = '[FormData]'
            } else {
              requestBody = JSON.stringify(url.body)
              requestData = url.body
            }
          } catch {
            requestBody = String(url.body)
            requestData = requestBody
          }
        }

        // 合并 options（options 会覆盖 Request 对象的属性）
        requestOptions = {
          method: url.method,
          headers: url.headers,
          body: url.body,
          ...options,
        }
      } else {
        // url 是字符串
        requestUrl = typeof url === 'string' ? url : url.toString()
        requestMethod = options.method || 'GET'
      }

      // 处理 options 中的 headers（合并到 requestHeaders）
      if (requestOptions.headers) {
        if (requestOptions.headers instanceof Headers) {
          requestOptions.headers.forEach((value, key) => {
            requestHeaders[key] = value
          })
        } else if (typeof requestOptions.headers === 'object') {
          Object.assign(requestHeaders, requestOptions.headers)
        }
      }

      // 处理 options 中的 body（如果 Request 对象中没有 body）
      if (!requestBody && requestOptions.body) {
        try {
          if (typeof requestOptions.body === 'string') {
            requestBody = requestOptions.body
            try {
              requestData = JSON.parse(requestOptions.body)
            } catch {
              requestData = requestOptions.body
            }
          } else if (isFormDataInstance(requestOptions.body)) {
            requestBody = '[FormData]'
            requestData = '[FormData]'
          } else {
            requestBody = JSON.stringify(requestOptions.body)
            requestData = requestOptions.body
          }
        } catch {
          requestBody = String(requestOptions.body)
          requestData = requestBody
        }
      }

      const method = requestMethod.toUpperCase()
      const fullUrl = requestUrl
      const urlInfo = self.parseUrl(fullUrl)
      const queryParams = self.parseQueryParams(fullUrl)
      const headers = normalizeHeaders(requestHeaders)
      const requestSize = self.getRequestSize(requestOptions.body || (url && url.body))

      // 收集其他请求配置信息
      const requestConfig = {}
      if (requestOptions.credentials !== undefined) {
        requestConfig.credentials = requestOptions.credentials
      }
      if (requestOptions.mode !== undefined) {
        requestConfig.mode = requestOptions.mode
      }
      if (requestOptions.cache !== undefined) {
        requestConfig.cache = requestOptions.cache
      }
      if (requestOptions.redirect !== undefined) {
        requestConfig.redirect = requestOptions.redirect
      }
      if (requestOptions.referrer !== undefined) {
        requestConfig.referrer = requestOptions.referrer
      }
      if (requestOptions.referrerPolicy !== undefined) {
        requestConfig.referrerPolicy = requestOptions.referrerPolicy
      }

      // 发送请求开始消息
      self.sendNetworkMessage('network-request', {
        id: requestId,
        method,
        url: fullUrl,
        headers,
        data: serializePayloadPreview(requestData),
        body: serializePayloadPreview(requestBody),
        params: method === 'GET' ? queryParams : undefined,
        startTime,
        type: 'fetch',
        baseURL: urlInfo.baseURL,
        originalUrl: urlInfo.originalUrl,
        requestSize, // 请求大小
        ...requestConfig, // 包含其他配置信息
      })

      // 存储请求信息
      self.requestMap.set(requestId, {
        startTime,
        method,
        url: fullUrl,
      })

      try {
        // 执行原始 fetch
        const response = await self.originalFetch.call(this, url, options)
        const endTime = Date.now()
        const duration = endTime - startTime

        // 克隆响应以便读取（原始响应只能读取一次）
        const responseClone = response.clone()

        // 解析响应头
        const responseHeaders = {}
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value
        })

        // 读取响应体
        let responseData = null
        let responseSize = 0
        try {
          const contentType = response.headers.get('content-type') || ''
          if (contentType.includes('application/json')) {
            responseData = await responseClone.json()
            responseSize = self.getResponseSize(responseData)
          } else if (contentType.includes('text/')) {
            const text = await responseClone.text()
            responseData = text
            responseSize = self.getResponseSize(text)
          } else {
            const blob = await responseClone.blob()
            responseSize = blob.size
            responseData = '[Blob]'
          }
        } catch (error) {
          safeConsoleCall('debug', '[WS Logger] 读取响应体失败:', error)
          responseSize = 0
        }

        // 发送响应消息
        self.sendNetworkMessage('network-response', {
          id: requestId,
          status: response.status,
          statusText: response.statusText,
          headers: normalizeHeaders(responseHeaders),
          data: serializePayloadPreview(responseData),
          endTime,
          size: responseSize,
        })

        // 清理请求信息
        self.requestMap.delete(requestId)

        return response
      } catch (error) {
        const endTime = Date.now()
        const errorMessage = error instanceof Error ? error.message : String(error)

        // 发送错误消息
        self.sendNetworkMessage('network-error', {
          id: requestId,
          error: errorMessage,
          endTime,
        })

        // 清理请求信息
        self.requestMap.delete(requestId)

        throw error
      }
    }
  }

  /**
   * 拦截 XMLHttpRequest
   *
   * 注意：
   * - 捕获所有通过 setRequestHeader 设置的请求头
   * - 捕获 XHR 配置（withCredentials, timeout, responseType 等）
   * - React Native 可能会自动添加一些默认请求头（如 User-Agent），这些在发送前无法获取
   * - 实际的请求头（包括自动添加的）只能在响应后通过其他方式获取，但此时请求已发送
   */
  interceptXMLHttpRequest() {
    if (typeof XMLHttpRequest === 'undefined') return
    if (this.originalXHROpen) return

    const self = this
    const OriginalXHR = XMLHttpRequest

    // 拦截 open 方法
    this.originalXHROpen = OriginalXHR.prototype.open
    OriginalXHR.prototype.open = function (method, url, ...rest) {
      const requestId = self.generateRequestId()
      this._networkRequestId = requestId
      this._networkMethod = method.toUpperCase()
      this._networkUrl = typeof url === 'string' ? url : url.toString()
      this._networkStartTime = Date.now()

      // 存储请求信息
      self.requestMap.set(requestId, {
        startTime: this._networkStartTime,
        method: this._networkMethod,
        url: this._networkUrl,
        xhr: this,
      })

      // 监听响应
      this.addEventListener('load', function () {
        const endTime = Date.now()
        const duration = endTime - this._networkStartTime

        // 解析响应头
        const responseHeaders = {}
        const headerString = this.getAllResponseHeaders() || ''
        headerString.split('\r\n').forEach((line) => {
          const parts = line.split(': ')
          if (parts.length === 2) {
            responseHeaders[parts[0].trim()] = parts[1].trim()
          }
        })

        // 读取响应数据
        let responseData = null
        let responseSize = 0
        try {
          const contentType = this.getResponseHeader('content-type') || ''
          if (contentType.includes('application/json')) {
            try {
              responseData = JSON.parse(this.responseText)
            } catch {
              responseData = this.responseText
            }
          } else {
            responseData = this.responseText
          }
          responseSize = self.getResponseSize(responseData)
        } catch (error) {
          safeConsoleCall('debug', '[WS Logger] 读取 XHR 响应失败:', error)
        }

        // 发送响应消息
        self.sendNetworkMessage('network-response', {
          id: this._networkRequestId,
          status: this.status,
          statusText: this.statusText,
          headers: normalizeHeaders(responseHeaders),
          data: serializePayloadPreview(responseData),
          endTime,
          size: responseSize,
        })

        // 清理请求信息
        self.requestMap.delete(this._networkRequestId)
      })

      // 监听错误
      this.addEventListener('error', function () {
        const endTime = Date.now()
        self.sendNetworkMessage('network-error', {
          id: this._networkRequestId,
          error: 'Network request failed',
          endTime,
        })
        self.requestMap.delete(this._networkRequestId)
      })

      // 监听超时
      this.addEventListener('timeout', function () {
        const endTime = Date.now()
        self.sendNetworkMessage('network-error', {
          id: this._networkRequestId,
          error: 'Request timeout',
          endTime,
        })
        self.requestMap.delete(this._networkRequestId)
      })

      // 调用原始 open 方法
      return self.originalXHROpen.call(this, method, url, ...rest)
    }

    // 拦截 send 方法
    this.originalXHRSend = OriginalXHR.prototype.send
    OriginalXHR.prototype.send = function (data) {
      if (this._networkRequestId) {
        const urlInfo = self.parseUrl(this._networkUrl)
        const queryParams = self.parseQueryParams(this._networkUrl)

        // 解析请求头（包括通过 setRequestHeader 设置的所有请求头）
        const headers = {}
        if (this._requestHeaders) {
          Object.assign(headers, this._requestHeaders)
        }

        // 解析请求体
        let requestBody = null
        let requestData = null
        if (data) {
          try {
            if (typeof data === 'string') {
              requestBody = data
              try {
                requestData = JSON.parse(data)
              } catch {
                requestData = data
              }
            } else if (isFormDataInstance(data)) {
              requestBody = '[FormData]'
              requestData = '[FormData]'
            } else if (isBlobInstance(data) || data instanceof ArrayBuffer) {
              requestBody = `[${data.constructor.name}]`
              requestData = `[${data.constructor.name}]`
            } else {
              requestBody = String(data)
              requestData = requestBody
            }
          } catch {
            requestBody = String(data)
            requestData = requestBody
          }
        }

        const requestSize = self.getRequestSize(data)

        // 收集 XHR 配置信息
        const xhrConfig = {}
        if (this.withCredentials !== undefined) {
          xhrConfig.withCredentials = this.withCredentials
        }
        if (this.timeout !== undefined && this.timeout > 0) {
          xhrConfig.timeout = this.timeout
        }
        if (this.responseType !== undefined && this.responseType !== '') {
          xhrConfig.responseType = this.responseType
        }

        // 发送请求开始消息
        self.sendNetworkMessage('network-request', {
          id: this._networkRequestId,
          method: this._networkMethod,
          url: this._networkUrl,
          headers: normalizeHeaders(headers),
          data: serializePayloadPreview(requestData),
          body: serializePayloadPreview(requestBody),
          params: this._networkMethod === 'GET' ? queryParams : undefined,
          startTime: this._networkStartTime,
          type: 'xhr',
          baseURL: urlInfo.baseURL,
          originalUrl: urlInfo.originalUrl,
          requestSize, // 请求大小
          ...xhrConfig, // 包含 XHR 配置信息
        })
      }

      // 调用原始 send 方法
      return self.originalXHRSend.call(this, data)
    }

    // 拦截 setRequestHeader 方法以捕获请求头
    this.originalXHRSetRequestHeader = OriginalXHR.prototype.setRequestHeader
    OriginalXHR.prototype.setRequestHeader = function (header, value) {
      if (!this._requestHeaders) {
        this._requestHeaders = {}
      }
      this._requestHeaders[header] = value
      return self.originalXHRSetRequestHeader.call(this, header, value)
    }
  }

  /**
   * 安装拦截器
   */
  install() {
    if (!__DEV__) return
    if (this.installed) return

    this.interceptFetch()
    this.interceptXMLHttpRequest()

    this.installed = true
    safeConsoleCall('log', '[WS Logger] 网络请求拦截器已安装')
  }

  /**
   * 卸载拦截器
   */
  uninstall() {
    if (this.originalFetch) {
      global.fetch = this.originalFetch
      this.originalFetch = null
    }

    if (this.originalXHROpen && typeof XMLHttpRequest !== 'undefined') {
      XMLHttpRequest.prototype.open = this.originalXHROpen
      XMLHttpRequest.prototype.send = this.originalXHRSend
      if (this.originalXHRSetRequestHeader) {
        XMLHttpRequest.prototype.setRequestHeader = this.originalXHRSetRequestHeader
      }
      this.originalXHROpen = null
      this.originalXHRSend = null
      this.originalXHRSetRequestHeader = null
    }

    this.requestMap.clear()
    this.installed = false
  }
}

// ==================== 主类：WSLogger ====================

/**
 * WebSocket 日志转发器主类
 */
class WSLogger {
  constructor() {
    this.ipResolver = new IPAddressResolver()
    this.wsManager = new WebSocketManager(this.ipResolver)
    this.consoleWrapper = new ConsoleWrapper(this.wsManager)
    this.networkInterceptor = new NetworkInterceptor(this.wsManager)
    this.reinstallInterval = null
    this.statusCheckTimer = null
    this.installed = false
  }

  /**
   * 安装日志转发器
   */
  install() {
    if (!__DEV__) return
    if (this.installed) return
    this.wsManager.destroyed = false

    this.consoleWrapper.install()
    this.networkInterceptor.install()
    this.wsManager.connect()

    safeConsoleCall('log', '[WS Logger] 日志转发器已安装')
    safeConsoleCall('log', '[WS Logger] 网络请求拦截器已安装')

    // 暴露全局测试函数
    if (typeof global !== 'undefined') {
      global.wsLoggerTest = () => this.sendTestLog()
      global.wsLoggerStatus = () => this.getStatus()
      safeConsoleCall(
        'log',
        '[WS Logger] 提示: 在控制台中可以调用 wsLoggerTest() 测试，或 wsLoggerStatus() 查看状态'
      )
    }

    // 延迟状态检查
    this.statusCheckTimer = setTimeout(() => {
      this.statusCheckTimer = null
      this.checkStatus()
    }, CONFIG.STATUS_CHECK_DELAY)

    // 定期检查并重新安装
    this.reinstallInterval = setInterval(() => {
      if (!__DEV__) {
        this.cleanup()
        return
      }
      this.consoleWrapper.reinstallIfNeeded()
    }, CONFIG.REINSTALL_CHECK_INTERVAL)

    // 保存清理函数
    if (typeof global !== 'undefined') {
      global._wsLoggerCleanup = () => this.cleanup()
    }

    this.installed = true
  }

  /**
   * 检查连接状态并输出提示
   */
  checkStatus() {
    if (this.wsManager.connected) {
      safeConsoleCall('log', '[WS Logger] 测试: 转发器正常工作')
      return
    }

    safeConsoleCall('warn', '[WS Logger] 警告: WebSocket 未连接，日志可能无法转发')
    safeConsoleCall(
      'warn',
      '[WS Logger] 提示: 检查日志服务器是否在运行，端口是否为',
      CONFIG.LOG_SERVER_PORT
    )
    safeConsoleCall('warn', '[WS Logger] 提示: 连接地址:', this.wsManager.getWebSocketUrl())

    this.printPlatformInstructions()
  }

  /**
   * 打印平台配置说明
   */
  printPlatformInstructions() {
    safeExecute(
      () => {
        const { Platform } = require('react-native')
        if (Platform.OS === 'android') {
          safeConsoleCall('warn', '[WS Logger] Android 配置说明:')
          safeConsoleCall('warn', '  - 模拟器: 自动使用 10.0.2.2（无需配置）')
          safeConsoleCall('warn', '  - 真机: 需要设置 global.__LOG_SERVER_IP__ = "你的开发机IP"')
          safeConsoleCall('warn', '  - 示例: global.__LOG_SERVER_IP__ = "192.168.1.100"')
          safeConsoleCall('warn', '  - 获取开发机IP: ifconfig | grep "inet " | grep -v 127.0.0.1')
        } else {
          safeConsoleCall('warn', '[WS Logger] iOS 配置说明:')
          safeConsoleCall('warn', '  - 模拟器: 自动使用 localhost（无需配置）')
          safeConsoleCall('warn', '  - 真机: 需要设置 global.__LOG_SERVER_IP__ = "你的开发机IP"')
        }
      },
      () => {
        safeConsoleCall(
          'warn',
          '[WS Logger] 提示: 如果使用真机，请设置 global.__LOG_SERVER_IP__ 为开发机的实际 IP 地址'
        )
      }
    )
  }

  /**
   * 获取转发器状态
   * @returns {object}
   */
  getStatus() {
    const status = {
      installed: this.installed,
      ...this.wsManager.getStatus(),
      devServerHost: this.ipResolver.getDevServerHost(),
      logServerPort: CONFIG.LOG_SERVER_PORT,
      metroPort: CONFIG.METRO_PORT,
    }
    safeConsoleCall('log', '[WS Logger] 状态:', JSON.stringify(status, null, 2))
    return status
  }

  /**
   * 发送测试日志
   */
  sendTestLog() {
    if (!__DEV__) {
      safeConsoleCall('log', '[WS Logger] 仅在开发环境可用')
      return
    }

    console.log('[WS Logger] 这是一条测试日志消息')
    console.info('[WS Logger] 这是一条测试 info 消息')
    console.warn('[WS Logger] 这是一条测试 warn 消息')

    safeConsoleCall('log', '[WS Logger] 状态:', this.getStatus())
  }

  /**
   * 卸载日志转发器
   */
  uninstall() {
    if (!this.installed) return

    this.consoleWrapper.uninstall()
    this.networkInterceptor.uninstall()
    this.wsManager.cleanup()

    if (this.reinstallInterval) {
      clearInterval(this.reinstallInterval)
      this.reinstallInterval = null
    }

    if (this.statusCheckTimer) {
      clearTimeout(this.statusCheckTimer)
      this.statusCheckTimer = null
    }

    if (typeof global !== 'undefined') {
      delete global.wsLoggerTest
      delete global.wsLoggerStatus
      delete global._wsLoggerCleanup
    }

    this.installed = false
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.uninstall()
  }
}

// ==================== 单例实例 ====================

let loggerInstance = null

/**
 * 获取或创建日志转发器实例
 * @returns {WSLogger}
 */
const getLoggerInstance = () => {
  if (!loggerInstance) {
    loggerInstance = new WSLogger()
  }
  return loggerInstance
}

// ==================== 导出 API ====================

/**
 * 安装 WebSocket 日志转发器
 */
function installWSLogger() {
  getLoggerInstance().install()
}

/**
 * 卸载 WebSocket 日志转发器
 */
function uninstallWSLogger() {
  if (loggerInstance) {
    loggerInstance.uninstall()
    loggerInstance = null
  }
}

/**
 * 获取转发器状态
 * @returns {object}
 */
function getWSLoggerStatus() {
  return getLoggerInstance().getStatus()
}

/**
 * 发送测试日志
 */
function sendTestLog() {
  getLoggerInstance().sendTestLog()
}

module.exports = {
  installWSLogger,
  uninstallWSLogger,
  getWSLoggerStatus,
  sendTestLog,
}
