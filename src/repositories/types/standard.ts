import Handlebars from 'handlebars'
import * as core from '@actions/core'
import { execSync } from 'child_process'
import { RepositoryConfig } from '../../config.js'

export abstract class StandardRepository {
  private repositoryConfig: RepositoryConfig
  public readonly type: string = 'standard'

  constructor(
    repositoryConfig: RepositoryConfig,
    templateValues: { [key: string]: string }
  ) {
    const configTemplateFunc = Handlebars.compile(
      JSON.stringify(repositoryConfig)
    )
    const resolvedConfig = configTemplateFunc({
      env: process.env,
      ...templateValues
    })

    this.repositoryConfig = JSON.parse(resolvedConfig)
  }

  protected getRepositoryConfig(): RepositoryConfig {
    return this.repositoryConfig
  }

  public async login(): Promise<void> {
    const repositoryConfig = this.getRepositoryConfig()

    if (repositoryConfig.password) {
      core.setSecret(repositoryConfig.password)
    }

    core.info(`Logging in to ${repositoryConfig.registry}`)
    try {
      execSync(
        `docker login ${repositoryConfig.registry} -u ${repositoryConfig.username} -p ${repositoryConfig.password}`,
        {
          stdio: 'inherit'
        }
      )
    } catch (error) {
      core.error(`Failed to login to ${repositoryConfig.registry}`)
      throw error
    }
  }
}

export default StandardRepository
