import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

const REQUIRED_BRANCH = "main"
const EXPECTED_REMOTE = "github.com/17356085/17356085.github.io"

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  })

  return {
    ok: result.status === 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status,
    error: result.error,
  }
}

function commandName(args) {
  return `git ${args.join(" ")}`
}

function reportGitFailure(action, args, result) {
  console.error(`同步已停止：${action}失败。`)

  const stderr = String(result.stderr).trim()
  if (stderr) {
    const conciseStderr = stderr.length > 2000 ? `${stderr.slice(0, 2000)}…` : stderr
    console.error(conciseStderr)
  } else if (result.error) {
    console.error(`${commandName(args)}：${result.error.message}`)
  } else if (result.status !== null && result.status !== undefined) {
    console.error(`${commandName(args)} 退出码：${result.status}`)
  }
}

function canonicalPath(target) {
  const absolutePath = path.resolve(target)

  try {
    return fs.realpathSync.native(absolutePath)
  } catch {
    return absolutePath
  }
}

function pathsEqual(left, right) {
  const normalizedLeft = canonicalPath(left)
  const normalizedRight = canonicalPath(right)

  if (process.platform === "win32") {
    return normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
  }

  return normalizedLeft === normalizedRight
}

function verifyRepositoryRoot() {
  const worktree = runGit(["rev-parse", "--is-inside-work-tree"])
  if (!worktree.ok) {
    reportGitFailure("确认 Git worktree", ["rev-parse", "--is-inside-work-tree"], worktree)
    return false
  }

  if (worktree.stdout.trim() !== "true") {
    console.error("同步已停止：当前目录不是 Git worktree。")
    return false
  }

  const root = runGit(["rev-parse", "--show-toplevel"])
  if (!root.ok) {
    reportGitFailure("读取 Git 仓库根目录", ["rev-parse", "--show-toplevel"], root)
    return false
  }

  if (!pathsEqual(process.cwd(), root.stdout.trim())) {
    console.error("同步已停止：请从 Git 仓库根目录运行 pnpm sync。")
    return false
  }

  return true
}

function normalizeRemoteUrl(rawUrl) {
  const value = rawUrl.trim()
  let hostname
  let pathname

  if (/^https?:\/\//i.test(value) || /^(?:ssh|git\+ssh):\/\//i.test(value)) {
    let url

    try {
      url = new URL(value)
    } catch {
      return null
    }

    const isHttps = url.protocol === "https:"
    const isSsh = url.protocol === "ssh:" || url.protocol === "git+ssh:"
    if ((!isHttps && !isSsh) || url.hostname === "" || url.password !== "" || (isHttps && url.username !== "")) {
      return null
    }

    if (url.search !== "" || url.hash !== "") {
      return null
    }

    hostname = url.hostname
    pathname = url.pathname
  } else {
    const scpStyle = value.match(/^(?:[^@\s/]+@)?github\.com:(.+)$/i)
    if (!scpStyle) {
      return null
    }

    hostname = "github.com"
    pathname = `/${scpStyle[1]}`
  }

  const repositoryPath = pathname
    .replace(/^\/+|\/+$/g, "")
    .replace(/\.git$/i, "")
    .toLowerCase()

  return `${hostname.toLowerCase()}/${repositoryPath}`
}

function verifyOrigin() {
  const result = runGit(["config", "--get-all", "remote.origin.url"])
  if (!result.ok) {
    reportGitFailure("读取 origin fetch URL", ["config", "--get-all", "remote.origin.url"], result)
    return false
  }

  const fetchUrls = result.stdout.split(/\r?\n/).map((url) => url.trim()).filter(Boolean)
  const fetchUrl = fetchUrls[0]
  if (!fetchUrl || normalizeRemoteUrl(fetchUrl) !== EXPECTED_REMOTE) {
    console.error("同步已停止：origin 的 fetch URL 不是 github.com/17356085/17356085.github.io。")
    return false
  }

  return true
}

