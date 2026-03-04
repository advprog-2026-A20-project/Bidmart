import { request } from './api.js'

const form = document.querySelector('#create-listing-form')
const errorState = document.querySelector('#create-listing-error')

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    errorState.textContent = ''

    const formData = new FormData(form)
    const payload = {
      title: formData.get('title'),
      description: formData.get('description'),
      price: Number(formData.get('price')),
    }

    try {
      await request('/listings', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      window.location.href = '/pages/listings.html'
    } catch (error) {
      errorState.textContent = error.message
    }
  })
}
