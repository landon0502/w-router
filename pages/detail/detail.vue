<template>
  <view class="container">
    <view class="header">
      <text class="title">详情页 (Detail)</text>
      <text class="subtitle">接收路由参数和数据</text>
    </view>

    <!-- ============================================================ -->
    <!-- Received Route Params -->
    <!-- ============================================================ -->
    <view class="section">
      <text class="section-title">接收的路由参数 (params)</text>
      <view class="card" v-if="receivedParams">
        <text class="code">{{ JSON.stringify(receivedParams, null, 2) }}</text>
      </view>
      <text class="hint" v-else>未收到 params — 请从首页携带参数跳转</text>
    </view>

    <!-- ============================================================ -->
    <!-- Received Route Data -->
    <!-- ============================================================ -->
    <view class="section">
      <text class="section-title">接收的隐式数据 (data)</text>
      <view class="card" v-if="receivedData">
        <text class="code">{{ JSON.stringify(receivedData, null, 2) }}</text>
      </view>
      <text class="hint" v-else>未收到 data — 请从首页使用 data 传参跳转</text>
      <text class="hint">
        data 不会出现在 URL 上，仅通过 event channel / 缓存传递
      </text>
    </view>

    <!-- ============================================================ -->
    <!-- Back with Params -->
    <!-- ============================================================ -->
    <view class="section">
      <text class="section-title">返回并传递参数 (back params)</text>

      <view class="input-group">
        <text class="label">返回消息:</text>
        <input class="input" v-model="backMessage" placeholder="输入返回参数" />
      </view>

      <button class="btn btn-primary" @tap="handleBackWithParams">
        router.back({ params: {...} }) — 返回并传参
      </button>
      <text class="hint">
        返回参数将通过 events.onBack 回调传递到来源页面
      </text>
    </view>

    <!-- ============================================================ -->
    <!-- Plain Back -->
    <!-- ============================================================ -->
    <view class="section">
      <button class="btn btn-default" @tap="handlePlainBack">
        router.back() — 普通返回
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import router from '@/common/router'

// ==========================================================================
// State
// ==========================================================================
const receivedParams = ref<unknown>(null)
const receivedData = ref<unknown>(null)
const backMessage = ref('来自详情页的问候')

// ==========================================================================
// Retrieve cached params and data on page load
// ==========================================================================
onMounted(() => {
  const cache = router.getPrevRouterDataCache()
  if (cache) {
    receivedParams.value = cache.params ?? null
    receivedData.value = cache.data ?? null
  }
})

// ==========================================================================
// Back with params — triggers events.onBack in the source page
// ==========================================================================
function handleBackWithParams(): void {
  router.back({
    params: {
      message: backMessage.value || 'empty',
      timestamp: Date.now(),
    },
  })
}

// ==========================================================================
// Plain back navigation
// ==========================================================================
function handlePlainBack(): void {
  router.back()
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
}

.input-group {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.label {
  width: 150rpx;
  font-size: 28rpx;
  color: #666;
}

.input {
  flex: 1;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  padding: 12rpx 16rpx;
  font-size: 28rpx;
  background: #fafafa;
}

.btn {
  margin-bottom: 16rpx;
  font-size: 28rpx;
  border-radius: 10rpx;
  padding: 20rpx 0;
}

.btn-primary {
  background-color: #007aff;
  color: #fff;
}

.btn-default {
  background-color: #f0f0f0;
  color: #333;
}
</style>
