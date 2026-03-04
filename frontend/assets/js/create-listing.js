import { getUser, request } from './api.js'
import { showToast } from './ui.js'

const form = document.querySelector('#create-listing-form')
const errorState = document.querySelector('#create-listing-error')
const warningState = document.querySelector('#seller-warning')

const setSubmitting = (isSubmitting) => {
  if (!form) {
    return
  }
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

const showWarning = (message) => {
  if (!warningState) {
    return
  }
  warningState.textContent = message
  warningState.classList.remove('hidden')
}

const hideWarning = () => {
  if (!warningState) {
    return
  }
  warningState.textContent = ''
  warningState.classList.add('hidden')
}

const guardSeller = () => {
  const user = getUser()
  const token = localStorage.getItem('token')

  if (!token) {
    window.location.href = '/pages/login.html'
    return false
  }

  if (!user || user.role !== 'SELLER') {
    showWarning('Only seller can create listing. Switch to seller account.')
    if (form) {
      form.querySelectorAll('.input-field').forEach((field) => {
        field.disabled = true
      })
      const button = form.querySelector('button[type="submit"]')
      if (button) {
        button.disabled = true
      }
    }
    return false
  }

  hideWarning()
  return true
}

const validatePayload = ({ title, price }) => {
  if (!title) {
    return 'Title is required'
  }
  if (Number.isNaN(price) || price <= 0) {
    return 'Price must be greater than 0'
  }
  return ''
}

if (form) {
  guardSeller()

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    errorState.textContent = ''

    if (!guardSeller()) {
      return
    }

    const formData = new FormData(form)
    const payload = {
      title: formData.get('title')?.trim(),
      description: formData.get('description')?.trim(),
      price: Number(formData.get('price')),
    }

    const validationMessage = validatePayload(payload)
    if (validationMessage) {
      errorState.textContent = validationMessage
      showToast('error', validationMessage)
      return
    }

    try {
      setSubmitting(true)
      await request('/listings', {
        method: 'POST',
        body: JSON.stringify(payload),
        auth: true,
      })

      showToast('success', 'Listing created')
      window.location.href = '/pages/listings.html'
    } catch (error) {
      if (error.status === 403) {
        errorState.textContent = 'Only seller can create listing'
        showToast('error', 'Only seller can create listing')
      } else {
        errorState.textContent = error.message
        showToast('error', error.message)
      }
    } finally {
      setSubmitting(false)
    }
  })
}
