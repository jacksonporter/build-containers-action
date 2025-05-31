#!/usr/bin/env node

/*
This script was rewritten from the original version: https://github.com/actions/typescript-action/blob/main/script/release
*/

import { execSync } from 'child_process'
import { createInterface } from 'readline'

// Terminal colors
const OFF = '\x1b[0m'
const BOLD_RED = '\x1b[1;31m'
const BOLD_GREEN = '\x1b[1;32m'
const BOLD_BLUE = '\x1b[1;34m'
const BOLD_PURPLE = '\x1b[1;35m'
const BOLD_UNDERLINED = '\x1b[1;4m'
const BOLD = '\x1b[1m'

// Variables
const semverTagRegex = 'v[0-9]+\\.[0-9]+\\.[0-9]+$'
const semverTagGlob = 'v[0-9].[0-9].[0-9]*'
const gitRemote = 'origin'
const majorSemverTagRegex = '(v[0-9]*)'

const readline = createInterface({
  input: process.stdin,
  output: process.stdout
})

// Helper to prompt for input
const prompt = (query) => {
  return new Promise((resolve) => {
    readline.question(query, resolve)
  })
}

async function main() {
  try {
    // 1. Retrieve the latest release tag
    let latestTag
    try {
      latestTag = execSync(
        `git describe --abbrev=0 --match="${semverTagGlob}"`,
        { encoding: 'utf8' }
      ).trim()
    } catch {
      console.log(
        'No tags found (yet) - Continue to create and push your first tag'
      )
      latestTag = '[unknown]'
    }

    // 2. Display the latest release tag
    console.log(`The latest release tag is: ${BOLD_BLUE}${latestTag}${OFF}`)

    // 3. Prompt the user for a new release tag
    const newTag = await prompt('Enter a new release tag (vX.X.X format): ')

    // 4. Validate the new release tag
    if (new RegExp(semverTagRegex).test(newTag)) {
      console.log(`Tag: ${BOLD_BLUE}${newTag}${OFF} is valid syntax`)
    } else {
      console.log(
        `Tag: ${BOLD_BLUE}${newTag}${OFF} is ${BOLD_RED}not valid${OFF} (must be in ${BOLD}vX.X.X${OFF} format)`
      )
      process.exit(1)
    }

    // 5. Remind user to update the version field in package.json
    const yn = await prompt(
      `Make sure the version field in package.json is ${BOLD_BLUE}${newTag}${OFF}. Yes? [Y/${BOLD_UNDERLINED}n${OFF}] `
    )

    if (!['y', 'Y'].includes(yn)) {
      console.log(
        `Please update the package.json version to ${BOLD_PURPLE}${newTag}${OFF} and commit your changes`
      )
      process.exit(1)
    }

    // 6. Tag a new release
    execSync(`git tag "${newTag}" --annotate --message "${newTag} Release"`)
    console.log(`Tagged: ${BOLD_GREEN}${newTag}${OFF}`)

    // 7. Set 'is_major_release' variable
    const newMajorReleaseTag = newTag.match(
      new RegExp(majorSemverTagRegex)
    )?.[1]

    let isMajorRelease = false
    if (latestTag === '[unknown]') {
      isMajorRelease = true
    } else {
      const latestMajorReleaseTag = latestTag.match(
        new RegExp(majorSemverTagRegex)
      )?.[1]
      isMajorRelease = newMajorReleaseTag !== latestMajorReleaseTag
    }

    // 8. Point separate major release tag (e.g. v1, v2) to the new release
    if (isMajorRelease && newMajorReleaseTag) {
      execSync(
        `git tag "${newMajorReleaseTag}" --annotate --message "${newMajorReleaseTag} Release"`
      )
      console.log(
        `New major version tag: ${BOLD_GREEN}${newMajorReleaseTag}${OFF}`
      )
    } else if (latestTag !== '[unknown]') {
      const latestMajorReleaseTag = latestTag.match(
        new RegExp(majorSemverTagRegex)
      )?.[1]
      if (latestMajorReleaseTag) {
        execSync(
          `git tag "${latestMajorReleaseTag}" --force --annotate --message "Sync ${latestMajorReleaseTag} tag with ${newTag}"`
        )
        console.log(
          `Synced ${BOLD_GREEN}${latestMajorReleaseTag}${OFF} with ${BOLD_GREEN}${newTag}${OFF}`
        )
      }
    }

    // 9. Push the new tags (with commits, if any) to remote
    execSync('git push --follow-tags')

    if (isMajorRelease && newMajorReleaseTag) {
      console.log(
        `Tags: ${BOLD_GREEN}${newMajorReleaseTag}${OFF} and ${BOLD_GREEN}${newTag}${OFF} pushed to remote`
      )
    } else if (latestTag !== '[unknown]') {
      const latestMajorReleaseTag = latestTag.match(
        new RegExp(majorSemverTagRegex)
      )?.[1]
      if (latestMajorReleaseTag) {
        execSync(`git push ${gitRemote} "${latestMajorReleaseTag}" --force`)
        console.log(
          `Tags: ${BOLD_GREEN}${latestMajorReleaseTag}${OFF} and ${BOLD_GREEN}${newTag}${OFF} pushed to remote`
        )
      }
    }

    // 10. If this is a major release, create a 'releases/v#' branch and push
    if (isMajorRelease && newMajorReleaseTag) {
      execSync(
        `git branch "releases/${newMajorReleaseTag}" "${newMajorReleaseTag}"`
      )
      console.log(
        `Branch: ${BOLD_BLUE}releases/${newMajorReleaseTag}${OFF} created from ${BOLD_BLUE}${newMajorReleaseTag}${OFF} tag`
      )
      execSync(
        `git push --set-upstream ${gitRemote} "releases/${newMajorReleaseTag}"`
      )
      console.log(
        `Branch: ${BOLD_GREEN}releases/${newMajorReleaseTag}${OFF} pushed to remote`
      )
    }

    // Completed
    console.log(`${BOLD_GREEN}Done!${OFF}`)
  } finally {
    readline.close()
  }
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
