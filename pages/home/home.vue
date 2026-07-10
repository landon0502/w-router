<template>
  <view class="container">
    <view class="header">
      <text class="title">Tab 首页 (Home)</text>
      <text class="subtitle">Tab 导航 与 uni.$emit 通信示例</text>
    </view>

    <!-- ============================================================ -->
    <!-- Explanation -->
    <!-- ============================================================ -->
    <view class="section">
      <text class="section-title">Tab 页面特点</text>
      <view class="card">
        <text class="info-text">
          Tab 页面没有 opener event channel（getOpenerEventChannel 不可用）。
        </text>
        <text class="info-text">
          因此，w-router 对 tab 页面使用 uni.$emit / uni.$on 来传递 params。
        </text>
        <text class="info-text highlight">
          事件名格式: onRouteParams[/pages/home/home]
        </text>
      </view>
    </view>

    <!-- ============================================================ -->
    <!-- Received Data -->
    <!-- ============================================================ -->
    <view class="section">
      <text class="section-title">接收的路由参数 (params)</text>
      <view class="card" v-if="receivedParams">
        <text class="code">{{ JSON.stringify(receivedParams, null, 2) }}</text>
      </view>
      <text class="hint" v-else>
        未收到 params — 请从首页点击 "router.tab()" 携带参数跳转。
        或在 onLoad 中查看 query 参数。
      </text>
    </view>

    <!-- ============================================================ -->
    <!-- Navigation -->
    <!-- ============================================================ -->
    <view class="section">
      <button class="btn btn-primary" @tap="handleGoToIndex">
        router.to() — 前往示例首页
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import router from '@/common/router'
import { onRouteParamsEventKey } from '@/uni_modules/w-router'

// ==========================================================================
// State
// ==========================================================================
const receivedParams = ref<unknown>(null)

// ==========================================================================
// Listen for route params via uni.$emit (tab page pattern)
// ==========================================================================
onMounted(() => {
  // Retrieve cached params from the pipeline (may work for some tab scenarios)
  const cache = router.getPrevRouterDataCache()
  if (cache) {
    receivedParams.value = cache.params ?? null
  }

  // Also listen via uni.$on for tab-page params (event-based)
  // The event name format: onRouteParams[/pages/home/home]
  const paramsEventName = `${onRouteParamsEventKey}[/pages/home/home]`

  uni.$on(paramsEventName, (data: unknown) => {
    receivedParams.value = data
    console.log('[Tab Home] Received params via uni.$on:', data)
  })
})

// ==========================================================================
// Navigate to the demo index page
// ==========================================================================
function handleGoToIndex(): void {
  router.tab({ url: '/pages/index/index' })
}
</script>

<style scoped>
.container {
  padding: 20rpx 30rpx;
}

.header {
  text-align: center;
  padding: 40rpx 0;
}

.title {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  display: block;
}

.subtitle {
  font-size: 26rpx;
  color: #999;
  margin-top: 8rpx;
  display: block;
}

.section {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.card {
  background: #f8f8f8;
  border-radius: 10rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
}

.info-text {
  font-size: 26rpx;
  color: #555;
  display: block;
  margin-bottom: 10rpx;
  line-height: 1.6;
}

.highlight {
  color: #ff9500;
  font-weight: bold;
}

.code {
  font-family: 'Courier New', monospace;
  font-size: 26rpx;
  color: #555;
  white-space: pre-wrap;
  word-break: break-all;
}

.hint {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
  display: block;
  line-height: 1.5;
}

.btn {
  font-size: 28rpx;
  border-radius: 10rpx;
  padding: 20rpx 0;
}

.btn-primary {
  background-color: #007aff;
  color: #fff;
}
</style>
