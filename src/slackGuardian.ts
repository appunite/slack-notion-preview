import { logger } from './logger'
import { sanitizeSlackLink } from './index'
import { notionClient, notionService } from './notion'
import { asyncSome } from './utils'
import { LinkSharedEvent, SayFn } from '@slack/bolt'

type SlackGuardianConfig = {
  event: LinkSharedEvent
  say: SayFn
  channels: string[]
  message: string
}

export const handleSlackGuardian = async ({
  event,
  say,
  channels,
  message,
}: SlackGuardianConfig) => {
  if (channels.includes(event.channel)) {
    const containsAdrWithGo = await asyncSome(event.links, async link => {
      if (!notionService.isNotionDomain(link.domain)) return false
      const url = new URL(sanitizeSlackLink(link.url))
      const notionPageId = notionService.getPageIdFromUrl(url)

      if (notionPageId == null) {
        logger.error(`PageId not found in ${url}`)
        return false
      }

      const isPageAdr = await notionService.isPageAdr(notionPageId)

      const property = await notionClient.pages.properties.retrieve({
        page_id: notionPageId,
        property_id: 'hhz%7C', // Decision
      })

      const isAdrGo =
        property.type === 'select' && property.select?.name === 'Go'

      return isPageAdr && isAdrGo
    })

    if (containsAdrWithGo) {
      await say({
        text: message,
        thread_ts: event.message_ts,
      })
    }
  }
}
