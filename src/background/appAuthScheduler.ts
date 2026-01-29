import browser from 'webextension-polyfill'

import { appAuthTokens, resetAppAuthTokens } from '~/logic'
import { refreshAppAccessToken } from '~/utils/authProvider'

const ALARM_NAME = 'bewlycat-auth-refresh'
const CHECK_INTERVAL_MINUTES = 5
const REFRESH_BUFFER = 10 * 60 * 1000 // 10 minutes

let refreshing = false

async function ensureFreshTokens() {
  const tokens = appAuthTokens.value

  if (!tokens.accessToken || !tokens.refreshToken)
    return

  if (tokens.refreshTokenExpiresAt && tokens.refreshTokenExpiresAt <= Date.now()) {
    console.warn('[BewlyCat] APP refresh token 已过期，清除授权。')
    resetAppAuthTokens()
    return
  }

  if (!tokens.accessTokenExpiresAt)
    return

  const shouldRefresh = tokens.accessTokenExpiresAt <= Date.now() + REFRESH_BUFFER
  if (!shouldRefresh)
    return

  if (refreshing)
    return

  refreshing = true
  try {
    const ok = await refreshAppAccessToken()
    if (!ok)
      console.warn('[BewlyCat] APP access token 刷新失败，请重新授权。')
  }
  finally {
    refreshing = false
  }
}

export function setupAppAuthScheduler() {
  // 使用 browser.alarms 替代 setInterval，确保非持久后台（Safari）也能按时唤醒
  browser.alarms.create(ALARM_NAME, { periodInMinutes: CHECK_INTERVAL_MINUTES })

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
      void ensureFreshTokens()
    }
  })

  // 启动时立即检查一次
  void ensureFreshTokens()
}

export function teardownAppAuthScheduler() {
  browser.alarms.clear(ALARM_NAME)
}
