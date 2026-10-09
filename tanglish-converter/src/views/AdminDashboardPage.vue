<template>
  <div class="admin-page">
    <!-- ─────────────────── LOGIN GATE SCREEN (WHEN NOT LOGGED IN) ─────────────────── -->
    <div v-if="!isAdminAuthenticated" class="login-gate-wrapper">
      <div class="login-card glass">
        <div class="login-card-header">
          <div class="shield-icon-wrap">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <rect x="9" y="9" width="6" height="5" rx="1"></rect>
              <path d="M10 9V7a2 2 0 1 1 4 0v2"></path>
            </svg>
          </div>
          <h2>Usil AI Admin Access</h2>
          <p class="login-sub">Please enter your Admin ID and Password to manage dictionary records, Trie cache, and system internals.</p>
        </div>

        <!-- Login Error Alert -->
        <div v-if="loginError" class="login-error-alert">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{{ loginError }}</span>
        </div>

        <form @submit.prevent="handleAdminLoginSubmit" class="login-form">
          <div class="form-group">
            <label class="form-label">Admin ID (Username)</label>
            <div class="input-icon-wrap">
              <svg class="field-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <input
                v-model="loginForm.username"
                type="text"
                required
                autocomplete="username"
                placeholder="e.g. admin"
                class="form-input with-icon"
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Admin Password</label>
            <div class="input-icon-wrap">
              <svg class="field-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <input
                v-model="loginForm.password"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="current-password"
                placeholder="••••••••"
                class="form-input with-icon with-eye"
              />
              <button type="button" @click="showPassword = !showPassword" class="eye-toggle-btn" tabindex="-1">
                {{ showPassword ? 'Hide' : 'Show' }}
              </button>
            </div>
          </div>

          <div class="remember-row">
            <label class="checkbox-label">
              <input type="checkbox" v-model="loginForm.remember" />
              <span>Remember session on this device</span>
            </label>
          </div>

          <button type="submit" :disabled="isLoggingIn" class="btn-primary full-width login-submit-btn">
            <span v-if="isLoggingIn">Verifying Credentials...</span>
            <span v-else>Sign In to Admin Portal</span>
          </button>
        </form>

        <div class="login-footer">
          <p class="credential-tip">
            Default credentials: ID: <code>admin</code> | Password: <code>admin123</code> (Configurable in .env or Settings).
          </p>
          <a href="/" class="return-home-link">← Return to Main Application</a>
        </div>
      </div>
    </div>

    <!-- ─────────────────── AUTHENTICATED ADMIN DASHBOARD ─────────────────── -->
    <div v-else>
      <!-- Header Banner -->
      <header class="admin-header">
        <div class="header-inner">
          <div class="header-titles">
            <div class="badge-row">
              <span class="admin-badge">Admin Console</span>
              <span class="admin-user-tag">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                ID: {{ activeAdminUser }}
              </span>
              <span :class="['status-pill', systemStatus?.status === 'healthy' ? 'online' : 'offline']">
                <span class="status-dot"></span>
                {{ systemStatus?.status === 'healthy' ? 'Engine Online' : 'Engine Checking...' }}
              </span>
            </div>
            <h1>Usil AI System Administration</h1>
            <p class="subtitle">Protected portal for vocabulary management, dictionary updates, and memory cache pipeline control.</p>
          </div>

          <div class="header-actions">
            <a :href="sqlAdminUrl" target="_blank" rel="noopener noreferrer" class="btn-secondary sqladmin-btn" title="Open SQLAdmin in new tab">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              SQLAdmin Portal
            </a>
            <button @click="handleReloadTrie" :disabled="isReloadingTrie" class="btn-primary reload-btn">
              <svg :class="['icon-spin', { active: isReloadingTrie }]" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
              {{ isReloadingTrie ? 'Syncing...' : 'Hot-Reload Trie' }}
            </button>
            <button @click="handleAdminLogout" class="btn-logout" title="Log out of Admin Portal">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Lock / Logout
            </button>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <nav class="admin-tabs">
          <button
            @click="activeTab = 'overview'"
            :class="['tab-btn', { active: activeTab === 'overview' }]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="9"></rect>
              <rect x="14" y="3" width="7" height="5"></rect>
              <rect x="14" y="12" width="7" height="9"></rect>
              <rect x="3" y="16" width="7" height="5"></rect>
            </svg>
            Overview & Analytics
          </button>
          <button
            @click="activeTab = 'dictionary'"
            :class="['tab-btn', { active: activeTab === 'dictionary' }]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            Dictionary Management
          </button>
          <button
            @click="activeTab = 'system'"
            :class="['tab-btn', { active: activeTab === 'system' }]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            System & Security
          </button>
        </nav>
      </header>

      <!-- Notification Toast -->
      <transition name="toast">
        <div v-if="toastMessage" :class="['toast-banner', toastType]">
          <span>{{ toastMessage }}</span>
          <button @click="toastMessage = ''" class="toast-close">&times;</button>
        </div>
      </transition>

      <!-- Main Container Content -->
      <main class="admin-content">
        <!-- ─────────────────── TAB 1: OVERVIEW & ANALYTICS ─────────────────── -->
        <section v-if="activeTab === 'overview'" class="tab-panel">
          <!-- Metric Cards -->
          <div class="metrics-grid">
            <div class="metric-card glass">
              <div class="metric-icon-wrap blue">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                </svg>
              </div>
              <div class="metric-details">
                <span class="metric-label">Database Words</span>
                <span class="metric-value">{{ (analyticsData?.summary?.total_dictionary_words ?? systemStatus?.database?.total_words ?? 0).toLocaleString() }}</span>
                <span class="metric-sub">Stored in PostgreSQL</span>
              </div>
            </div>

            <div class="metric-card glass">
              <div class="metric-icon-wrap green">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
              </div>
              <div class="metric-details">
                <span class="metric-label">In-Memory Trie Cache</span>
                <span class="metric-value">{{ (systemStatus?.trie_cache?.in_memory_words ?? 0).toLocaleString() }}</span>
                <span class="metric-sub">Instant zero-latency lookup</span>
              </div>
            </div>

            <div class="metric-card glass">
              <div class="metric-icon-wrap purple">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div class="metric-details">
                <span class="metric-label">User-Learned Frequencies</span>
                <span class="metric-value">{{ (analyticsData?.summary?.total_user_tracked_words ?? 0).toLocaleString() }}</span>
                <span class="metric-sub">Adaptive session & user models</span>
              </div>
            </div>

            <div class="metric-card glass">
              <div class="metric-icon-wrap orange">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                  <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                  <line x1="6" y1="6" x2="6.01" y2="6"></line>
                  <line x1="6" y1="18" x2="6.01" y2="18"></line>
                </svg>
              </div>
              <div class="metric-details">
                <span class="metric-label">Reranker Model</span>
                <span class="metric-value">{{ systemStatus?.reranker?.status || 'Active' }}</span>
                <span class="metric-sub">ONNX Dynamic Transformer</span>
              </div>
            </div>
          </div>

          <!-- Analytics Charts & Tables Split -->
          <div class="analytics-row">
            <!-- Top Words Table -->
            <div class="card glass flex-1">
              <div class="card-header">
                <h3>Top Most Frequent Words</h3>
                <span class="card-caption">Highest weighted terms in suggestion ranking</span>
              </div>
              <div class="table-container">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Tanglish</th>
                      <th>Tamil</th>
                      <th class="text-right">Frequency</th>
                      <th>Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(word, idx) in analyticsData?.top_frequent_words || []" :key="idx">
                      <td><code class="code-pill">{{ word.tanglish }}</code></td>
                      <td class="tamil-text font-lg">{{ word.tamil }}</td>
                      <td class="text-right font-mono">{{ Number(word.frequency).toLocaleString() }}</td>
                      <td>
                        <div class="freq-bar-wrap">
                          <div
                            class="freq-bar"
                            :style="{ width: Math.min(100, Math.max(12, (word.frequency / (analyticsData?.top_frequent_words[0]?.frequency || 1)) * 100)) + '%' }"
                          ></div>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="!analyticsData?.top_frequent_words?.length">
                      <td colspan="4" class="empty-state">No frequency records found.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Distribution & User Adaptations -->
            <div class="card glass flex-1">
              <div class="card-header">
                <h3>Vocabulary Frequency Distribution</h3>
                <span class="card-caption">Breakdown across weight tiers</span>
              </div>
              
              <div class="distribution-bars">
                <div class="dist-item">
                  <div class="dist-header">
                    <span>High Frequency (&ge; 10,000)</span>
                    <span class="font-mono">{{ (analyticsData?.distribution?.high_frequency || 0).toLocaleString() }}</span>
                  </div>
                  <div class="bar-track">
                    <div class="bar-fill green-gradient" :style="{ width: getDistPercent(analyticsData?.distribution?.high_frequency) + '%' }"></div>
                  </div>
                </div>

                <div class="dist-item">
                  <div class="dist-header">
                    <span>Medium Frequency (1,000 - 9,999)</span>
                    <span class="font-mono">{{ (analyticsData?.distribution?.medium_frequency || 0).toLocaleString() }}</span>
                  </div>
                  <div class="bar-track">
                    <div class="bar-fill blue-gradient" :style="{ width: getDistPercent(analyticsData?.distribution?.medium_frequency) + '%' }"></div>
                  </div>
                </div>

                <div class="dist-item">
                  <div class="dist-header">
                    <span>Standard / Low (&lt; 1,000)</span>
                    <span class="font-mono">{{ (analyticsData?.distribution?.low_frequency || 0).toLocaleString() }}</span>
                  </div>
                  <div class="bar-track">
                    <div class="bar-fill purple-gradient" :style="{ width: getDistPercent(analyticsData?.distribution?.low_frequency) + '%' }"></div>
                  </div>
                </div>
              </div>

              <div class="card-header mt-lg">
                <h3>User Adaptive Corrections</h3>
                <span class="card-caption">Terms boosted by user selection</span>
              </div>

              <div class="table-container small-table">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Tanglish</th>
                      <th>Target Tamil</th>
                      <th class="text-right">Hits</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(uw, idx) in analyticsData?.top_user_adaptive_words || []" :key="idx">
                      <td><code class="code-pill">{{ uw.tanglish }}</code></td>
                      <td class="tamil-text">{{ uw.tamil }}</td>
                      <td class="text-right font-mono font-bold">{{ uw.usage_count }}</td>
                    </tr>
                    <tr v-if="!analyticsData?.top_user_adaptive_words?.length">
                      <td colspan="3" class="empty-state">No adaptive user words recorded yet.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <!-- ─────────────────── TAB 2: DICTIONARY MANAGEMENT ─────────────────── -->
        <section v-if="activeTab === 'dictionary'" class="tab-panel">
          <div class="card glass">
            <!-- Action & Search Toolbar -->
            <div class="dictionary-toolbar">
              <div class="search-wrap">
                <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  v-model="searchQuery"
                  @input="handleSearchDebounced"
                  type="text"
                  placeholder="Search by Tanglish (e.g. vanakkam) or Tamil (e.g. வணக்கம்)..."
                  class="search-input"
                />
                <button v-if="searchQuery" @click="clearSearch" class="clear-search-btn">&times;</button>
              </div>

              <div class="toolbar-btns">
                <button @click="openAddModal" class="btn-primary add-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add New Word
                </button>
              </div>
            </div>

            <!-- Words Table -->
            <div class="table-container main-words-table">
              <div v-if="isLoadingWords" class="table-loading">
                <div class="spinner"></div>
                <span>Loading dictionary records...</span>
              </div>

              <table v-else class="data-table">
                <thead>
                  <tr>
                    <th class="w-10">ID</th>
                    <th @click="toggleSort('tanglish')" class="sortable">
                      Tanglish
                      <span v-if="sortBy === 'tanglish'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                    </th>
                    <th>Tamil Word</th>
                    <th @click="toggleSort('frequency')" class="sortable text-right">
                      Frequency Weight
                      <span v-if="sortBy === 'frequency'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                    </th>
                    <th>Prefix</th>
                    <th class="text-right w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="word in wordsList" :key="word.id" class="table-row">
                    <td class="font-mono text-muted">#{{ word.id }}</td>
                    <td>
                      <code class="code-pill bold">{{ word.tanglish }}</code>
                    </td>
                    <td>
                      <span class="tamil-text font-lg text-primary">{{ word.tamil }}</span>
                    </td>
                    <td class="text-right font-mono">
                      <span class="freq-badge">{{ word.frequency.toLocaleString() }}</span>
                    </td>
                    <td>
                      <span class="prefix-tag">{{ word.prefix }}</span>
                    </td>
                    <td class="text-right">
                      <div class="action-btn-group">
                        <button @click="openEditModal(word)" class="btn-icon edit" title="Edit Word">
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button @click="confirmDeleteWord(word)" class="btn-icon delete" title="Delete Word">
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!wordsList.length && !isLoadingWords">
                    <td colspan="6" class="empty-state">
                      No words found matching "{{ searchQuery }}".
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Pagination Bar -->
            <div class="pagination-footer">
              <div class="pagination-info">
                Showing <strong>{{ wordsList.length }}</strong> of <strong>{{ totalWordsCount.toLocaleString() }}</strong> entries
                (Page {{ currentPage }} of {{ totalPages }})
              </div>
              <div class="pagination-controls">
                <button
                  @click="goToPage(currentPage - 1)"
                  :disabled="currentPage <= 1 || isLoadingWords"
                  class="page-nav-btn"
                >
                  Previous
                </button>
                <span class="current-page-num">{{ currentPage }}</span>
                <button
                  @click="goToPage(currentPage + 1)"
                  :disabled="currentPage >= totalPages || isLoadingWords"
                  class="page-nav-btn"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- ─────────────────── TAB 3: SYSTEM & SECURITY ─────────────────── -->
        <section v-if="activeTab === 'system'" class="tab-panel">
          <div class="system-grid">
            <!-- Server Status Card -->
            <div class="card glass">
              <div class="card-header">
                <h3>FastAPI Backend & Pipeline Status</h3>
                <span class="card-caption">Current execution environment</span>
              </div>
              
              <div class="status-items-list">
                <div class="status-item">
                  <span class="item-label">Server State</span>
                  <span class="item-value badge-success">{{ systemStatus?.status?.toUpperCase() || 'ONLINE' }}</span>
                </div>
                <div class="status-item">
                  <span class="item-label">Process ID (PID)</span>
                  <span class="item-value font-mono">{{ systemStatus?.system?.pid || 'N/A' }}</span>
                </div>
                <div class="status-item">
                  <span class="item-label">Server Uptime</span>
                  <span class="item-value font-mono">{{ formatUptime(systemStatus?.system?.uptime_seconds) }}</span>
                </div>
                <div class="status-item">
                  <span class="item-label">PostgreSQL Database</span>
                  <span :class="['item-value', systemStatus?.database?.connected ? 'text-success' : 'text-danger']">
                    {{ systemStatus?.database?.connected ? 'Connected (usil_db)' : 'Disconnected' }}
                  </span>
                </div>
                <div class="status-item">
                  <span class="item-label">Database Word Count</span>
                  <span class="item-value font-mono">{{ (systemStatus?.database?.total_words ?? 0).toLocaleString() }}</span>
                </div>
                <div class="status-item">
                  <span class="item-label">In-Memory Trie Size</span>
                  <span class="item-value font-mono font-bold text-primary">{{ (systemStatus?.trie_cache?.in_memory_words ?? 0).toLocaleString() }} words</span>
                </div>
                <div class="status-item">
                  <span class="item-label">ONNX Sentence Reranker</span>
                  <span class="item-value badge-info">{{ systemStatus?.reranker?.model || 'model_dynamic.onnx' }} ({{ systemStatus?.reranker?.status }})</span>
                </div>
              </div>

              <!-- Hot-Reload Trie Action -->
              <div class="mt-lg pt-border">
                <h4>Hot-Reload In-Memory Cache</h4>
                <p class="tool-desc">Synchronize in-memory RAM directly from PostgreSQL database without dropping server connections.</p>
                <button @click="handleReloadTrie" :disabled="isReloadingTrie" class="btn-primary full-width">
                  <svg :class="['icon-spin', { active: isReloadingTrie }]" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                  </svg>
                  {{ isReloadingTrie ? 'Reloading Trie...' : 'Sync Database Words to Trie' }}
                </button>
              </div>
            </div>

            <!-- Admin Credentials Management Card -->
            <div class="card glass">
              <div class="card-header">
                <h3>Admin ID & Password Management</h3>
                <span class="card-caption">Update credentials used for all admin pages</span>
              </div>

              <form @submit.prevent="handleChangeCredentialsSubmit" class="security-form">
                <div class="form-group">
                  <label class="form-label">Current Admin Password <span class="required">*</span></label>
                  <input
                    v-model="credForm.currentPassword"
                    type="password"
                    required
                    placeholder="Enter current password"
                    class="form-input"
                  />
                  <span class="form-hint">Required to authorize credential updates</span>
                </div>

                <div class="form-group">
                  <label class="form-label">New Admin ID (Username)</label>
                  <input
                    v-model="credForm.newUsername"
                    type="text"
                    :placeholder="activeAdminUser"
                    class="form-input"
                  />
                  <span class="form-hint">Leave blank to keep current ID: {{ activeAdminUser }}</span>
                </div>

                <div class="form-group">
                  <label class="form-label">New Admin Password <span class="required">*</span></label>
                  <input
                    v-model="credForm.newPassword"
                    type="password"
                    required
                    minlength="4"
                    placeholder="Enter new strong password"
                    class="form-input"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Confirm New Password <span class="required">*</span></label>
                  <input
                    v-model="credForm.confirmPassword"
                    type="password"
                    required
                    placeholder="Confirm new password"
                    class="form-input"
                  />
                </div>

                <button type="submit" :disabled="isUpdatingCredentials" class="btn-primary full-width">
                  {{ isUpdatingCredentials ? 'Updating Credentials...' : 'Save New Admin Credentials' }}
                </button>
              </form>

              <!-- Live Testing Box -->
              <div class="mt-lg pt-border">
                <h4>Live Word Verification</h4>
                <p class="tool-desc">Type a word to verify how the in-memory Trie and API engine suggest candidates.</p>
                <input
                  v-model="testWordInput"
                  @input="handleTestWordInput"
                  type="text"
                  placeholder="Test Tanglish word (e.g. vanakkam)..."
                  class="form-input mb-sm"
                />

                <div v-if="testSuggestions.length" class="suggestions-chips">
                  <div v-for="(sug, idx) in testSuggestions" :key="idx" class="suggestion-chip">
                    <span class="chip-tamil">{{ sug.tamil }}</span>
                    <span class="chip-tanglish">{{ sug.tanglish }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <!-- ─────────────────── ADD / EDIT WORD MODAL ─────────────────── -->
      <div v-if="showWordModal" class="modal-overlay" @click.self="closeWordModal">
        <div class="modal-box glass">
          <div class="modal-header">
            <h3>{{ isEditingWord ? 'Edit Dictionary Word' : 'Add New Dictionary Word' }}</h3>
            <button @click="closeWordModal" class="modal-close">&times;</button>
          </div>

          <form @submit.prevent="submitWordForm" class="modal-form">
            <div class="form-group">
              <label class="form-label">Tanglish Spelling <span class="required">*</span></label>
              <input
                v-model="wordForm.tanglish"
                type="text"
                required
                placeholder="e.g. vanakkam"
                class="form-input"
                :disabled="isEditingWord"
              />
              <span class="form-hint">English phonetic representation</span>
            </div>

            <div class="form-group">
              <label class="form-label">Tamil Word <span class="required">*</span></label>
              <input
                v-model="wordForm.tamil"
                type="text"
                required
                placeholder="e.g. வணக்கம்"
                class="form-input tamil-text font-lg"
              />
              <span class="form-hint">Target Tamil script rendering</span>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label class="form-label">Frequency Weight</label>
                <input
                  v-model.number="wordForm.frequency"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="100"
                  class="form-input font-mono"
                />
              </div>

              <div class="form-group flex-1">
                <label class="form-label">Prefix (Optional)</label>
                <input
                  v-model="wordForm.prefix"
                  type="text"
                  maxlength="10"
                  placeholder="auto"
                  class="form-input font-mono"
                />
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" @click="closeWordModal" class="btn-secondary">Cancel</button>
              <button type="submit" :disabled="isSavingWord" class="btn-primary">
                {{ isSavingWord ? 'Saving...' : (isEditingWord ? 'Update Word' : 'Create Word') }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- ─────────────────── DELETE CONFIRM MODAL ─────────────────── -->
      <div v-if="wordToDelete" class="modal-overlay" @click.self="wordToDelete = null">
        <div class="modal-box glass confirm-box">
          <div class="modal-header">
            <h3>Confirm Delete Word</h3>
            <button @click="wordToDelete = null" class="modal-close">&times;</button>
          </div>
          <p class="confirm-message">
            Are you sure you want to delete <strong class="code-pill">{{ wordToDelete.tanglish }}</strong> (<span class="tamil-text">{{ wordToDelete.tamil }}</span>) from the database and in-memory Trie?
          </p>
          <div class="modal-actions">
            <button type="button" @click="wordToDelete = null" class="btn-secondary">Cancel</button>
            <button @click="executeDeleteWord" :disabled="isDeletingWord" class="btn-danger">
              {{ isDeletingWord ? 'Deleting...' : 'Delete Word' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import {
  isAdminLoggedIn,
  getAdminUsername,
  adminLogin,
  adminLogout,
  verifyAdminSession,
  changeAdminCredentials,
  fetchAdminWords,
  createAdminWord,
  updateAdminWord,
  deleteAdminWord,
  fetchAdminStatus,
  reloadAdminTrie,
  fetchAdminAnalytics,
  fetchSuggestions
} from '@/services/apiService'

// Tab state
const activeTab = ref('overview')

// Direct SQLAdmin Portal URL
const sqlAdminUrl = (typeof window !== 'undefined' && window.location.hostname)
  ? `http://${window.location.hostname}:8000/admin`
  : 'http://localhost:8000/admin'

// Toast state
const toastMessage = ref('')
const toastType = ref('success')
const showToast = (msg, type = 'success') => {
  toastMessage.value = msg
  toastType.value = type
  setTimeout(() => {
    if (toastMessage.value === msg) toastMessage.value = ''
  }, 4000)
}

// ── Authentication States ───────────────────────────────────────────────────
const isAdminAuthenticated = ref(false)
const activeAdminUser = ref('admin')
const isLoggingIn = ref(false)
const loginError = ref('')
const showPassword = ref(false)

const loginForm = ref({
  username: 'admin',
  password: '',
  remember: true
})

// Change Credentials Form State
const isUpdatingCredentials = ref(false)
const credForm = ref({
  currentPassword: '',
  newUsername: '',
  newPassword: '',
  confirmPassword: ''
})

// ── Data States ─────────────────────────────────────────────────────────────
const systemStatus = ref(null)
const analyticsData = ref(null)

// Dictionary Management State
const wordsList = ref([])
const totalWordsCount = ref(0)
const currentPage = ref(1)
const totalPages = ref(1)
const searchQuery = ref('')
const sortBy = ref('frequency')
const sortOrder = ref('desc')
const isLoadingWords = ref(false)

// Modals State
const showWordModal = ref(false)
const isEditingWord = ref(false)
const isSavingWord = ref(false)
const wordForm = ref({
  id: null,
  tanglish: '',
  tamil: '',
  frequency: 100,
  prefix: ''
})

const wordToDelete = ref(null)
const isDeletingWord = ref(false)

// In-Memory Trie Hot-Reload state
const isReloadingTrie = ref(false)

// Live Test Tool State
const testWordInput = ref('')
const testSuggestions = ref([])
let testDebounce = null

// ── Auth Handlers ───────────────────────────────────────────────────────────

const handleAdminLoginSubmit = async () => {
  isLoggingIn.value = true
  loginError.value = ''
  try {
    const res = await adminLogin(loginForm.value.username, loginForm.value.password, loginForm.value.remember)
    isAdminAuthenticated.value = true
    activeAdminUser.value = res.username || loginForm.value.username
    loginForm.value.password = ''
    showToast(`Welcome, ${activeAdminUser.value}! Admin session activated.`)
    await initializeAdminData()
  } catch (err) {
    loginError.value = err.message || 'Invalid Admin ID or Password. Please try again.'
  } finally {
    isLoggingIn.value = false
  }
}

const handleAdminLogout = () => {
  adminLogout()
  isAdminAuthenticated.value = false
  loginError.value = ''
  showToast('Admin session locked. Log in again to access.', 'error')
}

const handleChangeCredentialsSubmit = async () => {
  if (credForm.value.newPassword !== credForm.value.confirmPassword) {
    showToast('New Password and Confirmation do not match!', 'error')
    return
  }

  isUpdatingCredentials.value = true
  try {
    const res = await changeAdminCredentials({
      currentPassword: credForm.value.currentPassword,
      newUsername: credForm.value.newUsername.trim() || undefined,
      newPassword: credForm.value.newPassword.trim()
    })
    activeAdminUser.value = res.username
    credForm.value = {
      currentPassword: '',
      newUsername: '',
      newPassword: '',
      confirmPassword: ''
    }
    showToast('Admin ID & Password successfully updated and saved to .env!')
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    isUpdatingCredentials.value = false
  }
}

// ── Data Loaders ────────────────────────────────────────────────────────────

const initializeAdminData = async () => {
  await Promise.all([
    loadStatus(),
    loadAnalytics(),
    loadWords(1)
  ])
}

const loadStatus = async () => {
  try {
    const data = await fetchAdminStatus()
    systemStatus.value = data
  } catch (err) {
    if (err.message && err.message.includes('Unauthorized')) {
      isAdminAuthenticated.value = false
    }
  }
}

const loadAnalytics = async () => {
  try {
    const data = await fetchAdminAnalytics()
    analyticsData.value = data
  } catch (err) {
    if (err.message && err.message.includes('Unauthorized')) {
      isAdminAuthenticated.value = false
    }
  }
}

const loadWords = async (page = 1) => {
  isLoadingWords.value = true
  currentPage.value = page
  try {
    const data = await fetchAdminWords({
      search: searchQuery.value,
      page,
      limit: 20,
      sortBy: sortBy.value,
      order: sortOrder.value
    })
    wordsList.value = data.items || []
    totalWordsCount.value = data.total || 0
    totalPages.value = data.total_pages || 1
  } catch (err) {
    if (err.message && err.message.includes('Unauthorized')) {
      isAdminAuthenticated.value = false
    } else {
      showToast('Failed to load dictionary records: ' + err.message, 'error')
    }
  } finally {
    isLoadingWords.value = false
  }
}

let searchDebounceTimer = null
const handleSearchDebounced = () => {
  clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    loadWords(1)
  }, 300)
}

const clearSearch = () => {
  searchQuery.value = ''
  loadWords(1)
}

const toggleSort = (field) => {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortOrder.value = 'desc'
  }
  loadWords(1)
}

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    loadWords(page)
  }
}

