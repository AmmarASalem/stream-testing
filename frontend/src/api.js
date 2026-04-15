const BASE = 'http://localhost:3001'

let _user = null
export function setUser(user) { _user = user }

export async function api(path, { body, method, ...opts } = {}) {
  const headers = {
    'x-user-id': _user?.id || '',
    'x-user-role': _user?.role || '',
    ...opts.headers
  }

  let finalBody = body
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
    finalBody = JSON.stringify(body)
  }

  const res = await fetch(`${BASE}${path}`, {
    method: method || (body ? 'POST' : 'GET'),
    headers,
    body: finalBody
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Request failed')
  return data
}
