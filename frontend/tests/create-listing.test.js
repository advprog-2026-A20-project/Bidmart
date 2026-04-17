import { describe, expect, it, vi } from 'vitest'
import {
  flushPromises,
  importFresh,
  jsonFailureResponse,
  jsonResponse,
  moduleVariants,
  setPage,
} from './helpers/module-utils.js'

const buildFormMarkup = () => `
  <p id="seller-warning" class="hidden"></p>
  <p id="create-listing-error"></p>
  <form id="create-listing-form">
    <input class="input-field" name="title" value="Auction Item" />
    <textarea class="input-field" name="description">Detailed description</textarea>
    <input class="input-field" name="imageUrl" value="https://img.example/item.jpg" />
    <select class="input-field" id="category" name="category"></select>
    <input class="input-field" name="startingPrice" value="100" />
    <input class="input-field" name="reservePrice" value="150" />
    <input class="input-field" name="minimumBidIncrement" value="10" />
    <input class="input-field" name="durationMinutes" value="30" />
    <input class="input-field" type="checkbox" name="activateNow" checked />
    <button type="submit">Create Auction</button>
  </form>
`

const categoryTree = [
  {
    key: 'ELECTRONICS',
    path: 'Elektronik',
    children: [{ key: 'ELECTRONICS_PHONE', path: 'Elektronik > Handphone', children: [] }],
  },
]

