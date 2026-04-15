const axios = require('axios')
const cheerio = require('cheerio')

async function verifyContractor(contractorId) {
  const id = String(contractorId).trim()

  if (!/^\d+$/.test(id)) {
    return {
      verified: false,
      contractorId: null,
      companyName: null,
      reason: 'invalid_format',
      message: 'Contractor ID must be numeric (e.g. 100005440).'
    }
  }

  let html
  try {
    const response = await axios.get(
      `https://muqawil.org/en/contractors?q=${id}&region_id=`,
      {
        timeout: 12000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        }
      }
    )
    html = response.data
  } catch (err) {
    console.error('Muqawil fetch error:', err.message)
    return {
      verified: false,
      contractorId: null,
      companyName: null,
      reason: 'service_unavailable',
      message: 'Could not reach the contractor verification service. Please try again later.'
    }
  }

  const $ = cheerio.load(html)

  // Flatten page text to find the contractor result
  const pageText = $('body').text().replace(/\s+/g, ' ')

  // Check: does the ID appear as a membership number in the results?
  if (!pageText.includes(id)) {
    return {
      verified: false,
      contractorId: null,
      companyName: null,
      reason: 'not_found',
      message: `No certified contractor found with ID "${id}". Please check your ID and try again.`
    }
  }

  // The page text reads: "... <Company Name> Membership Number <ID> ..."
  // Extract the company name that appears immediately before "Membership Number <ID>"
  const marker = `Membership Number ${id}`
  const markerIdx = pageText.indexOf(marker)
  let companyName = null

  if (markerIdx !== -1) {
    const before = pageText.slice(Math.max(0, markerIdx - 200), markerIdx).trim()
    // Nav bar always ends with "Contract Request" before the company name
    const afterNav = before.includes('Contract Request')
      ? before.split('Contract Request').pop().trim()
      : before.split(' ').slice(-4).join(' ')
    companyName = afterNav || null
  }

  return {
    verified: true,
    contractorId: id,
    companyName,
    reason: null,
    message: 'Contractor verified successfully via Muqawil.'
  }
}

module.exports = { verifyContractor }
