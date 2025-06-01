import { FinalizedContainerConfig } from './config.js'
import { LinuxMatrix, WindowsMatrix } from './matrix.js'

export interface ModeReturn {
  finalizedContainerConfig?: FinalizedContainerConfig
  linuxMatrix?: LinuxMatrix
  windowsMatrix?: WindowsMatrix
}
