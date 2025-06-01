import { getJobIncludeConfig } from '../input.js'
import { ModeReturn } from '../mode.js'

export interface BuildOutput {
  temp: string
}

export async function buildMode(): Promise<ModeReturn> {
  const jobIncludeConfig = getJobIncludeConfig()

  return {
    buildOutput: {
      temp: JSON.stringify(jobIncludeConfig, null, 2)
    }
  } as ModeReturn
}
