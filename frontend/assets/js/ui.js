import { getUser, setToken, setUser } from './api.js'

const navContainer = document.querySelector('#nav-links')
const createListingLink = document.querySelector('#create-listing-link')

const buildNav = (user) => {
  if (!navContainer) {
    return
  }

  navContainer.innerHTML = ''

  const links = []

  links.push({ label: 'Listings', href: '/pages/listings.html' })

  if (user?.role === 'SELLER') {
    links.push({ label: 'Create Listing', href: '/pages/create-listing.html' })
  }

  if (user) {
    links.push({ label: 'Logout', href: '#logout' })
  } else {
    links.push({ label: 'Login', href: '/pages/login.html' })
  }

  links.forEach((link) => {
    if (link.href === '#logout') {
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = link.label
      button.className = 'text-sm text-slate-300 hover:text-white'
      button.addEventListener('click', () => {
        setToken('')
        setUser(null)
        window.location.href = '/pages/login.html'
      })
      navContainer.appendChild(button)
      return
    }

    const anchor = document.createElement('a')
    anchor.href = link.href
    anchor.textContent = link.label
    anchor.className = 'text-sm text-slate-300 hover:text-white'
    navContainer.appendChild(anchor)
  })
}

const user = getUser()

if (createListingLink) {
  if (user?.role !== 'SELLER') {
    createListingLink.classList.add('hidden')
  }
}

buildNav(user)
