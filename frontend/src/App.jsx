import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import PrivateRoute from './components/PrivateRoute.jsx'
import AuctionDetailPage from './pages/AuctionDetailPage.jsx'
import CreateListingPage from './pages/CreateListingPage.jsx'
import ListingsPage from './pages/ListingsPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import { routes } from './router/routes.js'

const LegacyAuctionRedirect = () => {
  const { auctionId } = useParams()
  return <Navigate to={routes.auctionDetail(auctionId)} replace />
}

const App = () => {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to={routes.listings} replace />} />
        <Route path={routes.login} element={<LoginPage />} />
        <Route path={routes.register} element={<RegisterPage />} />
        <Route path={routes.listings} element={<ListingsPage />} />
        <Route path={routes.lelangHome} element={<ListingsPage />} />
        <Route path={routes.auctionDetail()} element={<AuctionDetailPage />} />
        <Route path={routes.legacyAuctionDetail()} element={<LegacyAuctionRedirect />} />
        <Route
          path={routes.createListing}
          element={(
            <PrivateRoute>
              <CreateListingPage />
            </PrivateRoute>
          )}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
