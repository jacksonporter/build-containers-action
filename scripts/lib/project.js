import { execSync } from 'child_process'
import fs from 'fs'

export function getProjectRoot() {
  try {
    // Check if git is installed
    try {
      execSync('git --version', { stdio: 'ignore' })
    } catch {
      return process.cwd()
    }

    // Check if .git exists and get root
    try {
      const gitRoot = execSync('git rev-parse --show-toplevel', {
        encoding: 'utf8'
      }).trim()
      return gitRoot
    } catch {
      return process.cwd()
    }
  } catch {
    return process.cwd()
  }
}

function installNpmDependencies() {
  if (process.env.SKIP_NPM_INSTALL) {
    console.log('Skipping NPM dependencies installation')
    return
  }
  console.log('Installing NPM dependencies')
  execSync('mise exec -- npm install')
}

function installPythonPipDependencies() {
  if (process.env.SKIP_PIP_INSTALL) {
    console.log('Skipping Python pip dependencies installation')
    return
  }
  console.log('Installing Python pip dependencies')
  execSync('mise exec -- python -m pip install --upgrade pip')
  execSync('mise exec -- python -m pip install -r requirements.txt')
}

function installBundlerRubyGems() {
  if (process.env.SKIP_BUNDLE_INSTALL) {
    console.log('Skipping Bundler gems installation')
    return
  }
  console.log('Installing Bundler gems')
  execSync('mise exec -- bundle install')
}

const packageManagerMap = {
  npm: installNpmDependencies,
  'python-pip': installPythonPipDependencies,
  'bundler-gems': installBundlerRubyGems
}

function getEnabledPackageManagers() {
  const defaultManagers = ['npm', 'bundler-gems', 'python-pip']
  const enabledManagers = process.env.ENABLED_PACKAGE_MANAGERS
    ? process.env.ENABLED_PACKAGE_MANAGERS.split(',')
    : defaultManagers

  // Check for any invalid package managers
  const invalidManagers = enabledManagers.filter(
    (manager) => !packageManagerMap[manager]
  )
  if (invalidManagers.length > 0) {
    throw new Error(
      `Invalid package managers in ENABLED_PACKAGE_MANAGERS: ${invalidManagers.join(', ')}`
    )
  }

  return enabledManagers
}

function getPackageManagersToSkip() {
  const skipManagers = process.env.SKIP_PACKAGE_MANAGERS
    ? process.env.SKIP_PACKAGE_MANAGERS.split(',')
    : []

  // Warn about any package managers that don't exist in packageManagerMap
  skipManagers.forEach((manager) => {
    if (!packageManagerMap[manager]) {
      console.warn(
        `Warning: Unknown package manager "${manager}" in SKIP_PACKAGE_MANAGERS`
      )
    }
  })

  return skipManagers
}

export function getLastDevEnv() {
  return fs.existsSync('.last-dev-env')
    ? fs.readFileSync('.last-dev-env', 'utf8').trim()
    : null
}

export function getCurrentDevEnv() {
  return process.env.MISE_ENV || 'local'
}

export function setLastDevEnv(devEnv) {
  console.log(`Writing Mise environment [${devEnv}] to .last-dev-env`)
  fs.writeFileSync('.last-dev-env', devEnv)
}

export function installProjectDependencies() {
  console.log('Installing dependencies')

  const lastDevEnv = getLastDevEnv()
  const currentDevEnv = getCurrentDevEnv()

  if (lastDevEnv !== currentDevEnv) {
    console.log(
      `Dev environment changed from [${lastDevEnv}] to [${currentDevEnv}], cleaning dependencies`
    )
    cleanProjectDependencies()
  }

  for (const packageManager of getEnabledPackageManagers()) {
    if (getPackageManagersToSkip().includes(packageManager)) {
      console.log(`Skipping ${packageManager} dependencies installation`)
      continue
    }

    if (!packageManagerMap[packageManager]) {
      console.error(`Unknown package manager: ${packageManager}`)
      process.exit(1)
    }

    packageManagerMap[packageManager]()
  }

  setLastDevEnv(currentDevEnv)
}

export function cleanProjectDependencies() {
  // read contents of .last-dev-env file (if it exists)
  const lastDevEnv = fs.existsSync('.last-dev-env')
    ? fs.readFileSync('.last-dev-env', 'utf8')
    : null

  if (lastDevEnv === 'dev-container') {
    console.log('Dev container already used')
    // remove .last-dev-env file
    fs.rmSync('.last-dev-env')
    return
  }

  // remove .venv folder if it exists
  if (fs.existsSync('.venv')) {
    fs.rmSync('.venv', { recursive: true })
  }

  //remove node_modules folder if it exists
  if (fs.existsSync('node_modules')) {
    fs.rmSync('node_modules', { recursive: true })
  }
}
