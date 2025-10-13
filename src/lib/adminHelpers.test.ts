import { describe, it, expect } from 'vitest'
import { fieldStyle, labelStyle, createEmptyExperience, parseAchievements, parseStack } from './adminHelpers'

describe('adminHelpers', () => {
  it('exports style strings', () => {
    expect(typeof fieldStyle).toBe('string')
    expect(typeof labelStyle).toBe('string')
    expect(fieldStyle.length).toBeGreaterThan(0)
    expect(labelStyle.length).toBeGreaterThan(0)
  })

  it('createEmptyExperience returns empty fields', () => {
    const e = createEmptyExperience()
    expect(e.role).toBe('')
    expect(e.company).toBe('')
    expect(e.year).toBe('')
    expect(e.description).toBe('')
    expect(e.achievementsInput).toBe('')
    expect(e.stackInput).toBe('')
    expect(e.location).toBeUndefined()
  })

  it('parseAchievements splits lines and trims', () => {
    const input = ' one\n\n two \nthree\n '
    const parsed = parseAchievements(input)
    expect(parsed).toEqual(['one', 'two', 'three'])
  })

  it('parseStack splits by comma and trims', () => {
    const input = ' react,  node , , express '
    const parsed = parseStack(input)
    expect(parsed).toEqual(['react', 'node', 'express'])
  })
})
