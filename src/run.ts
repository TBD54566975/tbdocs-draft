import * as core from '@actions/core'

import { configInputs, getInputEntryPoints } from './config'
import { runDocsReport, generateReportMarkdown } from './docs-report'
import { generateDocs, groupDocs } from './docs-generator'

import { getFilesDiffs } from './utils'
import { handleGithubDocsReport, handleGithubGeneratedDocs } from './github'

export async function run(): Promise<void> {
  try {
    const {
      reportChangedScopeOnly,
      docsTargetOwnerRepo,
      failOnError,
      failOnWarnings,
      groupDocs: isGroupDocs
    } = configInputs

    const entryPoints = getInputEntryPoints()
    console.info('Processing EntryPoints >>>', entryPoints)

    const changedFiles = reportChangedScopeOnly
      ? await getFilesDiffs()
      : undefined

    for (const entryPoint of entryPoints) {
      console.info(`Processing entry point ${entryPoint.file}...`)

      if (entryPoint.docsReporter) {
        console.info(`Executing docs reporter ${entryPoint.docsReporter} ...`)
        entryPoint.report = await runDocsReport(
          entryPoint,
          changedFiles,
          entryPoint.docsReporterIgnore
        )
      }

      if (entryPoint.docsGenerator) {
        console.info(`Executing docs generator ${entryPoint.docsGenerator} ...`)
        entryPoint.generatedDocsPath = await generateDocs(entryPoint)
      }

      console.info(
        JSON.stringify(
          {
            report: entryPoint.report,
            generatedDocsPath: entryPoint.generatedDocsPath
          },
          null,
          2
        )
      )
    }

    if (isGroupDocs) {
      await groupDocs(entryPoints)
    }

    const reportMarkdown = await generateReportMarkdown(entryPoints)

    await handleGithubDocsReport(
      entryPoints,
      reportMarkdown,
      failOnError,
      failOnWarnings
    )

    if (docsTargetOwnerRepo) {
      await handleGithubGeneratedDocs(entryPoints)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    console.error(error)
    if (error instanceof Error) core.setFailed(error.message)
  }
}
