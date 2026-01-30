import browser from 'webextension-polyfill'

export interface Message<T = any> {
  type: string
  data: T
}

export type MessageHandler<T = any, R = any> = (
  data: T,
  sender?: browser.Runtime.MessageSender,
) => R | Promise<R>

/**
 * 从 content script 发送消息到 background
 */
export async function sendMessage<T = any, R = any>(type: string, data?: T): Promise<R> {
  const message: Message<T> = { type, data: data as T }
  return browser.runtime.sendMessage(message)
}

// 消息处理器注册表（单一分发，避免 Safari 多监听器响应冲突）
const messageHandlers = new Map<string, MessageHandler>()
let listenerRegistered = false

function ensureListener() {
  if (listenerRegistered)
    return
  listenerRegistered = true

  browser.runtime.onMessage.addListener((message: any, sender) => {
    if (!message?.type)
      return false

    const handler = messageHandlers.get(message.type)
    if (!handler)
      return false

    const result = handler(message.data, sender)
    if (result instanceof Promise)
      return result
    return Promise.resolve(result)
  })
}

/**
 * 在 background 中监听来自 content script 的消息
 */
export function onMessage<T = any, R = any>(
  type: string,
  handler: MessageHandler<T, R>,
): void {
  messageHandlers.set(type, handler as MessageHandler)
  ensureListener()
}
