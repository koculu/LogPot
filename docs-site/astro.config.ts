import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'

import {
  getAPISidebar,
  getMainSidebar,
  stripMdExtensions,
} from './astro.sidebar'

export default defineConfig({
  site: 'https:/tenray.io/',
  base: '/logpot/',
  trailingSlash: 'ignore',
  integrations: [
    starlight({
      title: 'LogPot',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/koculu/logpot',
        },
      ],
      sidebar: [
        ...getMainSidebar(),
        {
          label: 'Reference',
          items: getAPISidebar(),
          collapsed: true,
          badge: { text: 'API', class: '', variant: 'success' },
        },
      ],
      pagefind: true,
    }),
  ],
  outDir: './dist/logpot',
  markdown: {
    remarkPlugins: [],
    rehypePlugins: [
      () => {
        return (node) => {
          return stripMdExtensions(node)
        }
      },
    ],
  },
})
