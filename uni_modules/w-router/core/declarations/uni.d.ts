/**
 * Ambient type declarations for uni-app global APIs.
 * These types are provided by the uni-app runtime at build time.
 */

interface UniRouteRecord {
  route: string
  $: { uid: number }
  __wxWebviewId__?: number
  getOpenerEventChannel?: () => {
    emit: (eventName: string, ...args: unknown[]) => void
  }
}

declare function getCurrentPages(): UniRouteRecord[]

declare const uni: {
  addInterceptor(
    method: string,
    interceptor: { invoke: (...args: unknown[]) => void }
  ): void
  $emit(event: string, ...args: unknown[]): void
  $on(event: string, callback: (...args: unknown[]) => void): void
  $off(event: string, callback?: (...args: unknown[]) => void): void
  navigateTo(options: Record<string, unknown>): void
  redirectTo(options: Record<string, unknown>): void
  switchTab(options: Record<string, unknown>): void
  reLaunch(options: Record<string, unknown>): void
  navigateBack(options: Record<string, unknown>): void
  showToast(options: { title: string; icon?: string }): void
  showLoading(options: { title: string }): void
  hideLoading(): void
}
