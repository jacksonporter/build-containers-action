import * as core from '@actions/core'
import { RepositoryConfig } from '../config.js'
import { StandardRepository } from './types/standard.js'

export async function getRepositoryClass(
  type: string,
  repositoryConfig: RepositoryConfig,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  templateValues: { [key: string]: any }
): Promise<StandardRepository> {
  // check if there is a custom repository class for this type named <type>.js in the repositories/types folder
  try {
    core.debug(`Attempting to import repository class for type: ${type}`)
    const repositoryClass = await import(`./types/${type}.js`)
    core.debug(`Repository class: ${repositoryClass.default}`)
    return new repositoryClass.default(repositoryConfig, templateValues)
  } catch (error) {
    throw new Error(
      `Unknown or could not import repository class for type: ${type} - ${error}`
    )
  }
}
