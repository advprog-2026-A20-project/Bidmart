import { Navigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'
import { routes } from '../router/routes.js'

const PrivateRoute = ({ children }) => {
  const { token } = useAuth()

  if (!token) {
    return <Navigate to={routes.login} replace />
  }

  return children
}

export default PrivateRoute
