import { readFile } from 'fs/promises'
import { processI18nWorkflow } from './processWorkflow'

export async function extract(file: string) {
  const type = file.endsWith('.vue') ? 'vue' : 'js'
  const content = await readFile(file, 'utf-8')

  const result: string[] = []

  await processI18nWorkflow(content, {
    type,
    getI18nKey(text) {
      result.push(text)

      return '_#_'
    },
  })

  return result.sort()
}
