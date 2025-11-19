// Simple markdown parser for chat messages
export function parseMarkdown(text: string): string {
  if (!text) return ''

  let html = text

  // Preserve existing HTML tags (like <a> tags from AI response)
  const htmlTags: string[] = []
  html = html.replace(/(<a[^>]*>.*?<\/a>)/g, (match) => {
    htmlTags.push(match)
    return `__HTML_TAG_${htmlTags.length - 1}__`
  })

  // Headings: #### text -> h4, ### text -> h3, etc.
  html = html.replace(/^####\s+(.+)$/gm, '<h4 class="text-sm font-semibold mt-2 mb-0.5">$1</h4>')
  html = html.replace(/^###\s+(.+)$/gm, '<h3 class="text-base font-semibold mt-2 mb-0.5">$1</h3>')
  html = html.replace(/^##\s+(.+)$/gm, '<h2 class="text-base font-bold mt-2.5 mb-1">$1</h2>')
  html = html.replace(/^#\s+(.+)$/gm, '<h1 class="text-lg font-bold mt-3 mb-1">$1</h1>')

  // Bold: **text** (do this first)
  html = html.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
  
  // Lists: - item or * item (at start of line)
  html = html.replace(/^[\-\*]\s+(.+)$/gm, '<li class="leading-snug">$1</li>')
  
  // Wrap list items in ul
  html = html.replace(/(<li.*?<\/li>\s*)+/gs, '<ul class="list-disc list-inside ml-2 my-0.5 space-y-0">$1</ul>')

  // Italic: *text* (only if not already in strong or list)
  html = html.replace(/(?<![<\*])\*([^*\n]+?)\*(?![>\*])/g, '<em>$1</em>')

  // Paragraphs: double newline
  html = html.split('\n\n').map(para => 
    para.includes('<ul>') || para.includes('<li>') || para.includes('<h') ? para : `<p class="mb-1">${para}</p>`
  ).join('')

  // Line breaks
  html = html.replace(/\n/g, '<br />')

  // Restore HTML tags
  htmlTags.forEach((tag, index) => {
    html = html.replace(`__HTML_TAG_${index}__`, tag)
  })

  return html
}
