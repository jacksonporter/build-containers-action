import { getRepositoryClass } from '../repositories/respository.js'

import { getJobIncludeConfig } from '../input.js'
import { ModeReturn } from '../mode.js'
import { getGitProjectRoot } from '../git.js'
import * as core from '@actions/core'
import Handlebars from 'handlebars'
import { JobInclude } from '../matrix.js'
import {
  BuildArgConfig,
  BuildArgPrecedence,
  RepositoryConfig
} from '../config.js'
import { execSync } from 'child_process'

export interface BuildOutput {
  temp: string
}

export async function* loginToRepositories(
  jobIncludeConfig: JobInclude,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  templateValues: { [key: string]: any }
) {
  // Login to repositories
  for (const repository of Object.values(jobIncludeConfig.repositories || {})) {
    core.info(`Logging in to ${repository.registry}`)
    const repositoryClass = await getRepositoryClass(
      repository.type,
      repository,
      templateValues
    )
    await repositoryClass.login()

    yield {
      repository: repository,
      repositoryClass: repositoryClass
    }
  }
}

export function generateTags(
  repository: RepositoryConfig,
  platformTags: string[]
) {
  return platformTags.map((platformTag) => {
    return `${repository.registry}/${repository.repository}:${platformTag}`
  })
}

export function generateBuildArgs(buildArgs: Record<string, BuildArgConfig>) {
  const buildArgsArray: Record<string, string> = {}

  for (const [key, value] of Object.entries(buildArgs)) {
    let setValue

    if (!value.orderPrecedence) {
      core.warning(`No orderPrecedence set for build arg: ${key}`)
      value.orderPrecedence = [
        BuildArgPrecedence.CMD,
        BuildArgPrecedence.ENV_VAR,
        BuildArgPrecedence.DEFAULT
      ]
    }

    for (const precedence of value.orderPrecedence) {
      switch (precedence) {
        case BuildArgPrecedence.DEFAULT:
          setValue = value.default
          break
        case BuildArgPrecedence.CMD:
          if (!value.cmd) {
            core.warning(`No cmd set for build arg: ${key}`)
            continue
          }

          try {
            execSync(value.cmd, {
              stdio: 'inherit'
            })
            setValue = value.cmd.trim()
          } catch (error) {
            core.error(`Error executing command: ${error}`)
          }
          break
        case BuildArgPrecedence.ENV_VAR:
          setValue = process.env[key] || null
          break
      }

      if (setValue) {
        buildArgsArray[key] = setValue.toString()
        continue
      }
    }
  }
  return buildArgsArray
}

export function buildContainer(
  containerfilePath: string,
  contextPath: string,
  buildArgs: Record<string, string>,
  tag: string
) {
  // const skipPush =
  //   core.getInput('skip-push') || process.env.SKIP_PUSH ? true : false

  core.info(`Building container with tag: ${tag}`)

  const command = ['docker', 'build', '-f', containerfilePath, '-t', tag]

  for (const [key, value] of Object.entries(buildArgs)) {
    command.push('--build-arg')
    command.push(`${key}=${value}`)
  }

  command.push(contextPath)

  const strCommand = command.join(' ')

  core.info(`Running command: ${strCommand}`)

  try {
    execSync(strCommand, {
      stdio: 'inherit'
    })
  } catch (error) {
    core.error(`Error building container: ${error}`)
    throw error
  }

  return tag
}

export async function buildMode(): Promise<ModeReturn> {
  const jobIncludeConfig = getJobIncludeConfig()

  const templateValues = {
    env: process.env,
    GIT_PROJECT_ROOT: getGitProjectRoot()
  }

  // populate tags
  const populatedPlatformTags =
    jobIncludeConfig.platformTagTemplates?.map((template) => {
      return Handlebars.compile(template)(templateValues)
    }) || []

  if (populatedPlatformTags.length === 0) {
    throw new Error('No platform tag templates found')
  }

  const fullTags = []

  for await (const loginResult of loginToRepositories(
    jobIncludeConfig,
    templateValues
  )) {
    core.info(`Logged in to ${loginResult.repository.registry}`)

    for (const tag of generateTags(
      loginResult.repository,
      populatedPlatformTags
    )) {
      fullTags.push(tag)
    }
  }

  const buildArgs = generateBuildArgs(jobIncludeConfig.buildArgs || {})

  const builtTag = buildContainer(
    jobIncludeConfig.containerfilePath || 'Dockerfile',
    jobIncludeConfig.contextPath || '.',
    buildArgs,
    fullTags[0]
  )

  core.info(`Build complete: ${builtTag}`)

  return {
    buildOutput: {
      temp: JSON.stringify(jobIncludeConfig, null, 2)
    }
  } as ModeReturn
}
