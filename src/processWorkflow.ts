import { readFile } from 'fs/promises'
import {
  quoteStrRegexp,
  singleChineseRegexp,
  templateStrRegexp,
  tplInterpolationRegexp,
  buildTagMatchRegexp,
  parseStringTemplate,
  processWithoutComments,
  maybeChineseStrRegexp,
} from './utils'

interface ProcessContext {
  file: string
  options: ProcessOptions
}

export interface ProcessOptions {
  getI18nKey?(str: string): string | undefined
}

export async function processI18nWorkflow(filePath: string, opt: ProcessOptions) {
  const ctx: ProcessContext = {
    file: filePath,
    options: opt,
  }

  const content = await readFile(filePath, 'utf-8')

  return processWithoutComments(content, (contentWithoutComment) => {
    if (filePath.endsWith('.vue')) {
      return processVueContent(ctx, contentWithoutComment)
    } else {
      return processJsContent(ctx, contentWithoutComment)
    }
  })
}

// --------- replacer
function processVueContent(ctx: ProcessContext, fileContent: string) {
  const result = fileContent
    .replace(buildTagMatchRegexp('template'), (t) => replaceVueTemplateContent(ctx, t))
    .replace(buildTagMatchRegexp('script'), (t) => processJsContent(ctx, t))

  return result
}

function processJsContent(ctx: ProcessContext, fileContent: string): string {
  return fileContent
    .replace(templateStrRegexp, (text) => {
      if (!singleChineseRegexp.test(text)) {
        return text
      }

      const parsedResult = parseStringTemplate(text)

      if (!parsedResult.expressions.length) {
        const token = getI18nToken(ctx, text)
        return token || text
      }

      if (!singleChineseRegexp.test(parsedResult.tpl)) {
        return text.replace(tplInterpolationRegexp, (interopStr) => {
          const jsStr = interopStr.slice(2, -1)
          return '${' + processJsContent(ctx, jsStr) + '}'
        })
      }

      const variables = parsedResult.expressions.map((jsStr) => processJsContent(ctx, jsStr))

      const key = findTranslationKey(ctx, parsedResult.tpl)

      return `$t('${key}', [${variables.join(', ')}])`
    })
    .replace(quoteStrRegexp, (t) => {
      if (!singleChineseRegexp.test(t)) {
        return t
      }

      const token = getI18nToken(ctx, t)

      return token || t
    })
}

function replaceVueTemplateContent(ctx: ProcessContext, fileContent: string) {
  return (
    fileContent
      // replace props
      .replace(/(?<= ):?[\w\d_-]+="[^"]+"/g, (t) => {
        const eqlIdx = t.indexOf('=')
        let [key, value] = [t.slice(0, eqlIdx), t.slice(eqlIdx + 1)]

        if (!singleChineseRegexp.test(value)) {
          return t
        }

        const isSpecialExpressionKeys = key.startsWith('v-')
        const isExpression = key.startsWith(':') || isSpecialExpressionKeys

        const rawValue = value.slice(1, -1)

        if (isExpression) {
          const replacedText = processJsContent(ctx, rawValue)

          return replacedText === rawValue ? t : `${key}="${replacedText}"`
        } else {
          const token = getI18nToken(ctx, rawValue)

          return token ? `:${key}="${token}"` : t
        }
      })
      // replace {{ xxx }} js expression
      .replace(/{{(.|\n)+?}}/gm, (t) => {
        const replaced = processJsContent(ctx, t)

        return replaced
      })
      // replace normal text
      .replace(maybeChineseStrRegexp, (t) => {
        if (!singleChineseRegexp.test(t)) {
          return t
        }

        const tailingChars = /[:：,，\-、 ]+$/.exec(t)?.[0] || ''
        const leadingChars = /^[:：,，\-、 ]+/.exec(t)?.[0] || ''

        t = t.slice(leadingChars.length, tailingChars ? -tailingChars.length : undefined)

        const token = getI18nToken(ctx, t)

        return leadingChars + (token ? `{{ ${token} }}` : t) + tailingChars
      })
  )
}

function getI18nToken(ctx: ProcessContext, content: string) {
  const key = findTranslationKey(ctx, content)

  return key ? `$t('${key}')` : undefined
}

function findTranslationKey(ctx: ProcessContext, text: string) {
  if (/^('|"|\`)[\s\S]+?\1$/.test(text)) {
    text = text.slice(1, -1)
  }

  text = text.replace(/\n\s+/g, '\n')
  text = text.trim()

  const key = ctx.options.getI18nKey?.(text)

  return key
}
