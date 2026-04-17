import { describe, expect, it, vi } from 'vitest'
import {
  flushPromises,
  importFresh,
  jsonResponse,
  moduleVariants,
  setPage,
} from './helpers/module-utils.js'

const buildListingsMarkup = () => `
  <form id="listing-filter-form">
    <input id="keyword" value="" />
    <select id="category"></select>
    <input id="min-price" value="" />
    <input id="max-price" value="" />
    <input id="ending-after" value="" />
    <input id="ending-before" value="" />
    <button type="submit">Apply</button>
    <button type="reset">Reset</button>
  </form>
  <div id="listings-skeleton" class="hidden"></div>
  <div id="listings-empty" class="hidden"></div>
  <div id="listings-error" class="hidden"><span id="listings-error-message"></span></div>
  <button id="listings-retry" type="button">Retry</button>
  <div id="listings-container"></div>
`

const categoryTree = [
  {
    key: 'ELECTRONICS',
    path: 'Elektronik',
    children: [{ key: 'ELECTRONICS_PHONE', path: 'Elektronik > Handphone', children: [] }],
  },
]

describe.each(moduleVariants)('$label listings.js', ({ basePath }) => {
  it('loads categories, syncs URL filters, renders cards, and handles empty results', async () => {
    setPage(
      '/pages/listings.html?keyword=phone&category=ELECTRONICS&minPrice=100&maxPrice=300&endingAfter=2026-04-20T10:00:00Z&endingBefore=not-a-date',
    )
    document.body.insertAdjacentHTML('beforeend', buildListingsMarkup())

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(categoryTree))
      .mockResolvedValueOnce(jsonResponse([
        {
          id: 'listing-1',
          title: 'Phone Pro',
          description: 'Fast flagship',
          imageUrl: 'https://img.example/phone.jpg',
          price: 200,
          categoryPath: 'Elektronik > Handphone',
          auctionStatus: 'ACTIVE',
          endsAt: '2026-04-21T10:00:00Z',
          sellerId: 'seller-1',
          sellerEmail: 'seller@example.com',
          auctionId: 'auction-1',
        },
        {
          id: 'listing-2',
          title: 'Mystery Box',
          description: 'Unknown contents',
          imageUrl: '',
          price: 'invalid-price',
          category: 'OTHER',
          endsAt: null,
          sellerId: 'seller-2',
          sellerEmail: 'other@example.com',
        },
      ]))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([
        {
          id: 'listing-3',
          title: 'Old Tablet',
          description: 'Used item',
          imageUrl: '',
          price: 50,
          categoryPath: 'Elektronik',
          endsAt: 'invalid-date',
          sellerId: 'seller-3',
          sellerEmail: 'third@example.com',
        },
      ]))

    vi.stubGlobal('fetch', fetchMock)

    await importFresh(`${basePath}/listings.js`)
    await flushPromises()

    expect(document.querySelector('#keyword').value).toBe('phone')
    expect(document.querySelector('#category').value).toBe('ELECTRONICS')
    expect(document.querySelector('#ending-after').value).not.toBe('')
    expect(document.querySelector('#ending-before').value).toBe('')
    expect(document.querySelector('#listings-container').children).toHaveLength(2)
    expect(document.querySelector('#listings-container').textContent).toContain('Phone Pro')
    expect(document.querySelector('#listings-container').textContent).toContain('Rp')
    expect(document.querySelector('#listings-container').textContent).toContain('Belum dijadwalkan')
    expect(document.querySelector('#listings-container').querySelector('a[href="/pages/seller-profile.html?id=seller-1"]')).not.toBeNull()
    expect(document.querySelector('#listings-container').querySelector('a[href="/pages/lelang-detail.html?id=auction-1"]')).not.toBeNull()

    document.querySelector('#keyword').value = 'tablet'
    document.querySelector('#min-price').value = '10'
    document.querySelector('#max-price').value = '90'
    document.querySelector('#ending-before').value = '2026-04-21T16:00'
    document.querySelector('#listing-filter-form').dispatchEvent(
      new window.Event('submit', { bubbles: true, cancelable: true }),
    )
    await flushPromises()

    expect(document.querySelector('#listings-empty').classList.contains('hidden')).toBe(false)
    expect(window.location.search).toContain('keyword=tablet')
    expect(window.location.search).toContain('minPrice=10')

    document.querySelector('#listing-filter-form').dispatchEvent(new window.Event('reset', { bubbles: true }))
    await new Promise((resolve) => window.setTimeout(resolve, 0))
    await flushPromises()

    expect(document.querySelector('#listings-container').textContent).toContain('Old Tablet')
    expect(document.querySelector('#listings-container').textContent).toContain('Belum dijadwalkan')
    expect(document.querySelector('#listings-skeleton').classList.contains('hidden')).toBe(true)
  })

  it('handles request failures, retry clicks, and pages without a filter form', async () => {
    setPage('/pages/listings.html')
    document.body.insertAdjacentHTML('beforeend', buildListingsMarkup())

    const failingFetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse(categoryTree))
      .mockRejectedValueOnce(new Error('Catalog unavailable'))
      .mockResolvedValueOnce(jsonResponse([
        {
          id: 'listing-4',
          title: 'Recovered Listing',
          description: 'Back online',
          imageUrl: '',
          price: 25,
          category: 'OTHER',
          endsAt: null,
          sellerId: 'seller-4',
          sellerEmail: 'recover@example.com',
        },
      ]))

    vi.stubGlobal('fetch', failingFetch)

    await importFresh(`${basePath}/listings.js`)
    await flushPromises()

    expect(document.querySelector('#listings-error').classList.contains('hidden')).toBe(false)
    expect(document.querySelector('#listings-error-message').textContent).toBe('Catalog unavailable')

    document.querySelector('#listings-retry').click()
    await flushPromises()

    expect(document.querySelector('#listings-container').textContent).toContain('Recovered Listing')
    expect(document.querySelector('#listings-error').classList.contains('hidden')).toBe(true)

    setPage('/pages/listings.html')
    vi.stubGlobal('fetch', vi.fn())
    await importFresh(`${basePath}/listings.js`)
  })

  it('falls back after category loading fails and tolerates missing optional elements', async () => {
    setPage('/pages/listings.html')
    document.body.insertAdjacentHTML('beforeend', `
      <form id="listing-filter-form">
        <input id="keyword" value="" />
        <select id="category"></select>
        <input id="ending-after" value="not-a-date" />
        <button type="submit">Apply</button>
      </form>
      <div id="listings-container"></div>
    `)

    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('Categories unavailable'))
      .mockResolvedValueOnce(jsonResponse([
        {
          id: 'listing-5',
          title: 'Fallback Listing',
          description: 'Recovered after category failure',
          imageUrl: '',
          price: 10,
          category: 'OTHER',
          endsAt: null,
          sellerId: 'seller-5',
          sellerEmail: 'fallback@example.com',
        },
      ]))
      .mockResolvedValueOnce(jsonResponse([
        {
          id: 'listing-6',
          title: 'Second Fetch',
          description: 'Invalid date filter path',
          imageUrl: '',
          price: 15,
          category: 'OTHER',
          endsAt: null,
          sellerId: 'seller-6',
          sellerEmail: 'second@example.com',
        },
      ]))

    vi.stubGlobal('fetch', fetchMock)

    await importFresh(`${basePath}/listings.js`)
    await flushPromises()

    await vi.waitFor(() => {
      expect(document.querySelector('#listings-container').textContent).toContain('Fallback Listing')
    })

    document.querySelector('#ending-after').value = 'not-a-date'
    document.querySelector('#listing-filter-form').dispatchEvent(
      new window.Event('submit', { bubbles: true, cancelable: true }),
    )
    await flushPromises()

    expect(window.location.search).not.toContain('endingAfter=')
    await vi.waitFor(() => {
      expect(document.querySelector('#listings-container').textContent).toContain('Second Fetch')
    })
  })

  it('supports forms without a category select', async () => {
    setPage('/pages/listings.html')
    document.body.insertAdjacentHTML('beforeend', `
      <form id="listing-filter-form">
        <input id="keyword" value="" />
        <button type="submit">Apply</button>
      </form>
      <div id="listings-container"></div>
    `)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([
      {
        id: 'listing-7',
        title: 'No Category Field',
        description: 'Category select omitted',
        imageUrl: '',
        price: 12,
        category: 'OTHER',
        endsAt: null,
        sellerId: 'seller-7',
        sellerEmail: 'nocategory@example.com',
      },
    ])))

    await importFresh(`${basePath}/listings.js`)
    await flushPromises()

    expect(document.querySelector('#listings-container').textContent).toContain('No Category Field')
  })
})
