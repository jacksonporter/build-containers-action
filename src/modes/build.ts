import { getRepositoryClass } from '../repositories/respository.js'

import { getJobIncludeConfig } from '../input.js'
import { ModeReturn } from '../mode.js'
import { getGitProjectRoot } from '../git.js'

export interface BuildOutput {
  temp: string
}

export async function buildMode(): Promise<ModeReturn> {
  const jobIncludeConfig = getJobIncludeConfig()

  const templateValues = {
    env: process.env,
    GIT_PROJECT_ROOT: getGitProjectRoot()
  }

  if (!process.env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN is not set')
  }

  // Login to repositories
  for (const repository of Object.values(jobIncludeConfig.repositories || {})) {
    const repositoryClass = await getRepositoryClass(
      repository.type,
      repository,
      templateValues
    )
    await repositoryClass.login()
  }

  return {
    buildOutput: {
      temp: JSON.stringify(jobIncludeConfig, null, 2)
    }
  } as ModeReturn
}
