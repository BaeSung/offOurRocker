import { app } from 'electron'
import { join } from 'path'
import { writeFileSync, existsSync } from 'fs'
import { simpleGit, SimpleGit } from 'simple-git'
import { IPC } from '../../shared/ipc-channels'
import { DB_NAME, closeDatabase } from '../db/connection'
import { safeHandle, walCheckpoint, getSettingValue } from './utils'

function getRepoPath(customPath?: string): string {
  return customPath || app.getPath('userData')
}

function getGit(repoPath: string): SimpleGit {
  return simpleGit(repoPath)
}

export function registerGitHandlers(): void {
  // Check if git is installed
  safeHandle(IPC.GIT_CHECK, async () => {
    try {
      const git = simpleGit()
      const version = await git.version()
      return { installed: true, version: version?.installed ? version.major + '.' + version.minor + '.' + version.patch : '' }
    } catch {
      return { installed: false, version: '' }
    }
  })

  // Initialize git repo at the given path
  safeHandle(IPC.GIT_INIT, async (_e, customPath?: string) => {
    const repoPath = getRepoPath(customPath)
    const git = getGit(repoPath)

    const isRepo = await git.checkIsRepo().catch(() => false)
    if (!isRepo) {
      await git.init()
    }

    // Create .gitignore if it doesn't exist
    const gitignorePath = join(repoPath, '.gitignore')
    if (!existsSync(gitignorePath)) {
      writeFileSync(
        gitignorePath,
        [
          '# Only track the DB file',
          '*',
          '!.gitignore',
          `!${DB_NAME}`,
          '',
        ].join('\n'),
        'utf-8'
      )
    }

    // Initial commit if no commits exist
    try {
      await git.log()
    } catch {
      const dbPath = join(repoPath, DB_NAME)
      if (existsSync(dbPath)) {
        await git.add(DB_NAME)
        await git.add('.gitignore')
        await git.commit('초기 커밋')
      }
    }

    return { success: true }
  })

  // Commit DB file
  safeHandle(IPC.GIT_COMMIT, async (_e, customPath?: string) => {
    const repoPath = getRepoPath(customPath)
    const git = getGit(repoPath)

    const isRepo = await git.checkIsRepo().catch(() => false)
    if (!isRepo) return { success: false, error: 'Git 저장소가 초기화되지 않았습니다.' }

    // Ensure WAL is flushed
    walCheckpoint()

    const dbPath = join(repoPath, DB_NAME)
    if (!existsSync(dbPath)) return { success: false, error: 'DB 파일을 찾을 수 없습니다.' }

    // Check if there are changes
    await git.add(DB_NAME)
    const status = await git.status()
    if (status.staged.length === 0) {
      return { success: true, message: '변경 사항 없음' }
    }

    const timestamp = new Date().toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
    await git.commit(`자동 저장 — ${timestamp}`)

    return { success: true }
  })

  // Get repo status
  safeHandle(IPC.GIT_STATUS, async (_e, customPath?: string) => {
    const repoPath = getRepoPath(customPath)
    const git = getGit(repoPath)

    const isRepo = await git.checkIsRepo().catch(() => false)
    if (!isRepo) return { initialized: false, lastCommit: null }

    try {
      const log = await git.log({ maxCount: 1 })
      return {
        initialized: true,
        lastCommit: log.latest
          ? { message: log.latest.message, date: log.latest.date }
          : null,
      }
    } catch {
      return { initialized: true, lastCommit: null }
    }
  })

  // Set remote origin URL
  safeHandle(IPC.GIT_SET_REMOTE, async (_e, url: string, customPath?: string) => {
    const repoPath = getRepoPath(customPath)
    const git = getGit(repoPath)

    const isRepo = await git.checkIsRepo().catch(() => false)
    if (!isRepo) return { success: false, error: 'Git 저장소가 초기화되지 않았습니다.' }

    try {
      const remotes = await git.getRemotes()
      const hasOrigin = remotes.some((r) => r.name === 'origin')
      if (hasOrigin) {
        await git.removeRemote('origin')
      }
      await git.addRemote('origin', url)
      return { success: true }
    } catch (err) {
      return { success: false, error: `Remote 설정 실패: ${err instanceof Error ? err.message : err}` }
    }
  })

  // Push to origin (current branch)
  safeHandle(IPC.GIT_PUSH, async (_e, customPath?: string) => {
    const repoPath = getRepoPath(customPath)
    const git = getGit(repoPath)

    const isRepo = await git.checkIsRepo().catch(() => false)
    if (!isRepo) return { success: false, error: 'Git 저장소가 초기화되지 않았습니다.' }

    try {
      const branch = (await git.branchLocal()).current
      await git.push(['-u', 'origin', branch])
      return { success: true }
    } catch (err) {
      return { success: false, error: `Push 실패: ${err instanceof Error ? err.message : err}` }
    }
  })

  // Pull from origin
  safeHandle(IPC.GIT_PULL, async (_e, customPath?: string) => {
    const repoPath = getRepoPath(customPath)
    const git = getGit(repoPath)

    const isRepo = await git.checkIsRepo().catch(() => false)
    if (!isRepo) return { success: false, error: 'Git 저장소가 초기화되지 않았습니다.' }

    try {
      // Checkpoint WAL before pull so DB is clean
      walCheckpoint()

      // Ensure current branch tracks origin
      const branch = (await git.branchLocal()).current
      await git.raw(['branch', '--set-upstream-to', `origin/${branch}`, branch]).catch(() => {})

      const result = await git.pull('origin', branch)
      return { success: true, summary: result.summary }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('CONFLICT') || msg.includes('conflict')) {
        // Don't abort — let the user choose how to resolve
        return { success: false, conflict: true, error: '원격 저장소와 충돌이 발생했습니다. 해결 방법을 선택해주세요.' }
      }
      return { success: false, error: `Pull 실패: ${msg}` }
    }
  })

  // Force push: overwrite remote with local (uses --force-with-lease for safety)
  safeHandle(IPC.GIT_FORCE_PUSH, async (_e, customPath?: string) => {
    const repoPath = getRepoPath(customPath)
    const git = getGit(repoPath)

    const isRepo = await git.checkIsRepo().catch(() => false)
    if (!isRepo) return { success: false, error: 'Git 저장소가 초기화되지 않았습니다.' }

    try {
      const branch = (await git.branchLocal()).current
      // Fetch first so --force-with-lease has a fresh ref to compare against
      await git.fetch('origin').catch(() => {})
      try {
        await git.push(['-u', 'origin', branch, '--force-with-lease'])
      } catch (leaseErr) {
        // If lease fails (no upstream yet, etc.), fall back to plain --force
        const msg = leaseErr instanceof Error ? leaseErr.message : String(leaseErr)
        if (msg.includes('stale info') || msg.includes('rejected')) {
          throw leaseErr
        }
        await git.push(['-u', 'origin', branch, '--force'])
      }
      return { success: true }
    } catch (err) {
      return { success: false, error: `강제 Push 실패: ${err instanceof Error ? err.message : err}` }
    }
  })

  // Force pull: fetch + reset --hard (discard local, use remote)
  safeHandle(IPC.GIT_FORCE_PULL, async (_e, customPath?: string) => {
    const repoPath = getRepoPath(customPath)
    const git = getGit(repoPath)

    const isRepo = await git.checkIsRepo().catch(() => false)
    if (!isRepo) return { success: false, error: 'Git 저장소가 초기화되지 않았습니다.' }

    try {
      walCheckpoint()
      closeDatabase()

      const branch = (await git.branchLocal()).current
      await git.fetch('origin')
      await git.reset(['--hard', `origin/${branch}`])

      // Restart to reload DB with new data
      app.relaunch()
      app.exit(0)

      return { success: true }
    } catch (err) {
      return { success: false, error: `강제 Pull 실패: ${err instanceof Error ? err.message : err}` }
    }
  })

  // Resolve conflict: 'ours' keeps local, 'theirs' uses remote
  safeHandle(IPC.GIT_RESOLVE_CONFLICT, async (_e, strategy: 'ours' | 'theirs', customPath?: string) => {
    const repoPath = getRepoPath(customPath)
    const git = getGit(repoPath)

    const isRepo = await git.checkIsRepo().catch(() => false)
    if (!isRepo) return { success: false, error: 'Git 저장소가 초기화되지 않았습니다.' }

    try {
      if (strategy === 'ours') {
        // Keep local version — checkout ours and finish merge
        await git.raw(['checkout', '--ours', DB_NAME])
        await git.add(DB_NAME)
        await git.commit('충돌 해결: 내 버전 유지')
      } else {
        // Use remote version — checkout theirs and finish merge
        walCheckpoint()
        closeDatabase()
        await git.raw(['checkout', '--theirs', DB_NAME])
        await git.add(DB_NAME)
        await git.commit('충돌 해결: 원격 버전 사용')
        // Restart to reload DB with new data
        app.relaunch()
        app.exit(0)
      }
      return { success: true, needsReload: strategy === 'theirs' }
    } catch (err) {
      // If resolution fails, abort merge to clean state
      await git.raw(['merge', '--abort']).catch(() => {})
      return { success: false, error: `충돌 해결 실패: ${err instanceof Error ? err.message : err}` }
    }
  })

  // Get commit log
  safeHandle(IPC.GIT_LOG, async (_e, maxCount: number = 30, customPath?: string) => {
    const repoPath = getRepoPath(customPath)
    const git = getGit(repoPath)

    const isRepo = await git.checkIsRepo().catch(() => false)
    if (!isRepo) return { commits: [] }

    try {
      const log = await git.log({ maxCount })
      return {
        commits: log.all.map((c) => ({
          hash: c.hash,
          message: c.message,
          date: c.date,
        })),
      }
    } catch {
      return { commits: [] }
    }
  })

  // Restore DB from a specific commit
  safeHandle(IPC.GIT_RESTORE, async (_e, commitHash: string, customPath?: string) => {
    const repoPath = getRepoPath(customPath)
    const git = getGit(repoPath)

    const isRepo = await git.checkIsRepo().catch(() => false)
    if (!isRepo) return { success: false, error: 'Git 저장소가 초기화되지 않았습니다.' }

    try {
      // Checkpoint WAL and close DB before restoring
      walCheckpoint()
      closeDatabase()

      // Checkout the DB file from the specified commit
      await git.raw(['checkout', commitHash, '--', DB_NAME])

      // Restart the app to reload the DB
      app.relaunch()
      app.exit(0)

      return { success: true, needsReload: true }
    } catch (err) {
      return { success: false, error: `복원 실패: ${err instanceof Error ? err.message : err}` }
    }
  })
}

/** Auto-commit DB (fire-and-forget, never throws) */
export async function gitAutoCommit(customPath?: string): Promise<void> {
  try {
    const repoPath = getRepoPath(customPath)
    const git = getGit(repoPath)

    const isRepo = await git.checkIsRepo().catch(() => false)
    if (!isRepo) return

    const dbPath = join(repoPath, DB_NAME)
    if (!existsSync(dbPath)) return

    await git.add(DB_NAME)
    const status = await git.status()
    if (status.staged.length === 0) return

    const timestamp = new Date().toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
    await git.commit(`자동 저장 — ${timestamp}`)

    // Auto-push if enabled (fire-and-forget)
    if (getSettingValue('gitAutoPush') === 'true') {
      git.branchLocal().then((b) => {
        git.push('origin', b.current).catch((err) => {
          console.error('[Git] auto-push failed:', err)
        })
      }).catch(() => {})
    }
  } catch (err) {
    console.error('[Git] auto-commit failed:', err)
  }
}
