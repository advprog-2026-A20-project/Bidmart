import { Link, NavLink, useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'
import { routes } from '../router/routes.js'
import { formatCurrency } from '../utils/auction.js'

const Navbar = () => {
  const navigate = useNavigate()
  const { user, token, logout } = useAuth()
  const isSeller = user?.role === 'SELLER'

  const handleLogout = () => {
    logout()
    navigate(routes.login)
  }

  return (
    <header className="topbar-shell">
      <nav className="topbar">
        <Link className="brand" to={routes.listings}>
          <span className="brand-mark">B</span>
          <span>Bidmart</span>
        </Link>

        <div className="topbar-actions">
          <NavLink className={({ isActive }) => `nav-pill${isActive ? ' active' : ''}`} to={routes.listings}>
            Listings
          </NavLink>
          {isSeller && (
            <NavLink
              className={({ isActive }) => `nav-pill nav-pill-accent${isActive ? ' active' : ''}`}
              to={routes.createListing}
            >
              + Create
            </NavLink>
          )}
          {!token && (
            <NavLink className={({ isActive }) => `nav-pill${isActive ? ' active' : ''}`} to={routes.login}>
              Login
            </NavLink>
          )}
          {token && (
            <>
              <span className="user-chip">
                {user?.email}
                {user?.role === 'BUYER' && ` · ${formatCurrency(user?.availableBalance)}`}
              </span>
              <button className="nav-link-button" type="button" onClick={handleLogout}>
                Logout
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}

export default Navbar
