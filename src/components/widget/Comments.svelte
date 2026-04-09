<section>
  {#if shouldLoadGiscus}
    <script
      src="https://giscus.app/client.js"
      data-repo="17356085/17356085.github.io"
      data-repo-id="R_kgDOPcYMPg"
      data-category="Announcements"
      data-category-id="DIC_kwDOPcYMPs4CuH1t"
      data-mapping="pathname"
      data-strict="0"
      data-reactions-enabled="1"
      data-emit-metadata="0"
      data-input-position="bottom"
      data-theme={$mode === DARK_MODE ? 'dark' : 'light'}
      data-lang="zh-CN"
      crossorigin="anonymous"
      async
    >
    </script>
  {:else}
    <div class="card-base">
      <div class="text-sm opacity-80">
        评论区需要访问 GitHub。
        {#if connectivityHint}
          当前网络：{connectivityHint}
        {:else}
          当前网络似乎无法连接 GitHub。
        {/if}
      </div>
      <div class="text-sm mt-2">
        <a class="link" href="https://github.com/17356085/17356085.github.io/discussions" target="_blank" rel="noreferrer">
          在 GitHub Discussions 打开
        </a>
      </div>
    </div>
  {/if}
</section>

<script>
import { AUTO_MODE, DARK_MODE } from '@constants/constants.ts'
import { onDestroy, onMount } from 'svelte'
import { writable } from 'svelte/store';
import { getStoredTheme } from '@utils/setting-utils.ts'
const mode = writable(AUTO_MODE)

let shouldLoadGiscus = false
let connectivityHint: string | undefined

async function canReach(url: string, init?: RequestInit, timeoutMs = 3000) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    await fetch(url, { ...init, signal: controller.signal })
    return true
  } catch {
    return false
  } finally {
    window.clearTimeout(timer)
  }
}

async function checkGiscusConnectivity() {
  const giscusOk = await canReach('https://giscus.app/client.js', { method: 'GET' })
  if (!giscusOk) {
    connectivityHint = '无法连接 giscus 服务（giscus.app）。'
    return false
  }

  const githubGraphqlOk = await canReach(
    'https://api.github.com/graphql',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    },
  )

  if (!githubGraphqlOk) {
    connectivityHint = '无法连接 GitHub API（api.github.com/graphql）。'
    return false
  }

  connectivityHint = undefined
  return true
}

function updateGiscusTheme() {
  const iframe = document.querySelector('iframe.giscus-frame')
  if (!(iframe instanceof HTMLIFrameElement) || !iframe.contentWindow) return

  const src = iframe.getAttribute('src') || ''
  if (!src.startsWith('https://giscus.app/')) return

  const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  iframe.contentWindow.postMessage({ giscus: { setConfig: { theme } } }, 'https://giscus.app')
}

let observer: MutationObserver | undefined
let retryTimer: number | undefined

onMount(() => {
  mode.set(getStoredTheme())

  void checkGiscusConnectivity().then((ok) => {
    shouldLoadGiscus = ok
  })

  observer = new MutationObserver(updateGiscusTheme)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

  window.addEventListener('load', updateGiscusTheme, { once: true })
  retryTimer = window.setTimeout(updateGiscusTheme, 300)
})

onDestroy(() => {
  observer?.disconnect()
  if (retryTimer) window.clearTimeout(retryTimer)
})
</script>
