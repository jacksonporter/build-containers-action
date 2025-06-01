import * as core from '@actions/core'
import Handlebars from 'handlebars'
import { getGitProjectRoot } from './git.js'

export interface CIConfig {
  [key: string]: string | string[] | boolean | number | null
}

export function validateCIConfig(
  ciConfig: CIConfig,
  ciDefaults: CIConfig = {}
) {
  // check type of ciConfig is an object, otherwise throw an error
  if (typeof ciConfig !== 'object') {
    throw new Error('ciConfig must be an object')
  }

  if (typeof ciDefaults !== 'object') {
    throw new Error('ciDefaults must be an object')
  }

  for (const ciConfigObject of [ciConfig, ciDefaults]) {
    // check if ciConfigObject has any keys, otherwise throw an error
    if (Object.keys(ciConfigObject).length > 0) {
      // for every key, check if value is a string, string array, or boolean
      for (const key in ciConfigObject) {
        const value = ciConfigObject[key]
        if (
          typeof value !== 'string' &&
          !Array.isArray(value) &&
          typeof value !== 'boolean' &&
          typeof value !== 'number' &&
          value !== null
        ) {
          throw new Error(
            `ciConfigObject[${key}] must be a string, string array, number, boolean or null`
          )
        }
        // If it's an array, verify all elements are strings
        if (
          Array.isArray(value) &&
          !value.every((item) => typeof item === 'string')
        ) {
          throw new Error(`ciConfigObject[${key}] must be an array of strings`)
        }
      }
    }
  }

  return {
    ...(ciDefaults || {}),
    ...(ciConfig || {})
  }
}

export interface ConfigDefaults {
  ci?: CIConfig
  containerfilePath?: string
  contextPath?: string
  selectedBuildArgs?: string[]
  buildArgs?: {
    [key: string]: BuildArgConfig
  }
}

export function validateConfigDefaults(
  configDefaults: ConfigDefaults,
  parentConfigDefaults: ConfigDefaults
) {
  // check type of configDefaults is an object, otherwise throw an error
  if (typeof configDefaults !== 'object') {
    throw new Error('configDefaults must be an object')
  }

  // check ci as CIConfig
  configDefaults.ci = validateCIConfig(
    configDefaults.ci || {},
    parentConfigDefaults?.ci || {}
  )

  // check containerfilePath as string, and if its empty, set to ${GIT_PROJECT_ROOT}/Containerfile
  if (
    configDefaults.containerfilePath &&
    typeof configDefaults.containerfilePath !== 'string'
  ) {
    throw new Error('configDefaults.containerfilePath must be a string')
  } else if (!configDefaults?.containerfilePath) {
    if (parentConfigDefaults?.containerfilePath) {
      configDefaults.containerfilePath = parentConfigDefaults.containerfilePath
    } else {
      configDefaults.containerfilePath = '${GIT_PROJECT_ROOT}/Containerfile'
    }
  }

  // check contextPath as string, and if its empty, set to ${GIT_PROJECT_ROOT}
  if (
    configDefaults.contextPath &&
    typeof configDefaults.contextPath !== 'string'
  ) {
    throw new Error('configDefaults.contextPath must be a string')
  } else if (!configDefaults.contextPath) {
    if (parentConfigDefaults?.contextPath) {
      configDefaults.contextPath = parentConfigDefaults.contextPath
    } else {
      configDefaults.contextPath = '${GIT_PROJECT_ROOT}'
    }
  }

  const selectedBuildArgs =
    configDefaults.selectedBuildArgs &&
    configDefaults.selectedBuildArgs.length > 0
      ? configDefaults.selectedBuildArgs
      : parentConfigDefaults?.selectedBuildArgs &&
          parentConfigDefaults.selectedBuildArgs.length > 0
        ? parentConfigDefaults.selectedBuildArgs
        : []

  const buildArgs: { [key: string]: BuildArgConfig } = {}

  // loop through all possible buildArgs keys, and validate each one
  for (const key of [
    ...Object.keys(configDefaults?.buildArgs || {}),
    ...Object.keys(parentConfigDefaults?.buildArgs || {})
  ]) {
    buildArgs[key] = validateBuildArgConfig(
      configDefaults?.buildArgs?.[key] || {},
      parentConfigDefaults?.buildArgs?.[key] || {}
    )
  }

  return {
    ...configDefaults,
    selectedBuildArgs: selectedBuildArgs,
    buildArgs: buildArgs
  }
}

