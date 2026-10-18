import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // Bundle ID is hard to change once the iCloud container / App Store listing exist
  appId: 'com.popcornjournal.app',
  appName: 'Popcorn Journal',
  webDir: 'dist',
}

export default config
