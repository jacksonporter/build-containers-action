import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import { ModeReturn } from '../mode.js'
import { BuildOutput } from './build.js'

export async function combineBuildOutputsMode(): Promise<ModeReturn> {
  core.info('Combining build outputs...')

  const workspace = process.env.GITHUB_WORKSPACE || ''
  const combinedOutput: Record<string, unknown> = {}
  const prefix = core.getInput('build-output-artifact-name-prefix')

  if (!prefix) {
    throw new Error('build-output-artifact-name-prefix is required')
  }

  // Read all build output directories
  const buildOutputDirs = fs
    .readdirSync(workspace)
    .filter((dir) => dir.startsWith(prefix))

  // Group builds by container name
  const containerBuilds: Record<string, BuildOutput[]> = {}

  for (const dir of buildOutputDirs) {
    const buildOutputPath = path.join(workspace, dir, 'buildOutput.json')
    if (fs.existsSync(buildOutputPath)) {
      const buildOutput = JSON.parse(fs.readFileSync(buildOutputPath, 'utf8'))
      // Extract job name from directory name (remove prefix)
      const jobName = dir.replace(prefix, '')
      combinedOutput[jobName] = buildOutput

      // Group by container name
      const containerName = buildOutput.config.containerName
      if (!containerBuilds[containerName]) {
        containerBuilds[containerName] = []
      }
      containerBuilds[containerName].push(buildOutput)
    }
  }

  // Start building the summary
  let summary = `<details>\n<summary>🐳 Combined Build Outputs Summary (click to expand for details)</summary>\n\n`
  summary += `## 📋 Build Outputs\n\n`

  // For each container, show all its builds
  for (const [containerName, builds] of Object.entries(containerBuilds)) {
    summary += `### 📦 ${containerName}\n\n`
    summary += `| Platform | Primary Tag | Total Tags | Target |\n`
    summary += `|----------|-------------|------------|--------|\n`

    for (const build of builds) {
      const platform = build.buildInfo.platform || 'default'
      summary += `| \`${platform}\` | \`${build.buildInfo.primaryTag}\` | ${build.buildInfo.totalTags} | ${build.buildInfo.target ? `\`${build.buildInfo.target}\`` : '-'} |\n`
    }
    summary += '\n'
  }

  summary += '\n</details>'

  if (core.getInput('skip-step-summary') === 'false') {
    core.info('📝 Writing step summary')
    // Write the summary
    await core.summary.addRaw(summary).write()
  }

  return {
    buildOutput: combinedOutput as unknown as BuildOutput
  }
}
