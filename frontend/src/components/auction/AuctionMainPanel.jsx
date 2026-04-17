import { formatHitungMundur, formatRupiah } from '../../utils/lelang.js'

const AuctionMainPanel = ({
  auction,
  bidAmount,
  setBidAmount,
  submitBidForm,
  canBid,
  bidLockMessage,
  isSubmittingBid,
  clockTick,
  actionError,
  successMessage,
  extensionNotice,
}) => {
  const currentHighestBid = auction?.leadingBid?.amount ?? auction?.currentPrice ?? auction?.startingPrice

  return (
    <article className="panel bid-panel lelang-main-panel">
      <p className="section-kicker">Panel Lelang</p>
      <div className="lelang-cover" role="img" aria-label={`Barang lelang ${auction.title}`}>
        <span>{(auction.title || 'Bidmart').charAt(0).toUpperCase()}</span>
      </div>

      <div className="lelang-live-price">
        <span>Penawaran tertinggi saat ini</span>
        <strong>{formatRupiah(currentHighestBid)}</strong>
      </div>

      <div className="lelang-timer">
        <span>Sisa waktu lelang</span>
        <strong>{formatHitungMundur(auction.endsAt, clockTick)}</strong>
      </div>

      {extensionNotice && (
        <p className="lelang-extension-indicator">{extensionNotice}</p>
      )}

      <form className="stack-gap" onSubmit={submitBidForm}>
        <label className="field">
          <span>Masukkan nominal bid</span>
          <input
            className="input"
            type="number"
            min={Number(auction.nextMinimumBid ?? 0)}
            step="0.01"
            value={bidAmount}
            onChange={(event) => setBidAmount(event.target.value)}
            disabled={!canBid || isSubmittingBid}
            required
          />
        </label>
        <p className="muted">
          Bid minimal: <strong>{formatRupiah(auction.nextMinimumBid)}</strong>
        </p>
        <button className="button" type="submit" disabled={!canBid || isSubmittingBid}>
          {isSubmittingBid ? 'Mengajukan penawaran...' : 'Ajukan Penawaran'}
        </button>
      </form>

      {!canBid && (
        <p className="muted lelang-disabled-message">{bidLockMessage}</p>
      )}
      {actionError && <p className="alert">{actionError}</p>}
      {successMessage && <p className="lelang-success">{successMessage}</p>}
    </article>
  )
}

export default AuctionMainPanel
