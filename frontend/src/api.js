import axios from 'axios'

const baseURL = import.meta.env.VITE_BACKEND_BASE_URL || ''

const http = axios.create({ baseURL, timeout: 15000 })

export async function fetchApiKeyStats() {
  const response = await http.get('/api/stats')
  return response.data
}
