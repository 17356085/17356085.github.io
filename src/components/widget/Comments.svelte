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
        评论区需要访问 GitHub；当前网络似乎无法连接 `api.github.com`。
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

  fetch('https://api.github.com/', { method: 'GET' })
    .then((r) => {
      shouldLoadGiscus = r.ok
    })
    .catch(() => {
      shouldLoadGiscus = false
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
