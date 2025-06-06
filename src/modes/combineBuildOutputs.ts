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

  for (const dir of buildOutputDirs) {
    const buildOutputPath = path.join(workspace, dir, 'buildOutput.json')
    if (fs.existsSync(buildOutputPath)) {
      const buildOutput = JSON.parse(fs.readFileSync(buildOutputPath, 'utf8'))
      // Extract job name from directory name (remove prefix)
      const jobName = dir.replace(prefix, '')
      combinedOutput[jobName] = buildOutput
    }
  }

  return {
    buildOutput: {
      temp: JSON.stringify(combinedOutput, null, 2)
    } as BuildOutput
  }
}
