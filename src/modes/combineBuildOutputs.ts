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

  // Start building the summary
  let summary = `<details>\n<summary>🐳 Combined Build Outputs Summary (click to expand for details)</summary>\n\n`
  summary += `## 📋 Build Outputs\n\n`

  for (const dir of buildOutputDirs) {
    const buildOutputPath = path.join(workspace, dir, 'buildOutput.json')
    if (fs.existsSync(buildOutputPath)) {
      const buildOutput = JSON.parse(fs.readFileSync(buildOutputPath, 'utf8'))
      // Extract job name from directory name (remove prefix)
      const jobName = dir.replace(prefix, '')
      combinedOutput[jobName] = buildOutput

      // Add to summary
      summary += `### 🔨 ${jobName}\n\n`
      summary += `| Setting | Value |\n`
      summary += `|---------|-------|\n`
      summary += `| 📦 Container Name | \`${buildOutput.config.containerName}\` |\n`
      summary += `| 🏆 Primary Tag | \`${buildOutput.buildInfo.primaryTag}\` |\n`
      summary += `| 📊 Total Tags | ${buildOutput.buildInfo.totalTags} |\n`
      if (buildOutput.buildInfo.target) {
        summary += `| 🎯 Target | \`${buildOutput.buildInfo.target}\` |\n`
      }
      if (buildOutput.buildInfo.platform) {
        summary += `| 🌐 Platform | \`${buildOutput.buildInfo.platform}\` |\n`
      }
      summary += '\n'
    }
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