// ── Word Modal Handlers ─────────────────────────────────────────────────────

const openAddModal = () => {
  isEditingWord.value = false
  wordForm.value = {
    id: null,
    tanglish: '',
    tamil: '',
    frequency: 100,
    prefix: ''
  }
  showWordModal.value = true
}

const openEditModal = (word) => {
  isEditingWord.value = true
  wordForm.value = {
    id: word.id,
    tanglish: word.tanglish,
    tamil: word.tamil,
    frequency: word.frequency,
    prefix: word.prefix
  }
  showWordModal.value = true
}

const closeWordModal = () => {
  showWordModal.value = false
}

const submitWordForm = async () => {
  isSavingWord.value = true
  try {
    if (isEditingWord.value) {
      await updateAdminWord(wordForm.value.id, {
        tanglish: wordForm.value.tanglish,
        tamil: wordForm.value.tamil,
        frequency: wordForm.value.frequency,
        prefix: wordForm.value.prefix
      })
      showToast(`Word "${wordForm.value.tanglish}" updated & Trie synced!`)
    } else {
      await createAdminWord({
        tanglish: wordForm.value.tanglish,
        tamil: wordForm.value.tamil,
        frequency: wordForm.value.frequency,
        prefix: wordForm.value.prefix
      })
      showToast(`Word "${wordForm.value.tanglish}" added & Trie updated!`)
    }
    showWordModal.value = false
    await loadWords(currentPage.value)
    await loadStatus()
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    isSavingWord.value = false
  }
}

