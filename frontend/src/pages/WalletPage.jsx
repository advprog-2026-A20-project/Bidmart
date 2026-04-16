import { useEffect, useState } from 'react'
import {
  getWalletBalance,
  topUpWallet,
  getTransactionHistory,
} from '../api/wallet.js'
import '../styles/WalletPage.css'

const WalletPage = () => {
  const [balance, setBalance] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [isLoadingBalance, setIsLoadingBalance] = useState(true)
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true)
  const [error, setError] = useState('')
  const [topUpAmount, setTopUpAmount] = useState('')
  const [isTopping, setIsTopping] = useState(false)

  useEffect(() => {
    loadWalletData()
  }, [])

  const loadWalletData = async () => {
    try {
      setError('')
      setIsLoadingBalance(true)
      const balanceData = await getWalletBalance()
      setBalance(balanceData.balance)

      setIsLoadingTransactions(true)
      const transactionsData = await getTransactionHistory()
      setTransactions(Array.isArray(transactionsData) ? transactionsData : [])
    } catch (err) {
      const message = err?.response?.data?.message || 'Failed to load wallet data'
      setError(message)
    } finally {
      setIsLoadingBalance(false)
      setIsLoadingTransactions(false)
    }
  }

  const handleTopUp = async (e) => {
    e.preventDefault()
    setError('')

    if (!topUpAmount || parseFloat(topUpAmount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    try {
      setIsTopping(true)
      const result = await topUpWallet(parseFloat(topUpAmount))
      setBalance(result.balance)
      setTopUpAmount('')
      await loadWalletData()
    } catch (err) {
      const message = err?.response?.data?.message || 'Failed to top up wallet'
      setError(message)
    } finally {
      setIsTopping(false)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('id-ID')
  }

  return (
    <main className="wallet-container">
      <h1>Dompet Saya</h1>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      {/* Balance Section */}
      <section className="balance-section">
        <h2>Saldo Tersedia</h2>
        {isLoadingBalance ? (
          <p>Loading...</p>
        ) : (
          <div className="balance-display">
            <p className="balance-amount">{formatCurrency(balance || 0)}</p>
          </div>
        )}
      </section>

      {/* Top Up Section */}
      <section className="topup-section">
        <h2>Top Up Saldo</h2>
        <form onSubmit={handleTopUp} className="topup-form">
          <div className="form-group">
            <label htmlFor="topup-amount">Jumlah Top Up (IDR)</label>
            <input
              id="topup-amount"
              type="number"
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
              placeholder="Masukkan jumlah"
              min="0"
              step="1000"
              disabled={isTopping}
            />
          </div>
          <button type="submit" disabled={isTopping}>
            {isTopping ? 'Processing...' : 'Top Up'}
          </button>
        </form>
      </section>

      {/* Transaction History Section */}
      <section className="transactions-section">
        <h2>Riwayat Transaksi</h2>
        {isLoadingTransactions ? (
          <p>Loading...</p>
        ) : transactions.length === 0 ? (
          <p>No transactions yet</p>
        ) : (
          <div className="transactions-table">
            <table>
              <thead>
                <tr>
                  <th>Jenis</th>
                  <th>Jumlah</th>
                  <th>Saldo Akhir</th>
                  <th>Keterangan</th>
                  <th>Waktu</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <span className={`transaction-type ${tx.type.toLowerCase()}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td>{formatCurrency(tx.amount)}</td>
                    <td>{formatCurrency(tx.balanceAfter)}</td>
                    <td>{tx.description}</td>
                    <td>{formatDate(tx.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}

export default WalletPage
