import { describe, it, expect } from 'vitest'
import { createEmptyExperience, parseAchievements, parseStack, fieldStyle, labelStyle } from './adminHelpers'

describe('pages/adminHelpers', () => {
  it('exports non-empty style strings', () => {
    expect(typeof fieldStyle).toBe('string')
    expect(fieldStyle.length).toBeGreaterThan(0)
    expect(typeof labelStyle).toBe('string')
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

  it('parseAchievements splits on newlines and trims', () => {
    const input = '\nOne\n Two \n\nThree\n'
    expect(parseAchievements(input)).toEqual(['One', 'Two', 'Three'])
  })

  it('parseStack splits on commas and trims', () => {
    const input = 'a, b,, c '
    expect(parseStack(input)).toEqual(['a', 'b', 'c'])
  })
})
