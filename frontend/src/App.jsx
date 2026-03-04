import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import PrivateRoute from './components/PrivateRoute.jsx'
import CreateListingPage from './pages/CreateListingPage.jsx'
import ListingsPage from './pages/ListingsPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import { routes } from './router/routes.js'

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={routes.listings} replace />} />
        <Route path={routes.login} element={<LoginPage />} />
        <Route path={routes.register} element={<RegisterPage />} />
        <Route path={routes.listings} element={<ListingsPage />} />
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
