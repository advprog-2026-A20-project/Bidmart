import client from './client.js'

export const login = async (email, password) => {
  const response = await client.post('/auth/login', { email, password })
  return response.data
}

export const register = async (email, password, role) => {
  const response = await client.post('/auth/register', { email, password, role })
  return response.data
}
