const Jimp = require('jimp')
const QrCode = require('qrcode-reader')

// Pattern: http://eservices.saudieng.sa/ar/accreditation/pages/validation.aspx?Membershipid=XXXXXX
const SCE_PATTERN = /^http:\/\/eservices\.saudieng\.sa\/ar\/accreditation\/pages\/validation\.aspx\?Membershipid=(\d+)$/i

function decodeQR(bitmap) {
  return new Promise((resolve, reject) => {
    const qr = new QrCode()
    qr.callback = (err, value) => {
      if (err) return reject(err)
      resolve(value)
    }
    qr.decode(bitmap)
  })
}

async function verifyCertificate(imageBuffer) {
  let qrValue
  try {
    const image = await Jimp.read(imageBuffer)
    qrValue = await decodeQR(image.bitmap)
  } catch (err) {
    return {
      verified: false,
      membershipId: null,
      reason: 'qr_not_found',
      message: 'No QR code could be detected in the uploaded image. Please upload a clear photo of your SCE certificate.'
    }
  }

  if (!qrValue || !qrValue.result) {
    return {
      verified: false,
      membershipId: null,
      reason: 'qr_empty',
      message: 'The QR code in the image appears to be empty or unreadable.'
    }
  }

  const url = qrValue.result.trim()
  const match = SCE_PATTERN.exec(url)

  if (!match) {
    return {
      verified: false,
      membershipId: null,
      reason: 'invalid_qr_url',
      message: `The QR code does not link to a valid SCE membership page. Found: "${url}"`
    }
  }

  return {
    verified: true,
    membershipId: match[1],
    reason: null,
    message: 'Certificate verified successfully.'
  }
}

module.exports = { verifyCertificate }
