import * as core from '@actions/core'
import * as fs from 'fs'
import { Config } from './config.js'
import { parse as parseToml } from 'smol-toml'
import { parse as parseYaml } from 'yaml'

export enum InputMode {
  GENERATE_MATRIX = 'generate-matrix',
  BUILD = 'build',
  COMBINE_MANIFEST = 'combine-manifest',
  PUSH = 'push'
}

export enum InputConfigFormat {
  TOML = 'toml',
  JSON = 'json',
  YAML = 'yaml'
}

export function getInputMode(): InputMode {
  const mode = core.getInput('mode')
  if (!Object.values(InputMode).includes(mode as InputMode)) {
    throw new Error(`Invalid input mode: ${mode}`)
  }
  return mode as InputMode
}

export function getRawConfig(): Config {
  core.info('Getting raw config...')

  let config = core.getInput('config')
  const configFilePath = core.getInput('config-file')
  const configFormat = core.getInput('config-format')

  core.debug(`Config format: ${configFormat}`)
  core.debug(`Config file: ${configFilePath}`)
  core.debug(`Config: ${config}`)

  // check config file format
  if (
    !Object.values(InputConfigFormat).includes(
      configFormat as InputConfigFormat
    )
  ) {
    throw new Error(`Invalid input config format: ${configFormat}`)
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
  switch (configFormat) {
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
      throw new Error(`Unsupported config format: ${configFormat}`)
  }
}
