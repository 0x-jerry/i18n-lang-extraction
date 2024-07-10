import fg from 'fast-glob'
import path from 'path'
import { extract } from '../src/extract'

describe('extract', async () => {
  const exampleDir = path.join(__dirname, 'examples')
  const files = await fg('**/*', {
    cwd: exampleDir,
  })

  for (const file of files) {
    it(`should work with: ${file}`, async () => {
      const filePath = path.join(exampleDir, file)
      const messages = await extract(filePath)

      expect(messages).toMatchSnapshot()
    })
  }
})
