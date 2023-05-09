import { appEnv } from './app-env'
appEnv.init()

import { App as SlackApp, LogLevel } from '@slack/bolt'
import { LinkUnfurls } from '@slack/web-api'
import { logger } from './logger'
import { notionService } from './notion'

const slackApp = new SlackApp({
  token: appEnv.slackToken,
  signingSecret: appEnv.slackSigningSecret,
  logLevel: appEnv.isProduction ? LogLevel.ERROR : LogLevel.DEBUG,
})

// Remove &amp;, which & sometimes escaped to, perhaps due to a bug in Slack.
const sanitizeSlackLink = (url: string): string => {
  return url.replace(/amp;/g, '')
}

slackApp.event('link_shared', async ({ event, client }) => {
  let unfurls: LinkUnfurls = {}

  for (const link of event.links) {
    logger.debug(`handling ${link.url}`)
    if (!notionService.isNotionDomain(link.domain)) continue

    const url = new URL(sanitizeSlackLink(link.url))
    const notionPageId = notionService.getPageIdFromUrl(url)

    if (notionPageId == null) {
      logger.error(`PageId not found in ${url}`)
      continue
    }

    const isPublic = await notionService.isPagePublic(notionPageId)

    if (!isPublic) {
      console.log(`Page is not public: ${url}`)
      continue
    }

    const [pageData, text] = await Promise.all([
      notionService.getPageData(notionPageId),
      notionService.getPageBody(notionPageId),
    ])

    const formatted = notionService.formatHeadings(text)

    // Note that the key of the unfurl must be the same as the URL shared on slack.
    unfurls[link.url] = {
      title: pageData.title,
      mrkdwn_in: ['text'],
      text: formatted,
      title_link: link.url,
      color: '#ffffff',
      footer: pageData.breadcrumbs.join(' / '),
      footer_icon: 'https://www.notion.so/images/favicon.ico',
    }
  }
  await client.chat.unfurl({
    ts: event.message_ts,
    channel: event.channel,
    unfurls,
  })
})

const main = async () => {
  await slackApp.start({ port: appEnv.port, path: '/' })
  console.log(`⚡️ Bolt app is listening ${appEnv.port}`)
}

main()