describe.each(moduleVariants)('$label create-listing.js', ({ basePath }) => {
  it('redirects unauthenticated users before they can submit', async () => {
    setPage('/pages/create-listing.html')
    document.body.insertAdjacentHTML('beforeend', `
      <p id="create-listing-error"></p>
      <form id="create-listing-form">
        <input class="input-field" name="title" value="Auction Item" />
        <button type="submit">Create Auction</button>
      </form>
    `)

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await importFresh(`${basePath}/create-listing.js`)
    document.querySelector('#create-listing-form').dispatchEvent(
      new window.Event('submit', { bubbles: true, cancelable: true }),
    )

    expect(fetchMock).not.toHaveBeenCalled()
    expect(window.location.pathname).toBe('/pages/create-listing.html')
  })

  it('loads categories and disables the form for non-seller users', async () => {
    setPage('/pages/create-listing.html')
    document.body.insertAdjacentHTML('beforeend', buildFormMarkup())
    localStorage.setItem('token', 'session-token')
    localStorage.setItem('user', JSON.stringify({ id: 'buyer-1', role: 'BUYER' }))

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(categoryTree)))

    await importFresh(`${basePath}/create-listing.js`)
    await flushPromises()

    expect(document.querySelector('#seller-warning').textContent).toContain('Only seller accounts')
    expect(document.querySelector('button[type="submit"]').disabled).toBe(true)
    expect([...document.querySelectorAll('.input-field')].every((field) => field.disabled)).toBe(true)
    expect(document.querySelector('#category').innerHTML).toContain('ELECTRONICS_PHONE')
  })

  it('handles missing warning and category elements without crashing', async () => {
    setPage('/pages/create-listing.html')
    document.body.insertAdjacentHTML('beforeend', `
      <p id="create-listing-error"></p>
      <form id="create-listing-form">
        <input class="input-field" name="title" value="Auction Item" />
        <button type="submit">Create Auction</button>
      </form>
    `)
    localStorage.setItem('token', 'session-token')
    localStorage.setItem('user', JSON.stringify({ id: 'seller-1', role: 'SELLER' }))

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await importFresh(`${basePath}/create-listing.js`)
    expect(fetchMock).not.toHaveBeenCalled()

    setPage('/pages/create-listing.html')
    document.body.insertAdjacentHTML('beforeend', `
      <p id="create-listing-error"></p>
      <form id="create-listing-form">
        <input class="input-field" name="title" value="Auction Item" />
        <button type="submit">Create Auction</button>
      </form>
    `)
    localStorage.setItem('token', 'session-token')
    localStorage.setItem('user', JSON.stringify({ id: 'buyer-2', role: 'BUYER' }))

    await importFresh(`${basePath}/create-listing.js`)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('submits a valid auction payload for sellers and redirects to listing detail', async () => {
    setPage('/pages/create-listing.html')
    document.body.insertAdjacentHTML('beforeend', buildFormMarkup())
    localStorage.setItem('token', 'session-token')
    localStorage.setItem('accessToken', 'access-token')
    localStorage.setItem('user', JSON.stringify({ id: 'seller-1', role: 'SELLER' }))

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(categoryTree))
      .mockResolvedValueOnce(jsonResponse({ listingId: 'listing-123' }))

    vi.stubGlobal('fetch', fetchMock)

    await importFresh(`${basePath}/create-listing.js`)
    await flushPromises()

    document.querySelector('#category').value = 'ELECTRONICS_PHONE'
    document.querySelector('#create-listing-form').dispatchEvent(
      new window.Event('submit', { bubbles: true, cancelable: true }),
    )
    await flushPromises()

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/auctions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          title: 'Auction Item',
          description: 'Detailed description',
          imageUrl: 'https://img.example/item.jpg',
          category: 'ELECTRONICS_PHONE',
          startingPrice: 100,
          reservePrice: 150,
          minimumBidIncrement: 10,
          durationMinutes: 30,
          activateNow: true,
        }),
        headers: expect.any(Headers),
      }),
    )
    expect(fetchMock.mock.calls[1][1].headers.get('Authorization')).toBe('Bearer access-token')
    expect(document.querySelector('button[type="submit"]').textContent).toBe('Create Auction')
    expect(document.querySelector('#create-listing-error').textContent).toBe('')
  })

  it('surfaces category-load failures, validation errors, and submit failures', async () => {
    setPage('/pages/create-listing.html')
    document.body.insertAdjacentHTML('beforeend', buildFormMarkup())
    localStorage.setItem('token', 'session-token')
    localStorage.setItem('accessToken', 'access-token')
    localStorage.setItem('user', JSON.stringify({ id: 'seller-1', role: 'SELLER' }))

    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('Kategori gagal dimuat'))
      .mockResolvedValueOnce(jsonFailureResponse({ message: 'Auction create failed' }, 500))

    vi.stubGlobal('fetch', fetchMock)

    await importFresh(`${basePath}/create-listing.js`)
    await flushPromises()

    const form = document.querySelector('#create-listing-form')
    const errorState = document.querySelector('#create-listing-error')
    const titleInput = form.querySelector('[name="title"]')
    const descriptionInput = form.querySelector('[name="description"]')
    const startingPriceInput = form.querySelector('[name="startingPrice"]')
    const reservePriceInput = form.querySelector('[name="reservePrice"]')
    const incrementInput = form.querySelector('[name="minimumBidIncrement"]')
    const durationInput = form.querySelector('[name="durationMinutes"]')

    titleInput.value = ''
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
    expect(errorState.textContent).toBe('Title is required.')

    titleInput.value = 'Auction Item'
    descriptionInput.value = ''
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
    expect(errorState.textContent).toBe('Description is required.')

    descriptionInput.value = 'Detailed description'
    startingPriceInput.value = '0'
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
    expect(errorState.textContent).toBe('Starting price must be greater than 0.')

    startingPriceInput.value = '100'
    reservePriceInput.value = '50'
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
    expect(errorState.textContent).toBe('Reserve price must be greater than or equal to the starting price.')

    reservePriceInput.value = '150'
    incrementInput.value = '0'
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
    expect(errorState.textContent).toBe('Minimum bid increment must be greater than 0.')

    incrementInput.value = '10'
    durationInput.value = '0'
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
    expect(errorState.textContent).toBe('Auction duration must be at least 1 minute.')

    durationInput.value = '30'
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()

    expect(errorState.textContent).toBe('Auction create failed')
    expect(document.querySelector('button[type="submit"]').disabled).toBe(false)
  })
})
