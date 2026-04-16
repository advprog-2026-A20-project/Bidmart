import { getUser, setToken, setUser } from './api.js'

const navContainer = document.querySelector('#navbar')
const footerContainer = document.querySelector('#footer')
const createListingLink = document.querySelector('#create-listing-link')

const getCurrentPath = () => window.location.pathname

const isActive = (href) => getCurrentPath().endsWith(href)

const ensureToastRoot = () => {
  let root = document.querySelector('#toast-root')
  if (root) return root

  root = document.createElement('div')
  root.id = 'toast-root'
  root.className = 'fixed right-4 top-4 z-50 flex w-[min(360px,90vw)] flex-col gap-2'
  document.body.appendChild(root)
  return root
}

export const showToast = (type, message) => {
  const root = ensureToastRoot()
  const toast = document.createElement('div')

  const icons = {
    success: `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`,
    error: `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`,
    info: `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  }

  const variants = {
    success: 'border-emerald-500/30 bg-emerald-950/90 text-emerald-200',
    error: 'border-rose-500/30 bg-rose-950/90 text-rose-200',
    info: 'border-slate-500/30 bg-slate-900/95 text-slate-200',
  }

  const style = variants[type] || variants.info
  const icon = icons[type] || icons.info

  toast.className = `flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl ${style}`
  toast.style.cssText = 'transform:translateX(110%);opacity:0;transition:transform 0.35s cubic-bezier(0.34,1.56,0.64,1),opacity 0.3s ease;'
  toast.innerHTML = `${icon}<span>${message}</span>`

  root.appendChild(toast)

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)'
      toast.style.opacity = '1'
    })
  })

  setTimeout(() => {
    toast.style.transform = 'translateX(8px)'
    toast.style.opacity = '0'
    toast.addEventListener('transitionend', () => toast.remove(), { once: true })
  }, 3000)
}

const buildNavbar = (user) => {
  if (!navContainer) return

  navContainer.innerHTML = `
    <header class="sticky top-0 z-50 border-b border-white/[0.06] bg-slate-950/85 backdrop-blur-xl">
      <nav class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <a class="flex items-center gap-2.5 no-underline" href="/pages/listings.html">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-500/25 bg-indigo-500/15">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
            </svg>
          </div>
          <span class="bg-gradient-to-br from-white to-slate-400 bg-clip-text text-base font-bold text-transparent">Bidmart</span>
        </a>
        <div class="flex items-center gap-1" id="nav-links"></div>
      </nav>
    </header>
  `

  const linksContainer = navContainer.querySelector('#nav-links')
  if (!linksContainer) return

  const links = []
  links.push({ label: 'Lelang', href: '/pages/lelang.html' })
  links.push({ label: 'Listings', href: '/pages/listings.html' })
  links.push({ label: 'Wallet', href: '/pages/wallet.html' })

  if (user?.role === 'SELLER') {
    links.push({ label: '+ Create', href: '/pages/create-listing.html', cta: true })
  }

  if (!user) {
    links.push({ label: 'Login', href: '/pages/login.html' })
    links.push({ label: 'Register', href: '/pages/register.html' })
  }

  links.forEach((link) => {
    const anchor = document.createElement('a')
    anchor.href = link.href
    anchor.textContent = link.label
    const active = isActive(link.href)

    if (link.cta) {
      anchor.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold border border-indigo-500/25 bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 transition-all'
    } else if (active) {
      anchor.className = 'px-3 py-1.5 rounded-lg text-sm font-medium bg-white/10 text-white transition-all'
    } else {
      anchor.className = 'px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all'
    }

    linksContainer.appendChild(anchor)
  })

  if (user) {
    const sep = document.createElement('div')
    sep.className = 'mx-1 h-4 w-px bg-white/10'
    linksContainer.appendChild(sep)

    const badge = document.createElement('a')
    badge.href = '/pages/profile.html'
    badge.className = 'hidden sm:inline-flex px-2.5 py-1 rounded-full text-xs border border-slate-700/60 bg-slate-800/80 text-slate-400 hover:text-white hover:bg-white/10 transition-all'
    badge.textContent = user.email || user.role || 'User'
    linksContainer.appendChild(badge)

    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = 'Logout'
    button.className = 'px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all'
    button.addEventListener('click', () => {
      setToken('')
      setUser(null)
      window.location.href = '/pages/login.html'
    })
    linksContainer.appendChild(button)
  }
}

const buildFooter = () => {
  if (!footerContainer) return

  footerContainer.innerHTML = `
    <footer class="mt-16 border-t border-white/[0.04]">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-2 px-6 py-5">
        <span class="text-sm font-semibold text-slate-600">Bidmart</span>
        <span class="text-xs text-slate-700">© 2025 Frontend Demo</span>
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
