import { describe, expect, it, vi } from 'vitest'
import {
  flushPromises,
  importFresh,
  jsonFailureResponse,
  jsonResponse,
  moduleVariants,
  setPage,
} from './helpers/module-utils.js'

const buildAuctionDetailMarkup = () => `
  <h1 id="auction-title"></h1>
  <p id="auction-description"></p>
  <p id="auction-status"></p>
  <p id="auction-current-price"></p>
  <p id="auction-minimum-bid"></p>
  <p id="auction-ends-at"></p>
  <form id="bid-form">
    <input id="bid-amount" />
    <button id="bid-submit" type="submit">Ajukan Penawaran</button>
    <p id="bid-error"></p>
    <p id="bid-success"></p>
  </form>
  <div id="bid-history"></div>
  <p id="bid-history-empty" class="hidden"></p>
  <div id="detail-error-box" class="hidden"><span id="detail-error-message"></span></div>
  <button id="refresh-detail" type="button">Refresh</button>
`

describe.each(moduleVariants)('$label lelang-detail.js', ({ basePath }) => {
  it('shows a missing-id error and blocks bid submission without auction data', async () => {
    setPage('/pages/lelang-detail.html')
    document.body.insertAdjacentHTML('beforeend', buildAuctionDetailMarkup())
    vi.stubGlobal('fetch', vi.fn())

    await importFresh(`${basePath}/lelang-detail.js`)

    document.querySelector('#bid-form').dispatchEvent(
      new window.Event('submit', { bubbles: true, cancelable: true }),
    )

    expect(document.querySelector('#detail-error-box').classList.contains('hidden')).toBe(false)
    expect(document.querySelector('#detail-error-message').textContent).toBe('ID lelang tidak ditemukan.')
    expect(document.querySelector('#bid-error').textContent).toBe('Data lelang belum siap.')
    expect(document.querySelector('#bid-submit').disabled).toBe(true)
  })

  it('shows detail loading errors from the request layer', async () => {
    setPage('/pages/lelang-detail.html?id=auction-1')
    document.body.insertAdjacentHTML('beforeend', buildAuctionDetailMarkup())
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Auction unavailable')))

    await importFresh(`${basePath}/lelang-detail.js`)
    await flushPromises()

    expect(document.querySelector('#detail-error-box').classList.contains('hidden')).toBe(false)
    expect(document.querySelector('#detail-error-message').textContent).toBe('Auction unavailable')
    expect(document.querySelector('#bid-submit').disabled).toBe(true)
  })

  it('renders history, validates bid inputs, submits valid bids, and supports refresh', async () => {
    setPage('/pages/lelang-detail.html?id=auction-2')
    document.body.insertAdjacentHTML('beforeend', buildAuctionDetailMarkup())
    localStorage.setItem('user', JSON.stringify({ id: 'buyer-1', role: 'BUYER', availableBalance: 500 }))
    localStorage.setItem('accessToken', 'access-token')

    const initialAuction = {
      id: 'auction-2',
      title: 'Rare Figure',
      description: 'Collector edition',
      status: 'ACTIVE',
      currentPrice: 120,
      nextMinimumBid: 130,
      endsAt: '2026-04-21T10:00:00Z',
    }
    const updatedAuction = {
      ...initialAuction,
      currentPrice: 150,
      nextMinimumBid: 160,
    }
    const initialHistory = [
      { amount: 110, sequenceNumber: 1, bidderEmail: 'first@example.com', submittedAt: '2026-04-20T10:00:00Z', winning: false },
      { amount: 120, sequenceNumber: 2, bidderEmail: 'winner@example.com', submittedAt: '2026-04-20T10:01:00Z', winning: true },
    ]
    const updatedHistory = [...initialHistory, {
      amount: 150,
      sequenceNumber: 3,
      bidderEmail: 'buyer@example.com',
      submittedAt: '2026-04-20T10:02:00Z',
      winning: true,
    }]

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(initialAuction))
      .mockResolvedValueOnce(jsonResponse(initialHistory))
      .mockResolvedValueOnce(jsonResponse({}))
      .mockResolvedValueOnce(jsonResponse(updatedAuction))
      .mockResolvedValueOnce(jsonResponse(updatedHistory))
      .mockResolvedValueOnce(jsonResponse(updatedAuction))
      .mockResolvedValueOnce(jsonResponse(updatedHistory))

    vi.stubGlobal('fetch', fetchMock)

    await importFresh(`${basePath}/lelang-detail.js`)
    await flushPromises()

    expect(document.querySelector('#bid-history').children).toHaveLength(2)
    expect(document.querySelector('#bid-history').textContent).toContain('Bid tertinggi')
    expect(document.querySelector('#bid-history').firstElementChild.classList.contains('border-slate-800')).toBe(true)
    expect(document.querySelector('#bid-history').lastElementChild.classList.contains('border-emerald-600/30')).toBe(true)

    const bidInput = document.querySelector('#bid-amount')
    const form = document.querySelector('#bid-form')

    bidInput.value = ''
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
    expect(document.querySelector('#bid-error').textContent).toBe('Nominal bid tidak valid.')

    bidInput.value = '120'
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
    expect(document.querySelector('#bid-error').textContent).toContain('Bid minimal')

    bidInput.value = '600'
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
    expect(document.querySelector('#bid-error').textContent).toBe('Saldo tidak cukup untuk mengajukan bid.')

    bidInput.value = '150'
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/auctions/auction-2/bids',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ amount: 150 }),
        headers: expect.any(Headers),
      }),
    )
    expect(fetchMock.mock.calls[2][1].headers.get('Authorization')).toBe('Bearer access-token')
    await vi.waitFor(() => {
      expect(document.querySelector('#auction-current-price').textContent).toContain('150')
      expect(document.querySelector('#bid-amount').value).toBe('160')
    })

    document.querySelector('#refresh-detail').click()
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(7)
  })

  it('applies bid constraints for closed auctions and non-buyer users', async () => {
    setPage('/pages/lelang-detail.html?id=auction-3')
    document.body.insertAdjacentHTML('beforeend', buildAuctionDetailMarkup())
    localStorage.setItem('user', JSON.stringify({ id: 'seller-1', role: 'SELLER', availableBalance: 1000 }))

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        id: 'auction-3',
        title: 'Vintage Watch',
        description: 'Closed auction',
        status: 'CLOSED',
        currentPrice: 220,
        nextMinimumBid: null,
        startingPrice: 200,
        endsAt: null,
      }))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({
        id: 'auction-3',
        title: 'Vintage Watch',
        description: 'Non buyer view',
        status: 'ACTIVE',
        currentPrice: 220,
        nextMinimumBid: null,
        minimumBidIncrement: 10,
        leadingBid: { amount: 220 },
        endsAt: '2026-04-21T10:00:00Z',
      }))
      .mockResolvedValueOnce(jsonResponse([]))

    vi.stubGlobal('fetch', fetchMock)

    await importFresh(`${basePath}/lelang-detail.js`)
    await flushPromises()

    expect(document.querySelector('#bid-error').textContent).toBe('Lelang tidak menerima bid pada status saat ini.')
    expect(document.querySelector('#bid-submit').disabled).toBe(true)
    expect(document.querySelector('#auction-minimum-bid').textContent).toContain('200')

    document.querySelector('#refresh-detail').click()
    await flushPromises()

    expect(document.querySelector('#bid-error').textContent).toBe('Hanya akun BUYER yang dapat mengajukan penawaran.')
    expect(document.querySelector('#auction-minimum-bid').textContent).toContain('230')
  })

  it('reloads detail after 409 bid errors and preserves generic bid failures', async () => {
    setPage('/pages/lelang-detail.html?id=auction-4')
    document.body.insertAdjacentHTML('beforeend', buildAuctionDetailMarkup())
    localStorage.setItem('user', JSON.stringify({ id: 'buyer-4', role: 'BUYER', availableBalance: 500 }))
    localStorage.setItem('accessToken', 'token-4')

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        id: 'auction-4',
        title: 'Console',
        description: 'Current auction',
        status: 'ACTIVE',
        currentPrice: 100,
        nextMinimumBid: 110,
        endsAt: '2026-04-21T10:00:00Z',
      }))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonFailureResponse({ message: 'Bid must be at least 150.00' }, 409))
      .mockResolvedValueOnce(jsonResponse({
        id: 'auction-4',
        title: 'Console',
        description: 'Current auction',
        status: 'ACTIVE',
        currentPrice: 140,
        nextMinimumBid: null,
        minimumBidIncrement: 10,
        leadingBid: { amount: 140 },
        endsAt: '2026-04-21T10:00:00Z',
      }))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonFailureResponse({ message: 'Server error' }, 500))

    vi.stubGlobal('fetch', fetchMock)

    await importFresh(`${basePath}/lelang-detail.js`)
    await flushPromises()

    const form = document.querySelector('#bid-form')
    const bidInput = document.querySelector('#bid-amount')

    bidInput.value = '110'
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()

    await vi.waitFor(() => {
      expect(document.querySelector('#bid-error').textContent).toContain('Bid minimum terbaru sudah dimuat ulang')
      expect(document.querySelector('#bid-amount').value).toBe('150')
    })

    bidInput.value = '150'
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()

    expect(document.querySelector('#bid-error').textContent).toBe('Server error')
    expect(document.querySelector('#bid-submit').textContent).toBe('Ajukan Penawaran')
  })

  it('handles fallback minimum bid calculations and missing optional nodes', async () => {
    setPage('/pages/lelang-detail.html?id=auction-5')
    document.body.insertAdjacentHTML('beforeend', `
      <h1 id="auction-title"></h1>
      <p id="auction-description"></p>
      <p id="auction-status"></p>
      <p id="auction-current-price"></p>
      <p id="auction-minimum-bid"></p>
      <p id="auction-ends-at"></p>
      <form id="bid-form">
        <button id="bid-submit" type="submit">Ajukan Penawaran</button>
        <p id="bid-error"></p>
        <p id="bid-success"></p>
      </form>
      <div id="detail-error-box" class="hidden"><span id="detail-error-message"></span></div>
      <button id="refresh-detail" type="button">Refresh</button>
    `)
    localStorage.setItem('user', JSON.stringify({ id: 'buyer-5', role: 'BUYER', availableBalance: 500 }))

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        id: 'auction-5',
        title: 'Fallback Current Price',
        description: 'Uses current price when minimum missing',
        status: 'ACTIVE',
        currentPrice: 75,
        nextMinimumBid: null,
        endsAt: 'invalid-date',
      }))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({
        id: 'auction-5',
        title: 'Zero Minimum',
        description: 'No pricing information',
        status: 'ACTIVE',
        currentPrice: null,
        nextMinimumBid: null,
        minimumBidIncrement: null,
        startingPrice: null,
        endsAt: null,
      }))
      .mockResolvedValueOnce(jsonResponse([]))

    vi.stubGlobal('fetch', fetchMock)

    await importFresh(`${basePath}/lelang-detail.js`)
    await flushPromises()

    expect(document.querySelector('#auction-minimum-bid').textContent).toContain('75')
    expect(document.querySelector('#auction-ends-at').textContent).toBe('-')

    document.querySelector('#refresh-detail').click()
    await flushPromises()

    expect(document.querySelector('#auction-minimum-bid').textContent).toBe('Rp 0')
  })

  it('keeps the bid input untouched when the computed minimum bid is invalid', async () => {
    setPage('/pages/lelang-detail.html?id=auction-6')
    document.body.insertAdjacentHTML('beforeend', buildAuctionDetailMarkup())
    localStorage.setItem('user', JSON.stringify({ id: 'buyer-6', role: 'BUYER', availableBalance: 500 }))

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        id: 'auction-6',
        title: 'Broken Price',
        description: 'Missing pricing data',
        status: 'ACTIVE',
        currentPrice: 'invalid-price',
        nextMinimumBid: null,
        minimumBidIncrement: null,
        startingPrice: null,
        endsAt: null,
      }))
      .mockResolvedValueOnce(jsonResponse([])))

    await importFresh(`${basePath}/lelang-detail.js`)
    await flushPromises()

    expect(document.querySelector('#auction-current-price').textContent).toBe('-')
    expect(document.querySelector('#bid-amount').value).toBe('')
  })
})
