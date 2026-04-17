import { Link, useParams } from 'react-router-dom'
import AuctionInfoPanel from '../components/auction/AuctionInfoPanel.jsx'
import AuctionMainPanel from '../components/auction/AuctionMainPanel.jsx'
import AuctionStatusTabs from '../components/auction/AuctionStatusTabs.jsx'
import BidHistoryPanel from '../components/auction/BidHistoryPanel.jsx'
import useAuctionDetail from '../hooks/useAuctionDetail.js'
import useAuth from '../hooks/useAuth.js'
import { routes } from '../router/routes.js'
import { getStatusLelangLabel } from '../utils/lelang.js'

const AuctionDetailPage = () => {
  const { auctionId } = useParams()
  const { token, user, setAuth } = useAuth()
  const {
    auction,
    bidHistory,
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
    bidLockMessage,
    submitBidForm,
    reloadAuction,
  } = useAuctionDetail({
    auctionId,
    token,
    user,
    setAuth,
  })

  if (isLoading) {
    return (
      <main className="page">
        <section className="panel hero-panel lelang-header-panel">
          <span className="eyebrow">Lelang</span>
          <h1 className="page-title">Memuat detail lelang...</h1>
          <p className="muted">Mengambil data terbaru penawaran dan status lelang.</p>
        </section>
      </main>
    )
  }

  if (error || !auction) {
    return (
      <main className="page">
        <section className="panel hero-panel lelang-header-panel">
          <span className="eyebrow">Lelang</span>
          <h1 className="page-title">Detail lelang tidak tersedia</h1>
          <p className="alert">{error || 'Lelang tidak ditemukan.'}</p>
          <button className="button button-secondary" type="button" onClick={() => reloadAuction()}>
            Coba Muat Ulang
          </button>
          <Link className="button button-secondary" to={routes.listings}>
            Kembali ke Listings
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="page">
      <section className="panel hero-panel lelang-header-panel">
        <div className="lelang-breadcrumb">
          <Link className="eyebrow-link" to={routes.listings}>
            Listings
          </Link>
          <span>/</span>
          <span>Detail Lelang</span>
        </div>
        <h1 className="page-title">{auction.title}</h1>
        <p className="page-subtitle">{auction.description}</p>
        <div className="lelang-header-status">
          <span className="status-chip">{getStatusLelangLabel(auction.status)}</span>
        </div>
      </section>

      <AuctionStatusTabs status={auction.status} />

      <section className="lelang-grid">
        <AuctionMainPanel
          auction={auction}
          bidAmount={bidAmount}
          setBidAmount={setBidAmount}
          submitBidForm={submitBidForm}
          canBid={canBid}
          bidLockMessage={bidLockMessage}
          isSubmittingBid={isSubmittingBid}
          clockTick={clockTick}
          actionError={actionError}
          successMessage={successMessage}
          extensionNotice={extensionNotice}
        />

        <BidHistoryPanel bidHistory={bidHistory} clockTick={clockTick} />

        <AuctionInfoPanel
          auction={auction}
          user={user}
          notificationsEnabled={notificationsEnabled}
          setNotificationsEnabled={setNotificationsEnabled}
        />
      </section>
    </main>
  )
}

export default AuctionDetailPage
