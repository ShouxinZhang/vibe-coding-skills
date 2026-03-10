import { defineConfig } from 'vitepress'

const repository = 'ShouxinZhang/vibe-coding-skills'
const siteBase = process.env.SITE_BASE ?? '/'

export default defineConfig({
  title: 'vibe-coding-skills',
  description: '面向高效编码、结构化知识与可复用案例的开源知识库与展示站点。',
  lang: 'zh-CN',
  base: siteBase,
  appearance: false,
  srcDir: '.',
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: [
    /^https:\/\/github\.com\/ShouxinZhang\/vibe-coding-skills/,
  ],
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'vibe-coding-skills',
    nav: [
      { text: '首页', link: '/' },
      { text: '快速开始', link: '/guide/getting-started' },
      { text: '模块地图', link: '/guide/modules' },
      { text: '案例入口', link: '/guide/examples' },
      { text: '部署', link: '/guide/deploy' },
    ],
    socialLinks: [
      { icon: 'github', link: `https://github.com/${repository}` },
    ],
    search: {
      provider: 'local',
    },
    outline: {
      level: [2, 3],
      label: '页面导航',
    },
    docFooter: {
      prev: '上一页',
      next: '下一页',
    },
    sidebar: [
      {
        text: '站点导航',
        items: [
          { text: '快速开始', link: '/guide/getting-started' },
          { text: '模块地图', link: '/guide/modules' },
          { text: '案例入口', link: '/guide/examples' },
          { text: '免费部署', link: '/guide/deploy' },
        ],
      },
    ],
    footer: {
      message: 'Built with VitePress and deployed on GitHub Pages.',
      copyright: 'Copyright © 2026 vibe-coding-skills',
    },
  },
  head: [
    ['link', { rel: 'icon', href: `${siteBase}logo.svg` }],
  ],
})
