import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  flushPromises,
  importFresh,
  invalidJsonResponse,
  jsonFailureResponse,
  jsonResponse,
  moduleVariants,
  setPage,
  textResponse,
} from './helpers/module-utils.js'

describe.each(moduleVariants)('$label api.js', ({ basePath }) => {
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('handles local storage helpers and query-string serialization', async () => {
    setPage('/pages/listings.html')
    const api = await importFresh(`${basePath}/api.js`)

    api.setToken('secret-token')
    expect(localStorage.getItem('accessToken')).toBe('secret-token')

    api.setToken('')
    expect(localStorage.getItem('accessToken')).toBeNull()

    api.setUser({ id: 'user-1', role: 'BUYER' })
    expect(api.getUser()).toEqual({ id: 'user-1', role: 'BUYER' })

    api.setUser(null)
    expect(localStorage.getItem('user')).toBeNull()

    localStorage.setItem('user', '{invalid json')
    expect(api.getUser()).toBeNull()

    localStorage.removeItem('user')
    expect(api.getUser()).toBeNull()

    expect(api.toQueryString({ keyword: 'phone', category: '', minPrice: null, maxPrice: 100 })).toBe(
      '?keyword=phone&maxPrice=100',
    )
    expect(api.toQueryString({})).toBe('')
  })

  it('handles request success states and response parsing variations', async () => {
    setPage('/pages/listings.html')
    const api = await importFresh(`${basePath}/api.js`)

    api.setToken('access-token')

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
      .mockResolvedValueOnce(invalidJsonResponse())
      .mockResolvedValueOnce(textResponse(true, 204))
      .mockResolvedValueOnce(jsonResponse({ ok: true }, { headers: { 'content-type': 'application/json' } }))

    vi.stubGlobal('fetch', fetchMock)

    const firstPayload = await api.request('/hello', {
      method: 'POST',
      body: JSON.stringify({ value: 1 }),
      auth: true,
    })
    const secondPayload = await api.request('/broken-json', { auth: false })
    const thirdPayload = await api.request('/plain-text', { auth: false })
    const fourthPayload = await api.request('/custom-content-type', {
      method: 'POST',
      body: JSON.stringify({ value: 2 }),
      headers: { 'Content-Type': 'text/plain' },
      auth: true,
    })

    expect(firstPayload).toEqual({ ok: true })
    expect(secondPayload).toBeNull()
    expect(thirdPayload).toBeNull()
    expect(fourthPayload).toEqual({ ok: true })

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/hello',
      expect.objectContaining({
        method: 'POST',
        body: '{"value":1}',
        headers: expect.any(Headers),
      }),
    )
    const firstHeaders = fetchMock.mock.calls[0][1].headers
    expect(firstHeaders.get('Authorization')).toBe('Bearer access-token')
    expect(firstHeaders.get('Content-Type')).toBe('application/json')

    const fourthHeaders = fetchMock.mock.calls[3][1].headers
    expect(fourthHeaders.get('Content-Type')).toBe('text/plain')
  })

  it('handles failed requests with structured and fallback errors', async () => {
    setPage('/pages/listings.html')
    const api = await importFresh(`${basePath}/api.js`)

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonFailureResponse({ message: 'Validation failed', fieldErrors: { title: 'Required' } }, 409))
      .mockResolvedValueOnce(textResponse(false, 500))

    vi.stubGlobal('fetch', fetchMock)

    await expect(api.request('/structured-error', { auth: false })).rejects.toMatchObject({
      message: 'Validation failed',
      status: 409,
      fieldErrors: { title: 'Required' },
    })
    await expect(api.request('/fallback-error', { auth: false })).rejects.toMatchObject({
      message: 'Request failed. Please try again.',
      status: 500,
      fieldErrors: {},
    })

    await flushPromises()
  })
})
