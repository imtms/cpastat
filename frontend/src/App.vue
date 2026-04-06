<script setup>
import { onMounted, ref } from 'vue'
import axios from 'axios'

import { fetchApiKeyStats } from './api'

const loading = ref(false)
const error = ref('')
const stats = ref(null)

function formatNumber(value) {
  return new Intl.NumberFormat('zh-CN').format(value ?? 0)
}

async function loadStats() {
  error.value = ''
  loading.value = true

  try {
    stats.value = await fetchApiKeyStats()
  } catch (err) {
    if (axios.isAxiosError(err)) {
      error.value = err.response?.data?.error || err.response?.data?.detail || err.message
    } else {
      error.value = '请求失败，请稍后重试'
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadStats()
})
</script>

<template>
  <main class="page">
    <section class="panel">
      <h1>TMs API Key 统计面板</h1>
      <div class="toolbar">
        <button :disabled="loading" type="button" @click="loadStats">
          {{ loading ? '加载中...' : '刷新数据' }}
        </button>
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <section v-if="stats" class="result">
        <p class="api-key">当前 API Key: {{ stats.api_key_masked }}</p>
        <p class="api-key">统计时区: {{ stats.timezone }}（今日 {{ stats.today.date }}）</p>

        <h2 class="section-title">今日</h2>
        <div class="cards">
          <article class="card">
            <h2>请求次数</h2>
            <strong>{{ formatNumber(stats.today.request_count) }}</strong>
          </article>
          <article class="card">
            <h2>已用 Token</h2>
            <strong>{{ formatNumber(stats.today.total_tokens) }}</strong>
          </article>
          <article class="card">
            <h2>失败请求</h2>
            <strong>{{ formatNumber(stats.today.failure_count) }}</strong>
          </article>
        </div>

        <h2 class="section-title">总计</h2>
        <div class="cards">
          <article class="card">
            <h2>请求次数</h2>
            <strong>{{ formatNumber(stats.total.request_count) }}</strong>
          </article>
          <article class="card">
            <h2>已用 Token</h2>
            <strong>{{ formatNumber(stats.total.total_tokens) }}</strong>
          </article>
          <article class="card">
            <h2>失败请求</h2>
            <strong>{{ formatNumber(stats.total.failure_count) }}</strong>
          </article>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>模型</th>
                <th>今日请求</th>
                <th>今日 Token</th>
                <th>今日失败</th>
                <th>总请求</th>
                <th>总 Token</th>
                <th>总失败</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in stats.models" :key="item.model">
                <td>{{ item.model }}</td>
                <td>{{ formatNumber(item.today.request_count) }}</td>
                <td>{{ formatNumber(item.today.total_tokens) }}</td>
                <td>{{ formatNumber(item.today.failure_count) }}</td>
                <td>{{ formatNumber(item.total.request_count) }}</td>
                <td>{{ formatNumber(item.total.total_tokens) }}</td>
                <td>{{ formatNumber(item.total.failure_count) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>
  </main>
</template>

<style scoped>
:root {
  color-scheme: light;
}

.page {
  min-height: 100vh;
  margin: 0;
  padding: 24px;
  background: linear-gradient(160deg, #f6f8fb 0%, #f2f6ff 45%, #edf4ee 100%);
  font-family: "Avenir Next", "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #1c2835;
}

.panel {
  max-width: 980px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid #dce6e1;
  border-radius: 14px;
  padding: 24px;
  box-shadow: 0 18px 48px rgba(18, 39, 63, 0.08);
}

h1 {
  margin: 0 0 8px;
  font-size: 28px;
}

p {
  margin-top: 0;
}

.toolbar {
  margin: 18px 0;
}

.toolbar button {
  border: none;
  background: #1c6f55;
  color: #fff;
  border-radius: 10px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.toolbar button:disabled {
  opacity: 0.7;
  cursor: wait;
}

.error {
  color: #c63131;
  margin-bottom: 14px;
}

.api-key {
  margin: 0 0 14px;
  color: #475b6e;
}

.section-title {
  margin: 8px 0 10px;
  font-size: 18px;
  color: #284257;
}

.cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.card {
  border: 1px solid #d8e4ef;
  border-radius: 12px;
  background: #fbfdff;
  padding: 14px;
}

.card h2 {
  margin: 0;
  color: #4d5f72;
  font-size: 13px;
  font-weight: 600;
}

.card strong {
  display: block;
  margin-top: 6px;
  font-size: 24px;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 640px;
  background: #fff;
  border: 1px solid #dde7f0;
}

th,
td {
  text-align: left;
  padding: 11px;
  border-bottom: 1px solid #edf3f8;
  font-size: 14px;
}

th {
  color: #476178;
  background: #f4f8fd;
}

@media (max-width: 900px) {
  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .page {
    padding: 12px;
  }

  .panel {
    padding: 16px;
  }

  .cards {
    grid-template-columns: 1fr;
  }
}
</style>
