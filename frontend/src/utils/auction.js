const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const statusLabels = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  EXTENDED: 'Extended',
  CLOSED: 'Closed',
  WON: 'Won',
  UNSOLD: 'Unsold',
}

export const formatCurrency = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '-'
  }

  return currencyFormatter.format(Number(value))
}

export const formatDateTime = (value) => {
  if (!value) {
    return 'Not scheduled yet'
  }

  return dateFormatter.format(new Date(value))
}

export const formatTimeRemaining = (value, now = Date.now()) => {
  if (!value) {
    return 'Draft'
  }

  const remaining = new Date(value).getTime() - now
  if (remaining <= 0) {
    return 'Ended'
  }

  const totalSeconds = Math.floor(remaining / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  }

  return `${minutes}m ${seconds}s`
}

export const getStatusLabel = (status) => {
  return statusLabels[status] || status || 'Unknown'
}

export const isAuctionOpen = (status) => {
  return status === 'ACTIVE' || status === 'EXTENDED'
}

