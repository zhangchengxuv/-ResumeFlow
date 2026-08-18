import type { FieldDescriptor, MatchResult } from '../types/fields'
import { MATCH_RULES, type MatchRule } from './rules'

const normalize = (text?: string) =>
  (text ?? '').toLocaleLowerCase().replace(/[\s_\-:：；;，,。()[\]【】「」"'\\.]+/g, ' ').trim()
const compact = (text: string) => text.replace(/\s/g, '')

const sourceWeight: Record<string, number> = {
  label: 50, labelText: 50, placeholder: 40, name: 30, id: 30, ariaLabel: 35,
  autocomplete: 35, nearbyText: 20, parentText: 15, sectionText: 12,
}

function textMatchStrength(source: string, keyword: string): { score: number; kind: string } {
  const text = normalize(source)
  const target = normalize(keyword)
  if (!text || !target) return { score: 0, kind: '' }
  if (text === target) return { score: 100, kind: '完全匹配' }
  const sourceTokens = new Set(text.split(' '))
  const targetTokens = target.split(' ')
  if (targetTokens.length > 1 && targetTokens.every((token) => sourceTokens.has(token))) {
    return { score: 32, kind: '词组匹配' }
  }
  const compactText = compact(text)
  const compactTarget = compact(target)
  if (compactTarget.length >= 2 && compactText.includes(compactTarget)) {
    const coverage = compactTarget.length / Math.max(compactText.length, compactTarget.length)
    return { score: 10 + Math.round(20 * coverage), kind: '关键词匹配' }
  }
  return { score: 0, kind: '' }
}

function scoreRule(field: FieldDescriptor, rule: MatchRule): MatchResult {
  let score = 0
  const reasons: string[] = []
  const sources: Array<[keyof FieldDescriptor, string | undefined]> = [
    ['labelText', field.labelText], ['label', field.label], ['placeholder', field.placeholder], ['ariaLabel', field.ariaLabel],
    ['name', field.name], ['id', field.id], ['autocomplete', field.autocomplete],
    ['nearbyText', field.nearbyText], ['parentText', field.parentText], ['sectionText', field.sectionText],
  ]
  for (const [sourceName, source] of sources) {
    let best = { score: 0, kind: '' }
    for (const keyword of rule.keywords) {
      const match = textMatchStrength(source ?? '', keyword)
      if (match.score > best.score) best = match
    }
    if (best.score > 0) {
      const weighted = best.score === 100
        ? 100 + (sourceWeight[String(sourceName)] ?? 10)
        : Math.min(sourceWeight[String(sourceName)] ?? 10, best.score)
      score += weighted
      reasons.push(`${String(sourceName)} ${best.kind} +${weighted}`)
    }
  }
  const allText = sources.map(([, value]) => normalize(value)).join(' ')
  for (const conflict of rule.conflicts ?? []) {
    if (textMatchStrength(allText, conflict).score > 0) {
      score -= 30
      reasons.push(`冲突关键词「${conflict}」 -30`)
    }
  }
  if (field.type && rule.inputTypes?.includes(field.type)) {
    score += 28
    reasons.push(`输入类型 ${field.type} +28`)
  }
  if (field.autocomplete && rule.autocomplete?.some((item) => field.autocomplete?.includes(item))) {
    score += 35
    reasons.push('autocomplete 匹配 +35')
  }
  return { targetField: rule.path, confidence: Math.max(0, Math.min(0.99, score / 150)), reasons, source: 'rule' }
}

export function matchField(field: FieldDescriptor): MatchResult {
  const results = MATCH_RULES.map((rule) => scoreRule(field, rule)).sort((a, b) => b.confidence - a.confidence)
  const best = results[0]
  const runnerUp = results[1]
  if (!best || best.confidence < 0.25) return { targetField: '', confidence: best?.confidence ?? 0, reasons: ['没有足够明确的关键词'], source: 'rule' }
  if (runnerUp && best.confidence - runnerUp.confidence < 0.08 && best.confidence < 0.85) {
    return { ...best, confidence: Math.max(0, best.confidence - 0.12), reasons: [...best.reasons, '存在相近候选 -12%'] }
  }
  return best
}

export const matchFields = (fields: FieldDescriptor[]) => fields.map(matchField)
