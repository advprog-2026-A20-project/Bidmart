import { formatRupiah, formatTanggalWaktu, getStatusLelangLabel } from '../../utils/lelang.js'

const renderHasilAkhir = (auction, user) => {
  if (!auction) {
    return null
  }

  if (auction.status === 'WON' && auction.winningBid) {
    const isUserWinner = Boolean(user?.id && user.id === auction.winningBid.bidderId)
    if (isUserWinner) {
      return <p className="lelang-success">Anda memenangkan lelang ini.</p>
    }

    return (
      <p className="muted">
        Pemenang: <strong>{auction.winningBid.bidderEmail}</strong> (
        {formatRupiah(auction.winningBid.amount)})
      </p>
    )
  }

  if (auction.status === 'UNSOLD') {
    return (
      <p className="muted">
        Lelang ditutup tanpa pemenang karena reserve price tidak tercapai.
      </p>
    )
  }

  if (auction.status === 'CLOSED') {
    return (
      <p className="muted">
        Lelang sudah ditutup dan menunggu status akhir.
      </p>
    )
  }

  return null
}

const AuctionInfoPanel = ({
  auction,
  user,
  notificationsEnabled,
  setNotificationsEnabled,
}) => {
  return (
    <article className="panel bid-panel lelang-info-panel">
      <div className="panel-header">
        <p className="section-kicker">Info & Aktivitas</p>
        <h2 className="section-title">Ringkasan sistem lelang</h2>
      </div>

      <div className="detail-list lelang-detail-list">
        <div>
          <span>Harga awal</span>
          <strong>{formatRupiah(auction.startingPrice)}</strong>
        </div>
        <div>
          <span>Reserve price</span>
          <strong>{formatRupiah(auction.reservePrice)}</strong>
        </div>
        <div>
          <span>Buy now</span>
          <strong>Tidak tersedia</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>{getStatusLelangLabel(auction.status)}</strong>
        </div>
        <div>
          <span>Total bid</span>
          <strong>{auction.totalBids}</strong>
        </div>
        <div>
          <span>Watchers</span>
          <strong>Belum tersedia</strong>
        </div>
        <div>
          <span>Mulai</span>
          <strong>{formatTanggalWaktu(auction.startsAt)}</strong>
        </div>
        <div>
          <span>Berakhir</span>
          <strong>{formatTanggalWaktu(auction.endsAt)}</strong>
        </div>
      </div>

      <label className="toggle-field lelang-notification-toggle">
        <input
          type="checkbox"
          checked={notificationsEnabled}
          onChange={(event) => setNotificationsEnabled(event.target.checked)}
        />
        <span>Aktifkan notifikasi lelang</span>
      </label>
      <p className="muted lelang-note">
        Toggle ini masih UI-only sampai API notifikasi tersedia.
      </p>

      {user?.role === 'BUYER' && (
        <div className="wallet-card">
          <span>Saldo tersedia</span>
          <strong>{formatRupiah(user.availableBalance)}</strong>
          <span>Saldo tertahan</span>
          <strong>{formatRupiah(user.heldBalance)}</strong>
        </div>
      )}

      {renderHasilAkhir(auction, user)}
    </article>
  )
}

export default AuctionInfoPanel
