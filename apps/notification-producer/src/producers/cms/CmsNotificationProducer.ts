import { PushNotification } from '@cowprotocol/notifications'
import { CmsPushNotification, PushNotificationsRepository } from '@cowprotocol/repositories'
import Mustache from 'mustache'
import { Runnable } from '../../../types'
import { PushSubscriptionsRepository } from '@cowprotocol/repositories'
import { logger, doForever } from '@cowprotocol/shared'

const WAIT_TIME = 30000

export type CmsNotificationProducerProps = {
  pushNotificationsRepository: PushNotificationsRepository
  pushSubscriptionsRepository: PushSubscriptionsRepository
}

export class CmsNotificationProducer implements Runnable {
  isStopping = false

  /**
   * This in-memory state just adds some resilience in case there's an error posting the message.
   * Because the PUSH notifications are currently consumed just by reading, in case of a failure the notification is lost
   *
   * This solution is a patch until we properly implement a more reliable consumption
   */
  pendingNotifications = new Map<string, PushNotification>()

  constructor(private props: CmsNotificationProducerProps) {}

  /**
   * Main loop: Run the CMS notification producer. This method runs indefinitely,
   * fetching notifications and sending them to the queue.
   *
   * The method should not throw or finish.
   */
  async start(): Promise<void> {
    await doForever({
      name: 'CmsNotificationProducer',
      callback: async (stop) => {
        if (this.isStopping) {
          stop()
          return
        }
        await this.fetchAndSend()
      },
      waitTimeMilliseconds: WAIT_TIME,
      logger,
    })

    logger.info('CmsNotificationProducer', 'stopped')
  }

  async stop(): Promise<void> {
    this.isStopping = true
  }

  async fetchAndSend(): Promise<void> {
    const accounts = (await this.props.pushSubscriptionsRepository.getAllSubscribedAccounts()).map(account => account.toLowerCase())
    logger.debug(
      `[CmsNotificationProducer] Watching ${accounts.length} subscribed account(s): ${JSON.stringify(accounts)}`
    )

    // Get PUSH notifications
    const allCmsPushNotifications = await this.props.pushSubscriptionsRepository.getPushNotifications()
    logger.debug(`[CmsNotificationProducer] CMS returned ${allCmsPushNotifications.length} push notification(s)`)

    const cmsPushNotifications = allCmsPushNotifications.filter(
      // Include only the notifications for subscribed accounts
      ({ account }) => accounts.includes(account.toLowerCase())
    )
    logger.debug(
      `[CmsNotificationProducer] ${cmsPushNotifications.length} of ${allCmsPushNotifications.length} CMS notification(s) match a subscribed account`
    )

    const pendingNotifications = Array.from(this.pendingNotifications.values())
    if (pendingNotifications.length > 0) {
      logger.debug(
        `[CmsNotificationProducer] ${pendingNotifications.length} pending notification(s) from a previous failed send`
      )
    }

    const pushNotifications = cmsPushNotifications.map(fromCmsToNotifications).concat(pendingNotifications)

    if (pushNotifications.length === 0) {
      logger.debug(`[CmsNotificationProducer] No notifications to send`)
      return
    }

    logger.debug(`[notification-producer:main] ${pushNotifications.length} new PUSH notifications`)

    // Save notifications in-memory, so they are not lost if there's an issue with the queue
    pushNotifications.forEach((notification) => this.pendingNotifications.set(notification.id, notification))

    // Connect
    logger.debug(`[CmsNotificationProducer] Connecting to push notifications queue`)
    await this.props.pushNotificationsRepository.connect()

    // Post notifications to queue
    logger.info(`[CmsNotificationProducer] Sending ${pushNotifications.length} notification(s) to the queue`)
    this.props.pushNotificationsRepository.send(pushNotifications)
    this.pendingNotifications.clear()
  }
}

function fromCmsToNotifications(cmsNotification: CmsPushNotification): PushNotification {
  const {
    id,
    account,
    data,
    notification_template: { title, description, url },
  } = cmsNotification
  const message = Mustache.render(description, data)
  const cmsNotificationId = id.toString()

  return {
    id: cmsNotificationId,
    title,
    message,
    account,
    url: url || undefined,
    context: {
      cmsId: cmsNotificationId,
    },
  }
}
