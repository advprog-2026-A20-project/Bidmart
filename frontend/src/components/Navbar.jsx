import { Link, useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'
import { routes } from '../router/routes.js'

const Navbar = () => {
  const navigate = useNavigate()
  const { user, token, logout } = useAuth()
  const isSeller = user?.role === 'SELLER'

  const handleLogout = () => {
    logout()
    navigate(routes.login)
  }

  return (
    <nav>
      <Link to={routes.listings}>Listings</Link>
      {isSeller && <Link to={routes.createListing}>Create Listing</Link>}
      <Link to={routes.wallet}>Wallet</Link>
      {!token && <Link to={routes.login}>Login</Link>}
      {token && (
        <button type="button" onClick={handleLogout}>
          Logout
        </button>
      )}
    </nav>
  )
}

export default Navbar
