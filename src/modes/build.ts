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
  config: JobInclude
  buildInfo: {
    primaryTag: string
    totalTags: number
    tags: string[]
    buildArgs: Record<string, string>
    target: string | null
    platform: string | null
    builderOS: string
    builderArch: string
  }
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
      core.info(`Checking value for precedence type: ${precedence}`)
      switch (precedence) {
        case BuildArgPrecedence.DEFAULT:
          setValue = value.default || null
          break
        case BuildArgPrecedence.CMD:
          if (!value.cmd) {
            core.warning(`No cmd set for build arg: ${key}`)
            continue
          }

          try {
            const output = execSync(value.cmd, {
              stdio: 'pipe'
            })

            if (output) {
              setValue = output.toString().trim()
            } else {
              core.warning(
                `Command '${value.cmd}' returned no output, setting to null`
              )
              setValue = null
              continue
            }
          } catch (error) {
            core.error(`Error executing command '${value.cmd}': ${error}`)
            throw error
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
  tag: string,
  target: string | null,
  platform_slug: string | null
) {
  core.info(`Building container with tag: ${tag}`)

  const command = ['docker', 'build', '-f', containerfilePath, '-t', tag]

  for (const [key, value] of Object.entries(buildArgs)) {
    command.push('--build-arg')
    command.push(`${key}=${value}`)
  }

  if (target) {
    command.push('--target')
    command.push(target)
  }

  if (platform_slug) {
    command.push('--platform')
    command.push(platform_slug)
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

export function addOtherTags(builtTag: string, fullTags: string[]) {
  for (const tag of fullTags) {
    if (tag !== builtTag) {
      core.info(`Adding tag: ${tag}`)
      try {
        execSync(`docker tag ${builtTag} ${tag}`, {
          stdio: 'inherit'
        })
      } catch (error) {
        core.error(`Error adding tag: ${tag}`)
        throw error
      }
    }
  }
}

export function pushTags(tags: string[]) {
  const skipPush =
    core.getInput('skip-push') || process.env.SKIP_PUSH ? true : false

  if (skipPush) {
    core.info('Skipping push')
    return
  }

  for (const tag of tags) {
    core.info(`Pushing tag: ${tag}`)
    try {
      execSync(`docker push ${tag}`, {
        stdio: 'inherit'
      })
    } catch (error) {
      core.error(`Error pushing tag: ${tag}`)
      throw error
    }
  }
}

export async function buildMode(): Promise<ModeReturn> {
  const jobIncludeConfig = getJobIncludeConfig()

  const templateValues = {
    env: process.env,
    GIT_PROJECT_ROOT: await getGitProjectRoot(),
    CONTAINER_NAME: jobIncludeConfig.containerName,
    PLATFORM:
      jobIncludeConfig.platform_slug?.replace('/', '-') || process.platform,
    ARCH: jobIncludeConfig.arch || process.arch
  }

  const buildName =
    jobIncludeConfig.job || core.getInput('build-name') || 'build'

  // Start building the summary
  let summary = `<details>\n<summary>🐳 ${buildName} Container Build Summary (click to expand for details)</summary>\n\n`
  summary += `## 📋 Build Configuration\n\n`
  summary += `| Setting | Value |\n`
  summary += `|---------|-------|\n`
  summary += `| 🏷️ Job Name | \`${buildName}\` |\n`
  summary += `| 📦 Container Name | \`${jobIncludeConfig.containerName}\` |\n`
  summary += `| 💻 Builder OS | \`${process.platform}\` |\n`
  summary += `| 💻 Builder Architecture | \`${process.arch}\` |\n`
  if (jobIncludeConfig.target) {
    summary += `| 🎯 Target | \`${jobIncludeConfig.target}\` |\n`
  }
  if (jobIncludeConfig.platform_slug) {
    summary += `| 🌐 Platform | \`${jobIncludeConfig.platform_slug}\` |\n`
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
  const registryLogins = []

  for await (const loginResult of loginToRepositories(
    jobIncludeConfig,
    templateValues
  )) {
    core.info(`Logged in to ${loginResult.repository.registry}`)
    registryLogins.push(loginResult.repository.registry)

    for (const tag of generateTags(
      loginResult.repository,
      populatedPlatformTags
    )) {
      fullTags.push(tag)
    }
  }

  if (registryLogins.length > 0) {
    summary += `\n## 🔐 Registry Login\n\n`
    summary += `| Status | Registry |\n`
    summary += `|--------|----------|\n`
    for (const registry of registryLogins) {
      summary += `| ✅ Success | \`${registry}\` |\n`
    }
  }

  summary += `\n## 🏷️ Generated Tags\n\n`
  summary += `| Tag |\n`
  summary += `|-----|\n`
  for (const tag of fullTags) {
    summary += `| \`${tag}\` |\n`
  }

  const buildArgs = generateBuildArgs(jobIncludeConfig.buildArgs || {})

  let buildError: Error | null = null

  try {
    const builtTag = buildContainer(
      jobIncludeConfig.containerfilePath
        ? Handlebars.compile(jobIncludeConfig.containerfilePath)(templateValues)
        : 'Dockerfile',
      jobIncludeConfig.contextPath
        ? Handlebars.compile(jobIncludeConfig.contextPath)(templateValues)
        : '.',
      buildArgs,
      fullTags[0],
      jobIncludeConfig.target || null,
      jobIncludeConfig.platform_slug || null
    )

    addOtherTags(builtTag, fullTags)
    pushTags(fullTags)

    core.info(`Build complete: ${builtTag}`)

    summary += `\n## 🚀 Build Results\n\n`
    summary += `| Metric | Value |\n`
    summary += `|--------|-------|\n`
    summary += `| 🏆 Primary Tag | \`${builtTag}\` |\n`
    summary += `| 📊 Total Tags | ${fullTags.length} |\n`
    summary += `| ✅ Build Status | Success |\n`

    if (core.getInput('skip-step-summary') === 'false') {
      // Write the summary
      await core.summary.addRaw(summary + '\n</details>').write()
    }

    return {
      buildOutput: {
        config: {
          ...jobIncludeConfig,
          containerName: jobIncludeConfig.containerName
        },
        buildInfo: {
          primaryTag: builtTag,
          totalTags: fullTags.length,
          tags: fullTags,
          buildArgs,
          target: jobIncludeConfig.target,
          platform: jobIncludeConfig.platform_slug,
          builderOS: process.platform,
          builderArch: process.arch
        }
      }
    } as ModeReturn
  } catch (error) {
    buildError = error instanceof Error ? error : new Error(String(error))

    summary += `\n## 🚀 Build Results\n\n`
    summary += `| Metric | Value |\n`
    summary += `|--------|-------|\n`
    summary += `| ❌ Build Status | Failed |\n`
    summary += `| 💥 Error | \`${buildError.message}\` |\n`

    if (core.getInput('skip-step-summary') === 'false') {
      // Write the summary
      await core.summary.addRaw(summary + '\n</details>').write()
    }

    // Re-throw the error to fail the job
    throw buildError
  }
}
