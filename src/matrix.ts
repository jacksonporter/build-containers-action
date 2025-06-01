import * as core from '@actions/core'
import {
  BuildArgConfig,
  CIConfig,
  FinalizedContainerConfig,
  FinalizedLinuxPlatformConfig,
  FinalizedPlatformConfig
} from './config.js'

export interface LinuxJobInclude {
  job: string
  containerfilePath: string
  contextPath: string
  platform_slug: string
  arch: string | null
  buildArgs: {
    [key: string]: BuildArgConfig
  }
  ci: CIConfig
}

export interface LinuxMatrix {
  job: Array<string>
  include: Array<LinuxJobInclude>
}

export function buildLinuxMatrixFromFinalizedContainerConfig(
  config: FinalizedContainerConfig
): LinuxMatrix {
  const matrix: LinuxMatrix = { job: [], include: [] as LinuxJobInclude[] }

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
        job: finalizedJobKey
      } as LinuxJobInclude)
    }
  }

  return matrix
}

export interface WindowsJobInclude {
  job: string
  containerfilePath: string
  contextPath: string
  arch: string | null
  buildArgs: {
    [key: string]: BuildArgConfig
  }
  ci: CIConfig
}

export interface WindowsMatrix {
  job: Array<string>
  include: Array<WindowsJobInclude>
}

export function buildWindowsMatrixFromFinalizedContainerConfig(
  config: FinalizedContainerConfig
): WindowsMatrix {
  const matrix: WindowsMatrix = { job: [], include: [] as WindowsJobInclude[] }

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
        job: finalizedJobKey
      } as WindowsJobInclude)
    }
  }

  return matrix
}
