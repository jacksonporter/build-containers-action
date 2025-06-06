import * as core from '@actions/core'
import { getRawConfig } from '../input.js'
import { getConfigFromJSON } from '../config.js'
import { ModeReturn } from '../mode.js'
import {
  buildLinuxMatrixFromFinalizedContainerConfig,
  buildWindowsMatrixFromFinalizedContainerConfig
} from '../matrix.js'

export async function generateMatrixMode(): Promise<ModeReturn> {
  core.info('Getting config, validating, parsing and generating values...')

  const config = getRawConfig()
  core.debug(`Raw config: ${JSON.stringify(config, null, 2)}`)

  const finalizedContainerConfig = await getConfigFromJSON(config)

  core.debug(
    `Finalized container config: ${JSON.stringify(finalizedContainerConfig, null, 2)}`
  )

  const linuxMatrix = buildLinuxMatrixFromFinalizedContainerConfig(
    finalizedContainerConfig
  )
  const windowsMatrix = buildWindowsMatrixFromFinalizedContainerConfig(
    finalizedContainerConfig
  )

  // Check if matrices have any jobs
  const hasLinuxJobs = linuxMatrix && Object.keys(linuxMatrix).length > 0
  const hasWindowsJobs = windowsMatrix && Object.keys(windowsMatrix).length > 0

  return {
    finalizedContainerConfig,
    linuxMatrix: hasLinuxJobs ? linuxMatrix : undefined,
    windowsMatrix: hasWindowsJobs ? windowsMatrix : undefined
  }
}
