import * as core from '@actions/core'
import {
  getConfigFromJSON,
  ContainerConfig,
  RepositoryConfig
} from '../config.js'
import { getGitProjectRoot } from '../git.js'
import { loginToRepositories } from './build.js'
import { execSync } from 'child_process'
import * as Handlebars from 'handlebars'
import { JobInclude } from '../matrix.js'
import { BuildOutput } from './build.js'
import { ModeReturn } from '../mode.js'
import { getRawConfig } from '../input.js'

interface TemplateValues {
  env: NodeJS.ProcessEnv
  GIT_PROJECT_ROOT: string
  CONTAINER_NAME?: string
}

async function processContainer(
  containerName: string,
  containerConfig: ContainerConfig,
  buildOutputs: BuildOutput[],
  templateValues: TemplateValues
): Promise<string> {
  core.info(`\n📦 Starting manifest creation for container: ${containerName}`)
  let summary = `### 📦 Container: ${containerName}\n\n`

  const updatedTemplateValues = {
    ...templateValues,
    CONTAINER_NAME: containerName
  }

  // Get all primary tags from build outputs
  const primaryTags = buildOutputs
    .filter((output) => output.config.containerName === containerName)
    .map((output) => output.buildInfo.primaryTag)

  if (primaryTags.length === 0) {
    throw new Error(`No primary tags found for container ${containerName}`)
  }
  core.info(`🏷️ Found ${primaryTags.length} primary tags`)

  // Get manifest tag templates
  const manifestTagTemplates = containerConfig.manifestTagTemplates || []
  if (manifestTagTemplates.length === 0) {
    throw new Error(
      `No manifest tag templates found for container ${containerName}`
    )
  }
  core.info(`📝 Found ${manifestTagTemplates.length} manifest tag templates`)

  // Populate manifest tags
  const manifestTags = manifestTagTemplates.map((template: string) => {
    return Handlebars.compile(template)(updatedTemplateValues)
  })
  core.info(`✨ Generated ${manifestTags.length} manifest tags`)

  // Get repositories from the first platform that has them
  let repositories: { [key: string]: RepositoryConfig } = {}
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
  core.info(
    `🔑 Found ${Object.keys(repositories).length} repositories to authenticate with`
  )

  // Create a JobInclude object for loginToRepositories
  const jobInclude: JobInclude = {
    job: 'create-manifest',
    containerName,
    repositories
  }

  // Login to repositories
  core.info('🔐 Starting registry authentication')
  const registryLogins = []
  for await (const loginResult of loginToRepositories(
    jobInclude,
    templateValues
  )) {
    core.info(`✅ Successfully logged in to ${loginResult.repository.registry}`)
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
  summary += `#### 🏷️ Manifest Tags\n\n`
  summary += `| Tag |\n`
  summary += `|-----|\n`
  for (const tag of manifestTags) {
    summary += `| \`${tag}\` |\n`
  }
  summary += '\n'

  // Add platform info to summary
  summary += `#### 💻 Included Platforms\n\n`
  summary += `| Platform | Tag | Status |\n`
  summary += `|----------|-----|--------|\n`
  for (const buildOutput of buildOutputs) {
    const platform = buildOutput.buildInfo.platform || 'default'
    const tag = buildOutput.buildInfo.primaryTag
    summary += `| \`${platform}\` | \`${tag}\` | ✅ Included |\n`
  }
  summary += '\n'

  // Create and push manifests
  core.info('🚀 Starting manifest creation and push')
  for (const manifestTag of manifestTags) {
    core.info(`\n📦 Creating manifest: ${manifestTag}`)
    try {
      // Create manifest for each repository
      for (const repository of Object.values(repositories)) {
        // Combine repository info with manifest tag
        const fullManifestTag = `${repository.registry}/${repository.repository}:${manifestTag}`

        // Create manifest
        core.info(`🔄 Creating manifest with tags: ${primaryTags.join(', ')}`)
        execSync(
          `docker manifest create ${fullManifestTag} ${primaryTags.join(' ')}`,
          {
            stdio: 'inherit'
          }
        )

        // Push manifest
        core.info(`⬆️ Pushing manifest: ${fullManifestTag}`)
        execSync(`docker manifest push ${fullManifestTag}`, {
          stdio: 'inherit'
        })
        core.info(
          `✅ Successfully created and pushed manifest: ${fullManifestTag}`
        )
      }
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

  core.info(`✅ Completed manifest creation for container: ${containerName}`)
  return summary
}

export async function createManifestMode(): Promise<ModeReturn> {
  core.info('🚀 Starting create-manifest mode')

  try {
    const config = await getConfigFromJSON(getRawConfig())
    core.info(
      `📋 Loaded configuration for ${Object.keys(config).length} containers`
    )

    core.info('Full Container Config: \n' + JSON.stringify(config, null, 2))

    const buildOutputsInput = core.getInput('build-outputs')
    core.info('📦 Raw build outputs input received')

    let buildOutputs: Record<string, BuildOutput>
    try {
      buildOutputs = JSON.parse(buildOutputsInput)
      core.info(`📦 Successfully parsed build outputs JSON`)
    } catch (error) {
      core.error(`❌ Failed to parse build outputs JSON: ${error}`)
      core.error(`📄 Build outputs input length: ${buildOutputsInput.length}`)
      core.error(
        `📄 First 100 characters of build outputs: ${buildOutputsInput.substring(0, 100)}`
      )
      throw error
    }

    core.info(`📦 Found ${Object.keys(buildOutputs).length} build outputs`)

    const templateValues: TemplateValues = {
      env: process.env,
      GIT_PROJECT_ROOT: await getGitProjectRoot()
    }
    core.info(`📂 Git project root: ${templateValues.GIT_PROJECT_ROOT}`)

    // Start building the summary
    let summary = `## 🐳 Container Manifest Summary\n\n`

    // Process each container
    for (const [containerName, containerConfig] of Object.entries(config)) {
      core.info(`\n🔄 Processing container: ${containerName}`)

      // Filter build outputs for this container
      const containerBuildOutputs = Object.values(buildOutputs).filter(
        (output) => output.config.containerName === containerName
      )
      core.info(
        `📊 Found ${containerBuildOutputs.length} build outputs for ${containerName}`
      )

      const containerSummary = await processContainer(
        containerName,
        containerConfig,
        containerBuildOutputs,
        templateValues
      )
      summary += containerSummary
    }

    if (core.getInput('skip-step-summary') === 'false') {
      core.info('📝 Writing step summary')
      // Write the summary
      await core.summary.addRaw(summary).write()
    }

    core.info('✅ Create manifest mode completed successfully')
    return {}
  } catch (error) {
    core.error(`❌ Error in create-manifest mode: ${error}`)
    throw error
  }
}
