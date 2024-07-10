export function buildTagMatchRegexp(tagName: string) {
  return new RegExp(`<${tagName}(.|\\n)*<\\/${tagName}>`, "g");
}

export function sortObjectKeys(obj: Record<string, any>) {
  const entries = Object.entries(obj);

  entries.sort((a, b) => a[0].localeCompare(b[0]));

  return Object.fromEntries(entries);
}

export function processWithoutComments(
  fileContent: string,
  fn: (s: string) => string
) {
  let i = 0;
  const comments: Record<string, string> = {};

  const updateCommentMap = (str: string, type: "html" | "js") => {
    const key = type === "html" ? `<!--${i++}-->` : `//__#${i++}__`;

    comments[key] = str;
    return key;
  };

  const content = fileContent
    .replace(htmlCommentRegexp, (s) => updateCommentMap(s, "html"))
    .replace(jsCommentRegexp, (s) => updateCommentMap(s, "js"));

  let result = fn(content);

  for (const [key, value] of Object.entries(comments)) {
    result = result.replace(key, () => value);
  }

  return result;
}

/**
 *
 * `xxx ${variable}` => { tpl: 'xxx {0}', expressions: ['variable']}
 * @param source
 * @returns
 */
export function parseStringTemplate(source: string) {
  const result = {
    tpl: "",
    expressions: [] as string[],
  };

  const tpl = magicReplace(source, tplInterpolationRegexp, (jsStr, idx) => {
    result.expressions.push(jsStr.slice(2, -1));
    return `{${idx}}`;
  });

  result.tpl = tpl === source ? source.slice(1, -1) : tpl;

  return result;
}

// ---------

const createQuoteInput = (char: string) =>
  `${char}(?:[^${char}\\\\]|\\\\.)*${char}`;

const doubleQuoteStr = createQuoteInput('"');
const singleQuoteStr = createQuoteInput("'");
const strTemplateQuoteStr = createQuoteInput("`");

const quoteStr = `(${doubleQuoteStr}|${singleQuoteStr})`;

/**
 * match single quote string or double quote string
 */
export const quoteStrRegexp = new RegExp(quoteStr, "g");

/**
 * match example:
 *
 * `xxx${xxx}bbb`
 * --------------
 */
export const templateStrRegexp = new RegExp(strTemplateQuoteStr, "g");

/**
 * match example:
 *
 * `aaa${xxx}bbb`
 *     -----
 */
export const tplInterpolationRegexp = /\$\{[\s\S]+?\}/g;

export const maybeChineseStrRegexp =
  /[\p{Script=Han}a-zA-Z0-9，,。\.?？!！"“”% \-、：:【】[\]]+/gmu;

export const singleChineseRegexp = /\p{Script=Han}/u;

export const jsCommentRegexp =
  /(?<=(?:\b|^|\s))(?:\/\/.+$|\/\*(?:(?:\s|\S)+?)\*\/)/gm;

export const htmlCommentRegexp = /<!--[\s\S]+?-->/g;

// -----------------

function magicSplit(source: string, pattern: RegExp) {
  const segments: { content: string; match?: RegExpMatchArray }[] = [];

  let lastMatch: RegExpMatchArray | undefined;

  for (const match of source.matchAll(pattern)) {
    const matchedStr = match[0];

    appendRawContent(match);

    segments.push({
      content: matchedStr,
      match,
    });

    lastMatch = match;
  }

  appendRawContent();

  return segments;

  function appendRawContent(match?: RegExpMatchArray) {
    const lastMatchIdx = lastMatch
      ? (lastMatch.index || 0) + lastMatch[0].length
      : 0;

    const nextMatchIndex = match ? match.index : source.length;

    if (lastMatchIdx !== nextMatchIndex) {
      const content = source.slice(lastMatchIdx, nextMatchIndex);

      segments.push({
        content,
      });
    }
  }
}

export function magicReplace(
  source: string,
  pattern: RegExp,
  replacer: (
    substring: string,
    index: number,
    match: RegExpMatchArray
  ) => string
) {
  const segments = magicSplit(source, pattern);

  let result = [];
  let idx = 0;
  for (const seg of segments) {
    if (seg.match) {
      result.push(replacer(seg.content, idx, seg.match));
      idx++;
    } else {
      result.push(seg.content);
    }
  }

  return result.join("");
}
