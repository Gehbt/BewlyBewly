import 'uno.css'
import '~/styles'

import { createApp } from 'vue'

import { useDark } from '~/composables/useDark'
import { settings } from '~/logic'
import { setupApp } from '~/logic/common-setup'
import { runWhenIdle } from '~/utils/lazyLoad'
import { injectCSS, isHomePage } from '~/utils/main'
import { SVG_ICONS } from '~/utils/svgIcons'

import App from './views/App.vue'

const isFirefox: boolean = /Firefox/i.test(navigator.userAgent)

// Fix `OverlayScrollbars` not working in Firefox
// https://github.com/fingerprintjs/fingerprintjs/issues/683#issuecomment-881210244
if (isFirefox) {
  window.requestIdleCallback = window.requestIdleCallback.bind(window)
  window.cancelIdleCallback = window.cancelIdleCallback.bind(window)
  window.requestAnimationFrame = window.requestAnimationFrame.bind(window)
  window.cancelAnimationFrame = window.cancelAnimationFrame.bind(window)
  window.setTimeout = window.setTimeout.bind(window)
  window.clearTimeout = window.clearTimeout.bind(window)
}

const currentUrl = document.URL

function isSupportedPages(): boolean {
  if (
    // homepage
    isHomePage()
    // fix #166 https://github.com/hakadao/BewlyBewly/issues/166
    || /https?:\/\/www\.bilibili\.com\/\?bvid=.*$/.test(currentUrl)

    // video page
    || /https?:\/\/(?:www\.)?bilibili\.com\/(?:video|list)\/.*/.test(currentUrl)
    // anime playback & movie page
    || /https?:\/\/(?:www\.)?bilibili\.com\/bangumi\/play\/.*/.test(currentUrl)
    // watch later playlist
    || /https?:\/\/(?:www\.)?bilibili\.com\/list\/watchlater.*/.test(currentUrl)
    // favorite playlist
    || /https?:\/\/(?:www\.)?bilibili\.com\/list\/ml.*/.test(currentUrl)
    // search page
    || /https?:\/\/search\.bilibili\.com\.*/.test(currentUrl)
    // moments
    || /https?:\/\/t\.bilibili\.com\.*/.test(currentUrl)
    // moment detail
    || /https?:\/\/(?:www\.)?bilibili\.com\/opus\/.*/.test(currentUrl)
    // history page
    || /https?:\/\/(?:www\.)?bilibili\.com\/account\/history.*/.test(currentUrl)
    // watcher later page
    || /https?:\/\/(?:www\.)?bilibili\.com\/watchlater\/#\/list.*/.test(currentUrl)
    // user space page
    || /https?:\/\/space\.bilibili\.com\.*/.test(currentUrl)
    // notifications page
    || /https?:\/\/message\.bilibili\.com\.*/.test(currentUrl)
    // bilibili channel page b站分区页面
    || /https?:\/\/(?:www\.)?bilibili\.com\/v\/(?!popular).*/.test(currentUrl)
    // anime page & chinese anime page
    || /https?:\/\/(?:www\.)?bilibili\.com\/(?:anime|guochuang).*/.test(currentUrl)
    // channel page e.g. tv shows, movie, variety shows, mooc page
    || /https?:\/\/(?:www\.)?bilibili\.com\/(?:tv|movie|variety|mooc|documentary).*/.test(currentUrl)
    // article page
    // www.bilibili.com/read/pcpreview 是专栏浏览页, 因布局问题不做适配 #846
    || /https?:\/\/(?:www\.)?bilibili\.com\/read\/(?!pcpreview).*/.test(currentUrl)
    // 404 page
    || /^https?:\/\/(?:www\.)?bilibili\.com\/404.*$/.test(currentUrl)
    // creative center page 創作中心頁
    || /^https?:\/\/member\.bilibili\.com\/platform.*$/.test(currentUrl)
    // account settings page 帳號設定頁
    || /^https?:\/\/account\.bilibili\.com\/.*$/.test(currentUrl)
    // login page
    || /^https?:\/\/passport\.bilibili\.com\/login.*$/.test(currentUrl)
  ) {
    return true
  }
  else {
    return false
  }
}

let beforeLoadedStyleEl: HTMLStyleElement | undefined

