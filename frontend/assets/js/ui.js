import { getUser, setToken, setUser } from './api.js'

const navContainer = document.querySelector('#navbar')
const footerContainer = document.querySelector('#footer')
const createListingLink = document.querySelector('#create-listing-link')

const getCurrentPath = () => window.location.pathname

const isActive = (href) => getCurrentPath().endsWith(href)

const ensureToastRoot = () => {
  let root = document.querySelector('#toast-root')
  if (root) {
    return root
  }

  root = document.createElement('div')
  root.id = 'toast-root'
  root.className = 'fixed right-4 top-4 z-50 flex w-[min(360px,90vw)] flex-col gap-2'
  document.body.appendChild(root)
  return root
}

export const showToast = (type, message) => {
  const root = ensureToastRoot()
  const toast = document.createElement('div')
  const variants = {
    success: 'border-emerald-400/40 bg-emerald-500/20 text-emerald-100',
    error: 'border-rose-400/40 bg-rose-500/20 text-rose-100',
    info: 'border-slate-400/40 bg-slate-500/20 text-slate-100',
  }
  const style = variants[type] || variants.info

  toast.className = `rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${style}`
  toast.textContent = message

  root.appendChild(toast)

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-x-2')
    toast.addEventListener('transitionend', () => toast.remove())
  }, 2500)
}

const buildNavbar = (user) => {
  if (!navContainer) {
    return
  }

  navContainer.innerHTML = `
    <header class="border-b border-slate-900">
      <nav class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <a class="text-lg font-semibold" href="/pages/listings.html">Bidmart</a>
        <div class="flex flex-wrap items-center gap-3 text-sm" id="nav-links"></div>
      </nav>
    </header>
  `

  const linksContainer = navContainer.querySelector('#nav-links')
  if (!linksContainer) {
    return
  }

  const links = []
  links.push({ label: 'Listings', href: '/pages/listings.html' })

  if (user?.role === 'SELLER') {
    links.push({ label: 'Create Listing', href: '/pages/create-listing.html' })
  }

  if (!user) {
    links.push({ label: 'Login', href: '/pages/login.html' })
    links.push({ label: 'Register', href: '/pages/register.html' })
  }

  links.forEach((link) => {
    const anchor = document.createElement('a')
    anchor.href = link.href
    anchor.textContent = link.label
    anchor.className = `text-sm ${isActive(link.href) ? 'text-white' : 'text-slate-300 hover:text-white'}`
    linksContainer.appendChild(anchor)
  })

  if (user) {
    const badge = document.createElement('span')
    badge.className = 'rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-200'
    badge.textContent = user.email || user.role || 'User'
    linksContainer.appendChild(badge)

    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = 'Logout'
    button.className = 'text-sm text-slate-300 hover:text-white'
    button.addEventListener('click', () => {
      setToken('')
      setUser(null)
      window.location.href = '/pages/login.html'
    })
    linksContainer.appendChild(button)
  }
}

const buildFooter = () => {
  if (!footerContainer) {
    return
  }

  footerContainer.innerHTML = `
    <footer class="border-t border-slate-900">
      <div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-6 py-4 text-sm text-slate-400">
        <span>Bidmart Demo</span>
        <span>Frontend milestone</span>
      </div>
    </footer>
  `
}

const user = getUser()

if (createListingLink && user?.role !== 'SELLER') {
  createListingLink.classList.add('hidden')
}

buildNavbar(user)
buildFooter()
