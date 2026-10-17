// Read an uploaded image file and downscale it so stored photos stay small.
export function fileToDataUrl(file, maxSize = 1000, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Could not read image'))
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

// Turn common "share" links into direct image links where we can.
export function normalizeImageUrl(input) {
  const url = input.trim()
  let u
  try {
    u = new URL(url)
  } catch {
    return url
  }
  // Google Drive: /file/d/<id>/view or ?id=<id>
  if (u.hostname === 'drive.google.com') {
    const id = u.pathname.match(/\/d\/([^/]+)/)?.[1] || u.searchParams.get('id')
    if (id) return `https://lh3.googleusercontent.com/d/${id}`
  }
  // Dropbox: ?dl=0 shows a web page, ?raw=1 serves the file
  if (u.hostname.endsWith('dropbox.com')) {
    u.searchParams.delete('dl')
    u.searchParams.set('raw', '1')
    return u.toString()
  }
  return url
}

/** Resolve if the link loads as an image, reject otherwise. */
export function checkImageUrl(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.referrerPolicy = 'no-referrer'
    const timer = setTimeout(() => {
      img.src = ''
      reject(new Error('The link took too long to load.'))
    }, timeout)
    img.onload = () => {
      clearTimeout(timer)
      resolve(url)
    }
    img.onerror = () => {
      clearTimeout(timer)
      reject(new Error("That link didn't open as a picture."))
    }
    img.src = url
  })
}
