import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { register } from '../api/auth.js'
import { routes } from '../router/routes.js'

const RegisterPage = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('BUYER')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await register(email, password, role)
      navigate(routes.login)
    } catch (err) {
      const message = err?.response?.data?.message || 'Register failed'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main>
      <h1>Register</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <label>
          Role
          <select
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            <option value="BUYER">BUYER</option>
            <option value="SELLER">SELLER</option>
          </select>
        </label>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Registering...' : 'Register'}
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
    </main>
  )
}

export default RegisterPage
