#!/usr/bin/env node

import { execSync } from 'child_process'

function main() {
  execSync('mise exec -- npx markdownlint --config .markdownlint.json .', {
    stdio: 'inherit'
  })
  execSync('mise exec -- npx eslint .', { stdio: 'inherit' })
  execSync('mise exec -- yamllint -c .yaml-lint.yml .', { stdio: 'inherit' })
}

main()