export enum BuildArgPrecedence {
  DEFAULT = 'default',
  CMD = 'cmd',
  ENV_VAR = 'env_var'
}

export interface BuildArgConfig {
  default?: string | null
  cmd?: string | null
  env_var?: string | null
  orderPrecedence?: BuildArgPrecedence[]
}

export function validateBuildArgConfig(
  buildArgConfig: BuildArgConfig,
  buildArgsDefault: BuildArgConfig
) {
  // check type of buildArgConfig is an object, otherwise throw an error
  if (typeof buildArgConfig !== 'object') {
    throw new Error('buildArgConfig must be an object')
  }

  buildArgConfig.default =
    buildArgConfig.default || buildArgsDefault.default || null
  buildArgConfig.cmd = buildArgConfig.cmd || buildArgsDefault.cmd || null
  buildArgConfig.env_var =
    buildArgConfig.env_var || buildArgsDefault.env_var || null

  // check that at least one value from BuildArgPrecedence enum is set
  if (
    !Object.values(BuildArgPrecedence).some((value) => buildArgConfig[value])
  ) {
    throw new Error(
      `buildArgConfig must have at least one of ${Object.values(BuildArgPrecedence).join(', ')} set. Config: ${JSON.stringify(buildArgConfig)}`
    )
  }

  // check that orderPrecedence is an array of strings, and if not set, cmd, env_var, default
  if (
    buildArgConfig.orderPrecedence &&
    !Array.isArray(buildArgConfig.orderPrecedence)
  ) {
    throw new Error(
      'buildArgConfig.orderPrecedence must be an array of strings'
    )
  } else if (!buildArgConfig.orderPrecedence) {
    buildArgConfig.orderPrecedence = [
      BuildArgPrecedence.CMD,
      BuildArgPrecedence.ENV_VAR,
      BuildArgPrecedence.DEFAULT
    ]
  }

  // remove all values from orderPrecedence that ARE NOT null (from the Enum BuildArgPrecedence)
  buildArgConfig.orderPrecedence = buildArgConfig.orderPrecedence.filter(
    (value) => Object.values(BuildArgPrecedence).includes(value)
  )

  // validate each value in orderPrecedence is a valid BuildArgPrecedence enum value
  buildArgConfig.orderPrecedence = buildArgConfig.orderPrecedence.filter(
    (value) => {
      if (!Object.values(BuildArgPrecedence).includes(value)) {
        throw new Error(
          `Invalid orderPrecedence value: ${value}. Must be one of: ${Object.values(BuildArgPrecedence).join(', ')}`
        )
      }
      return value !== null
    }
  )

  return buildArgConfig
}

export interface LinuxPlatformConfig {
  containerfilePath?: string
  contextPath?: string
  ci?: CIConfig
  platform_slug?: string | null
  arch?: string | null
  selectedBuildArgs?: string[]
  buildArgs?: {
    [key: string]: BuildArgConfig
  }
}

export interface FinalizedLinuxPlatformConfig {
  containerfilePath?: string
  contextPath?: string
  ci?: CIConfig
  platform_slug?: string | null
  arch?: string | null
  buildArgs?: {
    [key: string]: BuildArgConfig
  }
}

export interface WindowsPlatformConfig {
  containerfilePath?: string
  contextPath?: string
  ci?: CIConfig
  selectedBuildArgs?: string[]
  buildArgs?: {
    [key: string]: BuildArgConfig
  }
  arch?: string | null
}

export interface FinalizedWindowsPlatformConfig {
  containerfilePath?: string
  contextPath?: string
  arch?: string | null
  ci?: CIConfig
  buildArgs?: {
    [key: string]: BuildArgConfig
  }
}

