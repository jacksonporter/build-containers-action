import * as core from '@actions/core'
import { FinalizedContainerConfig } from './config.js'
import { FinalizedMatrixConfig } from './matrix.js'
import { buildMode, BuildOutput } from './modes/build.js'
import { generateMatrixMode } from './modes/generateMatrix.js'

export enum InputMode {
  GENERATE_MATRIX = 'generate-matrix',
  BUILD = 'build',
  COMBINE_MANIFEST = 'combine-manifest',
  PUSH = 'push'
}

export async function startMode(): Promise<ModeReturn> {
  const mode = core.getInput('mode')
  switch (mode) {
    case InputMode.GENERATE_MATRIX:
      return await generateMatrixMode()
    case InputMode.BUILD:
      return await buildMode()
    default:
      throw new Error(`Invalid input mode: ${mode}`)
  }
}

export interface ModeReturn {
  finalizedContainerConfig?: FinalizedContainerConfig
  linuxMatrix?: FinalizedMatrixConfig
  windowsMatrix?: FinalizedMatrixConfig
  buildOutput?: BuildOutput
}
