import { formatRupiah, formatTanggalWaktu, formatWaktuRelatif } from '../../utils/lelang.js'

const BidHistoryPanel = ({ bidHistory, clockTick }) => {
  return (
    <article className="panel bid-panel lelang-history-panel">
      <div className="panel-header">
        <p className="section-kicker">Riwayat Penawaran</p>
        <h2 className="section-title">Pergerakan bid terbaru</h2>
      </div>

      {bidHistory.length === 0 && (
        <div className="empty-card">
          <strong>Belum ada penawaran</strong>
          <p>Jadilah penawar pertama ketika lelang sudah aktif.</p>
        </div>
      )}

      {bidHistory.length > 0 && (
        <div className="history-list">
          {bidHistory.map((bid) => (
            <article className={`history-item${bid.winning ? ' history-item-active' : ''}`} key={bid.id}>
              <div>
                <span className="history-sequence">#{bid.sequenceNumber}</span>
                <strong>{bid.bidderEmail}</strong>
                <p>{formatWaktuRelatif(bid.submittedAt, clockTick)}</p>
                <p>{formatTanggalWaktu(bid.submittedAt)}</p>
              </div>
              <div className="history-amount">
                <strong>{formatRupiah(bid.amount)}</strong>
                {bid.winning && <span>Bid tertinggi</span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </article>
  )
}

export default BidHistoryPanel
