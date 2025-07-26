import { MarkdownPageEvent } from 'typedoc-plugin-markdown'

export function load(app) {
  app.renderer.on(MarkdownPageEvent.BEGIN, (page) => {
    const name = page.model?.name ?? '-'
    page.frontmatter = {
      // e.g add a title
      title: name,
      // spread the existing frontmatter
      ...page.frontmatter,
    }
  })
}
