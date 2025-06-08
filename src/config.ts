import * as core from '@actions/core'

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
  target?: string | null
  selectedBuildArgs?: string[]
  buildArgs?: {
    [key: string]: BuildArgConfig
  }
  platformTagTemplates?: string[]
  manifestTagTemplates?: string[]
  selectedRepositories?: string[]
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

  // check that target is a string, and if its empty, set to null
  if (configDefaults.target && typeof configDefaults.target !== 'string') {
    throw new Error('configDefaults.target must be a string')
  } else if (!configDefaults.target) {
    if (parentConfigDefaults?.target) {
      configDefaults.target = parentConfigDefaults.target
    } else {
      configDefaults.target = null
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

  // check that platformTagTemplates is an array of strings, and if not set, set to ["{{CONTAINER_NAME}}-{{ARCH}}-{{GITHUB_RUN_ID}}-{{GITHUB_RUN_NUMBER}}"]
  if (
    configDefaults.platformTagTemplates &&
    !Array.isArray(configDefaults.platformTagTemplates)
  ) {
    throw new Error(
      'configDefaults.platformTagTemplates must be an array of strings'
    )
  } else if (!configDefaults.platformTagTemplates) {
    if (parentConfigDefaults?.platformTagTemplates) {
      configDefaults.platformTagTemplates =
        parentConfigDefaults.platformTagTemplates
    } else {
      configDefaults.platformTagTemplates = [
        '{{CONTAINER_NAME}}-{{ARCH}}-{{GITHUB_RUN_ID}}-{{GITHUB_RUN_NUMBER}}'
      ]
    }
  }

  // check that manifestTagTemplates is an array of strings, and if not set, set to ["{{CONTAINER_NAME}}-{{GITHUB_RUN_ID}}-{{GITHUB_RUN_NUMBER}}"]
  if (
    configDefaults.manifestTagTemplates &&
    !Array.isArray(configDefaults.manifestTagTemplates)
  ) {
    throw new Error(
      'configDefaults.manifestTagTemplates must be an array of strings'
    )
  } else if (!configDefaults.manifestTagTemplates) {
    if (parentConfigDefaults?.manifestTagTemplates) {
      configDefaults.manifestTagTemplates =
        parentConfigDefaults.manifestTagTemplates
    } else {
      configDefaults.manifestTagTemplates = [
        '{{CONTAINER_NAME}}-{{GITHUB_RUN_ID}}-{{GITHUB_RUN_NUMBER}}'
      ]
    }
  }

  // check that selectedRepositories is an array of strings, and if not set, set to []
  if (
    configDefaults.selectedRepositories &&
    !Array.isArray(configDefaults.selectedRepositories)
  ) {
    throw new Error(
      'configDefaults.selectedRepositories must be an array of strings'
    )
  } else if (!configDefaults.selectedRepositories) {
    if (parentConfigDefaults?.selectedRepositories) {
      configDefaults.selectedRepositories =
        parentConfigDefaults.selectedRepositories
    } else {
      configDefaults.selectedRepositories = []
    }
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

export interface RepositoryConfig {
  type: string
  registry: string
  repository: string
  username?: string | null
  password?: string | null
}

export function validateRepositoryConfig(repositoryConfig: RepositoryConfig) {
  // check type of repositoryConfig is an object, otherwise throw an error
  if (typeof repositoryConfig !== 'object') {
    throw new Error('repositoryConfig must be an object')
  }

  if (!repositoryConfig.type) {
    throw new Error('repositoryConfig.type is required')
  }
  if (!repositoryConfig.registry) {
    throw new Error('repositoryConfig.registry is required')
  }
  if (!repositoryConfig.repository) {
    throw new Error('repositoryConfig.repository is required')
  }

  // check that username is a string, and if its empty, set to null
  if (!repositoryConfig.username) {
    core.warning('repositoryConfig.username is not set, setting to null')
    repositoryConfig.username = null
  }

  // check that password is a string, and if its empty, set to null
  if (!repositoryConfig.password) {
    core.warning('repositoryConfig.password is not set, setting to null')
    repositoryConfig.password = null
  }

  return repositoryConfig
}

export interface FinalizedPlatformConfig {
  containerfilePath?: string
  contextPath?: string
  target?: string | null
  ci?: CIConfig
  platform_slug?: string | null
  arch?: string | null
  buildArgs?: {
    [key: string]: BuildArgConfig
  }
  platformTagTemplates?: string[]
  repositories?: {
    [key: string]: RepositoryConfig
  }
}

export interface PlatformConfig extends FinalizedPlatformConfig {
  selectedBuildArgs?: string[]
  selectedRepositories?: string[]
}

export interface LinuxPlatformConfig extends PlatformConfig {
  platform_slug?: string | null
}

export interface FinalizedLinuxPlatformConfig extends FinalizedPlatformConfig {
  platform_slug?: string | null
}

export function validatePlatformConfig(
  platformConfig: PlatformConfig,
  containerDefaults: ConfigDefaults,
  repositories: {
    [key: string]: RepositoryConfig
  }
): FinalizedPlatformConfig {
  core.debug('Validating platform config')

  // check type of linuxPlatformConfig is an object, otherwise throw an error
  if (typeof platformConfig !== 'object') {
    throw new Error('platformConfig must be an object')
  }

  // Remove manifestTagTemplates if it exists at platform level
  if ('manifestTagTemplates' in platformConfig) {
    core.warning(
      'manifestTagTemplates should not be defined at platform level - it will be ignored'
    )
    delete platformConfig.manifestTagTemplates
  }

  let platformConfigDefaults: ConfigDefaults = {
    containerfilePath: platformConfig?.containerfilePath,
    contextPath: platformConfig.contextPath,
    target: platformConfig.target,
    selectedBuildArgs: platformConfig.selectedBuildArgs,
    ci: platformConfig.ci,
    buildArgs: platformConfig.buildArgs,
    platformTagTemplates: platformConfig.platformTagTemplates,
    selectedRepositories: platformConfig.selectedRepositories
  }

  platformConfigDefaults = validateConfigDefaults(
    platformConfigDefaults,
    containerDefaults
  )

  platformConfig.containerfilePath = platformConfigDefaults.containerfilePath
  platformConfig.contextPath = platformConfigDefaults.contextPath
  platformConfig.target = platformConfigDefaults.target
  platformConfig.ci = platformConfigDefaults.ci
  platformConfig.selectedBuildArgs = platformConfigDefaults.selectedBuildArgs
  platformConfig.buildArgs = platformConfigDefaults.buildArgs
  platformConfig.platformTagTemplates =
    platformConfigDefaults.platformTagTemplates
  platformConfig.repositories = {}

  for (const repository of platformConfigDefaults.selectedRepositories || []) {
    if (!repositories[repository]) {
      throw new Error(`Repository ${repository} not found`)
    }
    platformConfig.repositories[repository] = repositories[repository]
  }

  return platformConfig
}

export function validateLinuxPlatformConfig(
  linuxPlatformConfig: LinuxPlatformConfig,
  containerDefaults: ConfigDefaults,
  repositories: {
    [key: string]: RepositoryConfig
  }
): FinalizedLinuxPlatformConfig {
  // validate base platform config
  linuxPlatformConfig = validatePlatformConfig(
    linuxPlatformConfig,
    containerDefaults,
    repositories
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
    ...Object.fromEntries(
      Object.entries(linuxPlatformConfig).filter(
        ([key]) =>
          !['platform_slug', 'buildArgs', 'selectedBuildArgs'].includes(key)
      )
    ),
    platform_slug: linuxPlatformConfig.platform_slug,
    buildArgs: buildArgs
  } as FinalizedLinuxPlatformConfig
}

export function validateWindowsPlatformConfig(
  windowsPlatformConfig: PlatformConfig,
  containerDefaults: ConfigDefaults,
  repositories: {
    [key: string]: RepositoryConfig
  }
): FinalizedPlatformConfig {
  // validate base platform config
  windowsPlatformConfig = validatePlatformConfig(
    windowsPlatformConfig,
    containerDefaults,
    repositories
  )

  // filter build args by windowsPlatformConfig.selectedBuildArgs
  const buildArgs = Object.fromEntries(
    Object.entries(windowsPlatformConfig.buildArgs || {}).filter(([key]) =>
      windowsPlatformConfig.selectedBuildArgs?.includes(key)
    )
  )

  return {
    ...Object.fromEntries(
      Object.entries(windowsPlatformConfig).filter(
        ([key]) => !['buildArgs', 'selectedBuildArgs'].includes(key)
      )
    ),
    buildArgs: buildArgs
  } as FinalizedPlatformConfig
}

export interface FinalizedContainerConfig {
  manifestTagTemplates?: string[]
  linuxPlatforms?: {
    [key: string]: FinalizedLinuxPlatformConfig
  }
  windowsPlatforms?: {
    [key: string]: FinalizedPlatformConfig
  }
}

export interface ContainerConfig extends FinalizedContainerConfig {
  default: ConfigDefaults
}

export function validateContainerConfig(
  containerConfig: ContainerConfig,
  containerDefaults: ConfigDefaults,
  repositories: {
    [key: string]: RepositoryConfig
  }
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

  containerConfig.default.contextPath =
    containerConfig.default?.contextPath || containerDefaults?.contextPath

  containerConfig.default.target =
    containerConfig.default?.target || containerDefaults?.target || null

  containerConfig.default.selectedBuildArgs =
    (containerConfig.default.selectedBuildArgs &&
    containerConfig.default.selectedBuildArgs.length > 0
      ? containerConfig.default.selectedBuildArgs
      : containerDefaults?.selectedBuildArgs) || []

  containerConfig.default.buildArgs = {
    ...(containerConfig.default.buildArgs || {}),
    ...(containerDefaults.buildArgs || {})
  }

  containerConfig.default.platformTagTemplates =
    containerConfig.default.platformTagTemplates ||
    containerDefaults?.platformTagTemplates ||
    []

  if (containerConfig.default.platformTagTemplates.length === 0) {
    core.warning('containerConfig.default.platformTagTemplates is empty')
  }

  containerConfig.manifestTagTemplates =
    containerConfig.default.manifestTagTemplates ||
    containerDefaults?.manifestTagTemplates ||
    []

  // delete manifestTagTemplates from default config, as they are only used at the container level
  delete containerConfig.default.manifestTagTemplates

  if (containerConfig.manifestTagTemplates.length === 0) {
    core.warning('containerConfig.manifestTagTemplates is empty')
  }

  if (
    containerConfig.manifestTagTemplates.length === 0 &&
    containerConfig.default.platformTagTemplates.length === 0
  ) {
    throw new Error(
      'containerConfig.default.manifestTagTemplates and containerConfig.default.platformTagTemplates cannot both be empty'
    )
  }

  containerConfig.default.selectedRepositories =
    containerConfig.default.selectedRepositories ||
    containerDefaults?.selectedRepositories ||
    []

  core.debug('Validating linux platforms')

  // Initialize platforms if they don't exist
  if (!containerConfig.linuxPlatforms) {
    containerConfig.linuxPlatforms = {}
  }
  if (!containerConfig.windowsPlatforms) {
    containerConfig.windowsPlatforms = {}
  }

  // Validate linux platforms
  for (const [key, value] of Object.entries(containerConfig.linuxPlatforms)) {
    containerConfig.linuxPlatforms[key] = validateLinuxPlatformConfig(
      value,
      containerConfig.default,
      repositories
    )
  }

  core.debug('Validating windows platforms')

  // Validate windows platforms
  for (const [key, value] of Object.entries(containerConfig.windowsPlatforms)) {
    containerConfig.windowsPlatforms[key] = validateWindowsPlatformConfig(
      value,
      containerConfig.default,
      repositories
    )
  }

  // Ensure at least one platform exists
  if (
    Object.keys(containerConfig.linuxPlatforms).length === 0 &&
    Object.keys(containerConfig.windowsPlatforms).length === 0
  ) {
    throw new Error(
      'At least one platform (linux or windows) must be specified'
    )
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
  repositories?: {
    [key: string]: RepositoryConfig
  }
}

export function validateConfig(config: Config): FinalizedContainerConfig {
  // check type of config is an object, otherwise throw an error
  if (typeof config !== 'object') {
    throw new Error('config must be an object')
  }

  // check that default is a ConfigDefaults, and if its empty, set to configDefaults
  config.default = validateConfigDefaults(config.default || {}, {})

  if (config.repositories) {
    for (const [key, value] of Object.entries(config.repositories)) {
      config.repositories[key] = validateRepositoryConfig(value)
    }
  } else {
    config.repositories = {}
  }

  const finalizedContainers: { [key: string]: FinalizedContainerConfig } = {}

  // check that containers is an object, and if its empty, set to configDefaults.containers
  if (config.containers) {
    for (const [key, value] of Object.entries(config.containers)) {
      finalizedContainers[key] = validateContainerConfig(
        value,
        config.default,
        config.repositories
      )
    }
  }

  return finalizedContainers
}

export async function getConfigFromJSON(
  config: Config
): Promise<FinalizedContainerConfig> {
  const validatedConfig = validateConfig(config)

  return validatedConfig
}