export function validatePlatformConfig(
  platformConfig: LinuxPlatformConfig | WindowsPlatformConfig,
  containerDefaults: ConfigDefaults
): FinalizedLinuxPlatformConfig | FinalizedWindowsPlatformConfig {
  core.debug('Validating platform config')

  // check type of linuxPlatformConfig is an object, otherwise throw an error
  if (typeof platformConfig !== 'object') {
    throw new Error('platformConfig must be an object')
  }

  let platformConfigDefaults: ConfigDefaults = {
    containerfilePath: platformConfig?.containerfilePath,
    contextPath: platformConfig.contextPath,
    selectedBuildArgs: platformConfig.selectedBuildArgs,
    ci: platformConfig.ci,
    buildArgs: platformConfig.buildArgs
  }

  platformConfigDefaults = validateConfigDefaults(
    platformConfigDefaults,
    containerDefaults
  )

  platformConfig.containerfilePath = platformConfigDefaults.containerfilePath
  platformConfig.contextPath = platformConfigDefaults.contextPath
  platformConfig.ci = platformConfigDefaults.ci
  platformConfig.selectedBuildArgs = platformConfigDefaults.selectedBuildArgs
  platformConfig.buildArgs = platformConfigDefaults.buildArgs

  return platformConfig
}

export function validateLinuxPlatformConfig(
  linuxPlatformConfig: LinuxPlatformConfig,
  containerDefaults: ConfigDefaults
): FinalizedLinuxPlatformConfig {
  // validate base platform config
  linuxPlatformConfig = validatePlatformConfig(
    linuxPlatformConfig,
    containerDefaults
  )

  // filter build args by linuxPlatformConfig.selectedBuildArgs
  const buildArgs = Object.fromEntries(
    Object.entries(linuxPlatformConfig.buildArgs || {}).filter(([key]) =>
      linuxPlatformConfig.selectedBuildArgs?.includes(key)
    )
  )

  // check that arch is a string, and if its empty, set to null
  if (
    linuxPlatformConfig.arch &&
    typeof linuxPlatformConfig.arch !== 'string'
  ) {
    throw new Error('linuxPlatformConfig.arch must be a string')
  } else if (!linuxPlatformConfig.arch) {
    linuxPlatformConfig.arch = linuxPlatformConfig.platform_slug
      ? linuxPlatformConfig.platform_slug.replace('linux/', '')
      : null
  }

  return {
    containerfilePath: linuxPlatformConfig.containerfilePath,
    contextPath: linuxPlatformConfig.contextPath,
    platform_slug: linuxPlatformConfig.platform_slug,
    ci: linuxPlatformConfig.ci,
    arch: linuxPlatformConfig.arch,
    buildArgs: buildArgs
  } as FinalizedLinuxPlatformConfig
}

export function validateWindowsPlatformConfig(
  windowsPlatformConfig: WindowsPlatformConfig,
  containerDefaults: ConfigDefaults
): FinalizedWindowsPlatformConfig {
  // validate base platform config
  windowsPlatformConfig = validatePlatformConfig(
    windowsPlatformConfig,
    containerDefaults
  )

  // filter build args by windowsPlatformConfig.selectedBuildArgs
  const buildArgs = Object.fromEntries(
    Object.entries(windowsPlatformConfig.buildArgs || {}).filter(([key]) =>
      windowsPlatformConfig.selectedBuildArgs?.includes(key)
    )
  )

  return {
    containerfilePath: windowsPlatformConfig.containerfilePath,
    contextPath: windowsPlatformConfig.contextPath,
    arch: windowsPlatformConfig.arch,
    ci: windowsPlatformConfig.ci,
    buildArgs: buildArgs
  } as FinalizedWindowsPlatformConfig
}

export interface ContainerConfig {
  default: ConfigDefaults
  linuxPlatforms?: {
    [key: string]: LinuxPlatformConfig
  }
  windowsPlatforms?: {
    [key: string]: WindowsPlatformConfig
  }
}

