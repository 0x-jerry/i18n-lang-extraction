import fg from 'fast-glob'
import path from 'path'
import { extract } from '../src/extract'

describe('extract', () => {
  it("should works", () => {
    const files = await fg('**/*', {
      cwd: path.join(__dirname, 'examples'),
      absolute: true
    })

    for (const file of files) {
      const filename = path.basename(file)

      expect(extract(file)).toMatchSnapshot()
    }
  })
})