const confirmDeleteWord = (word) => {
  wordToDelete.value = word
}

const executeDeleteWord = async () => {
  if (!wordToDelete.value) return
  isDeletingWord.value = true
  try {
    await deleteAdminWord(wordToDelete.value.id)
    showToast(`Deleted "${wordToDelete.value.tanglish}" from DB & Trie.`)
    wordToDelete.value = null
    await loadWords(currentPage.value)
    await loadStatus()
  } catch (err) {
    showToast('Delete failed: ' + err.message, 'error')
  } finally {
    isDeletingWord.value = false
  }
}

// Hot Reload Trie Action
const handleReloadTrie = async () => {
  isReloadingTrie.value = true
  try {
    const res = await reloadAdminTrie()
    showToast(`Trie Reloaded: ${res.loaded_words.toLocaleString()} words loaded in-memory!`, 'success')
    await loadStatus()
  } catch (err) {
    showToast('Trie Reload Failed: ' + err.message, 'error')
  } finally {
    isReloadingTrie.value = false
  }
}

// Live Word Tester Handler
const handleTestWordInput = () => {
  clearTimeout(testDebounce)
  if (!testWordInput.value.trim()) {
    testSuggestions.value = []
    return
  }
  testDebounce = setTimeout(async () => {
    try {
      const results = await fetchSuggestions(testWordInput.value.trim(), 8)
      testSuggestions.value = results
    } catch {
      testSuggestions.value = []
    }
  }, 150)
}

