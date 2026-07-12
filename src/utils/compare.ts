const PUNCTUATION = /[.,!?;:"“”'‘«»()\[\]{}—–\-…/\\@#$%^&*_+=\|~`<>]/g

const RUSSIAN_NORMALIZE: Record<string, string> = {
  ё: 'е',
}

const SERBIAN_NORMALIZE: Record<string, string> = {
  č: 'c',
  ć: 'c',
  đ: 'd',
  š: 's',
  ž: 'z',
}

const ALL_NORMALIZE: Record<string, string> = {
  ...RUSSIAN_NORMALIZE,
  ...SERBIAN_NORMALIZE,
}

function normalizeChar(c: string): string {
  return ALL_NORMALIZE[c] ?? c
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(PUNCTUATION, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split('')
    .map(normalizeChar)
    .join('')
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(dp[j], dp[j - 1], prev)
      prev = tmp
    }
  }
  return dp[n]
}

export function similarity(a: string, b: string): number {
  const na = normalizeText(a)
  const nb = normalizeText(b)
  if (na === nb) return 100
  const maxLen = Math.max(na.length, nb.length)
  if (maxLen === 0) return 100
  return Math.round((1 - levenshtein(na, nb) / maxLen) * 100)
}

export function bestMatch(input: string, targets: string[]): { match: string; percent: number } {
  let best = { match: '', percent: 0 }
  for (const target of targets) {
    const p = similarity(input, target)
    if (p > best.percent) {
      best = { match: target, percent: p }
    }
  }
  return best
}