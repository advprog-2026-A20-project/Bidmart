import { request, setToken, setUser } from './api.js'

const loginForm = document.querySelector('#login-form')
const registerForm = document.querySelector('#register-form')

const handleError = (elementId, message) => {
  const target = document.querySelector(elementId)
  if (target) {
    target.textContent = message
  }
}

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    handleError('#login-error', '')

    const formData = new FormData(loginForm)
    const payload = {
      email: formData.get('email'),
      password: formData.get('password'),
    }

    try {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      setToken(data.accessToken)
      setUser(data.user)
      window.location.href = '/pages/listings.html'
    } catch (error) {
      handleError('#login-error', error.message)
    }
  })
}

if (registerForm) {
  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    handleError('#register-error', '')

    const formData = new FormData(registerForm)
    const payload = {
      email: formData.get('email'),
      password: formData.get('password'),
      role: formData.get('role'),
    }

    try {
      await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      window.location.href = '/pages/login.html'
    } catch (error) {
      handleError('#register-error', error.message)
    }
  })
}
