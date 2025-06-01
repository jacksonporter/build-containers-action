import * as core from '@actions/core'
import { startMode } from './mode.js'
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

    if (modeReturn.linuxMatrix) {
      core.setOutput('linuxMatrix', JSON.stringify(modeReturn.linuxMatrix))
      core.info(
        `Linux matrix: ${JSON.stringify(modeReturn.linuxMatrix, null, 2)}`
      )
    }

    if (modeReturn.windowsMatrix) {
      core.setOutput('windowsMatrix', JSON.stringify(modeReturn.windowsMatrix))
      core.info(
        `Windows matrix: ${JSON.stringify(modeReturn.windowsMatrix, null, 2)}`
      )
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

      core.setOutput('build-output-json-path', filePath)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