function verifyBranch() {
  const result = runGit(["branch", "--show-current"])
  if (!result.ok) {
    reportGitFailure("确认当前分支", ["branch", "--show-current"], result)
    return false
  }

  const branch = result.stdout.trim()
  if (branch !== REQUIRED_BRANCH) {
    const branchDescription = branch || "detached HEAD"
    console.error(`同步已停止：当前分支为 ${branchDescription}，只允许 main。`)
    return false
  }

  return true
}

function readWorktreeStatus() {
  const args = ["-c", "core.quotePath=false", "status", "--porcelain"]
  const result = runGit(args)
  if (!result.ok) {
    reportGitFailure("检查工作区状态", args, result)
    return null
  }

  return result.stdout.split(/\r?\n/).filter((line) => line.length > 0)
}

function requireCleanWorktree(context) {
  const status = readWorktreeStatus()
  if (status === null) {
    return false
  }

  if (status.length === 0) {
    return true
  }

  const blockedOperation = context === "fetch" ? "fetch 或写操作" : "fast-forward 写操作"
  console.error(`同步已停止：${context}前发现工作区存在 tracked/untracked 修改；未执行 ${blockedOperation}。`)
  console.error("检测到的文件：")
  for (const entry of status) {
    console.error(`  ${entry}`)
  }

  return false
}

function resolveOriginMain() {
  const args = ["rev-parse", "--verify", "--quiet", "refs/remotes/origin/main^{commit}"]
  const result = runGit(args)
  if (!result.ok) {
    reportGitFailure("确认 origin/main", args, result)
    return false
  }

  return result.stdout.trim() !== ""
}

function readAheadBehind() {
  const args = ["rev-list", "--left-right", "--count", "HEAD...origin/main"]
  const result = runGit(args)
  if (!result.ok) {
    reportGitFailure("比较 HEAD 与 origin/main", args, result)
    return null
  }

  const counts = result.stdout.trim().split(/\s+/).map(Number)
  if (counts.length !== 2 || counts.some((count) => !Number.isInteger(count) || count < 0)) {
    console.error("同步已停止：无法解析 HEAD 与 origin/main 的提交数量。")
    return null
  }

  return { ahead: counts[0], behind: counts[1] }
}

function main() {
  if (!verifyRepositoryRoot() || !verifyOrigin() || !verifyBranch()) {
    return 1
  }

  if (!requireCleanWorktree("fetch")) {
    return 1
  }

  const fetchArgs = ["fetch", "origin"]
  console.log("工作区干净，正在执行 git fetch origin…")
  const fetch = runGit(fetchArgs)
  if (!fetch.ok) {
    reportGitFailure("从 origin 获取更新", fetchArgs, fetch)
    return 1
  }

  if (!resolveOriginMain()) {
    console.error("同步已停止：origin/main 不可解析。")
    return 1
  }

  const counts = readAheadBehind()
  if (!counts) {
    return 1
  }

  if (counts.ahead === 0 && counts.behind === 0) {
    console.log("同步完成：本地 main 已是最新。")
    return 0
  }

  if (counts.ahead > 0 && counts.behind === 0) {
    console.error(`同步已停止：本地领先 origin/main；local-only=${counts.ahead}，remote-only=0。未自动 push。`)
    return 1
  }

  if (counts.ahead > 0 && counts.behind > 0) {
    console.error(`同步已停止：本地与 origin/main 已分叉；local-only=${counts.ahead}，remote-only=${counts.behind}。未自动合并。`)
    return 1
  }

  if (!requireCleanWorktree("fast-forward 更新")) {
    return 1
  }

  const updateArgs = ["merge", "--ff-only", "origin/main"]
  console.log(`本地落后 origin/main ${counts.behind} 个提交，正在执行 fast-forward-only 更新…`)
  const update = runGit(updateArgs)
  if (!update.ok) {
    reportGitFailure("fast-forward-only 更新", updateArgs, update)
    return 1
  }

  console.log("同步完成：本地 main 已 fast-forward 到 origin/main。")
  return 0
}

try {
  process.exitCode = main()
} catch (error) {
  console.error(`同步已停止：${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
