import client from './client.js'

export const getListings = async () => {
  const response = await client.get('/listings')
  return response.data
}
