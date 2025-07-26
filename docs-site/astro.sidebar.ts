import fg from 'fast-glob'
import fs from 'fs'
import matter from 'gray-matter'
import path from 'path'

interface BadgeConfig {
  text: string
  variant?: 'note' | 'tip' | 'caution' | 'danger' | 'success' | 'default'
  class?: string
}

interface PageNode {
  segments: string[] // path segments under the API or docs directory
  title: string // display title for the page
  link: string // URL path (without .md extension)
  order: number // sidebar.order or Infinity
  badge?: BadgeConfig // optional badge from frontmatter
}

type SidebarItem =
  | string
  | { label: string; link: string; badge?: BadgeConfig }
  | { label: string; items: SidebarItem[] }

function toPascalCase(input: string): string {
  return input
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('')
}

function loadPageNodes(
  baseDir: string,
  pattern: string,
  urlPrefix: string
): PageNode[] {
  const absBase = path.resolve(baseDir)
  return fg
    .sync(pattern, { absolute: true })
    .map((file) => {
      const raw = fs.readFileSync(file, 'utf-8')
      const { data } = matter(raw)
      const order =
        typeof data.sidebar?.order === 'number' ? data.sidebar.order : Infinity
      const badge = data.badge as BadgeConfig | undefined
      // derive path segments under base
      const relativePath = path.relative(absBase, file).replace(/\\/g, '/')
      const noExt = relativePath.replace(/\.(md|mdx)$/, '')
      const segments = noExt.split('/')
      const link = `${urlPrefix}/${noExt}`.toLowerCase().replace('/index', '')
      const title =
        typeof data.title === 'string'
          ? data.title
          : toPascalCase(path.basename(noExt))
      return { segments, title, link, order, badge }
    })
    .sort((a, b) => a.order - b.order)
}

export function getMainSidebar() {
  const docsDir = './src/content/docs'
  const pages = loadPageNodes(docsDir, `${docsDir}/*.{md,mdx}`, '')
  return pages.map((p) => ({ label: p.title, link: p.link, badge: p.badge }))
}

export function getAPISidebar(): SidebarItem[] {
  const apiDir = 'src/content/docs/reference'
  const nodes = loadPageNodes(apiDir, `${apiDir}/**/*.md`, '/reference')

  // Separate overview (index) page if present
  const overview = nodes.find((n) => n.link === '/reference')
  const pageNodes = overview ? nodes.filter((n) => n !== overview) : nodes

  // Define a tree node structure for nesting
  interface TreeNode {
    pages: PageNode[]
    children: Record<string, TreeNode>
  }

  // Initialize the root of the tree
  const tree: TreeNode = { pages: [], children: {} }

  // Insert each page into the tree based on its segment path, skipping 'src' and excluding the last segment
  for (const node of pageNodes) {
    // Remove any 'src' segments
    const filteredSegments = node.segments.filter(
      (segment) => segment.toLowerCase() !== 'src'
    )
    // Only use all segments except the last (which represents the page itself) for nesting
    const folderSegments = filteredSegments.slice(0, -1)

    let cursor = tree
    for (const segment of folderSegments) {
      if (!cursor.children[segment]) {
        cursor.children[segment] = { pages: [], children: {} }
      }
      cursor = cursor.children[segment]
    }
    // Add the page to the current tree node
    cursor.pages.push(node)
  }

  // Recursively build SidebarItem[] from the tree nodes
  function buildItems(node: TreeNode): SidebarItem[] {
    const items: SidebarItem[] = []

    // First, add any pages directly at this level
    node.pages
      .sort((a, b) => a.order - b.order)
      .forEach((p) =>
        items.push({
          label: p.title.replace('/src', ''),
          link: p.link,
          badge: p.badge,
        })
      )

    // Then, for each subfolder, create a nested group
    Object.keys(node.children)
      .sort()
      .forEach((folder) => {
        const child = node.children[folder]
        items.push({
          label: toPascalCase(folder),
          items: buildItems(child),
        })
      })

    return items
  }

  // Assemble final sidebar, putting the overview first if it exists
  const sidebar: SidebarItem[] = []
  if (overview) {
    sidebar.push({
      label: overview.title,
      link: overview.link,
      badge: overview.badge,
    })
  }
  sidebar.push(...buildItems(tree))

  return sidebar
}

interface Properties {
  href?: string
}
interface MDNode {
  type: string
  tagName?: string
  children?: MDNode[]
  properties?: Properties
}
export function stripMdExtensions(node: MDNode) {
  // if you change this code, ensure you run with yarn dev --force
  // otherwise astro cache would not reflect the changes in this plugin.
  const props = node.properties
  if (props) {
    if (props.href) {
      const hrefs = props.href.split('#')
      const href = hrefs[0]
      let newHref = props.href
      if (href.endsWith('/index')) {
        newHref = href.slice(0, href.length - 6).toLocaleLowerCase()
      } else if (href.endsWith('/index.md')) {
        newHref = href.slice(0, href.length - 9).toLocaleLowerCase()
      } else if (href.endsWith('.md')) {
        newHref = href.slice(0, href.length - 3).toLocaleLowerCase()
      } else if (href.endsWith('mdx')) {
        newHref = href.slice(0, href.length - 4).toLocaleLowerCase()
      } else {
        newHref = href.toLocaleLowerCase()
      }

      if (newHref.endsWith('/index')) {
        newHref = href.slice(0, href.length - 6).toLocaleLowerCase()
      }

      //Rooted urls should contain base url.
      if (newHref.startsWith('/') && !newHref.startsWith('/logpot')) {
        newHref = '/logpot' + newHref
      }
      if (props.href != newHref) {
        if (hrefs[1]) newHref = newHref + '#' + hrefs[1]
        props.href = newHref
      }
      return
    }
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      stripMdExtensions(child)
    }
  }
}
