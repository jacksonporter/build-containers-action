import * as core from '@actions/core'
import { InputMode, getInputMode } from './input.js'
import { generateMatrixMode } from './modes/generateMatrix.js'
import { ModeReturn } from './modeReturnTypes.js'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    // const ms: string = core.getInput('milliseconds')

    // // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
    // core.debug(`Waiting ${ms} milliseconds ...`)

    // // Log the current timestamp, wait, then log the new timestamp
    // core.debug(new Date().toTimeString())
    // await wait(parseInt(ms, 10))
    // core.debug(new Date().toTimeString())

    // // Set outputs for other workflow steps to use
    // core.setOutput('time', new Date().toTimeString())

    const mode = getInputMode()
    let modeReturn: ModeReturn

    switch (mode) {
      case InputMode.GENERATE_MATRIX:
        modeReturn = await generateMatrixMode()
        break
      default:
        throw new Error(`Invalid input mode: ${mode}`)
    }

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
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
