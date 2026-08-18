export interface Settings {
  autoScan: boolean
  fillThreshold: 0.6 | 0.85
  showMatchReasons: boolean
}

export const defaultSettings: Settings = {
  autoScan: true,
  fillThreshold: 0.6,
  showMatchReasons: false,
}
