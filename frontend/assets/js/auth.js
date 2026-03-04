import { request, setToken, setUser } from './api.js'
import { showToast } from './ui.js'

const loginForm = document.querySelector('#login-form')
const registerForm = document.querySelector('#register-form')

const handleError = (elementId, message) => {
  const target = document.querySelector(elementId)
  if (target) {
    target.textContent = message
  }
}

const setSubmitting = (form, isSubmitting) => {
  const button = form.querySelector('button[type="submit"]')
  const fields = form.querySelectorAll('.input-field')

  if (button) {
    if (!button.dataset.defaultText) {
      button.dataset.defaultText = button.textContent.trim()
    }
    button.textContent = isSubmitting ? 'Loading...' : button.dataset.defaultText
    button.disabled = isSubmitting
  }

  fields.forEach((field) => {
    field.disabled = isSubmitting
  })
}

const clearFieldError = (form) => {
  const fields = form.querySelectorAll('.input-field')
  fields.forEach((field) => {
    field.classList.remove('border-rose-500', 'ring-2', 'ring-rose-200')
  })
}

const applyFieldError = (form) => {
  const fields = form.querySelectorAll('.input-field')
  fields.forEach((field) => {
    field.classList.add('border-rose-500', 'ring-2', 'ring-rose-200')
  })
}

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    handleError('#login-error', '')
    clearFieldError(loginForm)
    setSubmitting(loginForm, true)

    const formData = new FormData(loginForm)
    const payload = {
      email: formData.get('email'),
      password: formData.get('password'),
    }

    try {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
        auth: false,
      })

      setToken(data.accessToken)
      setUser(data.user)
      showToast('success', 'Login berhasil')
      window.location.href = '/pages/listings.html'
    } catch (error) {
      applyFieldError(loginForm)
      handleError('#login-error', error.message)
      showToast('error', error.message)
    } finally {
      setSubmitting(loginForm, false)
    }
  })
}

if (registerForm) {
  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    handleError('#register-error', '')
    clearFieldError(registerForm)
    setSubmitting(registerForm, true)

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
        auth: false,
      })

      showToast('success', 'Register berhasil, silakan login')
      window.location.href = '/pages/login.html'
    } catch (error) {
      applyFieldError(registerForm)
      handleError('#register-error', error.message)
      showToast('error', error.message)
    } finally {
      setSubmitting(registerForm, false)
    }
  })
}
