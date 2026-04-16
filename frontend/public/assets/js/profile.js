import { getUser, setToken, setUser } from './api.js'
import { showToast } from './ui.js'

const emailEl = document.querySelector('#profile-email')
const roleEl = document.querySelector('#profile-role')
const avatarEl = document.querySelector('#profile-avatar')
const placeholderEl = document.querySelector('#profile-placeholder')
const imageInput = document.querySelector('#profile-image-input')
const removeButton = document.querySelector('#profile-remove-photo')
const toggleButton = document.querySelector('#profile-toggle')
const customizeSection = document.querySelector('#profile-customize')
const logoutButton = document.querySelector('#profile-logout')

const getStoredPhoto = () => localStorage.getItem('profileImage')

const setPlaceholderInitial = (email) => {
  if (!placeholderEl) return
  const initial = email?.trim()?.[0]?.toUpperCase() || 'U'
  placeholderEl.textContent = initial
}

const renderPhoto = (dataUrl) => {
  if (!avatarEl || !placeholderEl) return
  if (dataUrl) {
    avatarEl.src = dataUrl
    avatarEl.classList.remove('hidden')
    placeholderEl.classList.add('hidden')
  } else {
    avatarEl.classList.add('hidden')
    placeholderEl.classList.remove('hidden')
  }
}

const setCustomizeVisible = (isVisible) => {
  if (!customizeSection || !toggleButton) return
  customizeSection.classList.toggle('hidden', !isVisible)
  toggleButton.textContent = isVisible ? 'Hide customization' : 'Customize profile'
}

const user = getUser()
if (!user) {
  window.location.href = '/pages/login.html'
}

if (emailEl) emailEl.textContent = user?.email || '-'
if (roleEl) roleEl.textContent = `Role: ${user?.role || '-'}`
setPlaceholderInitial(user?.email)
renderPhoto(getStoredPhoto())
setCustomizeVisible(false)

if (toggleButton) {
  toggleButton.addEventListener('click', () => {
    const isHidden = customizeSection?.classList.contains('hidden')
    setCustomizeVisible(isHidden)
  })
}

if (imageInput) {
  imageInput.addEventListener('change', (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      if (result) {
        localStorage.setItem('profileImage', result)
        renderPhoto(result)
        showToast('success', 'Foto profil diperbarui')
      }
    }
    reader.readAsDataURL(file)
  })
}

if (removeButton) {
  removeButton.addEventListener('click', () => {
    localStorage.removeItem('profileImage')
    renderPhoto('')
    showToast('info', 'Foto profil dihapus')
  })
}

if (logoutButton) {
  logoutButton.addEventListener('click', () => {
    setToken('')
    setUser(null)
    localStorage.removeItem('profileImage')
    window.location.href = '/pages/login.html'
  })
}
