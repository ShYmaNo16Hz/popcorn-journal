import { alertController } from '@ionic/vue'
import { formatRuntime, parseMinutes } from './date'
import { strings } from './strings'

/** Asks where the user stopped; resolves minutes, or null when cancelled. */
export async function askStoppedAt(
  current: number | undefined,
  runtime: number | null,
): Promise<number | null> {
  const s = strings.partial
  let minutes: number | null = null
  const alert = await alertController.create({
    header: s.promptHeader,
    message: runtime ? s.promptRuntime(formatRuntime(runtime)) : undefined,
    inputs: [
      {
        name: 'minutes',
        type: 'text',
        placeholder: s.placeholder,
        value: current ? formatRuntime(current) : '',
      },
    ],
    buttons: [
      { text: s.cancel, role: 'cancel' },
      {
        text: s.save,
        // Returning false keeps the alert open on invalid input
        handler: (values: { minutes: string }) => {
          minutes = parseMinutes(values.minutes)
          return minutes !== null
        },
      },
    ],
  })
  await alert.present()
  const { role } = await alert.onDidDismiss()
  return role === 'cancel' ? null : minutes
}
