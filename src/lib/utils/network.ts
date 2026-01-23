/**
 * Network utility functions
 * Check internet connectivity status
 */

import NetInfo from '@react-native-community/netinfo';

/**
 * Check if device is online
 */
export async function isOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return Boolean(state.isConnected && state.isInternetReachable);
  } catch (error) {
    console.error('[Network] Error checking connectivity:', error);
    return false;
  }
}
