import client from './client.js'

export const login = async (email, password) => {
  const response = await client.post('/auth/login', { email, password })
  const { accessToken } = response.data

  if (accessToken) {
    localStorage.setItem('accessToken', accessToken)
  }

  return response.data
}
