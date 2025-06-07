import * as core from '@actions/core'
import {
  FinalizedContainerConfig,
  FinalizedLinuxPlatformConfig,
  FinalizedPlatformConfig
} from './config.js'

export interface JobInclude extends FinalizedPlatformConfig {
  job: string
  containerName: string
}

export interface LinuxJobInclude extends JobInclude {
  platform_slug: string
}

export function buildLinuxMatrixFromFinalizedContainerConfig(
  config: FinalizedContainerConfig
): FinalizedMatrixConfig | null {
  const matrix: FinalizedMatrixConfig = {
    job: [],
    include: [] as Array<JobInclude>
  }

  for (const [i, j] of Object.entries(config)) {
    core.debug(`Building matrix for container: ${i}`)
    for (const [k, l] of Object.entries(j.linuxPlatforms)) {
      const finalizedJobKey = `linux-${i}-${k}`

      core.debug(
        `Building matrix for linux platform: ${k} for container: ${i} [Job Key: ${finalizedJobKey}]`
      )

      // add the job key to the matrix
      matrix.job.push(finalizedJobKey)

      // create the include object
      matrix.include.push({
        ...(l as FinalizedLinuxPlatformConfig),
        job: finalizedJobKey,
        containerName: i
      } as JobInclude)
    }
  }

  // Return undefined if no jobs were added
  return matrix.job.length > 0 ? matrix : null
}

export interface FinalizedMatrixConfig {
  job: Array<string>
  include: Array<JobInclude>
}

export function buildWindowsMatrixFromFinalizedContainerConfig(
  config: FinalizedContainerConfig
): FinalizedMatrixConfig | null {
  const matrix: FinalizedMatrixConfig = {
    job: [],
    include: [] as Array<JobInclude>
  }

  for (const [i, j] of Object.entries(config)) {
    core.debug(`Building matrix for container: ${i}`)
    for (const [k, l] of Object.entries(j.windowsPlatforms)) {
      const finalizedJobKey = `windows-${i}-${k}`

      core.debug(
        `Building matrix for windows platform: ${k} for container: ${i} [Job Key: ${finalizedJobKey}]`
      )

      // add the job key to the matrix
      matrix.job.push(finalizedJobKey)

      // create the include object
      matrix.include.push({
        ...(l as FinalizedPlatformConfig),
        job: finalizedJobKey,
        containerName: i
      } as JobInclude)
    }
  }

  // Return undefined if no jobs were added
  return matrix.job.length > 0 ? matrix : null
}
