// Opens the native share sheet, or copies the link when it isn't available.
// Returns 'copied' so the caller can show a toast.
export async function shareApp(nickname: string): Promise<'shared' | 'copied'> {
  const shareData = {
    title: 'MoonieCalm',
    text: `${nickname} ชวนมาดูตัวละครใน MoonieCalm!`,
    url: window.location.origin
  }

  if (navigator.share) {
    try {
      await navigator.share(shareData)
    } catch {
      // user cancelled the share sheet, nothing to do
    }
    return 'shared'
  }

  await navigator.clipboard.writeText(shareData.url)
  return 'copied'
}
