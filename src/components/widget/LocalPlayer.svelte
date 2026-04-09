<script>
import { onDestroy, onMount, tick } from "svelte";

export let audioList = [];
export let autoplay = false;
let audio;
let currentIndex = 0;
let playing = false;
let duration = 0;
let current = 0;
let timer;

let offset = 0;
let dir = 1;
let scrollDistance = 0;
let scrollInterval;
let titleEl;
let containerEl;

function formatTime(t) {
	const m = Math.floor(t / 60)
		.toString()
		.padStart(2, "0");
	const s = Math.floor(t % 60)
		.toString()
		.padStart(2, "0");
	return `${m}:${s}`;
}

function togglePlay() {
	if (!audio) return;
	if (playing) {
		audio.pause();
		playing = false;
	} else {
		void safePlay();
	}
}

async function safePlay() {
	if (!audio) return;
	try {
		await audio.play();
		playing = true;
	} catch {
		playing = false;
	}
}

function playCurrent() {
	const track = audioList[currentIndex];
	if (!track || !audio) return;
	audio.src = track.src;
	current = 0;
	void safePlay();
	setupScroll();
}

function prev() {
	if (audioList.length === 0) return;
	currentIndex = (currentIndex - 1 + audioList.length) % audioList.length;
	playCurrent();
}

function next() {
	if (audioList.length === 0) return;
	currentIndex = (currentIndex + 1) % audioList.length;
	playCurrent();
}

function seek(e) {
	if (audio) {
		audio.currentTime = +e.target.value;
		current = audio.currentTime;
	}
}

onMount(async () => {
	audio = new Audio();
	audio.loop = false;
	audio.addEventListener("loadedmetadata", () => {
		duration = audio.duration;
	});
	audio.addEventListener("timeupdate", () => {
		current = audio.currentTime;
	});
	audio.addEventListener("ended", () => next());

	if (autoplay) playCurrent();
	else {
		const track = audioList[currentIndex];
		if (track) audio.src = track.src;
	}
	timer = setInterval(() => {
		if (audio) current = audio.currentTime;
	}, 200);

	await tick();
	setupScroll();
});

onDestroy(() => {
	clearInterval(timer);
	clearInterval(scrollInterval);
	if (audio) {
		audio.pause();
		audio.src = "";
		audio = null;
	}
});

async function setupScroll() {
	clearInterval(scrollInterval);
	offset = 0;
	dir = 1;
	await tick();
	if (titleEl && containerEl) {
		const sw = titleEl.scrollWidth;
		const cw = containerEl.clientWidth;
		scrollDistance = sw - cw;
		if (scrollDistance > 0) {
			scrollInterval = setInterval(() => {
				offset += dir;
				if (offset >= scrollDistance || offset <= 0) dir = -dir;
			}, 100);
		}
	}
}
</script>

<div class="player">
  <img
    src={audioList[currentIndex]?.cover}
    alt={audioList[currentIndex]?.name}
    class="cover"
    class:spinning={playing}
    on:click={togglePlay}
    on:error={(e) => {
      console.error('图片加载失败：', e.target.src)
      // e.target.src = '/src/assets/images/魔法使之夜OST.webp'
    }}
  />

  <div class="info">
    <div bind:this={containerEl} class="title-container">
      <div
        bind:this={titleEl}
        class="title"
        style="transform: translateX(-{offset}px);"
      >
        {audioList[currentIndex]?.name}
      </div>
    </div>

    <div class="time">{formatTime(current)} / {formatTime(duration)}</div>

    <input
      type="range"
      min="0"
      max={duration}
      step="0.01"
      bind:value={current}
      on:input={seek}
      class="progress"
    />
  </div>

  <div class="controls">
    <button on:click={prev} aria-label="Last" class="ctrl">
      <svg viewBox="0 0 24 24"><path d="M16 5v14l-11-7z"/></svg>
    </button>
    <button on:click={togglePlay} aria-label="Play/Pause" class="ctrl play-pause">
      {#if playing}
        <svg viewBox="0 0 24 24">
          <rect x="6" y="5" width="4" height="14" rx="1"/>
          <rect x="14" y="5" width="4" height="14" rx="1"/>
        </svg>
      {:else}
        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      {/if}
    </button>
    <button on:click={next} aria-label="Next" class="ctrl">
      <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
    </button>
  </div>
</div>

<style>
  /* Light mode */
  .player {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    box-sizing: border-box;
    width: 100%;
    color: #333;
    background-color: white;
    border-radius: 12px;
  }
  .time { 
    font-size: 0.75rem; 
    color: #666; 
  }
  .progress { 
    background: rgba(0, 0, 0, 0.1);
    opacity: 0.7;
  }
  .ctrl { 
    color: #94c4fa;
  }

  /* Dark mode via Tailwind's .dark class */
  :global(html.dark) .player {
     color: #eee;
     background-color: #000000; /* 暗色时为黑色 */
  }
  :global(html.dark) .time { 
    color: #aaa; 
  }
  :global(html.dark) .progress { 
    background: rgba(255, 255, 255, 0.2);
    opacity: 0.7;
  }
  :global(html.dark) .ctrl { 
    color: #63B3FF;
  }

  .cover {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    object-fit: cover;
    cursor: pointer;
    flex-shrink: 0;
  }
  .spinning { 
    animation: spin 10s linear infinite; 
  }
  @keyframes spin { 
    to { transform: rotate(360deg); } 
  }

  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .title-container {
    overflow: hidden;
    width: 100%;
  }
  .title {
    display: inline-block;
    white-space: nowrap;
  }

  .progress {
    width: 100%;
    height: 4px;
    border-radius: 2px;
    appearance: none;
    cursor: pointer;
  }
  .progress::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 12px;
    background: currentColor;
    border-radius: 50%;
    cursor: pointer;
  }
  .progress::-moz-range-thumb {
    width: 12px;
    height: 12px;
    background: currentColor;
    border-radius: 50%;
    border: none;
    cursor: pointer;
  }

  .controls {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
  }
  .ctrl {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    transition: background-color 0.2s ease;
  }
  .ctrl:hover {
    /* 悬停时的蓝色 */
    /* background: #C6E1FF !important;  */
  }
  :global(html.dark) .ctrl:hover {
    /* 暗色模式悬停时的深蓝色 */
    /* background: #1d4ed8 !important;  */
  }
  .ctrl svg { 
    width: 16px; 
    height: 16px; 
    fill: currentColor; 
  }
</style>