if (isSupportedPages()) {
  if (settings.value.adaptToOtherPageStyles)
    useDark()

  if (settings.value.adaptToOtherPageStyles)
    document.documentElement.classList.add('bewly-design')
  else
    document.documentElement.classList.remove('bewly-design')
}

if (settings.value.adaptToOtherPageStyles && isHomePage()) {
  beforeLoadedStyleEl = injectCSS(`
    html.bewly-design {
      background-color: var(--bew-bg);
      transition: background-color 0.2s ease-in;
    }

    body {
      display: none;
    }
  `)

  // Add opacity transition effect for page loaded
  injectCSS(`
    body {
      transition: opacity 0.5s;
    }
  `)
}

// Set the original Bilibili top bar to `display: none` to prevent it from showing before the load
// see: https://github.com/BewlyBewly/BewlyBewly/issues/967
let removeOriginalTopBar: HTMLStyleElement | null = null
if (!settings.value.useOriginalBilibiliTopBar && isSupportedPages())
  removeOriginalTopBar = injectCSS(`.bili-header { visibility: hidden !important; }`)

async function onDOMLoaded() {
  let originalTopBar: HTMLElement | null = null
  // Remove the original Bilibili homepage if in Bilibili homepage & useOriginalBilibiliHomepage is enabled
  if (!settings.value.useOriginalBilibiliHomepage && isHomePage()) {
    originalTopBar = document.querySelector<HTMLElement>('.bili-header')
    const originalTopBarInnerUselessContents = document.querySelectorAll<HTMLElement>('.bili-header > *:not(.bili-header__bar)')

    if (originalTopBar) {
      // always show the background on the original bilibili top bar
      originalTopBar.querySelector('.bili-header__bar')?.classList.add('slide-down')
    }

    // Remove the original Bilibili homepage if in Bilibili homepage & useOriginalBilibiliHomepage is enabled
    document.body.innerHTML = ''

    if (originalTopBarInnerUselessContents)
      originalTopBarInnerUselessContents.forEach(item => (item as HTMLElement).style.display = 'none')
    if (originalTopBar)
      document.body.appendChild(originalTopBar)
  }
  if (beforeLoadedStyleEl)
    document.documentElement.removeChild(beforeLoadedStyleEl)

  if (isSupportedPages()) {
    // Then inject the app
    if (isHomePage() && !settings.value.useOriginalBilibiliHomepage) {
      injectApp()
    }
    else {
      await injectAppWhenIdle()
    }
  }

  // Reset the original Bilibili top bar display style
  if (removeOriginalTopBar)
    document.documentElement.removeChild(removeOriginalTopBar)
}

if (document.readyState !== 'loading')
  onDOMLoaded()
else
  document.addEventListener('DOMContentLoaded', () => onDOMLoaded())

function injectAppWhenIdle() {
  return new Promise<void>((resolve) => {
    // Inject app when idle
    runWhenIdle(async () => {
      injectApp()
      resolve()
    })
  })
}

function injectApp() {
  // mount component to context window
  const container = document.createElement('div')
  container.id = 'bewly'
  const root = document.createElement('div')
  const styleEl = document.createElement('link')
  // Fix #69 https://github.com/hakadao/BewlyBewly/issues/69
  // https://medium.com/@emilio_martinez/shadow-dom-open-vs-closed-1a8cf286088a - open shadow dom
  const shadowDOM = container.attachShadow?.({ mode: 'open' }) || container
  styleEl.setAttribute('rel', 'stylesheet')
  styleEl.setAttribute('href', browser.runtime.getURL('dist/contentScripts/style.css'))
  shadowDOM.appendChild(styleEl)
  shadowDOM.appendChild(root)
  container.style.opacity = '0'
  container.style.transition = 'opacity 0.5s'
  styleEl.onload = () => {
    // To prevent abrupt style transitions caused by sudden style changes
    setTimeout(() => {
      container.style.opacity = '1'
    }, 500)
  }

  // inject svg icons
  const svgDiv = document.createElement('div')
  svgDiv.innerHTML = SVG_ICONS
  shadowDOM.appendChild(svgDiv)

  document.body.appendChild(container)

  const app = createApp(App)
  setupApp(app)
  app.mount(root)
}
