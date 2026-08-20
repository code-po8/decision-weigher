import { describe, expect, it } from 'vitest'
import { routerBasename } from './routerBase'

describe('routerBasename', () => {
  it('maps the root base to "/"', () => {
    expect(routerBasename('/')).toBe('/')
  })

  it('treats an empty base as root', () => {
    expect(routerBasename('')).toBe('/')
  })

  it('strips the trailing slash from a subpath base', () => {
    expect(routerBasename('/decision-weigher/')).toBe('/decision-weigher')
  })

  it('leaves a subpath without a trailing slash unchanged', () => {
    expect(routerBasename('/decision-weigher')).toBe('/decision-weigher')
  })

  it('handles a nested subpath', () => {
    expect(routerBasename('/apps/decisions/')).toBe('/apps/decisions')
  })
})