export interface FinalizedContainerConfig {
  linuxPlatforms?: {
    [key: string]: FinalizedLinuxPlatformConfig
  }
  windowsPlatforms?: {
    [key: string]: WindowsPlatformConfig
  }
}

export function validateContainerConfig(
  containerConfig: ContainerConfig,
  containerDefaults: ConfigDefaults
): FinalizedContainerConfig {
  core.debug('Validating container config')

  // check type of containerConfig is an object, otherwise throw an error
  if (typeof containerConfig !== 'object') {
    throw new Error('containerConfig must be an object')
  }

  if (!containerConfig.default) {
    containerConfig.default = {}
  }

  containerConfig.default.containerfilePath =
    containerConfig.default?.containerfilePath ||
    containerDefaults?.containerfilePath

  core.debug('Made it to containerConfig.default.containerfilePath')
  containerConfig.default.contextPath =
    containerConfig.default?.contextPath || containerDefaults?.contextPath

  containerConfig.default.selectedBuildArgs =
    (containerConfig.default.selectedBuildArgs &&
    containerConfig.default.selectedBuildArgs.length > 0
      ? containerConfig.default.selectedBuildArgs
      : containerDefaults?.selectedBuildArgs) || []

  containerConfig.default.buildArgs = {
    ...(containerConfig.default.buildArgs || {}),
    ...(containerDefaults.buildArgs || {})
  }

  core.debug('Validating linux platforms')

  // check that linuxPlatforms is an object, and if its empty, set to containerDefaults.linuxPlatforms
  if (containerConfig.linuxPlatforms) {
    for (const [key, value] of Object.entries(containerConfig.linuxPlatforms)) {
      containerConfig.linuxPlatforms[key] = validateLinuxPlatformConfig(
        value,
        containerConfig.default
      )
    }
  }

  core.debug('Validating windows platforms')

  // check that windowsPlatforms is an object, and if its empty, set to containerDefaults.windowsPlatforms
  if (containerConfig.windowsPlatforms) {
    for (const [key, value] of Object.entries(
      containerConfig.windowsPlatforms
    )) {
      containerConfig.windowsPlatforms[key] = validateWindowsPlatformConfig(
        value,
        containerConfig.default
      )
    }
  }

  const finalizedContainerConfig: FinalizedContainerConfig = {
    linuxPlatforms: containerConfig.linuxPlatforms,
    windowsPlatforms: containerConfig.windowsPlatforms
  }

  return finalizedContainerConfig
}

export interface Config {
  default: ConfigDefaults
  containers: {
    [key: string]: ContainerConfig
  }
}

export function validateConfig(config: Config): FinalizedContainerConfig {
  // check type of config is an object, otherwise throw an error
  if (typeof config !== 'object') {
    throw new Error('config must be an object')
  }

  // check that default is a ConfigDefaults, and if its empty, set to configDefaults
  config.default = validateConfigDefaults(config.default || {}, {})

  const finalizedContainers: { [key: string]: FinalizedContainerConfig } = {}

  // check that containers is an object, and if its empty, set to configDefaults.containers
  if (config.containers) {
    for (const [key, value] of Object.entries(config.containers)) {
      finalizedContainers[key] = validateContainerConfig(value, config.default)
    }
  }

  return finalizedContainers
}

export async function populateConfig(
  config: FinalizedContainerConfig
): Promise<FinalizedContainerConfig> {
  const jsonConfig = JSON.stringify(config)

  const templateFunction = Handlebars.compile(jsonConfig)

  const gitProjectRoot = await getGitProjectRoot()

  const populatedConfig = templateFunction({
    GIT_PROJECT_ROOT: gitProjectRoot
  })

  return JSON.parse(populatedConfig) as FinalizedContainerConfig
}

export async function getConfigFromJSON(
  config: Config
): Promise<FinalizedContainerConfig> {
  const validatedConfig = validateConfig(config)

  return await populateConfig(validatedConfig)
}
