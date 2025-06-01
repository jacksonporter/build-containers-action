import { execSync } from 'child_process'
import fs from 'fs'
import which from 'which'

export async function getGitProjectRoot(): Promise<string> {
  if (process.env.GITHUB_WORKSPACE) {
    return process.env.GITHUB_WORKSPACE
  }

  // check if git command exists and .git folder
  const gitCommand = 'git'
  const gitFolder = '.git'

  try {
    const gitPath = await which(gitCommand)
    if (!gitPath) {
      throw new Error(`${gitCommand} command not found`)
    }
  } catch {
    throw new Error(`${gitCommand} command not found`)
  }

  if (!fs.existsSync(gitFolder)) {
    throw new Error(`${gitFolder} folder not found`)
  }

  const gitRoot = execSync(`${gitCommand} rev-parse --show-toplevel`, {
    stdio: 'pipe'
  })

  if (!gitRoot) {
    throw new Error(
      'Failed to get git root directory - command returned no output'
    )
  }

  return gitRoot.toString().trim()
}
