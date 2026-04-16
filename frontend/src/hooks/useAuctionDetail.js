import { useEffect, useRef, useState } from 'react'
import { getCurrentUser } from '../api/auth.js'
import { fetchAuctionSnapshot, submitBid } from '../services/auctionService.js'
import { formatRupiah, getStatusLelangLabel, isStatusBukaUntukBid } from '../utils/lelang.js'

const POLLING_INTERVAL_MS = 4000

const useAuctionDetail = ({ auctionId, token, user, setAuth }) => {
  const [auction, setAuction] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmittingBid, setIsSubmittingBid] = useState(false)
  const [bidAmount, setBidAmount] = useState('')
  const [clockTick, setClockTick] = useState(Date.now())
  const [extensionNotice, setExtensionNotice] = useState('')
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const previousEndsAtRef = useRef(null)

  const applyAuctionState = (nextAuction) => {
    const previousEndsAt = previousEndsAtRef.current
    const nextEndsAt = nextAuction?.endsAt ? new Date(nextAuction.endsAt).getTime() : null

    if (previousEndsAt && nextEndsAt && nextEndsAt > previousEndsAt) {
      setExtensionNotice('Lelang diperpanjang karena ada bid pada 2 menit terakhir.')
    }
    previousEndsAtRef.current = nextEndsAt

    setAuction(nextAuction)
    setBidAmount((currentAmount) => {
      const minimumBid = Number(nextAuction?.nextMinimumBid ?? 0)
      if (!currentAmount || Number(currentAmount) < minimumBid) {
        return minimumBid ? String(minimumBid) : ''
      }
      return currentAmount
    })
  }

  const synchronizeAuction = async ({ silent = false, gate } = {}) => {
    if (!silent) {
      setIsLoading(true)
    }

    try {
      const snapshot = await fetchAuctionSnapshot(auctionId)
      if (gate && !gate.current) {
        return null
      }
      setError('')
      applyAuctionState(snapshot)
      return snapshot
    } catch (err) {
      if (gate && !gate.current) {
        return null
      }
      const message = err?.response?.data?.message || err?.response?.data?.detail || 'Gagal memuat detail lelang.'
      setError(message)
      return null
    } finally {
      if (!silent && (!gate || gate.current)) {
        setIsLoading(false)
      }
    }
  }

  const refreshCurrentUser = async () => {
    if (!token) {
      return
    }

    try {
      const latestUser = await getCurrentUser()
      setAuth(token, latestUser)
    } catch {
      // Error refresh user tidak memblokir alur bid.
    }
  }

  useEffect(() => {
    const tickTimer = window.setInterval(() => {
      setClockTick(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(tickTimer)
    }
  }, [])

  useEffect(() => {
    const gate = { current: true }
    synchronizeAuction({ gate })

    const pollTimer = window.setInterval(() => {
      synchronizeAuction({ silent: true, gate })
    }, POLLING_INTERVAL_MS)

    return () => {
      gate.current = false
      window.clearInterval(pollTimer)
    }
  }, [auctionId])

  useEffect(() => {
    if (!extensionNotice) {
      return undefined
    }

    const clearTimer = window.setTimeout(() => {
      setExtensionNotice('')
    }, 6000)

    return () => {
      window.clearTimeout(clearTimer)
    }
  }, [extensionNotice])

  const resolveBidLockMessage = () => {
    if (!auction) {
      return 'Data lelang belum siap.'
    }

    if (!token) {
      return 'Silakan login sebagai pembeli untuk mengajukan penawaran.'
    }

    if (user?.role !== 'BUYER') {
      return 'Hanya akun pembeli yang dapat mengajukan penawaran.'
    }

    if (user?.id && auction?.sellerId && user.id === auction.sellerId) {
      return 'Penjual tidak dapat menawar lelang miliknya sendiri.'
    }

    if (!isStatusBukaUntukBid(auction.status)) {
      if (auction.status === 'DRAFT') {
        return 'Lelang masih berstatus draft. Penawaran belum dibuka.'
      }

      return `Lelang sudah ditutup (${getStatusLelangLabel(auction.status)}).`
    }

    return ''
  }

  const submitBidForm = async (event) => {
    event.preventDefault()
    setActionError('')
    setSuccessMessage('')

    if (!auction) {
      setActionError('Data lelang belum siap.')
      return
    }

    const bidLockMessage = resolveBidLockMessage()
    if (bidLockMessage) {
      setActionError(bidLockMessage)
      return
    }

    const nominalBid = Number(bidAmount)
    if (!Number.isFinite(nominalBid) || nominalBid <= 0) {
      setActionError('Nominal bid harus lebih besar dari 0.')
      return
    }

    const minimumBid = Number(auction.nextMinimumBid ?? 0)
    if (nominalBid < minimumBid) {
      setActionError(`Bid minimal adalah ${formatRupiah(minimumBid)}.`)
      return
    }

    const availableBalance = Number(user?.availableBalance ?? 0)
    if (availableBalance < nominalBid) {
      setActionError('Saldo Anda tidak cukup untuk nominal bid tersebut.')
      return
    }

    setIsSubmittingBid(true)
    try {
      await submitBid(auction.id, nominalBid)
      await synchronizeAuction({ silent: true })
      await refreshCurrentUser()
      setSuccessMessage('Penawaran berhasil diajukan dan data lelang sudah diperbarui.')
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.detail || 'Gagal mengajukan penawaran.'
      setActionError(message)
    } finally {
      setIsSubmittingBid(false)
    }
  }

  const canBid = !resolveBidLockMessage()

  return {
    auction,
    bidHistory: auction?.bidHistory ?? [],
    isLoading,
    error,
    actionError,
    successMessage,
    isSubmittingBid,
    bidAmount,
    setBidAmount,
    clockTick,
    extensionNotice,
    notificationsEnabled,
    setNotificationsEnabled,
    canBid,
    bidLockMessage: resolveBidLockMessage(),
    submitBidForm,
    reloadAuction: synchronizeAuction,
  }
}

export default useAuctionDetail