// Helper formatting functions
const formatUptime = (seconds) => {
  if (!seconds) return '0s'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

const getDistPercent = (count) => {
  const total = analyticsData.value?.summary?.total_dictionary_words || 1
  return Math.min(100, Math.round(((count || 0) / total) * 100))
}

onMounted(async () => {
  activeAdminUser.value = getAdminUsername()
  if (isAdminLoggedIn()) {
    const valid = await verifyAdminSession()
    if (valid) {
      isAdminAuthenticated.value = true
      await initializeAdminData()
    } else {
      isAdminAuthenticated.value = false
    }
  }
})
</script>

<style scoped>
/* Page Layout */
.admin-page {
  min-height: 100vh;
  background-color: #f1f5f9;
  color: #1e293b;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  padding-bottom: 60px;
}

/* Login Gate Screen */
.login-gate-wrapper {
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
}

.login-card {
  width: 100%;
  max-width: 440px;
  background: #ffffff;
  border-radius: 20px;
  padding: 36px 32px;
  box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.1);
  border: 1px solid #e2e8f0;
}

.login-card-header {
  text-align: center;
  margin-bottom: 24px;
}

.shield-icon-wrap {
  width: 56px;
  height: 56px;
  background: #ede9fe;
  color: #6366f1;
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}

.login-card-header h2 {
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
  margin-bottom: 8px;
}

