import * as core from '@actions/core'
import { FinalizedContainerConfig } from './config.js'
import { FinalizedMatrixConfig } from './matrix.js'
import { buildMode, BuildOutput } from './modes/build.js'
import { generateMatrixMode } from './modes/generateMatrix.js'
import { combineBuildOutputsMode } from './modes/combineBuildOutputs.js'
import { createManifestMode } from './modes/create-manifest.js'

export enum InputMode {
  GENERATE_MATRIX = 'generate-matrix',
  BUILD = 'build',
  CREATE_MANIFEST = 'create-manifest',
  PUSH = 'push',
  COMBINE_BUILD_OUTPUTS = 'combine-build-outputs'
}

export async function startMode(): Promise<ModeReturn> {
  const mode = core.getInput('mode') as InputMode

  switch (mode) {
    case InputMode.GENERATE_MATRIX:
      return generateMatrixMode()
    case InputMode.BUILD:
      return buildMode()
    case InputMode.COMBINE_BUILD_OUTPUTS:
      return combineBuildOutputsMode()
    case InputMode.CREATE_MANIFEST:
      return createManifestMode()
    default:
      throw new Error(`Unknown mode: ${mode}`)
  }
}

export interface ModeReturn {
  finalizedContainerConfig?: FinalizedContainerConfig
  jobMatrix?: FinalizedMatrixConfig | null
  buildOutput?: BuildOutput
}
