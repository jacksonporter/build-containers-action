import * as core from '@actions/core'
import { InputMode, startMode } from './mode.js'
import * as fs from 'fs'
import * as path from 'path'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const modeReturn = await startMode()

    if (modeReturn.finalizedContainerConfig) {
      core.setOutput(
        'finalizedContainerConfig',
        JSON.stringify(modeReturn.finalizedContainerConfig)
      )
      core.info(
        `Finalized container config: ${JSON.stringify(
          modeReturn.finalizedContainerConfig,
          null,
          2
        )}`
      )
    }

    if (modeReturn.jobMatrix) {
      core.setOutput('jobMatrix', JSON.stringify(modeReturn.jobMatrix))
      core.info(`Job matrix: ${JSON.stringify(modeReturn.jobMatrix, null, 2)}`)
    } else {
      core.setOutput('jobMatrix', '{}')

      if (core.getInput('mode') === InputMode.GENERATE_MATRIX) {
        core.warning('jobMatrix is empty')
      }
    }

    if (modeReturn.buildOutput) {
      core.setOutput(
        'build-output-json',
        JSON.stringify(modeReturn.buildOutput)
      )
      core.info(
        `Build output: ${JSON.stringify(modeReturn.buildOutput, null, 2)}`
      )

      // save the build output to a file
      const filePath = path.join(
        process.env.GITHUB_WORKSPACE || '',
        'buildOutput.json'
      )
      fs.writeFileSync(
        filePath,
        JSON.stringify(modeReturn.buildOutput, null, 2)
      )
      core.info(
        `Wrote file: ${filePath}, setting output 'build-output-json-path' as this file path`
      )

      core.setOutput('build-output-json-path', filePath)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
