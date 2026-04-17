import { vi } from 'vitest'

export const moduleVariants = [
  { label: 'assets', basePath: '../../assets/js' },
  { label: 'public', basePath: '../../public/assets/js' },
]

export const importFresh = async (modulePath) => {
  vi.resetModules()
  return import(`${modulePath}?scenario=${Date.now()}-${Math.random()}`)
}

export const setPage = (pathnameWithSearch = '/pages/listings.html') => {
  document.body.innerHTML = ''
  localStorage.clear()
  document.body.innerHTML = '<div id="navbar"></div><div id="footer"></div>'
  window.history.replaceState({}, '', pathnameWithSearch)
  window.__API_URL__ = '/api'
  window.setInterval = vi.fn(() => 1)
  window.requestAnimationFrame = vi.fn((callback) => callback())
  window.confirm = vi.fn(() => true)
}

export const flushPromises = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

export const jsonResponse = (payload, init = {}) => ({
  ok: init.ok ?? true,
  status: init.status ?? 200,
  headers: new Headers({ 'content-type': 'application/json', ...(init.headers || {}) }),
  json: vi.fn(async () => payload),
})

export const jsonFailureResponse = (payload, status = 400) => ({
  ok: false,
  status,
  headers: new Headers({ 'content-type': 'application/json' }),
  json: vi.fn(async () => payload),
})

export const textResponse = (ok = true, status = 200) => ({
  ok,
  status,
  headers: new Headers({ 'content-type': 'text/plain' }),
})

export const invalidJsonResponse = (ok = true, status = 200) => ({
  ok,
  status,
  headers: new Headers({ 'content-type': 'application/json' }),
  json: vi.fn(async () => {
    throw new Error('invalid json')
  }),
})
