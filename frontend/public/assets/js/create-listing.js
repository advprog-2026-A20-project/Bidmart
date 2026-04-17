import { getUser, request } from './api.js'
import { showToast } from './ui.js'

const form = document.querySelector('#create-listing-form')
const errorState = document.querySelector('#create-listing-error')
const warningState = document.querySelector('#seller-warning')
const categorySelect = document.querySelector('#category')

const flattenCategoryTree = (nodes = [], depth = 0) => {
  return nodes.flatMap((node) => {
    const prefix = depth > 0 ? `${'  '.repeat(depth)}- ` : ''
    const option = {
      value: node.key,
      label: `${prefix}${node.path}`,
    }

    return [option, ...flattenCategoryTree(node.children || [], depth + 1)]
  })
}

const populateCategories = async () => {
  if (!categorySelect) {
    return
  }

  try {
    const tree = await request('/listings/categories/tree', { auth: false })
    const options = flattenCategoryTree(Array.isArray(tree) ? tree : [])
    categorySelect.innerHTML = options
      .map((option) => `<option value="${option.value}">${option.label}</option>`)
      .join('')
  } catch (error) {
    showToast('error', error.message || 'Gagal memuat kategori.')
  }
}

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
    button.textContent = isSubmitting ? 'Saving...' : button.dataset.defaultText
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
    showWarning('Only seller accounts can create auction listings.')
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

const validatePayload = (payload) => {
  if (!payload.title) {
    return 'Title is required.'
  }

  if (!payload.description) {
    return 'Description is required.'
  }

  if (!Number.isFinite(payload.startingPrice) || payload.startingPrice <= 0) {
    return 'Starting price must be greater than 0.'
  }

  if (!Number.isFinite(payload.reservePrice) || payload.reservePrice < payload.startingPrice) {
    return 'Reserve price must be greater than or equal to the starting price.'
  }

  if (!Number.isFinite(payload.minimumBidIncrement) || payload.minimumBidIncrement <= 0) {
    return 'Minimum bid increment must be greater than 0.'
  }

  if (!Number.isFinite(payload.durationMinutes) || payload.durationMinutes < 1) {
    return 'Auction duration must be at least 1 minute.'
  }

  return ''
}

if (form) {
  populateCategories()
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
      imageUrl: formData.get('imageUrl')?.trim() || null,
      category: formData.get('category') || 'OTHER',
      startingPrice: Number(formData.get('startingPrice')),
      reservePrice: Number(formData.get('reservePrice')),
      minimumBidIncrement: Number(formData.get('minimumBidIncrement')),
      durationMinutes: Number(formData.get('durationMinutes')),
      activateNow: formData.get('activateNow') === 'on',
    }

    const validationMessage = validatePayload(payload)
    if (validationMessage) {
      errorState.textContent = validationMessage
      showToast('error', validationMessage)
      return
    }

    try {
      setSubmitting(true)
      const auction = await request('/auctions', {
        method: 'POST',
        body: JSON.stringify(payload),
        auth: true,
      })

      showToast('success', 'Auction listing created successfully.')
      window.location.href = `/pages/listing-detail.html?id=${auction.listingId}`
    } catch (error) {
      errorState.textContent = error.message
      showToast('error', error.message)
    } finally {
      setSubmitting(false)
    }
  })
}
