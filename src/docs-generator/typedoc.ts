import path from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { Application, TypeDocOptions } from 'typedoc'

import { EntryPoint } from '../interfaces'
import { loadTsconfigProps, lookupFile } from '../utils'

// Required for the typedoc-plugin-markdown plugin
declare module 'typedoc' {
  export interface TypeDocOptionMap {
    entryDocument: string
    hidePageTitle: boolean
    hideBreadcrumbs: boolean
    hideInPageTOC: boolean
  }
}

const ENTRY_DOCUMENT = 'index.md'

export const generateTypedoc = async (
  entryPoint: EntryPoint,
  isMarkdown?: boolean
): Promise<string> => {
  console.info('>>> Generating docs...')

  const entryPointFile = entryPoint.file

  // Set project path if not set before by the doc-reporter
  if (!entryPoint.projectPath) {
    const entryPointFileFullPath = path.dirname(
      path.join(process.cwd(), entryPointFile)
    )
    const packageJsonFullPath = lookupFile(
      'package.json',
      entryPointFileFullPath
    )
    const projectPath = path.dirname(packageJsonFullPath)
    entryPoint.projectPath = projectPath
  }

  const { tsconfigFile } = await loadTsconfigProps(entryPoint.projectPath)

  let generatorConfig: Partial<TypeDocOptions> = {
    tsconfig: tsconfigFile,
    entryPoints: [entryPointFile],
    skipErrorChecking: true,
    disableSources: true,
    readme: entryPoint.readmeFile || 'none',
    includeVersion: true
  }

  if (isMarkdown) {
    generatorConfig = {
      ...generatorConfig,
      plugin: ['typedoc-plugin-markdown'],
      entryDocument: ENTRY_DOCUMENT,
      hidePageTitle: true,
      hideBreadcrumbs: true,
      hideInPageTOC: true,
      githubPages: false
    }
  }

  console.info(
    '>>> Typedoc Generator entryPoint',
    entryPointFile,
    generatorConfig
  )
  const generatorApp = await Application.bootstrapWithPlugins(generatorConfig)

  const projectReflection = await generatorApp.convert()
  if (!projectReflection) {
    throw new Error('Failed to generate docs')
  }

  console.info('>>> Generating typedoc docs...', { isMarkdown })
  const outputDir = path.join(entryPoint.projectPath, '.tbdocs/docs')
  await generatorApp.generateDocs(projectReflection, outputDir)

  console.info('>>> Generating typedoc json...')
  const outputJson = path.join(outputDir, 'docs.json')
  await generatorApp.generateJson(projectReflection, outputJson)

  // Set project name if not set before
  if (!entryPoint.projectName) {
    entryPoint.projectName = projectReflection.packageName
  }

  if (isMarkdown) {
    addTitleToIndexFile(projectReflection.packageName, outputDir)
  }

  return outputDir
}

const addTitleToIndexFile = (
  packageName = 'API Reference',
  outputDir: string
): void => {
  const indexMdPath = path.join(outputDir, ENTRY_DOCUMENT)
  const indexFrontMatter = `---\ntitle: '${packageName}'\n---\n\n`
  const indexMdContent = readFileSync(indexMdPath, 'utf8')
  const updatedIndexMdContent = indexFrontMatter + indexMdContent
  writeFileSync(indexMdPath, updatedIndexMdContent)
}
