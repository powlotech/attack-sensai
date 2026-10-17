/** Hand a layer file to the user: native share sheet in the APK, Web Share if allowed, else a download. */
export async function shareOrDownload(filename, json, type = 'application/json') {
  const isBlob = json instanceof Blob
  const text = isBlob || typeof json === 'string' ? json : JSON.stringify(json, null, 2)
  const { Capacitor } = await import('@capacitor/core')
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
    const { Share } = await import('@capacitor/share')
    const data = isBlob ? (await blobToBase64(text)) : text
    const { uri } = await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache, ...(isBlob ? {} : { encoding: Encoding.UTF8 }) })
    await Share.share({ title: filename, files: [uri] })
    return 'shared'
  }
  const file = new File([text], filename, { type })
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return 'shared'
    } catch (e) {
      if (e.name === 'AbortError') return 'shared' // user dismissed the sheet
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return 'downloaded'
}

const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result.split(',')[1])
    r.onerror = reject
    r.readAsDataURL(blob)
  })
