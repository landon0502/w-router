<template>
  <view class="container">
    <view class="header">
      <text class="title">w-router 示例</text>
      <text class="subtitle">Type-safe uni-app router with middleware</text>
    </view>

    <!-- ============================================================ -->
    <!-- 1. Basic Navigation -->
    <!-- ============================================================ -->
    <view class="section">
      <text class="section-title">基础导航 (Quick Start)</text>

      <button class="btn btn-primary" @tap="handleNavigateTo">
        router.to() — 跳转详情页
      </button>
      <button class="btn btn-warning" @tap="handleRedirect">
        router.redirect() — 重定向到详情页
      </button>
      <button class="btn btn-default" @tap="handleBack">
        router.back() — 返回上一页
      </button>
      <button class="btn btn-success" @tap="handleTab">
        router.tab() — 切换到 Tab 页
      </button>
      <button class="btn btn-error" @tap="handleLaunch">
        router.launch() — 重启到首页
      </button>
    </view>

    <!-- ============================================================ -->
    <!-- 2. Route Params -->
    <!-- ============================================================ -->
    <view class="section">
      <text class="section-title">路由参数 (Route Params)</text>

      <view class="input-group">
        <text class="label">ID:</text>
        <input class="input" v-model="params.id" placeholder="输入ID" />
      </view>
      <view class="input-group">
        <text class="label">Name:</text>
        <input class="input" v-model="params.name" placeholder="输入名称" />
      </view>

      <button class="btn btn-primary" @tap="handleNavigateWithParams">
        router.to() — 携带 params 跳转
      </button>
      <button class="btn btn-primary" @tap="handleNavigateWithBackEvent">
        router.to() — 携带 events.onBack 回调
      </button>
      <text class="hint" v-if="backParams">
        收到返回参数: {{ JSON.stringify(backParams) }}
      </text>
    </view>

    <!-- ============================================================ -->
    <!-- 2b. Route Data (隐式传参) -->
    <!-- ============================================================ -->
    <view class="section">
      <text class="section-title">隐式数据通道 (Route Data)</text>

      <view class="input-group">
        <text class="label">ID:</text>
        <input class="input" v-model="params.id" placeholder="输入ID（展示在URL上）" />
      </view>
      <view class="input-group">
        <text class="label">Token:</text>
        <input class="input" v-model="routeData.token" placeholder="输入Token（不出现在URL上）" />
      </view>

      <button class="btn btn-primary" @tap="handleNavigateWithData">
        router.to() — 同时携带 params + data
      </button>
      <text class="hint">
        params 会拼接到 URL query 上，data 不会 — 适合传递敏感或内部数据
      </text>
    </view>

    <!-- ============================================================ -->
    <!-- 3. Back to Opened Page (backOpenedPage) -->
    <!-- ============================================================ -->
    <view class="section">
      <text class="section-title">回到已打开的页面 (backOpenedPage)</text>

      <button class="btn btn-primary" @tap="handleBackOpenedPage">
        router.to() — backOpenedPage: true
      </button>
      <text class="hint">
        如果目标页已在页面栈中，则 back 到该页，而不是新开一个实例
      </text>
    </view>

    <!-- ============================================================ -->
    <!-- 5. Skip Interceptors -->
    <!-- ============================================================ -->
    <view class="section">
      <text class="section-title">跳过拦截器 (notIntercept)</text>

      <button class="btn btn-success" @tap="handleNotIntercept">
        router.to() — notIntercept: true
      </button>
      <text class="hint"> 导航到公开页，跳过全局 auth 中间件 </text>
    </view>

    <!-- ============================================================ -->
    <!-- 6. Per-Navigation Interceptor -->
    <!-- ============================================================ -->
    <view class="section">
      <text class="section-title"
        >单次导航拦截器 (Per-Navigation Intercept)</text
      >

      <button class="btn btn-warning" @tap="handleCustomIntercept">
        router.to() — 自定义 intercept
      </button>
      <text class="hint"> 模拟异步校验，通过后才允许跳转到营销页 </text>
    </view>

    <!-- ============================================================ -->
    <!-- 7. Auth Guard Demo -->
    <!-- ============================================================ -->
    <view class="section">
      <text class="section-title">鉴权守卫演示 (Auth Guard)</text>

      <view class="auth-status">
        <text>当前登录状态: </text>
        <text :class="isLoggedIn ? 'text-success' : 'text-error'">
          {{ isLoggedIn ? "已登录" : "未登录" }}
        </text>
      </view>

      <button class="btn btn-success" @tap="handleLogin">
        {{ isLoggedIn ? "切换登录状态: 登出" : "切换登录状态: 登录" }}
      </button>
      <button class="btn btn-primary" @tap="handleGoToDetail">
        跳转详情页（需登录）
      </button>
      <text class="hint">
        详情页和营销页需要登录才能访问，未登录会自动跳转到登录页
      </text>
    </view>

    <!-- ============================================================ -->
    <!-- 8. TypeScript Demo -->
    <!-- ============================================================ -->
    <view class="section">
      <text class="section-title">TypeScript 类型使用</text>
      <text class="hint">
        所有导航选项都支持完整的 TypeScript 类型推断。 查看 common/router.ts
        了解 Middleware 类型定义， 以及各页面的 script 部分了解类型导入方式。
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import router, { setLoggedIn, getLoggedIn } from "@/common/router";
import type {
  NavigationOptions,
  Middleware,
} from "@/uni_modules/w-router/js_sdk/types";

