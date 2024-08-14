import { Application, TypeDocOptions } from 'typedoc'

import { EntryPoint } from '../interfaces'

// Required for the typedoc-plugin-markdown plugin
declare module 'typedoc' {
  export interface TypeDocOptionMap {
    entryFileName: string
    hidePageTitle: boolean
    hideBreadcrumbs: boolean
  }
}

export const typedocHtmlGroup = async (
  entryPoints: EntryPoint[]
): Promise<void> => {
  console.info('>>> Grouping generated docs...')

  const entryPointsJsons = entryPoints.map(
    ep => `${ep.generatedDocsPath}/docs.json`
  )

  const generatorConfig: Partial<TypeDocOptions> = {
    entryPointStrategy: 'merge',
    readme: 'none',
    entryPoints: entryPointsJsons
  }

  console.info('>>> Typedoc grouping', generatorConfig)
  const generatorApp = await Application.bootstrapWithPlugins(generatorConfig)

  const projectReflection = await generatorApp.convert()
  if (!projectReflection) {
    throw new Error('Failed to group generated docs')
  }

  console.info('>>> Generating grouped typedoc docs...')
  await generatorApp.generateDocs(projectReflection, '.tbdocs/docs')
}
