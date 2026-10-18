import { actionSheetController } from '@ionic/vue'
import { strings } from './strings'

/** iOS-style destructive confirmation; resolves true when the user confirms. */
export async function confirmRemove(header: string): Promise<boolean> {
  const sheet = await actionSheetController.create({
    header,
    subHeader: strings.removeConfirm.message,
    buttons: [
      { text: strings.removeConfirm.remove, role: 'destructive' },
      { text: strings.removeConfirm.cancel, role: 'cancel' },
    ],
  })
  await sheet.present()
  const { role } = await sheet.onDidDismiss()
  return role === 'destructive'
}
