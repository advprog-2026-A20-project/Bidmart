import { getUser, request } from './api.js'
import { showToast } from './ui.js'

const balanceEl = document.querySelector('#wallet-balance')
const summaryBalanceEl = document.querySelector('#summary-balance')
const summaryCountEl = document.querySelector('#summary-count')
const loadingEl = document.querySelector('#wallet-loading')
const bodyEl = document.querySelector('#transactions-body')
const emptyEl = document.querySelector('#transactions-empty')
const form = document.querySelector('#topup-form')
const amountInput = document.querySelector('#topup-amount')
const errorEl = document.querySelector('#wallet-error')

const user = getUser()
if (!user) {
  window.location.href = '/pages/login.html'
}

const formatCurrency = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value)
}

const formatDate = (value) => {
  return new Date(value).toLocaleString('id-ID')
}

const renderTransactions = (transactions) => {
  bodyEl.innerHTML = ''
  if (!transactions || transactions.length === 0) {
    emptyEl.classList.remove('hidden')
    return
  }

  emptyEl.classList.add('hidden')
  transactions.forEach((tx) => {
    const row = document.createElement('tr')
    row.className = 'border-b border-slate-800'
    row.innerHTML = `
      <td class="px-4 py-4 font-medium text-slate-100">${tx.type}</td>
      <td class="px-4 py-4">${formatCurrency(tx.amount)}</td>
      <td class="px-4 py-4">${formatCurrency(tx.balanceAfter)}</td>
      <td class="px-4 py-4 text-slate-400">${formatDate(tx.createdAt)}</td>
    `
    bodyEl.appendChild(row)
  })
}

const loadWallet = async () => {
  try {
    loadingEl.textContent = 'Loading...'
    const balanceData = await request('/wallet/balance', { auth: true })
    const transactions = await request('/wallet/transactions', { auth: true })

    const balance = balanceData.balance || 0
    balanceEl.textContent = formatCurrency(balance)
    summaryBalanceEl.textContent = formatCurrency(balance)
    summaryCountEl.textContent = transactions.length
    renderTransactions(transactions)
  } catch (error) {
    showToast('error', error.message)
  } finally {
    loadingEl.textContent = ''
  }
}

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    errorEl.textContent = ''

    const amount = Number(amountInput.value)
    if (!amount || amount <= 0) {
      errorEl.textContent = 'Masukkan jumlah top up yang valid.'
      return
    }

    try {
      const data = await request('/wallet/topup', {
        method: 'POST',
        body: JSON.stringify({ amount }),
        auth: true,
      })

      amountInput.value = ''
      showToast('success', 'Top up berhasil')
      loadWallet()
    } catch (error) {
      errorEl.textContent = error.message
      showToast('error', error.message)
    }
  })
}

loadWallet()
