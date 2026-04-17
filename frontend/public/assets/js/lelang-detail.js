import { getUser, request } from './api.js'

const params = new URLSearchParams(window.location.search)
const auctionId = params.get('id')

const titleEl = document.querySelector('#auction-title')
const descriptionEl = document.querySelector('#auction-description')
const statusEl = document.querySelector('#auction-status')
const currentPriceEl = document.querySelector('#auction-current-price')
const minimumBidEl = document.querySelector('#auction-minimum-bid')
const endsAtEl = document.querySelector('#auction-ends-at')
const bidForm = document.querySelector('#bid-form')
const bidAmountInput = document.querySelector('#bid-amount')
const bidSubmit = document.querySelector('#bid-submit')
const bidError = document.querySelector('#bid-error')
const bidSuccess = document.querySelector('#bid-success')
const bidHistoryEl = document.querySelector('#bid-history')
const bidHistoryEmptyEl = document.querySelector('#bid-history-empty')
const detailErrorBox = document.querySelector('#detail-error-box')
const detailErrorMessage = document.querySelector('#detail-error-message')
const refreshButton = document.querySelector('#refresh-detail')

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

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }

  return parsed.toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const setBidEnabled = (enabled) => {
  if (bidAmountInput) bidAmountInput.disabled = !enabled
  if (bidSubmit) bidSubmit.disabled = !enabled
}

const getMinimumBidAmount = (auction) => {
  const nextMinimumBid = Number(auction?.nextMinimumBid)
  if (Number.isFinite(nextMinimumBid) && nextMinimumBid > 0) {
    return nextMinimumBid
  }

  const currentPrice = Number(auction?.currentPrice)
  const minimumBidIncrement = Number(auction?.minimumBidIncrement)
  if (auction?.leadingBid && Number.isFinite(currentPrice) && Number.isFinite(minimumBidIncrement)) {
    return currentPrice + minimumBidIncrement
  }

  const startingPrice = Number(auction?.startingPrice)
  if (Number.isFinite(startingPrice) && startingPrice > 0) {
    return startingPrice
  }

  return Number.isFinite(currentPrice) ? currentPrice : 0
}

const syncBidInput = (auction) => {
  if (!bidAmountInput) {
    return
  }

  const minimumBidAmount = getMinimumBidAmount(auction)
  if (!Number.isFinite(minimumBidAmount) || minimumBidAmount <= 0) {
    return
  }

  bidAmountInput.min = minimumBidAmount

  const currentValue = Number(bidAmountInput.value)
  if (!Number.isFinite(currentValue) || currentValue < minimumBidAmount) {
    bidAmountInput.value = minimumBidAmount
  }
}

const renderHistory = (history = []) => {
  if (!bidHistoryEl || !bidHistoryEmptyEl) {
    return
  }

  bidHistoryEl.innerHTML = ''
  bidHistoryEmptyEl.classList.toggle('hidden', history.length > 0)

  history.forEach((bid) => {
    const item = document.createElement('article')
    item.className = 'rounded-xl border px-4 py-3 text-sm'
    item.classList.add(
      ...(bid.winning
        ? ['border-emerald-600/30', 'bg-emerald-950/20']
        : ['border-slate-800', 'bg-slate-950']),
    )

    item.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <strong>${formatPrice(bid.amount)}</strong>
        <span class="text-xs text-slate-400">#${bid.sequenceNumber}</span>
      </div>
      <p class="mt-1 text-xs text-slate-400">${bid.bidderEmail || '-'}</p>
      <p class="mt-1 text-xs text-slate-500">${formatDate(bid.submittedAt)}</p>
      ${bid.winning ? '<p class="mt-1 text-xs text-emerald-300">Bid tertinggi</p>' : ''}
    `

    bidHistoryEl.appendChild(item)
  })
}

const applyBidConstraint = (auction) => {
  const user = getUser()
  const canBidStatus = auction?.status === 'ACTIVE' || auction?.status === 'EXTENDED'
  const isBuyer = user?.role === 'BUYER'

  if (!canBidStatus) {
    setBidEnabled(false)
    bidError.textContent = 'Lelang tidak menerima bid pada status saat ini.'
    return
  }

  if (!isBuyer) {
    setBidEnabled(false)
    bidError.textContent = 'Hanya akun BUYER yang dapat mengajukan penawaran.'
    return
  }

  setBidEnabled(true)
  bidError.textContent = ''
}

let currentAuction = null

const loadAuctionDetail = async () => {
  if (!auctionId) {
    detailErrorBox?.classList.remove('hidden')
    if (detailErrorMessage) {
      detailErrorMessage.textContent = 'ID lelang tidak ditemukan.'
    }
    setBidEnabled(false)
    return
  }

  detailErrorBox?.classList.add('hidden')
  bidSuccess.textContent = ''

  try {
    const [auction, history] = await Promise.all([
      request(`/auctions/${auctionId}`, { auth: false }),
      request(`/auctions/${auctionId}/bids`, { auth: false }),
    ])
    currentAuction = auction

    titleEl.textContent = auction?.title || 'Lelang'
    descriptionEl.textContent = auction?.description || ''
    statusEl.textContent = statusLabel[auction?.status] || auction?.status || '-'
    currentPriceEl.textContent = formatPrice(auction?.currentPrice)
    minimumBidEl.textContent = formatPrice(getMinimumBidAmount(auction))
    endsAtEl.textContent = formatDate(auction?.endsAt)
    syncBidInput(auction)

    renderHistory(Array.isArray(history) ? history : [])
    applyBidConstraint(auction)
  } catch (error) {
    detailErrorBox?.classList.remove('hidden')
    if (detailErrorMessage) {
      detailErrorMessage.textContent = error.message || 'Gagal memuat detail lelang.'
    }
    setBidEnabled(false)
  }
}

if (bidForm) {
  bidForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    bidError.textContent = ''
    bidSuccess.textContent = ''

    if (!currentAuction) {
      bidError.textContent = 'Data lelang belum siap.'
      return
    }

    const amount = Number(bidAmountInput?.value || 0)
    const minimum = getMinimumBidAmount(currentAuction)
    const user = getUser()

    if (!Number.isFinite(amount) || amount <= 0) {
      bidError.textContent = 'Nominal bid tidak valid.'
      return
    }

    if (amount < minimum) {
      bidError.textContent = `Bid minimal ${formatPrice(minimum)}.`
      return
    }

    if (Number(user?.availableBalance || 0) < amount) {
      bidError.textContent = 'Saldo tidak cukup untuk mengajukan bid.'
      return
    }

    setBidEnabled(false)
    bidSubmit.textContent = 'Mengirim...'

    try {
      await request(`/auctions/${auctionId}/bids`, {
        method: 'POST',
        auth: true,
        body: JSON.stringify({ amount }),
      })
      bidSuccess.textContent = 'Bid berhasil diajukan.'
      await loadAuctionDetail()
    } catch (error) {
      const message = error.message || 'Gagal mengajukan bid.'

      if (error.status === 409) {
        try {
          await loadAuctionDetail()
        } catch {
          // Keep showing the server rejection even if the refresh fails.
        }
      }

      applyBidConstraint(currentAuction)
      bidError.textContent = error.status === 409
        ? `${message}. Bid minimum terbaru sudah dimuat ulang.`
        : message
    } finally {
      bidSubmit.textContent = 'Ajukan Penawaran'
    }
  })
}

if (refreshButton) {
  refreshButton.addEventListener('click', () => {
    loadAuctionDetail()
  })
}

loadAuctionDetail()
window.setInterval(loadAuctionDetail, 5000)