.login-sub {
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
}

.login-error-alert {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.field-icon {
  position: absolute;
  left: 12px;
  color: #94a3b8;
  pointer-events: none;
}

.form-input.with-icon {
  padding-left: 38px;
}

.form-input.with-eye {
  padding-right: 56px;
}

.eye-toggle-btn {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  font-size: 12px;
  color: #6366f1;
  font-weight: 600;
  cursor: pointer;
  padding: 4px;
}

.remember-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #475569;
  cursor: pointer;
}

.login-submit-btn {
  padding: 12px !important;
  font-size: 15px !important;
  margin-top: 6px;
}

.login-footer {
  text-align: center;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #f1f5f9;
}

.credential-tip {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 12px;
  background: #f8fafc;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px dashed #cbd5e1;
}

.credential-tip code {
  font-weight: 700;
  color: #4f46e5;
}

.return-home-link {
  font-size: 13px;
  color: #64748b;
  text-decoration: none;
  font-weight: 500;
}

.return-home-link:hover {
  color: #4f46e5;
}

/* Header */
.admin-header {
  background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%);
  color: #ffffff;
  padding: 32px 32px 0 32px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-inner {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 20px;
}

.badge-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.admin-badge {
  background: rgba(99, 102, 241, 0.25);
  border: 1px solid rgba(129, 140, 248, 0.4);
  color: #c7d2fe;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 3px 10px;
  border-radius: 9999px;
}

