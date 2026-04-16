import { request } from './api.js'

const container = document.querySelector('#auctions-container')
const skeleton = document.querySelector('#auctions-skeleton')
const emptyState = document.querySelector('#auctions-empty')
const errorState = document.querySelector('#auctions-error')
const errorMessage = document.querySelector('#auctions-error-message')
const retryButton = document.querySelector('#auctions-retry')

const statusLabel = {
  DRAFT: 'Draft',
  ACTIVE: 'Aktif',
  EXTENDED: 'Diperpanjang',
  CLOSED: 'Ditutup',
  WON: 'Menang',
  UNSOLD: 'Tidak Terjual',
}

const formatPrice = (value) => {
  const numberValue = Number(value)
  if (Number.isNaN(numberValue)) {
    return '-'
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(numberValue)
}

const formatDate = (value) => {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const setVisible = (element, isVisible) => {
  if (!element) {
    return
  }
  element.classList.toggle('hidden', !isVisible)
}

const renderAuctionCard = (auction) => {
  const card = document.createElement('article')
  card.className = 'rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm'

  const title = document.createElement('h2')
  title.className = 'text-lg font-semibold'
  title.textContent = auction?.title || 'Lelang tanpa judul'

  const topRow = document.createElement('div')
  topRow.className = 'mt-3 flex items-center justify-between gap-2'

  const status = document.createElement('span')
  status.className = 'rounded-full border border-indigo-500/30 bg-indigo-500/15 px-2.5 py-1 text-xs text-indigo-200'
  status.textContent = statusLabel[auction?.status] || auction?.status || 'Tidak diketahui'

  const bids = document.createElement('span')
  bids.className = 'text-xs text-slate-400'
  bids.textContent = `${auction?.totalBids || 0} bid`

  topRow.append(status, bids)

  const price = document.createElement('p')
  price.className = 'mt-3 text-sm font-semibold text-indigo-300'
  price.textContent = `Harga saat ini: ${formatPrice(auction?.currentPrice)}`

  const minimum = document.createElement('p')
  minimum.className = 'mt-1 text-xs text-slate-400'
  minimum.textContent = `Bid minimum: ${formatPrice(auction?.nextMinimumBid)}`

  const endsAt = document.createElement('p')
  endsAt.className = 'mt-1 text-xs text-slate-500'
  endsAt.textContent = `Berakhir: ${formatDate(auction?.endsAt)}`

  const action = document.createElement('a')
  action.href = `/pages/lelang-detail.html?id=${auction?.id}`
  action.className = 'mt-4 inline-flex rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-400'
  action.textContent = 'Buka Detail Lelang'

  card.append(title, topRow, price, minimum, endsAt, action)
  return card
}

const loadAuctions = async () => {
  if (!container) {
    return
  }

  setVisible(skeleton, true)
  setVisible(emptyState, false)
  setVisible(errorState, false)
  container.innerHTML = ''

  try {
    const data = await request('/auctions', { auth: false })
    const auctions = Array.isArray(data) ? data : []

    if (auctions.length === 0) {
      setVisible(emptyState, true)
      return
    }

    auctions.forEach((auction) => {
      container.appendChild(renderAuctionCard(auction))
    })
  } catch (error) {
    if (errorMessage) {
      errorMessage.textContent = error.message || 'Gagal memuat data lelang.'
    }
    setVisible(errorState, true)
  } finally {
    setVisible(skeleton, false)
  }
}

if (retryButton) {
  retryButton.addEventListener('click', () => {
    loadAuctions()
  })
}

loadAuctions()
