import * as core from '@actions/core'
import * as fs from 'fs'
import { Config } from './config.js'
import { parse as parseToml } from 'smol-toml'
import { parse as parseYaml } from 'yaml'
import { JobInclude } from './matrix.js'

export enum InputConfigFormat {
  TOML = 'toml',
  JSON = 'json',
  YAML = 'yaml'
}

export function getRawConfig(): Config {
  core.info('Getting raw config...')

  let config = core.getInput('config')
  const configFilePath = core.getInput('config-file')
  const configFormat = core.getInput('config-format')
  const configFileFormat = core.getInput('config-file-format')

  core.debug(`Config format: ${configFormat}`)
  core.debug(`Config file format: ${configFileFormat}`)
  core.debug(`Config file: ${configFilePath}`)
  core.debug(`Config: ${config}`)

  if (configFormat !== 'rawConfig') {
    throw new Error(
      `Invalid input config format for generating matrix: ${configFormat}`
    )
  }

  // check config file format
  if (
    !Object.values(InputConfigFormat).includes(
      configFileFormat as InputConfigFormat
    )
  ) {
    throw new Error(`Invalid input config file format: ${configFileFormat}`)
  }

  if (!config && configFilePath) {
    // check if config file exists
    if (!fs.existsSync(configFilePath)) {
      throw new Error(`Config file does not exist: ${configFilePath}`)
    }
    core.debug(`Config file exists: ${configFilePath}`)

    // read config file
    core.info(`Reading config file: ${configFilePath}`)
    config = fs.readFileSync(configFilePath, 'utf8')
  }

  // based on config format, parse it
  switch (configFileFormat) {
    case InputConfigFormat.TOML:
      core.debug('Parsing TOML config')
      return parseToml(config) as unknown as Config
    case InputConfigFormat.JSON:
      core.debug('Parsing JSON config')
      return JSON.parse(config) as unknown as Config
    case InputConfigFormat.YAML:
      core.debug('Parsing YAML config')
      return parseYaml(config) as unknown as Config
    default:
      throw new Error(`Unsupported config file format: ${configFileFormat}`)
  }
}

export function getJobIncludeConfig(): JobInclude {
  core.info('Getting job include...')

  let config = core.getInput('config')
  const configFilePath = core.getInput('config-file')
  const configFormat = core.getInput('config-format')
  const configFileFormat = core.getInput('config-file-format')

  core.debug(`Config format: ${configFormat}`)
  core.debug(`Config file format: ${configFileFormat}`)
  core.debug(`Config file: ${configFilePath}`)
  core.debug(`Config: ${config}`)

  if (configFormat !== 'jobInclude') {
    throw new Error(
      `Invalid input config format for job include: ${configFormat}`
    )
  }

  // check config file format
  if (
    !Object.values(InputConfigFormat).includes(
      configFileFormat as InputConfigFormat
    )
  ) {
    throw new Error(`Invalid input config file format: ${configFileFormat}`)
  }

  if (!config && configFilePath) {
    // check if config file exists
    if (!fs.existsSync(configFilePath)) {
      throw new Error(`Config file does not exist: ${configFilePath}`)
    }
    core.debug(`Config file exists: ${configFilePath}`)

    // read config file
    core.info(`Reading config file: ${configFilePath}`)
    config = fs.readFileSync(configFilePath, 'utf8')
  }

  // based on config format, parse it
  switch (configFileFormat) {
    case InputConfigFormat.TOML:
      core.debug('Parsing TOML config')
      return parseToml(config) as unknown as JobInclude
    case InputConfigFormat.JSON:
      core.debug('Parsing JSON config')
      return JSON.parse(config) as unknown as JobInclude
    case InputConfigFormat.YAML:
      core.debug('Parsing YAML config')
      return parseYaml(config) as unknown as JobInclude
    default:
      throw new Error(`Unsupported config file format: ${configFileFormat}`)
  }
}