.admin-user-tag {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.08);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.8);
}

.status-pill.offline .status-dot {
  background-color: #eab308;
  box-shadow: 0 0 8px rgba(234, 179, 8, 0.8);
}

.header-titles h1 {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 6px;
}

.subtitle {
  color: #94a3b8;
  font-size: 14px;
  max-width: 600px;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.btn-logout {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #fca5a5;
  padding: 9px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.btn-logout:hover {
  background: rgba(239, 68, 68, 0.35);
  color: #ffffff;
}

/* Tabs */
.admin-tabs {
  max-width: 1400px;
  margin: 28px auto 0 auto;
  display: flex;
  gap: 4px;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  color: #94a3b8;
  font-size: 14px;
  font-weight: 600;
  padding: 12px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  color: #e2e8f0;
}

.tab-btn.active {
  color: #ffffff;
  border-bottom-color: #6366f1;
}

/* Toast */
.toast-banner {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-radius: 10px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  font-size: 14px;
  font-weight: 500;
}

.toast-banner.success {
  background: #065f46;
  color: #ecfdf5;
  border: 1px solid #10b981;
}

.toast-banner.error {
  background: #991b1b;
  color: #fef2f2;
  border: 1px solid #ef4444;
}

.toast-close {
  background: transparent;
  border: none;
  color: inherit;
  font-size: 20px;
  cursor: pointer;
}

/* Main Content */
.admin-content {
  max-width: 1400px;
  margin: 32px auto 0 auto;
  padding: 0 32px;
}

/* Cards & Glass Design */
.glass {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 28px;
}

.metric-card {
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 18px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08);
}

.metric-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.metric-icon-wrap.blue { background: #eff6ff; color: #2563eb; }
.metric-icon-wrap.green { background: #f0fdf4; color: #16a34a; }
.metric-icon-wrap.purple { background: #faf5ff; color: #9333ea; }
.metric-icon-wrap.orange { background: #fff7ed; color: #ea580c; }

.metric-details {
  display: flex;
  flex-direction: column;
}

.metric-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
  margin-bottom: 4px;
}

.metric-value {
  font-size: 26px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.1;
}

.metric-sub {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 4px;
}

.analytics-row {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.flex-1 {
  flex: 1;
  min-width: 320px;
}

.card {
  padding: 24px;
}

.card-header {
  margin-bottom: 20px;
}

.card-header h3 {
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 4px;
}

.card-caption {
  font-size: 13px;
  color: #64748b;
}

.mt-lg { margin-top: 28px; }
.mb-sm { margin-bottom: 12px; }
.pt-border {
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
}

.pt-border h4 {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 6px;
}

/* Security Form */
.security-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Distribution Bars */
.distribution-bars {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dist-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dist-header {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
}

.bar-track {
  width: 100%;
  height: 8px;
  background: #e2e8f0;
  border-radius: 9999px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 9999px;
  transition: width 0.4s ease;
}

.green-gradient { background: linear-gradient(90deg, #10b981, #059669); }
.blue-gradient { background: linear-gradient(90deg, #3b82f6, #2563eb); }
.purple-gradient { background: linear-gradient(90deg, #8b5cf6, #7c3aed); }

/* Tables */
.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 14px;
}

.data-table th {
  padding: 12px 14px;
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
  border-bottom: 2px solid #e2e8f0;
  white-space: nowrap;
}

.data-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.data-table th.sortable:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.data-table td {
  padding: 12px 14px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

.table-row:hover {
  background-color: #f8fafc;
}

.code-pill {
  background: #e2e8f0;
  color: #0f172a;
  padding: 3px 8px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 13px;
}

.code-pill.bold { font-weight: 700; }
.tamil-text { font-family: 'Noto Sans Tamil', sans-serif; }
.font-lg { font-size: 16px; }

.freq-badge {
  background: #e0e7ff;
  color: #3730a3;
  padding: 3px 8px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
}

.prefix-tag {
  background: #f1f5f9;
  color: #64748b;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-family: monospace;
}

.freq-bar-wrap {
  width: 120px;
  height: 6px;
  background: #f1f5f9;
  border-radius: 4px;
  overflow: hidden;
}

.freq-bar {
  height: 100%;
  background: #4f46e5;
  border-radius: 4px;
}

.text-right { text-align: right; }
.font-mono { font-family: monospace; }
.empty-state {
  text-align: center;
  padding: 36px !important;
  color: #94a3b8;
}

/* Dictionary Toolbar */
.dictionary-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search-wrap {
  position: relative;
  flex: 1;
  max-width: 500px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
}

.search-input {
  width: 100%;
  padding: 10px 36px 10px 38px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  background: #ffffff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.clear-search-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 18px;
  color: #94a3b8;
  cursor: pointer;
}

.toolbar-btns { display: flex; gap: 10px; }

.action-btn-group {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.btn-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon.edit:hover {
  background: #eff6ff;
  color: #2563eb;
  border-color: #bfdbfe;
}

.btn-icon.delete:hover {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fecaca;
}

/* Pagination */
.pagination-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 18px;
  margin-top: 12px;
  border-top: 1px solid #e2e8f0;
  font-size: 13px;
  color: #64748b;
  flex-wrap: wrap;
  gap: 12px;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-nav-btn {
  padding: 6px 14px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.page-nav-btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.page-nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.current-page-num {
  padding: 6px 12px;
  background: #4f46e5;
  color: #ffffff;
  border-radius: 6px;
  font-weight: 600;
  font-size: 13px;
}

/* Buttons */
.btn-primary {
  background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
  color: #ffffff;
  border: none;
  padding: 9px 18px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 4px rgba(79, 70, 229, 0.25);
  transition: all 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #4338ca 0%, #3730a3 100%);
  box-shadow: 0 4px 8px rgba(79, 70, 229, 0.35);
}

.btn-secondary {
  background: #ffffff;
  color: #334155;
  border: 1px solid #cbd5e1;
  padding: 9px 18px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #f8fafc;
  border-color: #94a3b8;
  color: #0f172a;
}

.btn-danger {
  background: #dc2626;
  color: #ffffff;
  border: none;
  padding: 9px 18px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-danger:hover:not(:disabled) { background: #b91c1c; }

.full-width {
  width: 100%;
  justify-content: center;
}

.icon-spin.active {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* System Tab */
.system-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 24px;
}

.status-items-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
  font-size: 14px;
}

.item-label { color: #64748b; font-weight: 500; }
.item-value { font-weight: 600; color: #0f172a; }

.badge-success {
  background: #dcfce7;
  color: #15803d;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 12px;
}

.badge-info {
  background: #e0e7ff;
  color: #4338ca;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 12px;
}

.text-success { color: #16a34a; }
.text-danger { color: #dc2626; }

.tool-desc {
  font-size: 13px;
  color: #475569;
  line-height: 1.5;
  margin-bottom: 14px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  background: #ffffff;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.suggestions-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.suggestion-chip {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 6px 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.chip-tamil {
  font-family: 'Noto Sans Tamil', sans-serif;
  font-weight: 700;
  color: #1e1b4b;
  font-size: 15px;
}

.chip-tanglish {
  font-size: 12px;
  color: #64748b;
  font-family: monospace;
}

/* Modals */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.modal-box {
  background: #ffffff;
  width: 100%;
  max-width: 520px;
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
}

.confirm-box { max-width: 440px; }
.confirm-message {
  font-size: 15px;
  color: #475569;
  line-height: 1.5;
  margin-bottom: 24px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.modal-close {
  background: transparent;
  border: none;
  font-size: 24px;
  color: #94a3b8;
  cursor: pointer;
  line-height: 1;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-hint {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 4px;
}

.required { color: #ef4444; }
.form-row { display: flex; gap: 16px; }

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 12px;
}

/* Responsive */
@media (max-width: 768px) {
  .admin-header { padding: 24px 16px 0 16px; }
  .admin-content { padding: 0 16px; }
  .header-actions { width: 100%; }
  .sqladmin-btn, .reload-btn, .btn-logout {
    flex: 1;
    justify-content: center;
  }
  .admin-tabs { overflow-x: auto; }
}
</style>
