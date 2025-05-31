#!/usr/bin/env node

import { installProjectDependencies } from '../lib/project.js'

const main = async () => {
  installProjectDependencies()
}

main()
