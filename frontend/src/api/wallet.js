import client from './client.js'

export const getWalletBalance = async () => {
  const response = await client.get('/wallet/balance')
  return response.data
}

export const topUpWallet = async (amount) => {
  const response = await client.post('/wallet/topup', {
    amount,
  })
  return response.data
}

export const getTransactionHistory = async () => {
  const response = await client.get('/wallet/transactions')
  return response.data
}
