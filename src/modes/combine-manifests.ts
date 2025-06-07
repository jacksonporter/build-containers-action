import * as core from '@actions/core'
import { getConfigFromJSON, ContainerConfig } from '../config.js'
import { getGitProjectRoot } from '../git.js'
import { loginToRepositories } from './build.js'
import { execSync } from 'child_process'
import * as Handlebars from 'handlebars'
import { JobInclude } from '../matrix.js'
import { BuildOutput } from './build.js'
import { ModeReturn } from '../mode.js'

interface TemplateValues {
  env: NodeJS.ProcessEnv
  GIT_PROJECT_ROOT: string
  CONTAINER_NAME?: string
}

export async function combineManifestsMode(): Promise<ModeReturn> {
  const config = await getConfigFromJSON(JSON.parse(core.getInput('config')))
  const buildOutputs = JSON.parse(
    core.getInput('build-outputs')
  ) as BuildOutput[]
  const templateValues: TemplateValues = {
    env: process.env,
    GIT_PROJECT_ROOT: await getGitProjectRoot()
  }

  // Start building the summary
  let summary = `<details>\n<summary>🐳 Container Manifest Summary (click to expand for details)</summary>\n\n`
  summary += `## 📋 Manifest Configuration\n\n`

  // Process each container
  for (const [containerName, containerConfig] of Object.entries(config)) {
    const containerSummary = await processContainer(
      containerName,
      containerConfig,
      buildOutputs,
      templateValues
    )
    summary += containerSummary
  }

  summary += '\n</details>'

  if (core.getInput('skip-step-summary') === 'false') {
    // Write the summary
    await core.summary.addRaw(summary).write()
  }

  return {}
}

async function processContainer(
  containerName: string,
  containerConfig: ContainerConfig,
  buildOutputs: BuildOutput[],
  templateValues: TemplateValues
): Promise<string> {
  let summary = `### 📦 Container: ${containerName}\n\n`

  // Get all primary tags from build outputs
  const primaryTags = buildOutputs
    .filter((output) => output.config.containerName === containerName)
    .map((output) => output.buildInfo.primaryTag)

  if (primaryTags.length === 0) {
    throw new Error(`No primary tags found for container ${containerName}`)
  }

  // Get manifest tag templates
  const manifestTagTemplates = containerConfig.default?.manifestTagTemplates || []
  if (manifestTagTemplates.length === 0) {
    throw new Error(
      `No manifest tag templates found for container ${containerName}`
    )
  }

  // Add container info to template values
  templateValues.CONTAINER_NAME = containerName

  // Populate manifest tags
  const manifestTags = manifestTagTemplates.map((template: string) => {
    return Handlebars.compile(template)(templateValues)
  })

  // Get repositories from the first platform that has them
  let repositories = {}
  if (containerConfig.linuxPlatforms) {
    for (const platform of Object.values(containerConfig.linuxPlatforms)) {
      if (platform.repositories) {
        repositories = platform.repositories
        break
      }
    }
  }
  if (
    Object.keys(repositories).length === 0 &&
    containerConfig.windowsPlatforms
  ) {
    for (const platform of Object.values(containerConfig.windowsPlatforms)) {
      if (platform.repositories) {
        repositories = platform.repositories
        break
      }
    }
  }

  // Create a JobInclude object for loginToRepositories
  const jobInclude: JobInclude = {
    job: 'combine-manifests',
    containerName,
    repositories
  }

  // Login to repositories
  const registryLogins = []
  for await (const loginResult of loginToRepositories(
    jobInclude,
    templateValues
  )) {
    core.info(`Logged in to ${loginResult.repository.registry}`)
    registryLogins.push(loginResult.repository.registry)
  }

  // Add registry login info to summary
  if (registryLogins.length > 0) {
    summary += `#### 🔐 Registry Login\n\n`
    summary += `| Status | Registry |\n`
    summary += `|--------|----------|\n`
    for (const registry of registryLogins) {
      summary += `| ✅ Success | \`${registry}\` |\n`
    }
    summary += '\n'
  }

  // Add manifest info to summary
  summary += `#### 🏷️ Generated Manifest Tags\n\n`
  summary += `| Tag |\n`
  summary += `|-----|\n`
  for (const tag of manifestTags) {
    summary += `| \`${tag}\` |\n`
  }
  summary += '\n'

  // Add platform info to summary
  summary += `#### 💻 Included Platforms\n\n`
  summary += `| Platform |\n`
  summary += `|----------|\n`
  for (const tag of primaryTags) {
    summary += `| \`${tag}\` |\n`
  }
  summary += '\n'

  // Pull all images
  for (const tag of primaryTags) {
    core.info(`Pulling image: ${tag}`)
    try {
      execSync(`docker pull ${tag}`, { stdio: 'inherit' })
    } catch (error) {
      throw new Error(`Failed to pull image ${tag}: ${error}`)
    }
  }

  // Create and push manifests
  for (const manifestTag of manifestTags) {
    core.info(`Creating manifest: ${manifestTag}`)
    try {
      // Create manifest
      execSync(
        `docker manifest create ${manifestTag} ${primaryTags.join(' ')}`,
        { stdio: 'inherit' }
      )

      // Push manifest
      execSync(`docker manifest push ${manifestTag}`, { stdio: 'inherit' })
    } catch (error) {
      throw new Error(`Failed to create/push manifest ${manifestTag}: ${error}`)
    }
  }

  // Add results to summary
  summary += `#### 🚀 Manifest Results\n\n`
  summary += `| Metric | Value |\n`
  summary += `|--------|-------|\n`
  summary += `| 🏆 Primary Tag | \`${manifestTags[0]}\` |\n`
  summary += `| 📊 Total Tags | ${manifestTags.length} |\n`
  summary += `| 💻 Total Platforms | ${primaryTags.length} |\n`
  summary += `| ✅ Status | Success |\n\n`

  return summary
}