// ==========================================================================
// State
// ==========================================================================
const params = reactive({ id: "", name: "" });
const routeData = reactive({ token: "" });
const backParams = ref<unknown>(null);
const isLoggedIn = ref(getLoggedIn());

// ==========================================================================
// 1. Basic Navigation
// ==========================================================================
function handleNavigateTo(): void {
  router.to({
    url: "/pages/detail/detail",
    events: {
      onBack(e) {
        uni.showToast({title: JSON.stringify(e)})
      },
    },
  });
}

function handleRedirect(): void {
  router.redirect({ url: "/pages/detail/detail" });
}

function handleBack(): void {
  router.back();
}

function handleTab(): void {
  router.tab({
    url: "/pages/home/home",
    params: { name: "张三", message: "通过 tab 传递的 params 参数" },
    data: { refreshNeeded: true, source: "index-page" },
  });
}

function handleLaunch(): void {
  router.launch({ url: "/pages/index/index" });
}

// ==========================================================================
// 2. Route Params
// ==========================================================================
function handleNavigateWithParams(): void {
  router.to({
    url: "/pages/detail/detail",
    params: {
      id: params.id || "default-id",
      name: params.name || "default-name",
    },
  });
}

function handleNavigateWithBackEvent(): void {
  router.to({
    url: "/pages/detail/detail",
    params: { from: "index-page" },
    events: {
      onBack(params: unknown) {
        backParams.value = params;
        uni.showToast({ title: "收到返回参数", icon: "success" });
      },
    },
  });
}

// ==========================================================================
// 3. Route Data — 隐式传参（不出现在 URL 上）
// ==========================================================================
function handleNavigateWithData(): void {
  router.to({
    url: "/pages/detail/detail",
    params: {
      id: params.id || "default-id",
    },
    data: {
      token: routeData.token || "secret-token-abc123",
      from: "index-page",
      timestamp: Date.now(),
    },
  });
}

// ==========================================================================
// 4. Back to Opened Page
// ==========================================================================
function handleBackOpenedPage(): void {
  // First navigate to detail, then try again — the second call will go back
  router.to({
    url: "/pages/detail/detail",
    backOpenedPage: true,
  });
}

// ==========================================================================
// 5. Skip Interceptors
// ==========================================================================
function handleNotIntercept(): void {
  router.to({
    url: "/pages/public/public",
    notIntercept: true,
  });
}

// ==========================================================================
// 6. Per-Navigation Interceptor
// ==========================================================================
function handleCustomIntercept(): void {
  const customInterceptor: Middleware = (_context, next) => {
    uni.showLoading({ title: "校验中..." });

    // Simulate async validation (e.g., checking if a marketing page is enabled)
    setTimeout(() => {
      uni.hideLoading();
      // Simulate a successful check
      const passed = true;
      if (passed) {
        uni.showToast({ title: "校验通过", icon: "success" });
        next();
      } else {
        uni.showToast({ title: "页面不可用!", icon: "error" });
      }
    }, 1000);
  };

  router.to({
    url: "/pages/marketing/marketing",
    intercept: customInterceptor,
    params: { layoutConfigId: "demo-layout" },
  });
}

// ==========================================================================
// 7. Auth Guard Demo
// ==========================================================================
function handleLogin(): void {
  const newState = !getLoggedIn();
  setLoggedIn(newState);
  isLoggedIn.value = newState;
  uni.showToast({
    title: newState ? "已登录" : "已登出",
    icon: "success",
  });
}

function handleGoToDetail(): void {
  router.to({ url: "/pages/detail/detail" });
}
</script>

<style scoped>
.container {
  padding: 20rpx 30rpx;
  padding-bottom: 80rpx;
}

.header {
  text-align: center;
  padding: 40rpx 0;
}

.title {
  font-size: 44rpx;
  font-weight: bold;
  color: #333;
  display: block;
}

.subtitle {
  font-size: 26rpx;
  color: #999;
  margin-top: 10rpx;
  display: block;
}

/* Sections */
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

/* Buttons */
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

.btn-warning {
  background-color: #ff9500;
  color: #fff;
}

.btn-success {
  background-color: #34c759;
  color: #fff;
}

.btn-error {
  background-color: #ff3b30;
  color: #fff;
}

.btn-default {
  background-color: #f0f0f0;
  color: #333;
}

/* Inputs */
.input-group {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.label {
  width: 120rpx;
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

/* Hints */
.hint {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
  display: block;
  line-height: 1.5;
}

/* Auth status */
.auth-status {
  margin-bottom: 20rpx;
  font-size: 28rpx;
}

.text-success {
  color: #34c759;
  font-weight: bold;
}

.text-error {
  color: #ff3b30;
  font-weight: bold;
}
</style>
