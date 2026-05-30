import { useSyncExternalStore } from 'react'

import type { InventoryState } from './types'
import { EMPTY_INVENTORY, getStoredInventory, subscribeStoredInventory } from './store'

export function useStoredInventory(): InventoryState {
  return useSyncExternalStore(subscribeStoredInventory, getStoredInventory, () => EMPTY_INVENTORY)
}
