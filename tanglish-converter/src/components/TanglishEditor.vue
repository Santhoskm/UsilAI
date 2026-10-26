<template>
  <div class="tanglish-editor-container" :class="{ 'full-page-editor': fullPage, 'embedded-editor': !fullPage }">
    <!-- Files Sidebar (Left) - Separate Standalone Panel/Card when logged in & sidebar enabled -->
    <aside 
      v-if="isAuthenticated && showFilesSidebar && enableSidebar" 
      class="files-sidebar" 
      :class="{ 'full-page-sidebar': fullPage }"
    >
      <!-- Files Sidebar Header with Collapse Button -->
      <div class="files-sidebar-header">
        <div class="files-sidebar-title-wrap">
          <span class="files-folder-icon">📁</span>
          <span class="files-sidebar-heading">My Documents</span>
          <span class="files-count-badge" :class="{ 'at-limit': savedFiles.length >= 5 }">
            {{ savedFiles.length }}/5
          </span>
        </div>
        <button 
          v-if="fullPage"
          type="button" 
          @click="showFilesSidebar = false" 
          class="files-sidebar-collapse-btn" 
          title="Collapse documents sidebar"
        >
          ‹
        </button>
      </div>

      <!-- New File Action Button (Matches Screenshot) -->
      <div class="files-sidebar-top">
        <button 
          class="new-file-main-btn" 
          @click="createNewFile"
          :disabled="savedFiles.length >= 5"
          :title="savedFiles.length >= 5 ? '5/5 files limit reached' : 'Create new document'"
        >
          <span class="plus-symbol">+</span>
          <span class="new-file-label">New File</span>
          <span class="file-count-badge" :class="{ 'at-limit': savedFiles.length >= 5 }">
            {{ savedFiles.length }}/5
          </span>
        </button>
        <div class="files-sync-status-row" :title="syncStatus === 'syncing' ? 'Syncing to PostgreSQL database...' : syncStatus === 'error' ? 'Saved locally (offline)' : 'Stored in PostgreSQL Database'">
          <span class="sync-dot" :class="syncStatus"></span>
          <span class="sync-status-text">
            {{ syncStatus === 'syncing' ? 'Syncing to DB...' : syncStatus === 'error' ? 'Local only' : 'PostgreSQL Synced' }}
          </span>
        </div>
      </div>

      <!-- Files Scroll List -->
      <div class="files-scroll-list">
        <div class="file-group-section">
          <div class="group-header-label">Today</div>
          <div class="group-items-stack">
            <div 
              v-for="file in savedFiles" 
              :key="file.id"
              class="file-item-card"
              :class="{ 'active': file.id === activeFileId }"
              @click="switchToFile(file.id)"
            >
              <div class="file-item-main">
                <input 
                  v-if="editingFileId === file.id"
                  :id="`rename-input-${file.id}`"
                  v-model="editingTitleText"
                  @blur="saveRenameFile(file)"
                  @keydown.enter="saveRenameFile(file)"
                  @keydown.esc="editingFileId = null"
                  @click.stop
                  class="file-rename-input"
                />
                <span v-else class="file-item-title" :title="file.title">
                  {{ file.title }}
                </span>
              </div>
              <div class="file-item-actions" @click.stop>
                <button 
                  type="button"
                  class="file-action-icon-btn rename-btn" 
                  @click.stop="startRenameFile(file, $event)" 
                  title="Rename File"
                >
                  ✎
                </button>
                <button 
                  type="button"
                  class="file-action-icon-btn delete-btn" 
                  @click.stop.prevent="deleteFile(file.id, $event)" 
                  title="Delete File"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- Document Workspace Stage Panel (Separate Card on Right) -->
    <div class="document-stage-panel" :class="{ 'full-page-stage': fullPage, 'embedded-stage': !fullPage }">
      <!-- 1. FULL-PAGE FLOATING STICKY TOOLBAR (Used on /editor) -->
      <div class="toolbar floating-sticky-toolbar" v-if="editor && fullPage">
        <!-- Documents Sidebar Toggle (Only show if sidebar is collapsed or embedded) -->
        <div v-if="isAuthenticated && enableSidebar && !showFilesSidebar" class="toolbar-group files-toggle-group">
          <button 
            @click="showFilesSidebar = !showFilesSidebar"
            class="toolbar-btn btn-files-toggle compact"
            :class="{ active: showFilesSidebar }"
            :title="showFilesSidebar ? 'Hide Documents Sidebar' : 'Show Documents Sidebar'"
          >
            <span class="files-toggle-icon">📁</span>
            <span class="files-badge">{{ savedFiles.length }}/5</span>
          </button>
        </div>

        <div v-if="isAuthenticated && enableSidebar && (!fullPage || !showFilesSidebar)" class="toolbar-divider"></div>

        <!-- 1. History Segment (Undo / Redo) -->
        <div class="toolbar-group">
          <button
            @click="editor.chain().focus().undo().run()"
            :disabled="!editor.can().undo()"
            class="toolbar-btn"
            title="Undo (Ctrl+Z)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg>
          </button>
          <button
            @click="editor.chain().focus().redo().run()"
            :disabled="!editor.can().redo()"
            class="toolbar-btn"
            title="Redo (Ctrl+Y)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"></path><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"></path></svg>
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <!-- 2. Typography Segment (Font & Size) -->
        <div class="toolbar-group font-controls-group">
          <!-- Font Selector -->
          <div class="toolbar-font-selector" ref="fontSelectorRef">
            <button class="font-selector-btn" @click="showFontDropdown = !showFontDropdown" title="Change Tamil Font">
              <span class="font-preview">அ</span>
              <span class="font-name">{{ selectedFont.label }}</span>
              <span class="font-caret">▾</span>
            </button>
            <div v-if="showFontDropdown" class="font-dropdown">
              <div
                v-for="font in TAMIL_FONTS"
                :key="font.label"
                class="font-option"
                :class="{ active: selectedFont.label === font.label }"
                @click="applyFont(font)"
                :style="{ fontFamily: font.value }"
              >
                <span class="font-sample">அ ஆ </span>
                <span class="font-label">{{ font.label }}</span>
              </div>
            </div>
          </div>

          <!-- Font Size Dropdown -->
          <div class="font-size-wrapper" ref="fontSizeRef">
            <button class="toolbar-btn font-size-btn" @click="showFontSizeDropdown = !showFontSizeDropdown" title="Font Size">
              <span>{{ currentFontSize }}px</span>
              <span class="font-caret">▾</span>
            </button>
            <div v-if="showFontSizeDropdown" class="font-size-dropdown">
              <div
                v-for="size in FONT_SIZES"
                :key="size"
                class="font-size-option"
                :class="{ active: currentFontSize === size }"
                @click="applyFontSize(size)"
              >
                <span :style="{ fontSize: Math.min(size, 22) + 'px', lineHeight: '1' }">அ</span>
                <span class="size-label">{{ size }}px</span>
              </div>
            </div>
          </div>
        </div>

        <div class="toolbar-divider"></div>

        <!-- 3. Character Formatting Segment (B, I, S, Code, Text Color, Highlight) -->
        <div class="toolbar-group format-controls-group">
          <button
            @click="editor.chain().focus().toggleBold().run()"
            :class="{ active: editor.isActive('bold') }"
            class="toolbar-btn"
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button
            @click="editor.chain().focus().toggleItalic().run()"
            :class="{ active: editor.isActive('italic') }"
            class="toolbar-btn"
            title="Italic"
          >
            <em>I</em>
          </button>
          <button
            @click="editor.chain().focus().toggleStrike().run()"
            :class="{ active: editor.isActive('strike') }"
            class="toolbar-btn"
            title="Strikethrough"
          >
            <s>S</s>
          </button>
          <button
            @click="editor.chain().focus().toggleCode().run()"
            :class="{ active: editor.isActive('code') }"
            class="toolbar-btn"
            title="Inline Code"
          >
            &lt;/&gt;
          </button>

          <!-- Text Color Picker -->
          <div v-if="fullPage" class="color-picker-wrapper" ref="textColorDropdownRef">
            <button 
              class="toolbar-btn color-toolbar-btn" 
              @click="toggleTextColorDropdown" 
              title="Text Color"
            >
              <span class="color-text-sample" :style="{ color: activeTextColor }">A</span>
              <span class="color-underline-bar" :style="{ background: activeTextColor }"></span>
            </button>
            <div v-if="showTextColorDropdown" class="toolbar-dropdown-menu color-dropdown-menu">
              <div class="dropdown-menu-header">Text Color</div>
              <div class="color-swatch-grid">
                <button 
                  v-for="color in TEXT_PALETTE" 
                  :key="color" 
                  class="color-swatch-circle" 
                  :style="{ background: color }"
                  :class="{ active: activeTextColor === color }"
                  @click="applyTextColor(color)"
                  :title="color"
                ></button>
              </div>
              <div class="custom-color-row">
                <label class="custom-color-label">Custom</label>
                <input type="color" v-model="customColorInput" @input="applyTextColor(customColorInput)" class="native-color-picker" />
                <button class="color-reset-action" @click="resetTextColor">Reset</button>
              </div>
            </div>
          </div>

          <!-- Text Highlighting -->
          <div v-if="fullPage" class="color-picker-wrapper" ref="highlightDropdownRef">
            <button 
              class="toolbar-btn highlight-toolbar-btn" 
              @click="toggleHighlightDropdown" 
              title="Highlight Text"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m9 11-6 6v3h3l6-6"/>
                <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>
              </svg>
              <span class="color-underline-bar" :style="{ background: activeHighlightColor || '#fde047' }"></span>
            </button>
            <div v-if="showHighlightDropdown" class="toolbar-dropdown-menu color-dropdown-menu">
              <div class="dropdown-menu-header">Highlight Color</div>
              <div class="color-swatch-grid">
                <button 
                  v-for="h in HIGHLIGHT_PALETTE" 
                  :key="h.color" 
                  class="color-swatch-circle" 
                  :style="{ background: h.color }"
                  @click="applyHighlight(h.color)"
                  :title="h.label"
                ></button>
              </div>
              <div class="custom-color-row">
                <button class="color-reset-action full-width" @click="resetHighlight">Remove Highlight</button>
              </div>
            </div>
          </div>
        </div>

        <div class="toolbar-divider"></div>

        <!-- 4. Paragraph & Headings Segment -->
        <div class="toolbar-group">
          <button
            @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
            :class="{ active: editor.isActive('heading', { level: 1 }) }"
            class="toolbar-btn heading-btn"
            title="Heading 1"
          >
            H1
          </button>
          <button
            @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
            :class="{ active: editor.isActive('heading', { level: 2 }) }"
            class="toolbar-btn heading-btn"
            title="Heading 2"
          >
            H2
          </button>
          <button
            @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
            :class="{ active: editor.isActive('heading', { level: 3 }) }"
            class="toolbar-btn heading-btn"
            title="Heading 3"
          >
            H3
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <!-- 5. Alignment Segment -->
        <div class="toolbar-group">
          <button
            @click="editor.chain().focus().setTextAlign('left').run()"
            :class="{ active: editor.isActive({ textAlign: 'left' }) }"
            class="toolbar-btn"
            title="Align Left"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>
          </button>
          <button
            @click="editor.chain().focus().setTextAlign('center').run()"
            :class="{ active: editor.isActive({ textAlign: 'center' }) }"
            class="toolbar-btn"
            title="Align Center"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="10" x2="6" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="18" y1="18" x2="6" y2="18"></line></svg>
          </button>
          <button
            @click="editor.chain().focus().setTextAlign('right').run()"
            :class="{ active: editor.isActive({ textAlign: 'right' }) }"
            class="toolbar-btn"
            title="Align Right"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg>
          </button>
          <button
            @click="editor.chain().focus().setTextAlign('justify').run()"
            :class="{ active: editor.isActive({ textAlign: 'justify' }) }"
            class="toolbar-btn"
            title="Justify"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="21" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="3" y2="18"></line></svg>
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <!-- 6. Lists & Divider Segment -->
        <div class="toolbar-group">
          <button
            @click="editor.chain().focus().toggleBulletList().run()"
            :class="{ active: editor.isActive('bulletList') }"
            class="toolbar-btn"
            title="Bullet List"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="9" y1="6" x2="20" y2="6"></line><line x1="9" y1="12" x2="20" y2="12"></line><line x1="9" y1="18" x2="20" y2="18"></line><circle cx="4" cy="6" r="1.5" fill="currentColor"></circle><circle cx="4" cy="12" r="1.5" fill="currentColor"></circle><circle cx="4" cy="18" r="1.5" fill="currentColor"></circle></svg>
          </button>
          <button
            @click="editor.chain().focus().toggleOrderedList().run()"
            :class="{ active: editor.isActive('orderedList') }"
            class="toolbar-btn"
            title="Numbered List"
          >
            <span style="font-size: 12px; font-weight: 700; letter-spacing: -0.05em;">1.</span>
          </button>
          <button
            @click="editor.chain().focus().toggleBlockquote().run()"
            :class="{ active: editor.isActive('blockquote') }"
            class="toolbar-btn"
            title="Blockquote"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
            </svg>
          </button>
          <button
            @click="editor.chain().focus().setHorizontalRule().run()"
            class="toolbar-btn"
            title="Horizontal Divider"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
            </svg>
          </button>
        </div>

        <div v-if="fullPage" class="toolbar-divider"></div>

        <!-- 7. Media Insert Segment (Image, Background) -->
        <div v-if="fullPage" class="toolbar-group">
          <!-- Insert Image (Upload & Paste) -->
          <button 
            class="toolbar-btn image-upload-btn" 
            @click="triggerImageFileInput" 
            title="Insert Image (or paste with Ctrl+V)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </button>
          <input 
            type="file" 
            ref="imageFileInputRef" 
            accept="image/*" 
            @change="handleImageFileSelect" 
            style="display: none;" 
          />

          <!-- Document Background Image -->
          <div class="bg-picker-wrapper" ref="bgDropdownRef">
            <button 
              class="toolbar-btn bg-toolbar-btn" 
              :class="{ active: !!currentDocBackground }"
              @click="toggleBgDropdown" 
              title="Document Background Image (This Page Alone)"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.37-.61-.37-.99 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-4.96-4.49-9-10-9z"></path>
                <circle cx="6.5" cy="11.5" r="1.5" fill="currentColor"></circle>
                <circle cx="9.5" cy="7.5" r="1.5" fill="currentColor"></circle>
                <circle cx="14.5" cy="7.5" r="1.5" fill="currentColor"></circle>
                <circle cx="17.5" cy="11.5" r="1.5" fill="currentColor"></circle>
              </svg>
              <span v-if="currentDocBackground" class="bg-active-dot"></span>
            </button>

            <div v-if="showBgDropdown" class="toolbar-dropdown-menu bg-dropdown-menu">
              <div class="dropdown-menu-header">Document Background</div>
              <button class="bg-upload-main-btn" @click="triggerBgFileInput">
                <span>📁 Upload Custom Background</span>
              </button>
              <input 
                type="file" 
                ref="bgFileInputRef" 
                accept="image/*" 
                @change="handleBgFileSelect" 
                style="display: none;" 
              />
              <div class="bg-preset-title">Watermarks & Textures</div>
              <div class="bg-preset-grid">
                <button 
                  v-for="p in BG_PRESETS" 
                  :key="p.id" 
                  class="bg-preset-chip"
                  :class="{ active: currentDocBackground === p.value }"
                  @click="setDocumentBackground(p.value, p.mode)"
                >
                  <span class="preset-icon">{{ p.icon }}</span>
                  <span class="preset-name">{{ p.name }}</span>
                </button>
              </div>
              <div v-if="currentDocBackground" class="bg-opacity-control">
                <div class="opacity-label-row">
                  <span>Opacity</span>
                  <span class="opacity-val-badge">{{ Math.round(currentDocBackgroundOpacity * 100) }}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.05" 
                  max="0.85" 
                  step="0.05" 
                  :value="currentDocBackgroundOpacity" 
                  @input="updateBackgroundOpacity($event.target.value)" 
                  class="bg-range-slider"
                />
              </div>
              <div v-if="currentDocBackground" class="custom-color-row">
                <button class="color-reset-action full-width" @click="removeDocumentBackground">Remove Background</button>
              </div>
            </div>
          </div>
        </div>

        <div class="toolbar-divider"></div>

        <!-- 8. Right Action Tools Segment (Clear, Grammar Checker, Download) -->
        <div class="toolbar-group actions-tools-group">
          <button @click="clearEditor" class="toolbar-btn btn-clear" title="Clear Editor Content">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>Clear</span>
          </button>
          <button 
            @click="toggleAIHelp" 
            class="toolbar-btn btn-ai"
            :class="{ active: aiHelpEnabled }"
            title="AI Grammar Checker"
          >
            <svg class="grammar-sparkle-svg" width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L14.4 8.6L21 11L14.4 13.4L12 20L9.6 13.4L3 11L9.6 8.6L12 2Z" fill="currentColor"/>
              <circle cx="18.5" cy="5.5" r="2.2" fill="currentColor"/>
            </svg>
            <span>Grammar</span>
          </button>

          <!-- Download / Export Dropdown (Icon Alone with Scrollable Options) -->
          <div class="download-dropdown-wrapper" ref="downloadDropdownRef">
            <button 
              @click="showDownloadDropdown = !showDownloadDropdown" 
              class="toolbar-btn btn-download"
              :class="{ active: showDownloadDropdown }"
              title="Download / Export Document"
            >
              <svg class="download-svg-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3v12"/>
                <path d="m8 11 4 4 4-4"/>
                <path d="M4 20h16"/>
              </svg>
            </button>
            <div v-if="showDownloadDropdown" class="download-dropdown-menu">
              <div class="dropdown-menu-header">Download Options</div>
              <div class="download-options-scroll">
                <button @click="downloadAsDocx" class="download-menu-item">
                  <div class="item-icon-badge docx-badge">
                    <svg class="format-download-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                  </div>
                  <div class="item-info">
                    <span class="item-title">Word Document (.doc)</span>
                    <span class="item-desc">Formatted Microsoft Word file</span>
                  </div>
                </button>
                <button @click="downloadAsTxt" class="download-menu-item">
                  <div class="item-icon-badge txt-badge">
                    <svg class="format-download-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                  </div>
                  <div class="item-info">
                    <span class="item-title">Plain Text (.txt)</span>
                    <span class="item-desc">Standard plain text file</span>
                  </div>
                </button>
                <button @click="downloadAsPDF" class="download-menu-item">
                  <div class="item-icon-badge pdf-badge">
                    <svg class="format-download-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <path d="M9 15h6"></path>
                    </svg>
                  </div>
                  <div class="item-info">
                    <span class="item-title">PDF Document (.pdf)</span>
                    <span class="item-desc">Print-ready PDF / Print page</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- 2. HOME PAGE EMBEDDED TOOLBAR (Used on Home Page alone - exactly matches original 2-row layout) -->
      <div v-else-if="editor" class="toolbar embedded-home-toolbar">
        <!-- Documents Sidebar Toggle (When logged in and sidebar enabled) -->
        <div v-if="isAuthenticated && enableSidebar" class="toolbar-group files-toggle-group">
          <button 
            @click="showFilesSidebar = !showFilesSidebar"
            class="toolbar-btn btn-files-toggle"
            :class="{ active: showFilesSidebar }"
            :title="showFilesSidebar ? 'Hide Documents Sidebar' : 'Show Documents Sidebar'"
          >
            <span class="files-toggle-icon">📁</span>
            <span class="files-btn-title">{{ activeFile?.title || 'Documents' }}</span>
            <span class="files-badge">{{ savedFiles.length }}/5</span>
          </button>
        </div>

        <div v-if="isAuthenticated && enableSidebar" class="toolbar-divider"></div>

        <!-- 1. Formatting: Bold, Italic, Strikethrough, Code -->
        <div class="toolbar-group">
          <button
            @click="editor.chain().focus().toggleBold().run()"
            :class="{ active: editor.isActive('bold') }"
            class="toolbar-btn"
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button
            @click="editor.chain().focus().toggleItalic().run()"
            :class="{ active: editor.isActive('italic') }"
            class="toolbar-btn"
            title="Italic"
          >
            <em>I</em>
          </button>
          <button
            @click="editor.chain().focus().toggleStrike().run()"
            :class="{ active: editor.isActive('strike') }"
            class="toolbar-btn"
            title="Strikethrough"
          >
            <s>S</s>
          </button>
          <button
            @click="editor.chain().focus().toggleCode().run()"
            :class="{ active: editor.isActive('code') }"
            class="toolbar-btn"
            title="Inline Code"
          >
            &lt;/&gt;
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <!-- 2. Headings: H1, H2, H3 -->
        <div class="toolbar-group">
          <button
            @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
            :class="{ active: editor.isActive('heading', { level: 1 }) }"
            class="toolbar-btn"
            title="Heading 1"
          >
            H1
          </button>
          <button
            @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
            :class="{ active: editor.isActive('heading', { level: 2 }) }"
            class="toolbar-btn"
            title="Heading 2"
          >
            H2
          </button>
          <button
            @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
            :class="{ active: editor.isActive('heading', { level: 3 }) }"
            class="toolbar-btn"
            title="Heading 3"
          >
            H3
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <!-- 3. Lists & Quotes -->
        <div class="toolbar-group">
          <button
            @click="editor.chain().focus().toggleBulletList().run()"
            :class="{ active: editor.isActive('bulletList') }"
            class="toolbar-btn"
            title="Bullet List"
          >
            ☰
          </button>
          <button
            @click="editor.chain().focus().toggleOrderedList().run()"
            :class="{ active: editor.isActive('orderedList') }"
            class="toolbar-btn"
            title="Ordered List"
          >
            1.
          </button>
          <button
            @click="editor.chain().focus().toggleBlockquote().run()"
            :class="{ active: editor.isActive('blockquote') }"
            class="toolbar-btn"
            title="Quote"
          >
            ❝
          </button>
          <button
            @click="editor.chain().focus().setHorizontalRule().run()"
            class="toolbar-btn"
            title="Horizontal Rule"
          >
            ─
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <!-- 4. History: Undo, Redo -->
        <div class="toolbar-group">
          <button
            @click="editor.chain().focus().undo().run()"
            :disabled="!editor.can().undo()"
            class="toolbar-btn"
            title="Undo"
          >
            ↩
          </button>
          <button
            @click="editor.chain().focus().redo().run()"
            :disabled="!editor.can().redo()"
            class="toolbar-btn"
            title="Redo"
          >
            ↪
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <!-- 5. Alignment -->
        <div class="toolbar-group">
          <button
            @click="editor.chain().focus().setTextAlign('left').run()"
            :class="{ active: editor.isActive({ textAlign: 'left' }) }"
            class="toolbar-btn"
            title="Align Left"
          >
            ⬛︎
          </button>
          <button
            @click="editor.chain().focus().setTextAlign('center').run()"
            :class="{ active: editor.isActive({ textAlign: 'center' }) }"
            class="toolbar-btn"
            title="Align Center"
          >
            ▣
          </button>
          <button
            @click="editor.chain().focus().setTextAlign('right').run()"
            :class="{ active: editor.isActive({ textAlign: 'right' }) }"
            class="toolbar-btn"
            title="Align Right"
          >
            ▤
          </button>
          <button
            @click="editor.chain().focus().setTextAlign('justify').run()"
            :class="{ active: editor.isActive({ textAlign: 'justify' }) }"
            class="toolbar-btn"
            title="Justify"
          >
            ☰
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <!-- 6. Font Size & Increments -->
        <div class="toolbar-group">
          <div class="font-size-wrapper" ref="fontSizeRef">
            <button class="toolbar-btn font-size-btn" @click="showFontSizeDropdown = !showFontSizeDropdown" title="Font Size">
              <span>{{ currentFontSize }}px</span>
              <span class="font-caret">▾</span>
            </button>
            <div v-if="showFontSizeDropdown" class="font-size-dropdown">
              <div
                v-for="size in FONT_SIZES"
                :key="size"
                class="font-size-option"
                :class="{ active: currentFontSize === size }"
                @click="applyFontSize(size)"
              >
                <span :style="{ fontSize: Math.min(size, 22) + 'px', lineHeight: '1' }">அ</span>
                <span class="size-label">{{ size }}px</span>
              </div>
            </div>
          </div>
          <button class="toolbar-btn" title="Decrease Font Size" @click="changeFontSize(-2)">A−</button>
          <button class="toolbar-btn" title="Increase Font Size" @click="changeFontSize(+2)">A+</button>
        </div>

        <div class="toolbar-divider"></div>

        <!-- Row 2 Actions: Clear, Grammar Checker, Download, Font Selector -->
        <div class="toolbar-group">
          <button @click="clearEditor" class="toolbar-btn btn-clear" title="Clear Editor Content">
            Clear
          </button>
          <button 
            @click="toggleAIHelp" 
            class="toolbar-btn btn-ai"
            :class="{ active: aiHelpEnabled }"
            title="AI Grammar Checker"
          >
            <svg class="grammar-sparkle-svg" width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L14.4 8.6L21 11L14.4 13.4L12 20L9.6 13.4L3 11L9.6 8.6L12 2Z" fill="currentColor"/>
              <circle cx="18.5" cy="5.5" r="2.2" fill="currentColor"/>
            </svg>
            <span>Grammar Checker</span>
          </button>

          <!-- Download / Export Dropdown with Text -->
          <div class="download-dropdown-wrapper" ref="downloadDropdownRef">
            <button 
              @click="showDownloadDropdown = !showDownloadDropdown" 
              class="toolbar-btn btn-download-home"
              title="Download / Export Content"
            >
              <svg class="download-svg-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2.5V15.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
                <path d="M5.5 10.5L12 16.5L18.5 10.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M3.5 21H20.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
              </svg>
              <span class="download-btn-text">Download</span>
              <span class="font-caret">▾</span>
            </button>
            <div v-if="showDownloadDropdown" class="download-dropdown-menu">
              <div class="dropdown-menu-header">Download Options</div>
              <div class="download-options-scroll">
                <button @click="downloadAsDocx" class="download-menu-item">
                  <div class="item-icon-badge docx-badge">
                    <svg class="format-download-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                  </div>
                  <div class="item-info">
                    <span class="item-title">Word Document (.doc)</span>
                    <span class="item-desc">Formatted Microsoft Word file</span>
                  </div>
                </button>
                <button @click="downloadAsTxt" class="download-menu-item">
                  <div class="item-icon-badge txt-badge">
                    <svg class="format-download-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                  </div>
                  <div class="item-info">
                    <span class="item-title">Plain Text (.txt)</span>
                    <span class="item-desc">Standard plain text file</span>
                  </div>
                </button>
                <button @click="downloadAsPDF" class="download-menu-item">
                  <div class="item-icon-badge pdf-badge">
                    <svg class="format-download-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <path d="M9 15h6"></path>
                    </svg>
                  </div>
                  <div class="item-info">
                    <span class="item-title">PDF Document (.pdf)</span>
                    <span class="item-desc">Print-ready PDF / Print page</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Font Selector -->
        <div class="toolbar-font-selector" ref="fontSelectorRef">
          <button class="font-selector-btn" @click="showFontDropdown = !showFontDropdown" title="Change Tamil Font">
            <span class="font-preview">அ</span>
            <span class="font-name">{{ selectedFont.label }}</span>
            <span class="font-caret">▾</span>
          </button>
          <div v-if="showFontDropdown" class="font-dropdown">
            <div
              v-for="font in TAMIL_FONTS"
              :key="font.label"
              class="font-option"
              :class="{ active: selectedFont.label === font.label }"
              @click="applyFont(font)"
              :style="{ fontFamily: font.value }"
            >
              <span class="font-sample">அ ஆ </span>
              <span class="font-label">{{ font.label }}</span>
            </div>
          </div>
        </div>

        <!-- Stats on Right -->
        <div class="toolbar-stats">
          <span>{{ wordCount }} words</span>
          <span>{{ charCount }} chars</span>
        </div>
      </div>

      <!-- Document Workspace Canvas -->
      <div 
        class="editor-wrapper" 
        :class="{ 'a4-desk-canvas': fullPage }" 
        ref="editorWrapper"
        @click="handleEditorClick"
      >
        <!-- In fullPage mode, render inside an A4 Sheet Card with Zoom Scale -->
        <div 
          :class="{ 'a4-document-sheet': fullPage, 'embedded-sheet': !fullPage }"
          :style="fullPage ? { transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center', transition: 'transform 0.15s ease' } : {}"
        >
          <!-- Optional Document Background Layer -->
          <div 
            v-if="fullPage && currentDocBackground" 
            class="editor-background-layer"
            :style="{
              backgroundImage: currentDocBackground.startsWith('linear-gradient') ? currentDocBackground : `url('${currentDocBackground}')`,
              opacity: currentDocBackgroundOpacity,
              backgroundSize: currentDocBackgroundMode === 'contain' ? 'contain' : currentDocBackgroundMode === 'repeat' ? 'auto' : 'cover',
              backgroundRepeat: currentDocBackgroundMode === 'repeat' ? 'repeat' : 'no-repeat',
              backgroundPosition: 'center',
              borderRadius: '6px'
            }"
          ></div>

          <editor-content 
            :editor="editor" 
            class="editor-content" 
            :class="{ 'a4-editor-content': fullPage }"
            :style="{ fontFamily: selectedFont.value, fontSize: currentFontSize + 'px' }" 
          />
        </div>

        <!-- Interactive Floating Image Action Bar (Move / Align / Resize / Remove) -->
        <div 
          v-if="selectedImageNode" 
          class="image-action-overlay" 
          :style="imageToolbarStyle"
          @click.stop
        >
          <div class="img-tool-group">
            <span class="img-tool-label">Align:</span>
            <button type="button" class="img-tool-btn" :class="{ active: currentImgAlign === 'left' }" @click="setImageAlignment('left')" title="Align Left">⬅ Left</button>
            <button type="button" class="img-tool-btn" :class="{ active: currentImgAlign === 'center' }" @click="setImageAlignment('center')" title="Center">⏺ Center</button>
            <button type="button" class="img-tool-btn" :class="{ active: currentImgAlign === 'right' }" @click="setImageAlignment('right')" title="Align Right">Right ➡</button>
            <button type="button" class="img-tool-btn" :class="{ active: currentImgAlign === 'float-left' }" @click="setImageAlignment('float-left')" title="Wrap Text (Float Left)">Wrap Text</button>
          </div>
          <div class="img-tool-sep"></div>
          <div class="img-tool-group">
            <span class="img-tool-label">Size:</span>
            <button type="button" class="img-tool-btn" :class="{ active: currentImgSize === '30%' }" @click="setImageSize('30%')">30%</button>
            <button type="button" class="img-tool-btn" :class="{ active: currentImgSize === '60%' }" @click="setImageSize('60%')">60%</button>
            <button type="button" class="img-tool-btn" :class="{ active: currentImgSize === '100%' }" @click="setImageSize('100%')">100%</button>
          </div>
          <div class="img-tool-sep"></div>
          <button type="button" class="img-tool-btn delete-img-btn" @click="deleteSelectedImage" title="Delete Image">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>Remove</span>
          </button>
          <button type="button" class="img-tool-btn close-img-btn" @click="selectedImageNode = null" title="Close Toolbar">✕</button>
        </div>

        <!-- Suggestions Popup -->
        <div v-show="showSuggestions && suggestionsList.length > 0"
             class="suggestions-popup"
             :style="popupStyle">
          <div v-for="(suggestion, idx) in suggestionsList"
               :key="suggestion.tamil"
               @click="selectSuggestion(suggestion, idx)"
               :class="{ 'selected': idx === selectedSuggestionIndex }"
               class="suggestion-item">
            <span class="tamil-text-main">{{ suggestion.tamil }}</span>
            <span class="suggestion-space-hint" v-if="idx === 0">Space</span>
          </div>
        </div>

        <!-- Bottom Action Bar (Docked / Sticky at Bottom of Canvas) -->
        <div class="editor-bottom-bar" :class="{ 'full-page-dock': fullPage }">
          <!-- Left: Tamil / English Engine Mode Toggle -->
          <div class="engine-mode-pill" title="Toggle Tanglish transliteration or English typing">
            <button 
              type="button" 
              class="mode-btn" 
              :class="{ active: autoConvert }" 
              @click="autoConvert = true"
            >
              தமிழ்
            </button>
            <button 
              type="button" 
              class="mode-btn" 
              :class="{ active: !autoConvert }" 
              @click="autoConvert = false"
            >
              English
            </button>
          </div>

          <!-- Center: Words / Chars Stats -->
          <div class="bottom-stats-label">
            <span>{{ wordCount }} words</span>
            <span class="stats-sep">•</span>
            <span>{{ charCount }} chars</span>
          </div>

          <!-- Zoom Controls (A4 Sheet Zoom In / Out) -->
          <div v-if="fullPage" class="zoom-controls-dock" title="Page Zoom">
            <button type="button" class="zoom-btn" @click="zoomOut" :disabled="zoomLevel <= 50" title="Zoom Out (−)">−</button>
            <button type="button" class="zoom-value-btn" @click="resetZoom" title="Click to reset zoom to 100%">{{ zoomLevel }}%</button>
            <button type="button" class="zoom-btn" @click="zoomIn" :disabled="zoomLevel >= 200" title="Zoom In (+)">+</button>
          </div>

          <!-- Right: Voice Typing & Copy Actions -->
          <div class="bottom-tools-group">
            <button 
              type="button" 
              class="bottom-action-btn voice-btn" 
              :class="{ 'voice-listening': isVoiceActive }"
              @click="toggleVoiceTyping"
              :title="isVoiceActive ? 'Stop Voice Typing' : 'Start Voice Typing'"
            >
              <span class="btn-icon">🎙️</span>
              <span>{{ isVoiceActive ? 'Listening...' : 'Voice Typing' }}</span>
            </button>

            <button 
              type="button" 
              class="bottom-action-btn copy-btn" 
              :class="{ 'copied': copiedSuccess }"
              @click="copyEditorContent"
              title="Copy Tamil text to clipboard"
            >
              <span class="btn-icon">{{ copiedSuccess ? '✓' : '📋' }}</span>
              <span>{{ copiedSuccess ? 'Copied!' : 'Copy' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- AI Assistant / Grammar Checker Sidebar (Companion Drawer) -->
    <aside v-if="aiHelpEnabled" class="ai-assistant-sidebar">
        <!-- Sidebar Header -->
        <div class="sidebar-header">
          <div class="sidebar-title-group">
            <span class="sidebar-spark-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L14.4 8.6L21 11L14.4 13.4L12 20L9.6 13.4L3 11L9.6 8.6L12 2Z" fill="url(#ai-sparkle-grad)"/>
                <circle cx="18.5" cy="5.5" r="2.2" fill="#8B5CF6"/>
                <defs>
                  <linearGradient id="ai-sparkle-grad" x1="3" y1="2" x2="21" y2="20" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#6366F1"/>
                    <stop offset="1" stop-color="#A855F7"/>
                  </linearGradient>
                </defs>
              </svg>
            </span>
            <span class="sidebar-title">AI Assistant</span>
          </div>
          <button class="sidebar-close-btn" @click="toggleAIHelp" title="Close AI Assistant">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Mode Toggle: Auto / Manual -->
        <div class="sidebar-mode-section">
          <div class="mode-toggle-pill">
            <button 
              type="button"
              class="mode-pill-btn" 
              :class="{ active: autoCheckMode }" 
              @click="setAutoCheckMode(true)"
            >
              <span>Auto</span>
            </button>
            <button 
              type="button"
              class="mode-pill-btn" 
              :class="{ active: !autoCheckMode }" 
              @click="setAutoCheckMode(false)"
            >
              <span>Manual</span>
            </button>
          </div>
          <p class="mode-timing-hint">
            {{ autoCheckMode ? 'Checks automatically 3s after you stop typing' : 'Click "Check Grammar" below to scan text' }}
          </p>
        </div>

        <!-- Manual Scan Button (visible when in Manual mode) -->
        <div v-if="!autoCheckMode" class="manual-scan-box">
          <button 
            type="button" 
            class="btn-manual-scan" 
            @click="triggerGrammarScan" 
            :disabled="aiChecking || isOutOfCredits"
            :class="{ 'limit-reached': isOutOfCredits }"
          >
            <span v-if="aiChecking">Analyzing document...</span>
            <span v-else-if="isOutOfCredits">Limit Reached</span>
            <span v-else>Check Grammar</span>
          </button>
        </div>

        <!-- Issue Count and Bulk Actions Bar -->
        <div class="issues-status-bar">
          <div class="issue-count-label">
            <span v-if="aiChecking" class="issues-spinner-circle"></span>
            <span>{{ aiChecking ? 'Checking text...' : (activeIssues.length === 1 ? '1 issue' : (activeIssues.length > 0 ? activeIssues.length + ' issues' : 'No issues found')) }}</span>
          </div>
          <div v-if="activeIssues.length > 0" class="bulk-actions-group">
            <button type="button" class="btn-fix-all" @click="applyAllIssues">Fix all</button>
            <button type="button" class="btn-dismiss-all" @click="dismissAllIssues">Dismiss all</button>
          </div>
        </div>

        <!-- Issues Cards Container (Scrollable) -->
        <div class="issues-scroll-area">
          <div v-if="isOutOfCredits && activeIssues.length === 0" class="credit-limit-sidebar-card">
            <div class="limit-card-icon">⚡</div>
            <div class="limit-card-title">Credit Limit Reached</div>
            <div class="limit-card-desc">You have used all 30 grammar checks. Your credits will refill in {{ formattedTimeUntilRefill }} (16-hour cycle).</div>
          </div>
          <div v-else-if="activeIssues.length === 0 && !aiChecking" class="no-issues-placeholder">
            <div class="no-issues-check-icon">✓</div>
            <div class="no-issues-main-msg">Your Tamil text looks great!</div>
            <div class="no-issues-sub-msg">No grammar, spelling, or clarity issues found.</div>
          </div>

          <!-- Issue Card (Matches screenshot layout) -->
          <div 
            v-for="(issue, idx) in activeIssues" 
            :key="issue.id || idx" 
            class="issue-card"
          >
            <!-- Badge -->
            <div class="issue-card-top">
              <span class="issue-badge" :class="issue.type?.toLowerCase() || 'clarity'">
                {{ issue.type || 'Clarity' }}
              </span>
            </div>

            <!-- Strikethrough Original & Green Corrected -->
            <div class="issue-diff-box">
              <div class="diff-original-row">
                <span class="original-strikethrough-tag">
                  <s>{{ issue.original }}</s>
                </span>
              </div>
              <div class="diff-corrected-row">
                {{ issue.corrected }}
              </div>
            </div>

            <!-- Explanation -->
            <p class="issue-explanation-desc">
              {{ issue.explanation }}
            </p>

            <!-- Card Actions -->
            <div class="issue-card-actions">
              <button type="button" class="btn-apply-card" @click="applySingleIssue(issue, idx)">
                Apply
              </button>
              <button type="button" class="btn-dismiss-card" @click="dismissSingleIssue(idx)">
                Dismiss
              </button>
            </div>
          </div>
        </div>

        <!-- Quick Actions Section at Bottom (Matches screenshot) -->
        <div class="sidebar-quick-actions">
          <div class="quick-actions-title">Quick actions</div>
          <div class="quick-actions-list">
            <button type="button" class="quick-action-item" @click="handleTranslateToEnglish" title="Translate Tamil content to English">
              <span class="quick-action-symbol">文A</span>
              <span class="quick-action-text">Translate to English</span>
            </button>
            <button type="button" class="quick-action-item" @click="handleSummarizeText" title="Summarize document into key points">
              <span class="quick-action-symbol">📄</span>
              <span class="quick-action-text">Summarize text</span>
            </button>
          </div>
        </div>
      </aside>

    <!-- Quick Action Modal (Translate / Summarize Results) -->
    <Teleport to="body">
      <div v-if="showQuickActionModal" class="quick-action-overlay" @click.self="showQuickActionModal = false">
        <div class="quick-action-modal">
          <div class="qa-modal-header">
            <h3>{{ quickActionModalTitle }}</h3>
            <button class="qa-close-btn" @click="showQuickActionModal = false">✕</button>
          </div>
          <div class="qa-modal-body">
            <div v-if="quickActionLoading" class="qa-loading-state">
              <div class="spinner-small"></div>
              <span>Processing with AI...</span>
            </div>
            <pre v-else class="qa-content-text">{{ quickActionModalContent }}</pre>
          </div>
          <div class="qa-modal-footer">
            <button class="qa-btn-copy" @click="copyQuickActionResult">📋 Copy</button>
            <button class="qa-btn-insert" @click="insertQuickActionResult">➕ Insert into Editor</button>
            <button class="qa-btn-done" @click="showQuickActionModal = false">Close</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Auth Modal for AI Features -->
    <AuthModal 
      :isOpen="showAuthModal" 
      title="Sign in to Usil AI"
      subtitle="Sign in with your Google account to unlock AI grammar check, cloud documents, and all AI features."
      @close="showAuthModal = false"
      @success="onAuthSuccess"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed, nextTick } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Image from '@tiptap/extension-image'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'

// Custom TipTap Image extension that preserves width, style, and data-align attributes in ProseMirror HTML
const CustomImage = Image.extend({
  name: 'image',
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: 'width: 100%; max-width: 100%; display: block; margin-left: auto; margin-right: auto;',
        parseHTML: element => element.getAttribute('style'),
        renderHTML: attributes => {
          if (!attributes.style) return {}
          return { style: attributes.style }
        }
      },
      align: {
        default: 'center',
        parseHTML: element => element.getAttribute('data-align') || element.dataset?.align || 'center',
        renderHTML: attributes => {
          return { 'data-align': attributes.align || 'center' }
        }
      },
      width: {
        default: '100%',
        parseHTML: element => element.getAttribute('data-size') || element.style?.width || '100%',
        renderHTML: attributes => {
          return { 'data-size': attributes.width || '100%' }
        }
      }
    }
  }
})

// Compress and downscale uploaded or pasted images to ensure fast rendering & smooth DB persistence
const compressImageFile = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.85) => {
  return new Promise((resolve) => {
    if (!file) return resolve('')
    if (file.type === 'image/svg+xml' || (file.size && file.size < 80 * 1024)) {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = () => resolve('')
      reader.readAsDataURL(file)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new window.Image()
      img.onload = () => {
        let width = img.width
        let height = img.height
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const outputType = (file.type === 'image/png') ? 'image/png' : 'image/jpeg'
        resolve(canvas.toDataURL(outputType, quality))
      }
      img.onerror = () => resolve(e.target.result)
      img.src = e.target.result
    }
    reader.onerror = () => resolve('')
    reader.readAsDataURL(file)
  })
}
import { preloadCommonChunks } from '@/data/tamilEngine'
import { useAuth, registerPreLogoutHook } from '@/composables/useAuth'
import { useTanglishConverter } from '@/composables/useTanglishConverter'
import { useClaudeGrammarChecker } from '@/composables/useClaudeGrammarChecker'
import { useCredits } from '@/composables/useCredits'
import { fetchUserDocuments, syncUserDocuments, deleteUserDocument } from '@/services/apiService'
import AuthModal from '@/components/AuthModal.vue'

const { isAuthenticated, user } = useAuth()
const { creditsLeft, isOutOfCredits, formattedTimeUntilRefill, consumeCredit, openCreditModal } = useCredits()
const { suggestions: aiSuggestions, convertWord, convertSentence, getSuggestions, learnCorrection, recordUsage } = useTanglishConverter()
const { checkGrammar, isChecking: aiChecking, error: aiError, correctionResult } = useClaudeGrammarChecker()

const showAuthModal = ref(false)
const onAuthSuccess = async () => {
  showAuthModal.value = false
  if (props.fullPage || props.enableSidebar) {
    await loadSavedFiles()
  }
}

const props = defineProps({
  enableSidebar: {
    type: Boolean,
    default: true
  },
  fullPage: {
    type: Boolean,
    default: false
  }
})

// ── File Management State (Up to 5 files for authenticated users with PostgreSQL DB persistence) ──
const showFilesSidebar = ref(props.enableSidebar)
const savedFiles = ref([])
const activeFileId = ref('')
const editingFileId = ref(null)
const editingTitleText = ref('')
const syncStatus = ref('saved') // 'saved' | 'syncing' | 'error'
const copiedSuccess = ref(false)
let saveDebounceTimer = null
let dbSyncDebounceTimer = null
let isProgrammaticUpdate = false

// ── Text Color, Highlight, and Background State (Full-Page Document Editor) ──
const showTextColorDropdown = ref(false)
const activeTextColor = ref('#0f172a')
const customColorInput = ref('#2563eb')
const textColorDropdownRef = ref(null)

const showHighlightDropdown = ref(false)
const activeHighlightColor = ref('')
const highlightDropdownRef = ref(null)

const showBgDropdown = ref(false)
const bgDropdownRef = ref(null)
const imageFileInputRef = ref(null)
const bgFileInputRef = ref(null)

const currentDocBackground = ref('')
const currentDocBackgroundOpacity = ref(0.2)
const currentDocBackgroundMode = ref('cover')

const TEXT_PALETTE = [
  '#0f172a', // Slate/Black
  '#475569', // Slate Gray
  '#2563eb', // Royal Blue
  '#4f46e5', // Indigo
  '#7c3aed', // Purple
  '#db2777', // Rose Pink
  '#dc2626', // Crimson Red
  '#ea580c', // Bright Orange
  '#d97706', // Warm Amber
  '#16a34a', // Forest Green
  '#0d9488'  // Teal
]

const HIGHLIGHT_PALETTE = [
  { label: 'Yellow', color: '#fef08a' },
  { label: 'Green', color: '#bbf7d0' },
  { label: 'Cyan', color: '#a5f3fc' },
  { label: 'Pink', color: '#fbcfe8' },
  { label: 'Peach', color: '#fed7aa' },
  { label: 'Lavender', color: '#e9d5ff' }
]

const BG_PRESETS = [
  {
    id: 'grid',
    name: 'Graph Grid',
    icon: '📐',
    mode: 'repeat',
    value: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M 24 0 L 0 0 0 24' fill='none' stroke='%236366f1' stroke-width='0.5' stroke-opacity='0.25'/></svg>"
  },
  {
    id: 'lines',
    name: 'Notebook',
    icon: '📝',
    mode: 'repeat',
    value: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='32' viewBox='0 0 100 32'><line x1='0' y1='31.5' x2='100' y2='31.5' stroke='%233b82f6' stroke-width='1' stroke-opacity='0.2'/></svg>"
  },
  {
    id: 'parchment',
    name: 'Parchment',
    icon: '📜',
    mode: 'cover',
    value: "linear-gradient(135deg, #fef3c7 0%, #fffbeb 50%, #fde68a 100%)"
  },
  {
    id: 'tamil',
    name: 'Tamil Motif',
    icon: 'அ',
    mode: 'contain',
    value: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'><text x='200' y='250' font-size='160' font-family='Noto Sans Tamil, Arial, sans-serif' font-weight='bold' fill='%236366f1' fill-opacity='0.15' text-anchor='middle'>அ</text></svg>"
  },
  {
    id: 'aurora',
    name: 'Soft Aurora',
    icon: '✨',
    mode: 'cover',
    value: "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(244,114,182,0.12) 50%, rgba(56,189,248,0.12) 100%)"
  }
]

const toggleTextColorDropdown = () => {
  showTextColorDropdown.value = !showTextColorDropdown.value
  showHighlightDropdown.value = false
  showBgDropdown.value = false
}

const toggleHighlightDropdown = () => {
  showHighlightDropdown.value = !showHighlightDropdown.value
  showTextColorDropdown.value = false
  showBgDropdown.value = false
}

const toggleBgDropdown = () => {
  showBgDropdown.value = !showBgDropdown.value
  showTextColorDropdown.value = false
  showHighlightDropdown.value = false
}

const applyTextColor = (color) => {
  activeTextColor.value = color
  if (editor.value) {
    editor.value.chain().focus().setColor(color).run()
    scheduleSaveCurrentFile()
  }
}

const resetTextColor = () => {
  activeTextColor.value = '#0f172a'
  if (editor.value) {
    editor.value.chain().focus().unsetColor().run()
    scheduleSaveCurrentFile()
  }
}

const applyHighlight = (color) => {
  activeHighlightColor.value = color
  if (editor.value) {
    editor.value.chain().focus().toggleHighlight({ color }).run()
    scheduleSaveCurrentFile()
  }
}

const resetHighlight = () => {
  activeHighlightColor.value = ''
  if (editor.value) {
    editor.value.chain().focus().unsetHighlight().run()
    scheduleSaveCurrentFile()
  }
}

const triggerImageFileInput = () => {
  if (imageFileInputRef.value) {
    imageFileInputRef.value.click()
  }
}

const handleImageFileSelect = async (event) => {
  const file = event.target?.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    alert('Please select a valid image file.')
    return
  }
  const dataUrl = await compressImageFile(file, 1200, 1200, 0.85)
  if (dataUrl && editor.value) {
    if (!activeFile.value) {
      const draft = {
        id: 'file_' + Date.now(),
        title: 'New File',
        content: '',
        plainText: '',
        wordCount: 0,
        backgroundImage: currentDocBackground.value || '',
        backgroundMode: currentDocBackgroundMode.value || 'cover',
        backgroundOpacity: currentDocBackgroundOpacity.value ?? 0.2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      savedFiles.value = [draft]
      activeFileId.value = draft.id
    }
    const defaultStyle = 'width: 100%; max-width: 100%; display: block; margin-left: auto; margin-right: auto;'
    editor.value.chain().focus().setImage({ 
      src: dataUrl,
      style: defaultStyle,
      align: 'center',
      width: '100%'
    }).run()
    scheduleSaveCurrentFile()
  }
  if (imageFileInputRef.value) imageFileInputRef.value.value = ''
}

const triggerBgFileInput = () => {
  if (bgFileInputRef.value) {
    bgFileInputRef.value.click()
  }
}

const handleBgFileSelect = async (event) => {
  const file = event.target?.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file.')
    return
  }
  const dataUrl = await compressImageFile(file, 1600, 1600, 0.82)
  if (dataUrl) {
    setDocumentBackground(dataUrl, 'cover')
  }
  if (bgFileInputRef.value) bgFileInputRef.value.value = ''
}

const setDocumentBackground = (bgUrl, mode = 'cover') => {
  currentDocBackground.value = bgUrl
  currentDocBackgroundMode.value = mode
  if (activeFile.value) {
    activeFile.value.backgroundImage = bgUrl
    activeFile.value.backgroundMode = mode
    activeFile.value.backgroundOpacity = currentDocBackgroundOpacity.value
    scheduleSaveCurrentFile()
  } else {
    const draft = {
      id: 'file_' + Date.now(),
      title: 'New File',
      content: editor.value ? editor.value.getHTML() : '',
      plainText: editor.value ? editor.value.getText() : '',
      wordCount: 0,
      backgroundImage: bgUrl,
      backgroundMode: mode,
      backgroundOpacity: currentDocBackgroundOpacity.value,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    savedFiles.value = [draft]
    activeFileId.value = draft.id
    scheduleSaveCurrentFile()
  }
}

const updateBackgroundOpacity = (val) => {
  const num = Number(val)
  currentDocBackgroundOpacity.value = num
  if (activeFile.value) {
    activeFile.value.backgroundOpacity = num
    scheduleSaveCurrentFile()
  }
}

const removeDocumentBackground = () => {
  currentDocBackground.value = ''
  if (activeFile.value) {
    activeFile.value.backgroundImage = ''
    scheduleSaveCurrentFile()
  }
}

watch(() => props.enableSidebar, (newVal) => {
  showFilesSidebar.value = newVal
})

const copyEditorContent = async () => {
  if (!editor.value) return
  const text = editor.value.getText()
  if (!text || !text.trim()) return
  try {
    await navigator.clipboard.writeText(text)
    copiedSuccess.value = true
    setTimeout(() => {
      copiedSuccess.value = false
    }, 2000)
  } catch (err) {
    console.warn('Failed to copy to clipboard:', err)
  }
}

const setEditorTextSafely = (content) => {
  if (!editor.value) return
  isProgrammaticUpdate = true
  editor.value.commands.setContent(content || '')
  updateStats(editor.value)
  setTimeout(() => {
    isProgrammaticUpdate = false
  }, 60)
}

const currentUserId = computed(() => {
  return user.value?.id || (user.value?.email ? user.value.email.toLowerCase() : null)
})

const activeFile = computed(() => {
  return savedFiles.value.find(f => f.id === activeFileId.value) || savedFiles.value[0] || null
})

const isToday = (dateString) => {
  if (!dateString) return true
  const d = new Date(dateString)
  const today = new Date()
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  )
}

const groupedFiles = computed(() => {
  const todayList = []
  const earlierList = []
  savedFiles.value.forEach(file => {
    if (isToday(file.updatedAt)) {
      todayList.push(file)
    } else {
      earlierList.push(file)
    }
  })
  return {
    today: todayList,
    earlier: earlierList
  }
})

// Syncs documents exclusively to PostgreSQL database (NO local storage)
const saveFilesToStorage = () => {
  if (!props.fullPage && !props.enableSidebar) return
  const uid = currentUserId.value
  if (!isAuthenticated.value || !uid || savedFiles.value.length === 0) return

  syncStatus.value = 'syncing'
  if (dbSyncDebounceTimer) clearTimeout(dbSyncDebounceTimer)
  dbSyncDebounceTimer = setTimeout(async () => {
    try {
      const res = await syncUserDocuments(uid, savedFiles.value.slice(0, 5))
      if (res && res.success) {
        syncStatus.value = 'saved'
      } else {
        syncStatus.value = 'error'
      }
    } catch (err) {
      console.warn('PostgreSQL sync failed:', err)
      syncStatus.value = 'error'
    }
  }, 400)
}

// Immediately flushes pending edits without waiting for debounce (called before logout/unload)
const flushPendingSave = async () => {
  if (!props.fullPage && !props.enableSidebar) return
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer)
    saveDebounceTimer = null
  }
  if (dbSyncDebounceTimer) {
    clearTimeout(dbSyncDebounceTimer)
    dbSyncDebounceTimer = null
  }
  if (!editor.value || !activeFile.value || !isAuthenticated.value) return

  const html = editor.value.getHTML()
  const text = editor.value.getText()
  const words = text.trim().split(/\s+/).filter(w => w.length > 0).length
  activeFile.value.content = html
  activeFile.value.plainText = text
  activeFile.value.wordCount = words
  activeFile.value.backgroundImage = currentDocBackground.value
  activeFile.value.backgroundMode = currentDocBackgroundMode.value
  activeFile.value.backgroundOpacity = currentDocBackgroundOpacity.value
  activeFile.value.updatedAt = new Date().toISOString()

  const uid = currentUserId.value
  if (uid && savedFiles.value.length > 0) {
    try {
      await syncUserDocuments(uid, savedFiles.value.slice(0, 5))
    } catch (_) {}
  }
}

// Loads documents exclusively from PostgreSQL database for THIS authenticated user
const loadSavedFiles = async () => {
  // If on home page (sidebar disabled / not full page), keep editor strictly clean!
  if (!props.fullPage && !props.enableSidebar) {
    savedFiles.value = []
    activeFileId.value = ''
    currentDocBackground.value = ''
    setEditorTextSafely('')
    syncStatus.value = 'idle'
    return
  }

  // Clean up any legacy saved files previously stored in localStorage to protect privacy
  try {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('usil_saved_files_')) {
        localStorage.removeItem(k)
      }
    })
  } catch (_) {}

  const uid = currentUserId.value
  const altUid = user.value?.sub || null

  // Capture any active draft content before querying PostgreSQL
  const draftContent = editor.value ? editor.value.getHTML() : ''
  const draftText = editor.value ? editor.value.getText() : ''
  const draftBg = currentDocBackground.value || ''
  const draftBgMode = currentDocBackgroundMode.value || 'cover'
  const draftBgOpacity = currentDocBackgroundOpacity.value ?? 0.2
  const hasDraft = (draftText && draftText.trim().length > 0) || 
                   (draftContent && draftContent.includes('<img')) || 
                   (draftBg && draftBg.trim().length > 0)

  if (!isAuthenticated.value || !uid) {
    // Unauthenticated user on /editor: keep a local in-memory draft so activeFile is never null
    if (savedFiles.value.length === 0) {
      const guestDraft = {
        id: 'draft_' + Date.now(),
        title: 'New File',
        content: draftContent,
        plainText: draftText,
        wordCount: draftText ? draftText.trim().split(/\s+/).filter(w => w.length > 0).length : 0,
        backgroundImage: draftBg,
        backgroundMode: draftBgMode,
        backgroundOpacity: draftBgOpacity,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      savedFiles.value = [guestDraft]
      activeFileId.value = guestDraft.id
    }
    syncStatus.value = 'idle'
    return
  }

  // Query PostgreSQL database for this user's private documents
  try {
    syncStatus.value = 'syncing'
    const dbDocs = await fetchUserDocuments(uid, altUid)
    if (Array.isArray(dbDocs) && dbDocs.length > 0) {
      // If user has real documents, clean up any accidental empty "New File" created by previous failed fetch
      let validDocs = dbDocs
      const hasRealDocs = dbDocs.some(d => 
        (d.plain_text && d.plain_text.trim().length > 0) || 
        (d.content && d.content.includes('<img')) ||
        (d.background_image && d.background_image.trim().length > 0) ||
        (d.title && d.title !== 'New File' && d.title.trim().length > 0)
      )
      if (hasRealDocs) {
        const filtered = dbDocs.filter(d => {
          const isEmptyNew = d.title === 'New File' && 
            (!d.plain_text || !d.plain_text.trim()) && 
            (!d.content || (!d.content.includes('<img') && !d.content.replace(/<[^>]*>/g, '').trim())) &&
            (!d.background_image || !d.background_image.trim())
          if (isEmptyNew) {
            deleteUserDocument(d.id, uid)
            return false
          }
          return true
        })
        if (filtered.length > 0) validDocs = filtered
      }

      // Strictly enforce total max 5 files (including previous logins)
      const loaded = validDocs.slice(0, 5).map(d => ({
        id: d.id,
        title: d.title || 'New File',
        content: d.content || '',
        plainText: d.plain_text || d.plainText || '',
        wordCount: d.word_count || d.wordCount || 0,
        backgroundImage: d.background_image || d.backgroundImage || '',
        backgroundMode: d.background_mode || d.backgroundMode || 'cover',
        backgroundOpacity: d.background_opacity ?? d.backgroundOpacity ?? 0.2,
        createdAt: d.created_at || new Date().toISOString(),
        updatedAt: d.updated_at || new Date().toISOString()
      }))

      // If user just drafted something prior to logging in, and had < 5 files, preserve their draft!
      if (hasDraft && loaded.length < 5 && !loaded.some(d => d.content === draftContent && d.backgroundImage === draftBg)) {
        const migratedDraft = {
          id: 'file_' + Date.now(),
          title: 'Draft Document',
          content: draftContent,
          plainText: draftText,
          wordCount: draftText ? draftText.trim().split(/\s+/).filter(w => w.length > 0).length : 0,
          backgroundImage: draftBg,
          backgroundMode: draftBgMode,
          backgroundOpacity: draftBgOpacity,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        loaded.unshift(migratedDraft)
        syncUserDocuments(uid, loaded.slice(0, 5))
      }

      savedFiles.value = loaded

      // Prioritize activating a document with content or custom background
      const targetDoc = savedFiles.value.find(f => 
        (f.plainText && f.plainText.trim().length > 0) || 
        (f.content && f.content.includes('<img')) ||
        (f.backgroundImage && f.backgroundImage.trim().length > 0)
      ) || savedFiles.value[0]
      activeFileId.value = targetDoc.id
      currentDocBackground.value = targetDoc.backgroundImage || ''
      currentDocBackgroundMode.value = targetDoc.backgroundMode || 'cover'
      currentDocBackgroundOpacity.value = targetDoc.backgroundOpacity ?? 0.2
      setEditorTextSafely(targetDoc.content || '')
      syncStatus.value = 'saved'
    } else {
      // Brand new user with 0 files in PostgreSQL:
      // If they had a draft with background or images, use it as their first real file in PostgreSQL!
      const initialFile = {
        id: 'file_' + Date.now(),
        title: hasDraft ? 'My Document' : 'New File',
        content: draftContent || '',
        plainText: draftText || '',
        wordCount: draftText ? draftText.trim().split(/\s+/).filter(w => w.length > 0).length : 0,
        backgroundImage: draftBg || '',
        backgroundMode: draftBgMode || 'cover',
        backgroundOpacity: draftBgOpacity ?? 0.2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      savedFiles.value = [initialFile]
      activeFileId.value = initialFile.id
      currentDocBackground.value = initialFile.backgroundImage || ''
      currentDocBackgroundMode.value = initialFile.backgroundMode || 'cover'
      currentDocBackgroundOpacity.value = initialFile.backgroundOpacity ?? 0.2
      setEditorTextSafely(initialFile.content || '')

      if (hasDraft) {
        saveFilesToStorage()
      } else {
        syncStatus.value = 'saved'
      }
    }
  } catch (err) {
    console.warn('Could not load user documents from PostgreSQL:', err)
    syncStatus.value = 'error'
  }
}

const scheduleSaveCurrentFile = () => {
  if (!props.fullPage && !props.enableSidebar) return
  if (!editor.value || !activeFile.value || isProgrammaticUpdate) return
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer)
  saveDebounceTimer = setTimeout(() => {
    if (!editor.value || !activeFile.value || isProgrammaticUpdate) return
    const html = editor.value.getHTML()
    const text = editor.value.getText()
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length
    activeFile.value.content = html
    activeFile.value.plainText = text
    activeFile.value.wordCount = words
    activeFile.value.backgroundImage = currentDocBackground.value
    activeFile.value.backgroundMode = currentDocBackgroundMode.value
    activeFile.value.backgroundOpacity = currentDocBackgroundOpacity.value
    activeFile.value.updatedAt = new Date().toISOString()
    saveFilesToStorage()
  }, 250)
}

const createNewFile = () => {
  if (!isAuthenticated.value) {
    showAuthModal.value = true
    return
  }

  if (savedFiles.value.length >= 5) {
    alert('Maximum 5 files limit reached for your account! Including all previous logins, you can have up to 5 files total. Please edit an existing file or delete one to create a new file.')
    return
  }

  // Save current active file first
  if (editor.value && activeFile.value) {
    activeFile.value.content = editor.value.getHTML()
    activeFile.value.plainText = editor.value.getText()
    activeFile.value.wordCount = wordCount.value
    activeFile.value.backgroundImage = currentDocBackground.value
    activeFile.value.backgroundMode = currentDocBackgroundMode.value
    activeFile.value.backgroundOpacity = currentDocBackgroundOpacity.value
    activeFile.value.updatedAt = new Date().toISOString()
  }

  const fileNum = savedFiles.value.length + 1
  const newFile = {
    id: 'file_' + Date.now(),
    title: fileNum === 1 ? 'New File' : `New File ${fileNum}`,
    content: '',
    plainText: '',
    wordCount: 0,
    backgroundImage: '',
    backgroundMode: 'cover',
    backgroundOpacity: 0.2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  savedFiles.value.unshift(newFile)
  // Ensure we never have more than 5 in memory
  if (savedFiles.value.length > 5) {
    savedFiles.value = savedFiles.value.slice(0, 5)
  }
  activeFileId.value = newFile.id
  currentDocBackground.value = ''
  currentDocBackgroundMode.value = 'cover'
  currentDocBackgroundOpacity.value = 0.2
  saveFilesToStorage()

  if (editor.value) {
    setEditorTextSafely('')
    editor.value.commands.focus()
  }
}

const switchToFile = (fileId) => {
  if (fileId === activeFileId.value) return
  if (editor.value && activeFile.value) {
    activeFile.value.content = editor.value.getHTML()
    activeFile.value.plainText = editor.value.getText()
    activeFile.value.wordCount = wordCount.value
    activeFile.value.backgroundImage = currentDocBackground.value
    activeFile.value.backgroundMode = currentDocBackgroundMode.value
    activeFile.value.backgroundOpacity = currentDocBackgroundOpacity.value
    activeFile.value.updatedAt = new Date().toISOString()
    saveFilesToStorage()
  }

  activeFileId.value = fileId
  const target = savedFiles.value.find(f => f.id === fileId)
  if (target) {
    currentDocBackground.value = target.backgroundImage || ''
    currentDocBackgroundMode.value = target.backgroundMode || 'cover'
    currentDocBackgroundOpacity.value = target.backgroundOpacity ?? 0.2
    if (editor.value) {
      setEditorTextSafely(target.content || '')
      editor.value.commands.focus()
    }
  }
}

const startRenameFile = (file, e) => {
  if (e) e.stopPropagation()
  editingFileId.value = file.id
  editingTitleText.value = file.title
  nextTick(() => {
    const input = document.getElementById(`rename-input-${file.id}`)
    if (input) {
      input.focus()
      input.select()
    }
  })
}

const saveRenameFile = (file) => {
  if (editingTitleText.value.trim()) {
    file.title = editingTitleText.value.trim()
    saveFilesToStorage()
  }
  editingFileId.value = null
}

// Zoom controls for the Document Stage
const zoomLevel = ref(100)
const zoomIn = () => {
  if (zoomLevel.value < 200) {
    zoomLevel.value = Math.min(200, zoomLevel.value + 10)
  }
}
const zoomOut = () => {
  if (zoomLevel.value > 50) {
    zoomLevel.value = Math.max(50, zoomLevel.value - 10)
  }
}
const resetZoom = () => {
  zoomLevel.value = 100
}

// Interactive Image Management (Move, Align, Resize, Remove)
const selectedImageNode = ref(null)
const currentImgAlign = ref('center')
const currentImgSize = ref('100%')
const imageToolbarStyle = ref({ top: '0px', left: '0px' })

const updateImageToolbarPosition = (imgEl) => {
  if (!imgEl || !editorWrapper.value) return
  const wrapperRect = editorWrapper.value.getBoundingClientRect()
  const imgRect = imgEl.getBoundingClientRect()
  const scrollTop = editorWrapper.value.scrollTop || 0
  const scrollLeft = editorWrapper.value.scrollLeft || 0
  
  const top = (imgRect.top - wrapperRect.top + scrollTop) - 52
  const left = Math.max(16, (imgRect.left - wrapperRect.left + scrollLeft) + (imgRect.width / 2) - 180)
  
  imageToolbarStyle.value = {
    top: `${Math.max(8, top)}px`,
    left: `${Math.max(10, left)}px`
  }
}

const handleEditorClick = (e) => {
  const target = e.target
  if (target && target.tagName === 'IMG' && target.classList.contains('editor-embedded-image')) {
    selectedImageNode.value = target
    currentImgAlign.value = target.dataset.align || target.getAttribute('data-align') || 'center'
    currentImgSize.value = target.dataset.size || target.getAttribute('data-size') || target.style.width || '100%'
    nextTick(() => updateImageToolbarPosition(target))
  } else {
    if (!e.target.closest('.image-action-overlay')) {
      selectedImageNode.value = null
    }
  }
}

const updateSelectedImageAttributes = (attrsToUpdate) => {
  if (!selectedImageNode.value || !editor.value) return
  const img = selectedImageNode.value
  const { state } = editor.value.view
  let targetPos = null
  state.doc.descendants((node, pos) => {
    if (node.type.name === 'image' && (node.attrs.src === img.src || node.attrs.src === img.getAttribute('src'))) {
      targetPos = pos
      return false
    }
  })
  if (targetPos !== null) {
    const node = state.doc.nodeAt(targetPos)
    if (node) {
      const mergedAttrs = { ...node.attrs, ...attrsToUpdate }
      const tr = state.tr.setNodeMarkup(targetPos, undefined, mergedAttrs)
      editor.value.view.dispatch(tr)
    }
  }
}

const deleteSelectedImage = () => {
  if (!selectedImageNode.value || !editor.value) return
  const img = selectedImageNode.value
  
  const { state } = editor.value.view
  let targetPos = null
  state.doc.descendants((node, pos) => {
    if (node.type.name === 'image' && (node.attrs.src === img.src || node.attrs.src === img.getAttribute('src'))) {
      targetPos = pos
      return false
    }
  })
  
  if (targetPos !== null) {
    editor.value.commands.deleteRange({ from: targetPos, to: targetPos + 1 })
  } else {
    img.remove()
  }
  
  selectedImageNode.value = null
  scheduleSaveCurrentFile()
}

const setImageAlignment = (align) => {
  if (!selectedImageNode.value) return
  const img = selectedImageNode.value
  currentImgAlign.value = align
  img.dataset.align = align
  
  let styleStr = `width: ${currentImgSize.value}; max-width: ${currentImgSize.value};`
  if (align === 'left') {
    styleStr += ' display: block; float: none; margin-left: 0; margin-right: auto;'
  } else if (align === 'center') {
    styleStr += ' display: block; float: none; margin-left: auto; margin-right: auto;'
  } else if (align === 'right') {
    styleStr += ' display: block; float: none; margin-left: auto; margin-right: 0;'
  } else if (align === 'float-left') {
    styleStr += ' display: inline-block; float: left; margin: 8px 16px 8px 0;'
  }
  img.setAttribute('style', styleStr)

  updateSelectedImageAttributes({
    align,
    style: styleStr,
    width: currentImgSize.value
  })

  scheduleSaveCurrentFile()
  nextTick(() => updateImageToolbarPosition(img))
}

const setImageSize = (size) => {
  if (!selectedImageNode.value) return
  const img = selectedImageNode.value
  currentImgSize.value = size
  img.dataset.size = size
  
  const align = currentImgAlign.value || 'center'
  let styleStr = `width: ${size}; max-width: ${size};`
  if (align === 'left') {
    styleStr += ' display: block; float: none; margin-left: 0; margin-right: auto;'
  } else if (align === 'center') {
    styleStr += ' display: block; float: none; margin-left: auto; margin-right: auto;'
  } else if (align === 'right') {
    styleStr += ' display: block; float: none; margin-left: auto; margin-right: 0;'
  } else if (align === 'float-left') {
    styleStr += ' display: inline-block; float: left; margin: 8px 16px 8px 0;'
  }
  img.setAttribute('style', styleStr)

  updateSelectedImageAttributes({
    align,
    style: styleStr,
    width: size
  })

  scheduleSaveCurrentFile()
  nextTick(() => updateImageToolbarPosition(img))
}

const deleteFile = (fileId, e) => {
  if (e) {
    e.stopPropagation()
    e.preventDefault()
  }
  
  const wasActive = activeFileId.value === fileId
  
  if (savedFiles.value.length <= 1) {
    // Reset the last remaining file cleanly
    const file = savedFiles.value[0]
    file.title = 'New File'
    file.content = ''
    file.plainText = ''
    file.wordCount = 0
    file.backgroundImage = ''
    file.updatedAt = new Date().toISOString()
    currentDocBackground.value = ''
    saveFilesToStorage()
    setEditorTextSafely('')
    const uid = currentUserId.value
    if (isAuthenticated.value && uid) {
      deleteUserDocument(fileId, uid)
    }
    return
  }

  // Remove file from list immediately
  savedFiles.value = savedFiles.value.filter(f => f.id !== fileId)
  saveFilesToStorage()

  const uid = currentUserId.value
  if (isAuthenticated.value && uid) {
    deleteUserDocument(fileId, uid)
  }

  if (wasActive && savedFiles.value.length > 0) {
    const nextFile = savedFiles.value[0]
    activeFileId.value = nextFile.id
    currentDocBackground.value = nextFile.backgroundImage || ''
    currentDocBackgroundMode.value = nextFile.backgroundMode || 'cover'
    currentDocBackgroundOpacity.value = nextFile.backgroundOpacity ?? 0.2
    if (editor.value) {
      setEditorTextSafely(nextFile.content || '')
    }
  }
}


// State
const autoConvert = ref(true)
const showSuggestions = ref(false)
const suggestionsList = ref([])
const selectedSuggestionIndex = ref(0)
const popupStyle = ref({})
const editorWrapper = ref(null)
const fontSelectorRef = ref(null)
const wordCount = ref(0)
const charCount = ref(0)
const lastProcessedWord = ref('')
const lastProcessedPosition = ref(-1)

// Download / Export dropdown state
const showDownloadDropdown = ref(false)
const downloadDropdownRef = ref(null)

// Watch for Deep Learning suggestions from the backend API
watch(aiSuggestions, (newSuggestions) => {
  if (newSuggestions && newSuggestions.length > 0) {
    suggestionsList.value = newSuggestions
    if (!showSuggestions.value) {
      showSuggestions.value = true
      selectedSuggestionIndex.value = 0
      if (editor.value) {
        updatePopupPosition(editor.value.view)
      }
    }
  }
})

// ── AI Assistant & Grammar Checker Sidebar State ─────────────────
const aiHelpEnabled = ref(false)
const autoCheckMode = ref(false)
const activeIssues = ref([])
let checkDebounceTimer = null

// Quick Action Modal States
const showQuickActionModal = ref(false)
const quickActionModalTitle = ref('')
const quickActionModalContent = ref('')
const quickActionLoading = ref(false)

// ── VOICE TYPING STATE ──────────────────────────────────────────
const isVoiceActive = ref(false)
const voiceInterim = ref('')
const voiceError = ref('')
let recognition = null

// ── Font Size ────────────────────────────────────────────────────
const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72]
const currentFontSize = ref(16)
const showFontSizeDropdown = ref(false)
const fontSizeRef = ref(null)

const applyFontSize = (size) => {
  currentFontSize.value = size
  showFontSizeDropdown.value = false
}

const changeFontSize = (delta) => {
  const idx = FONT_SIZES.indexOf(currentFontSize.value)
  if (idx === -1) {
    // snap to nearest
    const clamped = Math.max(10, Math.min(72, currentFontSize.value + delta))
    currentFontSize.value = FONT_SIZES.reduce((a, b) => Math.abs(b - clamped) < Math.abs(a - clamped) ? b : a)
  } else {
    const newIdx = Math.max(0, Math.min(FONT_SIZES.length - 1, idx + (delta > 0 ? 1 : -1)))
    currentFontSize.value = FONT_SIZES[newIdx]
  }
}
// ── End Font Size ────────────────────────────────────────────────

// ── FONT THEME STATE ────────────────────────────────────────────
const TAMIL_FONTS = [
  { label: 'Noto Sans Tamil',  value: "'Noto Sans Tamil', sans-serif",   google: 'Noto+Sans+Tamil:wght@400;500;700' },
  { label: 'Noto Serif Tamil', value: "'Noto Serif Tamil', serif",        google: 'Noto+Serif+Tamil:wght@400;700' },
  { label: 'Catamaran',        value: "'Catamaran', sans-serif",          google: 'Catamaran:wght@400;600;700' },
  { label: 'Meera Inimai',     value: "'Meera Inimai', sans-serif",       google: 'Meera+Inimai' },
  { label: 'Mukta Malar',      value: "'Mukta Malar', sans-serif",        google: 'Mukta+Malar:wght@400;600' },
  { label: 'Arima Madurai',    value: "'Arima Madurai', serif",           google: 'Arima+Madurai:wght@400;700' },
  { label: 'Baloo Thambi 2',   value: "'Baloo Thambi 2', sans-serif",     google: 'Baloo+Thambi+2:wght@400;700' },
  { label: 'Latha',            value: "'Latha', sans-serif",              google: null },
  { label: 'Vijaya',           value: "'Vijaya', sans-serif",             google: null },
  { label: 'Tamil Sangam MN',  value: "'Tamil Sangam MN', sans-serif",    google: null },
]

const selectedFont = ref(TAMIL_FONTS[0])
const showFontDropdown = ref(false)

function applyFont(font) {
  selectedFont.value = font
  showFontDropdown.value = false
  if (font.google) {
    const existing = document.querySelector('link[data-gfont="' + font.google + '"]')
    if (!existing) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=' + font.google + '&display=swap'
      link.setAttribute('data-gfont', font.google)
      document.head.appendChild(link)
    }
  }
}

// Get current word being typed with improved accuracy
const getCurrentWord = (text, cursorPos) => {
  const before = text.slice(0, cursorPos)
  const match = before.match(/[a-zA-Z]+(?:'[a-zA-Z]+)?$/)
  
  if (match && match[0].length > 0) {
    const word = match[0]
    const start = cursorPos - word.length
    return { word, start, end: cursorPos }
  }
  return { word: '', start: cursorPos, end: cursorPos }
}

// Replace word in editor
const replaceWord = (view, start, end, replacement, addSpace = true) => {
  const { state } = view
  let tr = state.tr.delete(start, end)
  
  if (addSpace) {
    tr = tr.insertText(replacement + ' ', start)
  } else {
    tr = tr.insertText(replacement, start)
  }
  
  view.dispatch(tr)
  return start + replacement.length + (addSpace ? 1 : 0)
}

// Update popup position
const updatePopupPosition = (view) => {
  const { state } = view
  const { selection } = state
  const { from } = selection

  const coords = view.coordsAtPos(from)
  const wrapperRect = editorWrapper.value?.getBoundingClientRect()

  if (wrapperRect) {
    const scrollOffsetTop = editorWrapper.value?.scrollTop || 0
    const scrollOffsetLeft = editorWrapper.value?.scrollLeft || 0
    let top = coords.top - wrapperRect.top + scrollOffsetTop + 30
    let left = coords.left - wrapperRect.left + scrollOffsetLeft
    
    const popupWidth = 260
    const wrapperWidth = wrapperRect.clientWidth || wrapperRect.width
    
    if (left + popupWidth > wrapperWidth) {
      left = wrapperWidth - popupWidth - 10
    }
    if (left < 10) left = 10
    
    popupStyle.value = {
      top: `${top}px`,
      left: `${left}px`,
      position: 'absolute',
      zIndex: 1000
    }
  }
}

// Update word and character count
const updateStats = (editor) => {
  const text = editor.getText()
  const words = text.trim().split(/\s+/).filter(w => w.length > 0)
  wordCount.value = words.length
  charCount.value = text.length
}

// Handle text input with improved conversion logic
const handleTyping = (view, from, to, text) => {
    const { state } = view
    const { selection } = state
    const { $from } = selection
    const cursorPos = $from.pos
    
    const textBefore = state.doc.textBetween(0, cursorPos, ' ', ' ')
    const currentWordObj = getCurrentWord(textBefore, cursorPos)
    
    // Auto-convert logic with context
    const shouldConvert = autoConvert.value && (
        text === ' ' || 
        text === '.' || 
        text === ',' || 
        text === '?' || 
        text === '!' ||
        text === '\n' ||
        text === ';' ||
        text === ':'
    )
    
    if (shouldConvert && currentWordObj.word && currentWordObj.word.length > 0) {
        // Priority 1: Pick top suggestion from active suggestions popup if available
        let converted = ''
        const topCandidate = suggestionsList.value && suggestionsList.value[0]
        if (topCandidate && topCandidate.tamil) {
            converted = topCandidate.tamil
        }
        
        // Priority 2: Synchronous suggestions from getSuggestions (presets, trie, beam search)
        if (!converted) {
            const syncSuggs = getSuggestions(currentWordObj.word)
            if (syncSuggs && syncSuggs.length > 0 && syncSuggs[0].tamil) {
                converted = syncSuggs[0].tamil
            }
        }
        
        // Priority 3: Fallback to local synchronous convertWord
        if (!converted) {
            converted = convertWord(currentWordObj.word, '')
        }
        
        if (converted && converted !== currentWordObj.word) {
            let addSpace = (text === ' ')
            
            replaceWord(view, currentWordObj.start, currentWordObj.end, converted, addSpace)
            
            // Record usage for frequency learning (pass tanglish key for trie + backend sync)
            recordUsage(converted, currentWordObj.word)
            
            lastProcessedWord.value = currentWordObj.word
            lastProcessedPosition.value = currentWordObj.start
            
            showSuggestions.value = false
            suggestionsList.value = []
            
            if (text !== ' ' && text !== '\n') {
                setTimeout(() => {
                    const { state: newState } = view
                    const newCursorPos = currentWordObj.start + converted.length + (addSpace ? 1 : 0)
                    const tr = newState.tr.insertText(text, newCursorPos, newCursorPos)
                    view.dispatch(tr)
                }, 0)
            }
            
            return true
        }
    }
    
    // If not converting, user is typing letters inside a word
    suggestionsList.value = []
    showSuggestions.value = false

    // Update suggestions AFTER TipTap commits the new character
    setTimeout(() => {
        if (!editor.value) return
        const { state: newState } = editor.value
        const { $from: new$from } = newState.selection
        const newCursorPos = new$from.pos
        const newTextBefore = newState.doc.textBetween(0, newCursorPos, ' ', ' ')
        const newWordObj = getCurrentWord(newTextBefore, newCursorPos)
        const contextBefore = newTextBefore.slice(0, newWordObj.start).trim()
        if (newWordObj.word && newWordObj.word.length >= 1) {
            const newSuggestions = getSuggestions(newWordObj.word, contextBefore).slice(0, 6)
            suggestionsList.value = newSuggestions
            if (newSuggestions.length > 0) {
                showSuggestions.value = true
                selectedSuggestionIndex.value = 0
                updatePopupPosition(editor.value.view)
            } else {
                showSuggestions.value = false
            }
        } else {
            showSuggestions.value = false
            suggestionsList.value = []
        }
    }, 0)
    
    return false
}

// Handle keyboard navigation for suggestions
const handleKeyDown = (view, event) => {
  if (!showSuggestions.value) return false
  
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      selectedSuggestionIndex.value = Math.min(
        selectedSuggestionIndex.value + 1,
        suggestionsList.value.length - 1
      )
      return true
      
    case 'ArrowUp':
      event.preventDefault()
      selectedSuggestionIndex.value = Math.max(selectedSuggestionIndex.value - 1, 0)
      return true
      
    case 'Enter':
    case 'Tab':
      event.preventDefault()
      if (suggestionsList.value[selectedSuggestionIndex.value]) {
        selectSuggestion(suggestionsList.value[selectedSuggestionIndex.value], selectedSuggestionIndex.value, false)
      }
      return true
      
    case 'Escape':
      showSuggestions.value = false
      suggestionsList.value = []
      return true
      
    case ' ':
      // Intercept Space to commit the active suggestion from dropdown with trailing space
      if (showSuggestions.value && suggestionsList.value && suggestionsList.value.length > 0) {
        const { state } = view
        const { selection } = state
        const { $from } = selection
        const textBefore = state.doc.textBetween(0, $from.pos, ' ', ' ')
        const currentWordObj = getCurrentWord(textBefore, $from.pos)
        if (currentWordObj.word) {
          event.preventDefault()
          const selected = suggestionsList.value[selectedSuggestionIndex.value] || suggestionsList.value[0]
          selectSuggestion(selected, selectedSuggestionIndex.value, true)
          return true
        }
      }
      return false
      
    case 'Backspace':
      // Clear immediately before the timeout so stale list never flashes
      suggestionsList.value = []
      showSuggestions.value = false
      setTimeout(() => {
        if (!editor.value) return
        const { state } = view
        const { selection } = state
        const { $from } = selection
        const textBefore = state.doc.textBetween(0, $from.pos, ' ', ' ')
        const currentWordObj = getCurrentWord(textBefore, $from.pos)
        const backspaceContext = state.doc.textBetween(
          Math.max(0, $from.pos - 100),
          Math.min(state.doc.content.size, $from.pos + 50),
          ' ', ' '
        )
        if (currentWordObj.word && currentWordObj.word.length > 0) {
          const suggestions = getSuggestions(currentWordObj.word, backspaceContext).slice(0, 6)
          suggestionsList.value = suggestions
          if (suggestions.length > 0) {
            showSuggestions.value = true
            selectedSuggestionIndex.value = 0
            updatePopupPosition(view)
          } else {
            showSuggestions.value = false
          }
        } else {
          showSuggestions.value = false
          suggestionsList.value = []
        }
      }, 10)
      return false
      
    default:
      return false
  }
}

// Select suggestion from dropdown
const selectSuggestion = (suggestion, index = -1, addSpace = false) => {
  if (!editor.value || !suggestion) return
  
  const { state, view } = editor.value
  const { selection } = state
  const { $from } = selection
  const cursorPos = $from.pos
  const textBefore = state.doc.textBetween(0, cursorPos, ' ', ' ')
  const currentWordObj = getCurrentWord(textBefore, cursorPos)
  
  if (currentWordObj.word) {
    replaceWord(view, currentWordObj.start, currentWordObj.end, suggestion.tamil, addSpace)
    
    if (index > 0) {
      // User picked a non-top candidate -> learn correction
      learnCorrection(currentWordObj.word, suggestion.tamil)
    } else {
      // User picked the top candidate -> standard usage
      recordUsage(suggestion.tamil, currentWordObj.word)
    }
    
    showSuggestions.value = false
    suggestionsList.value = []
  }
}

// Handle paste event (supports both text and clipboard image pasting)
const handlePaste = (view, event) => {
  // 1. Check for clipboard image data (e.g. copied image, screenshot, or file)
  const items = event.clipboardData?.items
  if (items && items.length > 0) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile()
        if (file) {
          event.preventDefault()
          compressImageFile(file, 1200, 1200, 0.85).then((dataUrl) => {
            if (dataUrl && editor.value) {
              const defaultStyle = 'width: 100%; max-width: 100%; display: block; margin-left: auto; margin-right: auto;'
              editor.value.chain().focus().setImage({ 
                src: dataUrl,
                style: defaultStyle,
                align: 'center',
                width: '100%'
              }).run()
              scheduleSaveCurrentFile()
            }
          })
          return true
        }
      }
    }
  }

  // 2. Normal text paste
  event.preventDefault()
  const pastedText = event.clipboardData?.getData('text/plain')
  if (!pastedText) return true

  const { state } = view
  const { selection } = state
  const tr = state.tr.insertText(pastedText, selection.from, selection.to)
  view.dispatch(tr)

  // Show suggestions for the last word in pasted block
  setTimeout(() => {
    if (!editor.value) return
    const { state: newState } = editor.value
    const { selection: newSel } = newState
    const { $from } = newSel
    const cursorPos = $from.pos
    const textBefore = newState.doc.textBetween(0, cursorPos, ' ', ' ')
    const currentWordObj = getCurrentWord(textBefore, cursorPos)
    if (currentWordObj.word && currentWordObj.word.length >= 1) {
      const suggestions = getSuggestions(currentWordObj.word, '').slice(0, 6)
      suggestionsList.value = suggestions
      if (suggestions.length > 0) {
        showSuggestions.value = true
        selectedSuggestionIndex.value = 0
        updatePopupPosition(editor.value.view)
      }
    }
  }, 50)

  return true  // ← CRITICAL: prevents TipTap default paste (stops double paste)
}

// Handle image drop event (drag and drop image directly onto editor)
const handleDrop = (view, event, slice, moved) => {
  if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
    const file = event.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      event.preventDefault()
      compressImageFile(file, 1200, 1200, 0.85).then((dataUrl) => {
        if (dataUrl && editor.value) {
          const defaultStyle = 'width: 100%; max-width: 100%; display: block; margin-left: auto; margin-right: auto;'
          editor.value.chain().focus().setImage({ 
            src: dataUrl,
            style: defaultStyle,
            align: 'center',
            width: '100%'
          }).run()
          scheduleSaveCurrentFile()
        }
      })
      return true
    }
  }
  return false
}

// ── DOWNLOAD & EXPORT FUNCTIONS ──────────────────────────
const downloadAsPDF = () => {
  showDownloadDropdown.value = false
  if (!editor.value) return
  const htmlContent = editor.value.getHTML()
  const plainText = editor.value.getText()
  if (!plainText.trim()) {
    alert('Please write some content before downloading.')
    return
  }

  // Create a dedicated hidden print iframe for pristine PDF output
  const printIframe = document.createElement('iframe')
  printIframe.style.position = 'fixed'
  printIframe.style.right = '0'
  printIframe.style.bottom = '0'
  printIframe.style.width = '0'
  printIframe.style.height = '0'
  printIframe.style.border = 'none'
  document.body.appendChild(printIframe)

  const doc = printIframe.contentWindow.document
  doc.open()
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Usil AI Tamil Document</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Catamaran:wght@400;600;700&family=Noto+Sans+Tamil:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
          @page {
            margin: 20mm;
            size: A4;
          }
          body {
            font-family: ${selectedFont.value.value || "'Noto Sans Tamil', sans-serif"};
            font-size: ${currentFontSize.value || 16}px;
            line-height: 1.8;
            color: #0f172a;
            padding: 24px;
            background: white;
          }
          h1, h2, h3 { color: #1e293b; margin-top: 1em; margin-bottom: 0.5em; }
          blockquote { border-left: 3px solid #6366f1; margin: 1em 0; padding-left: 1em; color: #475569; font-style: italic; }
          code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; font-family: monospace; }
          .doc-footer {
            margin-top: 40px;
            padding-top: 12px;
            border-top: 1px solid #e2e8f0;
            font-size: 11px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        <h1 style="color: #1e293b; border-bottom: 2px solid #6366f1; padding-bottom: 8px;">${activeFile.value?.title || 'Tamil Document'}</h1>
        <div style="margin-top: 16px;">${htmlContent}</div>
        <div class="doc-footer">
          <span>Created with Usil AI (Tanglish to Tamil)</span>
          <span>${new Date().toLocaleDateString()}</span>
        </div>
      </body>
    </html>
  `)
  doc.close()

  setTimeout(() => {
    printIframe.contentWindow.focus()
    printIframe.contentWindow.print()
    setTimeout(() => {
      if (document.body.contains(printIframe)) {
        document.body.removeChild(printIframe)
      }
    }, 2500)
  }, 400)
}

// ── Separate Download as Word (.doc) ──
const downloadAsDocx = () => {
  showDownloadDropdown.value = false
  if (!editor.value) return
  const htmlContent = editor.value.getHTML()
  const plainText = editor.value.getText()
  if (!plainText.trim()) {
    alert('Please write some content before downloading.')
    return
  }

  const fileTitle = activeFile.value?.title || 'Tamil_Document'
  const cleanTitle = fileTitle.replace(/[^a-zA-Z0-9_\u0B80-\u0BFF\s-]/g, '').trim() || 'Document'

  const wordHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${fileTitle}</title>
        <!--[if gte mso 9]>
        <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body {
            font-family: 'Noto Sans Tamil', 'Catamaran', 'Arial Unicode MS', Tahoma, sans-serif;
            font-size: 14pt;
            line-height: 1.6;
            color: #000000;
          }
          h1 { font-size: 22pt; font-weight: bold; border-bottom: 2px solid #6366f1; padding-bottom: 6px; }
          h2 { font-size: 18pt; font-weight: bold; }
          h3 { font-size: 16pt; font-weight: bold; }
          p { margin-bottom: 10pt; }
        </style>
      </head>
      <body>
        <h1>${fileTitle}</h1>
        <div>${htmlContent}</div>
      </body>
    </html>
  `

  const blob = new Blob(['\\ufeff' + wordHtml], { type: 'application/msword;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${cleanTitle}_${Date.now()}.doc`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Download as Plain Text (.txt) ──
const downloadAsTxt = () => {
  showDownloadDropdown.value = false
  if (!editor.value) return
  const plainText = editor.value.getText()
  if (!plainText.trim()) {
    alert('Please write some content before downloading.')
    return
  }

  const fileTitle = activeFile.value?.title || 'Tamil_Document'
  const cleanTitle = fileTitle.replace(/[^a-zA-Z0-9_\u0B80-\u0BFF\s-]/g, '').trim() || 'Document'

  const blob = new Blob(['\ufeff' + plainText], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${cleanTitle}_${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

// Clear editor content
const clearEditor = () => {
  if (editor.value) {
    editor.value.commands.clearContent()
    showSuggestions.value = false
    suggestionsList.value = []
    wordCount.value = 0
    charCount.value = 0
  }
}

// Handle selection change to update suggestions position
const handleSelectionUpdate = ({ editor }) => {
  if (showSuggestions.value) {
    updatePopupPosition(editor.view)
  }
}

// ============ AI Assistant & Grammar Checker Functions ============

const setAutoCheckMode = (val) => {
  autoCheckMode.value = val
  if (val) {
    scheduleAutoCheck()
  }
}

// Toggle AI Assistant Sidebar ON/OFF
const toggleAIHelp = () => {
  if (!isAuthenticated.value) {
    showAuthModal.value = true
    return
  }
  aiHelpEnabled.value = !aiHelpEnabled.value
  if (aiHelpEnabled.value) {
    // Initial scan when sidebar opens if credits available
    if (!isOutOfCredits.value) {
      triggerGrammarScan()
    }
  } else {
    activeIssues.value = []
    if (checkDebounceTimer) clearTimeout(checkDebounceTimer)
  }
}

// Debounced auto-check (3 seconds after typing stops per screenshot)
const scheduleAutoCheck = () => {
  if (!autoCheckMode.value || !aiHelpEnabled.value) return
  if (checkDebounceTimer) clearTimeout(checkDebounceTimer)
  checkDebounceTimer = setTimeout(() => {
    triggerGrammarScan()
  }, 3000)
}

// Core grammar scanning function (1 check = 1 credit, 30 credits/day)
const triggerGrammarScan = async () => {
  if (!editor.value) return
  const text = editor.value.getText().trim()
  if (!text) {
    activeIssues.value = []
    return
  }

  // Enforce grammar check credit limit
  if (isOutOfCredits.value) {
    return
  }
  if (!consumeCredit(1)) {
    return
  }

  aiChecking.value = true
  try {
    const issues = []

    // 1. Check with Claude API or Backend
    try {
      const claudeResult = await checkGrammar(text)
      if (claudeResult && claudeResult.corrections && claudeResult.corrections.length > 0) {
        claudeResult.corrections.forEach((c, i) => {
          issues.push({
            id: `c_${Date.now()}_${i}`,
            original: c.original,
            corrected: c.corrected,
            explanation: c.explanation,
            type: c.type ? (c.type.charAt(0).toUpperCase() + c.type.slice(1)) : 'Clarity'
          })
        })
      }
    } catch (_) {}

    // 2. Local linguistic rules check (detects clarity, sandhi, conjunctions)
    // Conjunction check: e.g. "நம்பிக்கை நானும்" -> "நம்பிக்கையும் நானும்"
    if (text.includes('நம்பிக்கை நானும்') && !issues.some(i => i.original === 'நம்பிக்கை நானும்')) {
      issues.unshift({
        id: 'conjunction_trust',
        original: 'நம்பிக்கை நானும்',
        corrected: 'நம்பிக்கையும் நானும்',
        explanation: "Added conjunction 'உம்' for better flow and clarity, implying 'நம்பிக்கையும் நானும்' (both trust and I / I and my trust).",
        type: 'Clarity'
      })
    }

    // Sandhi rules
    const sandhiRules = [
      { orig: 'அந்த பையன்', corr: 'அந்தப் பையன்', exp: "'அந்த' என்ற சொல்லுக்குப் பின் வல்லினம் (ப்) மிக வேண்டும்.", type: 'Grammar' },
      { orig: 'இந்த புத்தகம்', corr: 'இந்தப் புத்தகம்', exp: "'இந்த' என்ற சொல்லுக்குப் பின் வல்லினம் (ப்) மிக வேண்டும்.", type: 'Grammar' },
      { orig: 'அந்த பக்கம்', corr: 'அந்தப் பக்கம்', exp: "'அந்த' என்ற சொல்லுக்குப் பின் வல்லினம் (ப்) மிக வேண்டும்.", type: 'Grammar' },
      { orig: 'எந்த காலம்', corr: 'எந்தக் காலம்', exp: "'எந்த' என்ற சொல்லுக்குப் பின் வல்லினம் (க்) மிக வேண்டும்.", type: 'Grammar' },
      { orig: 'இங்கு வா', corr: 'இங்கே வா', exp: "வினைச்சொல்லுடன் இணையும் போது 'இங்கே வா' என்பது மேலும் தெளிவானது.", type: 'Clarity' },
      { orig: 'எனக்கு தெரியும்', corr: 'எனக்குத் தெரியும்', exp: "'எனக்கு' என்ற நான்காம் வேற்றுமைக்குப் பின் வல்லினம் (த்) மிக வேண்டும்.", type: 'Grammar' }
    ]

    for (const r of sandhiRules) {
      if (text.includes(r.orig) && !issues.some(i => i.original === r.orig)) {
        issues.push({
          id: `sandhi_${r.orig}`,
          original: r.orig,
          corrected: r.corr,
          explanation: r.exp,
          type: r.type
        })
      }
    }

    activeIssues.value = issues
  } catch (err) {
    console.warn('[AI Assistant] Scan failed:', err)
  } finally {
    aiChecking.value = false
  }
}

// Apply single issue correction
const applySingleIssue = (issue, idx) => {
  if (!editor.value || !issue) return
  const currentText = editor.value.getText()
  if (currentText.includes(issue.original)) {
    const updated = currentText.replace(issue.original, issue.corrected)
    editor.value.commands.setContent(updated)
  }
  activeIssues.value.splice(idx, 1)
}

// Apply all corrections
const applyAllIssues = () => {
  if (!editor.value || activeIssues.value.length === 0) return
  let text = editor.value.getText()
  for (const issue of activeIssues.value) {
    text = text.replace(issue.original, issue.corrected)
  }
  editor.value.commands.setContent(text)
  activeIssues.value = []
}

// Dismiss single issue
const dismissSingleIssue = (idx) => {
  activeIssues.value.splice(idx, 1)
}

// Dismiss all issues
const dismissAllIssues = () => {
  activeIssues.value = []
}

// ── Quick Actions ────────────────────────────────────────────────
const handleTranslateToEnglish = async () => {
  if (!editor.value) return
  const text = editor.value.getText().trim()
  if (!text) {
    alert('Please write or convert some Tamil text in the editor first.')
    return
  }

  quickActionModalTitle.value = 'Tamil → English Translation'
  quickActionLoading.value = true
  showQuickActionModal.value = true
  quickActionModalContent.value = ''

  try {
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=ta&tl=en&dt=t&q=${encodeURIComponent(text)}`)
    const data = await res.json()
    if (data && data[0]) {
      quickActionModalContent.value = data[0].map(s => s[0]).join('')
    } else {
      quickActionModalContent.value = 'Translation returned empty response.'
    }
  } catch (e) {
    quickActionModalContent.value = 'Translation service error. Please try again.'
  } finally {
    quickActionLoading.value = false
  }
}

const handleSummarizeText = async () => {
  if (!editor.value) return
  const text = editor.value.getText().trim()
  if (!text) {
    alert('Please write or convert some Tamil text in the editor first.')
    return
  }

  quickActionModalTitle.value = 'Text Summary'
  quickActionLoading.value = true
  showQuickActionModal.value = true
  quickActionModalContent.value = ''

  setTimeout(() => {
    const sentences = text.split(/[.?!;\n]+/).filter(s => s.trim().length > 5)
    if (sentences.length <= 2) {
      quickActionModalContent.value = '• ' + text
    } else {
      quickActionModalContent.value = sentences.slice(0, 3).map(s => `• ${s.trim()}`).join('\n\n')
    }
    quickActionLoading.value = false
  }, 350)
}

const copyQuickActionResult = () => {
  if (!quickActionModalContent.value) return
  navigator.clipboard.writeText(quickActionModalContent.value)
  alert('Copied to clipboard!')
}

const insertQuickActionResult = () => {
  if (!editor.value || !quickActionModalContent.value) return
  editor.value.commands.insertContent('<p>' + quickActionModalContent.value + '</p>')
  showQuickActionModal.value = false
}


// ── VOICE TYPING FUNCTIONS ──────────────────────────────────────

function buildRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) {
    voiceError.value = 'Speech recognition not supported. Use Chrome or Edge.'
    return null
  }
  const rec = new SpeechRecognition()
  rec.continuous = true
  rec.interimResults = true
  rec.lang = 'en-IN'
  rec.maxAlternatives = 1

  rec.onresult = (event) => {
    let interimText = ''
    let finalText = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript
      if (event.results[i].isFinal) {
        finalText += transcript
      } else {
        interimText += transcript
      }
    }
    voiceInterim.value = interimText
    if (finalText.trim()) {
      voiceInterim.value = ''
      insertVoiceText(finalText.trim())
    }
  }

  rec.onerror = (event) => {
    if (event.error === 'no-speech' || event.error === 'aborted') return
    if (event.error === 'not-allowed') {
      voiceError.value = 'Microphone access denied. Click the 🔒 lock in your address bar → Site settings → allow Microphone → refresh the page.'
    } else if (event.error === 'audio-capture') {
      voiceError.value = 'No microphone found. Please connect a microphone and try again.'
    } else if (event.error === 'network') {
      voiceError.value = 'Network error with speech recognition. Check your internet connection.'
    } else {
      voiceError.value = `Microphone error: ${event.error}. Please check browser permissions.`
    }
    isVoiceActive.value = false
  }

  rec.onend = () => {
    if (isVoiceActive.value) {
      try { rec.start() } catch (_) {}
    }
  }

  return rec
}

function insertVoiceText(rawText) {
  if (!editor.value) return
  const words = rawText.trim().split(/\s+/)
  let textToInsert = ''
  for (const word of words) {
    if (!word) continue
    const converted = convertWord(word, '')
    textToInsert += (converted && converted !== word ? converted : word) + ' '
  }
  if (textToInsert.trim()) {
    editor.value.commands.insertContent(textToInsert)
    updateStats(editor.value)
  }
}

async function toggleVoiceTyping() {
  if (isVoiceActive.value) {
    stopVoiceTyping()
  } else {
    await startVoiceTyping()
  }
}

async function startVoiceTyping() {
  voiceError.value = ''
  voiceInterim.value = ''

  // Check SpeechRecognition support
  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognitionAPI) {
    voiceError.value = 'Speech recognition not supported. Please use Chrome or Edge.'
    return
  }

  // Use Permissions API to check mic state without triggering a blocking prompt
  if (navigator.permissions) {
    try {
      const permStatus = await navigator.permissions.query({ name: 'microphone' })
      if (permStatus.state === 'denied') {
        voiceError.value = 'Microphone is blocked. Click the 🔒 lock in your address bar → Site settings → allow Microphone → refresh.'
        return
      }
    } catch (_) {
      // Permissions API not available — proceed, SpeechRecognition will ask for permission itself
    }
  }

  // Build recognition instance (this triggers the browser mic permission prompt if not yet granted)
  if (!recognition) recognition = buildRecognition()
  if (!recognition) return

  try {
    recognition.start()
    isVoiceActive.value = true
    editor.value?.commands.focus()
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      voiceError.value = 'Microphone blocked. Allow mic access in browser settings and try again.'
    } else {
      voiceError.value = 'Could not start microphone: ' + (err.message || err)
    }
    isVoiceActive.value = false
  }
}

function stopVoiceTyping() {
  isVoiceActive.value = false
  voiceInterim.value = ''
  if (recognition) {
    try { recognition.stop() } catch (_) {}
  }
}

// ── END VOICE TYPING ────────────────────────────────────────────

// Initialize editor
const editor = useEditor({
  content: '',
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3]
      }
    }),
    Placeholder.configure({
      placeholder: 'Type in Tanglish — it converts to Tamil automatically when you press space or punctuation...'
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
      defaultAlignment: 'left',
    }),
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    CustomImage.configure({
      inline: false,
      allowBase64: true,
      HTMLAttributes: {
        class: 'editor-embedded-image',
      }
    })
  ],
  editorProps: {
    handleTextInput: handleTyping,
    handleKeyDown: handleKeyDown,
    handlePaste: handlePaste,
    handleDrop: handleDrop
  },
  onUpdate: ({ editor }) => {
    if (isProgrammaticUpdate) return
    updateStats(editor)
    scheduleSaveCurrentFile()
    if (aiHelpEnabled.value && autoCheckMode.value) {
      scheduleAutoCheck()
    }
  },
  onSelectionUpdate: handleSelectionUpdate
})

// Watch for autoConvert changes
watch(autoConvert, (newValue) => {
  console.log('Auto convert:', newValue ? 'ON' : 'OFF')
})

// Watch for authentication changes (login, logout, or account switch)
watch([isAuthenticated, currentUserId], async ([newAuth, newUid], [oldAuth, oldUid]) => {
  if (!newAuth || !newUid) {
    // User logged out: clear private documents
    savedFiles.value = []
    activeFileId.value = ''
    currentDocBackground.value = ''
    setEditorTextSafely('')
    syncStatus.value = 'idle'
    if (props.fullPage || props.enableSidebar) {
      await loadSavedFiles()
    }
    return
  }

  if (newUid !== oldUid || (newAuth && !oldAuth)) {
    // User logged in or switched accounts: load their documents from PostgreSQL
    if (props.fullPage || props.enableSidebar) {
      await loadSavedFiles()
    }
  }
})

// Lifecycle hooks
let unregisterPreLogout = null

onMounted(async () => {
  // Register pre-logout flush to guarantee latest text is saved to PostgreSQL before logout
  unregisterPreLogout = registerPreLogoutHook(flushPendingSave)
  window.addEventListener('beforeunload', flushPendingSave)

  // Preload common dictionary chunks in background — makes first lookup instant
  preloadCommonChunks()

  // Initialize and restore saved files strictly for fullPage/sidebar editor
  if (props.fullPage || props.enableSidebar) {
    await loadSavedFiles()
    setTimeout(() => {
      if (editor.value && activeFile.value) {
        currentDocBackground.value = activeFile.value.backgroundImage || ''
        currentDocBackgroundMode.value = activeFile.value.backgroundMode || 'cover'
        currentDocBackgroundOpacity.value = activeFile.value.backgroundOpacity ?? 0.2
        setEditorTextSafely(activeFile.value.content || '')
      }
    }, 150)
  } else {
    // Home page editor: ensure clean empty editor
    savedFiles.value = []
    activeFileId.value = ''
    setEditorTextSafely('')
  }

  // Close dropdowns when clicking outside
  document.addEventListener('mousedown', (e) => {
    if (fontSelectorRef.value && !fontSelectorRef.value.contains(e.target)) {
      showFontDropdown.value = false
    }
    if (fontSizeRef.value && !fontSizeRef.value.contains(e.target)) {
      showFontSizeDropdown.value = false
    }
    if (downloadDropdownRef.value && !downloadDropdownRef.value.contains(e.target)) {
      showDownloadDropdown.value = false
    }
    if (textColorDropdownRef.value && !textColorDropdownRef.value.contains(e.target)) {
      showTextColorDropdown.value = false
    }
    if (highlightDropdownRef.value && !highlightDropdownRef.value.contains(e.target)) {
      showHighlightDropdown.value = false
    }
    if (bgDropdownRef.value && !bgDropdownRef.value.contains(e.target)) {
      showBgDropdown.value = false
    }
  })

  // Check for imported text from OCR or Audio tools
  const importedText = sessionStorage.getItem('usil_imported_text')
  if (importedText) {
    sessionStorage.removeItem('usil_imported_text')
    setTimeout(() => {
      if (editor.value) {
        const paragraphs = importedText.split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('')
        editor.value.commands.setContent(paragraphs || `<p>${importedText}</p>`)
      }
    }, 150)
  }

  setTimeout(() => {
    if (editor.value) {
      editor.value.commands.focus()
    }
  }, 100)
})

// Cleanup on unmount
onBeforeUnmount(() => {
  if (unregisterPreLogout) unregisterPreLogout()
  window.removeEventListener('beforeunload', flushPendingSave)
  if (editor.value) {
    editor.value.destroy()
  }
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;500;700&family=Noto+Serif+Tamil:wght@400;700&family=Catamaran:wght@400;600;700&family=Meera+Inimai&family=Mukta+Malar:wght@400;600&family=Arima+Madurai:wght@400;700&family=Baloo+Thambi+2:wght@400;700&family=Inter:wght@400;500;600&display=swap');

.tanglish-editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: 'Inter', 'Segoe UI', 'Noto Sans Tamil', sans-serif;
  background: var(--card-bg, #ffffff);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: none;
  border: 1px solid var(--card-border, #e0e0e0);
}

.tanglish-editor-container.embedded-editor {
  height: 520px;
  max-height: 520px;
}

.tanglish-editor-container.full-page-editor {
  display: flex;
  flex-direction: row;
  height: 100%;
  min-height: 0;
  flex: 1;
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
  gap: 14px;
  overflow: hidden;
}

/* Document Stage Panel (Right Side Workspace) */
.document-stage-panel {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.document-stage-panel.full-page-stage {
  background: #f1f3f6;
  border: 1px solid var(--card-border, #e2e8f0);
  border-radius: 16px;
  box-shadow: 0 4px 16px -2px rgba(0, 0, 0, 0.04);
}

.document-stage-panel.embedded-stage {
  background: var(--card-bg, #ffffff);
  height: 100%;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: var(--toolbar-bg, #ffffff);
  border-bottom: 1px solid var(--toolbar-border, #e0e0e0);
  flex-wrap: wrap;
  position: sticky;
  top: 0;
  z-index: 100;
  flex-shrink: 0;
}

/* Floating Sticky Toolbar (Full Page Mode) - Modern, Airy, Spacious & Unified */
.toolbar.floating-sticky-toolbar {
  position: sticky;
  top: 8px;
  z-index: 50;
  margin: 8px 10px 10px 10px;
  height: 44px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 12px;
  box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 4px -1px rgba(15, 23, 42, 0.03);
  padding: 0 8px;
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: nowrap;
  overflow: visible;
  box-sizing: border-box;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.toolbar.floating-sticky-toolbar:hover {
  box-shadow: 0 8px 26px -4px rgba(15, 23, 42, 0.08), 0 3px 8px -1px rgba(15, 23, 42, 0.04);
}

.toolbar.floating-sticky-toolbar .toolbar-group {
  display: inline-flex;
  align-items: center;
  gap: 1.5px;
  background: transparent;
  border: none;
  padding: 0;
  flex-shrink: 0;
}

.toolbar.floating-sticky-toolbar .toolbar-divider {
  display: block;
  width: 1px;
  height: 18px;
  background: #e2e8f0;
  margin: 0 3.5px;
  flex-shrink: 0;
}

.toolbar.floating-sticky-toolbar .toolbar-btn {
  min-width: 29px;
  height: 29px;
  padding: 0 4px;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 500;
  color: #475569;
  background: transparent;
  border: none;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.toolbar.floating-sticky-toolbar .toolbar-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.toolbar.floating-sticky-toolbar .toolbar-btn.active {
  background: #ede9fe;
  color: #4f46e5;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(79, 70, 229, 0.15);
}

.toolbar.floating-sticky-toolbar .toolbar-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.toolbar.floating-sticky-toolbar .font-selector-btn {
  height: 29px;
  padding: 0 7px;
  font-size: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  gap: 4px;
  color: #334155;
  font-weight: 500;
  max-width: 120px;
  transition: all 0.15s ease;
}

.toolbar.floating-sticky-toolbar .font-selector-btn .font-name {
  max-width: 68px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toolbar.floating-sticky-toolbar .font-selector-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #0f172a;
}

.toolbar.floating-sticky-toolbar .font-size-btn {
  height: 29px;
  padding: 0 6px;
  font-size: 11.5px;
  font-weight: 600;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #334155;
  transition: all 0.15s ease;
}

.toolbar.floating-sticky-toolbar .font-size-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #0f172a;
}

.toolbar.floating-sticky-toolbar .btn-files-toggle.compact {
  padding: 0 7px;
  font-size: 11px;
  height: 29px;
  border-radius: 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
}

.toolbar.floating-sticky-toolbar .btn-files-toggle.compact:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.toolbar.floating-sticky-toolbar .heading-btn {
  font-weight: 700;
  font-size: 11px;
  letter-spacing: -0.02em;
}

.toolbar.floating-sticky-toolbar .color-toolbar-btn,
.toolbar.floating-sticky-toolbar .highlight-toolbar-btn {
  min-width: 29px;
  height: 29px;
  padding: 2px 4px;
  gap: 2px;
}

.toolbar.floating-sticky-toolbar .image-upload-btn,
.toolbar.floating-sticky-toolbar .bg-toolbar-btn {
  min-width: 29px;
  height: 29px;
  padding: 0 5px;
  color: #475569;
}

.toolbar.floating-sticky-toolbar .image-upload-btn:hover,
.toolbar.floating-sticky-toolbar .bg-toolbar-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

/* Right Action Segment */
.toolbar.floating-sticky-toolbar .actions-tools-group {
  background: transparent;
  border: none;
  padding: 0;
  gap: 4px;
  flex-shrink: 0;
}

.toolbar.floating-sticky-toolbar .btn-clear {
  color: #64748b;
  font-weight: 500;
  padding: 0 7px;
  height: 29px;
  border-radius: 6px;
  background: transparent;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
}

.toolbar.floating-sticky-toolbar .btn-clear:hover {
  color: #ef4444;
  background: #fee2e2;
  border-color: #fca5a5;
}

.toolbar.floating-sticky-toolbar .btn-ai {
  background: #f5f3ff !important;
  color: #7c3aed !important;
  border: 1px solid #ddd6fe !important;
  font-weight: 600;
  padding: 0 8px;
  height: 29px;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(124, 58, 237, 0.08);
  font-size: 11.5px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.toolbar.floating-sticky-toolbar .btn-ai:hover {
  background: #ede9fe !important;
  border-color: #c4b5fd !important;
  box-shadow: 0 3px 8px rgba(124, 58, 237, 0.15);
}

.toolbar.floating-sticky-toolbar .btn-download {
  min-width: 29px;
  height: 29px;
  padding: 0 5px;
  border-radius: 6px;
  background: transparent !important;
  color: #475569 !important;
  border: 1px solid transparent !important;
  box-shadow: none !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.toolbar.floating-sticky-toolbar .btn-download:hover {
  background: #f1f5f9 !important;
  color: #0f172a !important;
  border-color: transparent !important;
}

.toolbar.floating-sticky-toolbar .btn-download.active {
  background: #ede9fe !important;
  color: #4f46e5 !important;
  border-color: #ddd6fe !important;
}

.toolbar.floating-sticky-toolbar .download-dropdown-menu {
  right: 0;
  left: auto;
}

.toolbar-group {
  display: flex;
  gap: 2px;
  align-items: center;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: var(--toolbar-border, #ddd);
  margin: 0 6px;
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border: none;
  border-radius: 6px;
  background: var(--toolbar-btn-bg, transparent);
  color: var(--text-sub, #444);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.toolbar-btn:hover {
  background: var(--toolbar-btn-hover, #f0f0f0);
  color: var(--text-main, #111);
}

.toolbar-btn.active {
  background: var(--toolbar-btn-active, #4f46e5);
  color: #ffffff;
}

.toolbar-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* Download Dropdown */
.download-dropdown-wrapper {
  position: relative;
  display: inline-block;
}

/* Home Page Download Button with Label */
.btn-download-home {
  background: var(--toolbar-btn-bg, #f8fafc) !important;
  color: var(--text-main, #1e293b) !important;
  border: 1px solid var(--toolbar-border, #e2e8f0) !important;
  font-weight: 600 !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 7px !important;
  padding: 5px 12px !important;
  border-radius: 8px !important;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.btn-download-home:hover {
  background: var(--toolbar-btn-hover, #f1f5f9) !important;
  border-color: #5b92f7 !important;
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(91, 146, 247, 0.22);
}

.btn-download-home .download-svg-icon {
  width: 17px;
  height: 17px;
  color: #5b92f7;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.btn-download-home:hover .download-svg-icon {
  transform: translateY(1px);
}

.btn-download-home .download-btn-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main, #1e293b);
}

.download-svg-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.toolbar-btn:hover .download-svg-icon {
  transform: translateY(1px);
}

.download-dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  left: auto;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--card-inner-border, #e2e8f0);
  border-radius: 12px;
  box-shadow: 0 12px 30px -4px rgba(15, 23, 42, 0.12), 0 4px 10px -2px rgba(15, 23, 42, 0.05);
  min-width: 240px;
  max-width: 280px;
  z-index: 1000;
  padding: 6px;
  display: flex;
  flex-direction: column;
  animation: fadeInMenu 0.15s ease;
}

.dropdown-menu-header {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
  padding: 6px 10px 4px 10px;
}

.download-options-scroll {
  max-height: 250px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-right: 2px;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.download-options-scroll::-webkit-scrollbar {
  width: 4px;
}

.download-options-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.download-options-scroll::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.download-options-scroll::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.download-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px 10px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
  color: var(--text-main, #1e293b);
}

.download-menu-item:hover {
  background: #f8fafc;
}

.item-icon-badge {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.docx-badge {
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
}

.download-menu-item:hover .docx-badge {
  background: #2563eb;
  color: #ffffff;
  transform: scale(1.05);
}

.txt-badge {
  background: rgba(100, 116, 139, 0.12);
  color: #475569;
}

.download-menu-item:hover .txt-badge {
  background: #475569;
  color: #ffffff;
  transform: scale(1.05);
}

.pdf-badge {
  background: rgba(225, 29, 72, 0.1);
  color: #e11d48;
}

.download-menu-item:hover .pdf-badge {
  background: #e11d48;
  color: #ffffff;
  transform: scale(1.05);
}

.download-menu-item:hover .item-icon-badge {
  background: #5b92f7;
  color: #ffffff;
  transform: scale(1.04);
}

.format-download-svg {
  width: 17px;
  height: 17px;
  color: inherit;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main, #1e293b);
}

.item-desc {
  font-size: 11px;
  color: var(--text-muted, #64748b);
}

.toolbar-stats {
  margin-left: auto;
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-muted, #999);
  font-weight: 500;
}

/* Color & Highlight Toolbar Buttons */
.color-picker-wrapper,
.bg-picker-wrapper {
  position: relative;
  display: inline-block;
}

.color-toolbar-btn {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 3px 8px;
  min-width: 32px;
  height: 32px;
}

.color-text-sample {
  font-weight: 800;
  font-size: 14px;
  line-height: 1;
}

.color-underline-bar {
  width: 16px;
  height: 3px;
  border-radius: 2px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

.highlight-toolbar-btn {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 3px 8px;
  min-width: 32px;
  height: 32px;
}

.highlight-tool-icon {
  font-size: 13px;
  line-height: 1;
}

.image-upload-btn,
.bg-toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  font-weight: 500;
}

.bg-active-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #4f46e5;
  box-shadow: 0 0 0 2px #c7d2fe;
}

.btn-text-span {
  font-size: 12px;
  font-weight: 500;
}

.toolbar-icon-span {
  font-size: 14px;
  line-height: 1;
}

/* Color & Highlight Dropdown Menus */
.color-dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 100;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
  min-width: 190px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: fadeInMenu 0.15s ease;
}

.dropdown-menu-header {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
  margin-bottom: 2px;
}

.color-swatch-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
}

.color-swatch-circle {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid #ffffff;
  box-shadow: 0 0 0 1px #cbd5e1;
  cursor: pointer;
  padding: 0;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.color-swatch-circle:hover {
  transform: scale(1.15);
  box-shadow: 0 0 0 2px #6366f1;
}

.color-swatch-circle.active {
  box-shadow: 0 0 0 2px #4f46e5, 0 2px 4px rgba(79, 70, 229, 0.3);
}

.custom-color-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px solid #f1f5f9;
}

.custom-color-label {
  font-size: 12px;
  color: #475569;
  font-weight: 500;
}

.native-color-picker {
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: transparent;
}

.color-reset-action {
  margin-left: auto;
  background: #f1f5f9;
  color: #475569;
  border: none;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.color-reset-action:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.color-reset-action.full-width {
  width: 100%;
  margin-left: 0;
  padding: 6px;
  text-align: center;
}

/* Background Dropdown Menu */
.bg-dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 100;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 14px 30px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
  width: 250px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: fadeInMenu 0.15s ease;
}

.bg-upload-main-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #4f46e5;
  cursor: pointer;
  transition: all 0.15s ease;
}

.bg-upload-main-btn:hover {
  background: #eff6ff;
  border-color: #6366f1;
}

.bg-preset-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
  margin-top: 2px;
}

.bg-preset-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.bg-preset-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.bg-preset-chip:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.bg-preset-chip.active {
  background: #eef2ff;
  border-color: #6366f1;
  color: #4f46e5;
  font-weight: 600;
}

.preset-icon {
  font-size: 13px;
}

.preset-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bg-opacity-control {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.opacity-label-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
}

.opacity-val-badge {
  color: #4f46e5;
  font-weight: 700;
}

.bg-range-slider {
  width: 100%;
  accent-color: #4f46e5;
  cursor: pointer;
}

/* Editor Area */
.editor-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--card-inner-bg, #ffffff);
  overflow: hidden;
  min-height: 0;
  height: 100%;
}

/* A4 Desk Canvas (Scrollable Document Workspace) */
.editor-wrapper.a4-desk-canvas {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px 24px 60px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  scroll-behavior: smooth;
  background: transparent;
}

/* A4 Document Sheet (Authentic A4 Paper dimensions, margins & shadow) */
.a4-document-sheet {
  width: 100%;
  max-width: 816px; /* Standard A4 page width at 96 DPI: 8.5in = 816px */
  min-height: 1056px; /* Standard A4 page height at 96 DPI: 11in = 1056px */
  margin: 6px auto 40px auto;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.04),
    0 12px 32px -4px rgba(0, 0, 0, 0.08),
    0 0 0 1px rgba(0, 0, 0, 0.02);
  padding: 64px 72px; /* Standard 1-inch printable margins */
  box-sizing: border-box;
  position: relative;
  transition: box-shadow 0.2s ease;
  flex-shrink: 0;
}

.a4-document-sheet:hover {
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.04),
    0 16px 36px -4px rgba(0, 0, 0, 0.11),
    0 0 0 1px rgba(0, 0, 0, 0.03);
}

.embedded-sheet {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.editor-background-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  transition: opacity 0.2s ease, background 0.3s ease;
  border-radius: inherit;
}

.editor-content {
  position: relative;
  z-index: 1;
  background: transparent;
  flex: 1;
  padding: 32px 40px;
  font-size: 17px;
  line-height: 1.8;
  overflow-y: auto;
  color: var(--text-main, #111);
  min-height: 0;
}

/* Inside A4 Document Sheet */
.editor-content.a4-editor-content {
  padding: 0;
  min-height: 920px;
  font-size: 16.5px;
  line-height: 1.85;
  color: var(--text-main, #0f172a);
  overflow: visible;
}

@media (max-width: 900px) {
  .a4-document-sheet {
    max-width: 100%;
    min-height: 550px;
    padding: 32px 20px;
    margin: 4px auto 20px auto;
    border-radius: 8px;
  }
  .toolbar.floating-sticky-toolbar {
    margin: 6px 8px 4px 8px;
  }
}

.editor-content :deep(.editor-embedded-image) {
  display: block;
  max-width: 100%;
  max-height: 520px;
  object-fit: contain;
  margin: 16px auto;
  border-radius: 8px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
  transition: transform 0.15s ease, box-shadow 0.15s ease, outline 0.15s ease;
  cursor: pointer;
  user-select: all;
}

.editor-content :deep(.editor-embedded-image:hover) {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.14);
  outline: 2px dashed #818cf8;
  outline-offset: 3px;
}

/* Floating Image Action Overlay */
.image-action-overlay {
  position: absolute;
  z-index: 120;
  display: flex;
  align-items: center;
  gap: 6px;
  background: #1e293b;
  color: #f8fafc;
  padding: 5px 10px;
  border-radius: 10px;
  box-shadow: 0 8px 24px -2px rgba(0, 0, 0, 0.25), 0 2px 6px rgba(0, 0, 0, 0.15);
  animation: fadeInImageBar 0.15s ease;
  font-family: 'Inter', sans-serif;
  user-select: none;
}

@keyframes fadeInImageBar {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.img-tool-group {
  display: flex;
  align-items: center;
  gap: 3px;
}

.img-tool-label {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  margin-right: 2px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.img-tool-btn {
  background: rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.12s ease;
}

.img-tool-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.img-tool-btn.active {
  background: #6366f1;
  border-color: #818cf8;
  color: #ffffff;
  font-weight: 600;
}

.img-tool-sep {
  width: 1px;
  height: 16px;
  background: rgba(255, 255, 255, 0.2);
  margin: 0 4px;
}

.delete-img-btn {
  background: rgba(239, 68, 68, 0.25) !important;
  color: #fca5a5 !important;
  border-color: rgba(239, 68, 68, 0.4) !important;
  font-weight: 600;
}

.delete-img-btn:hover {
  background: #ef4444 !important;
  color: #ffffff !important;
}

.close-img-btn {
  padding: 3px 6px;
  font-size: 12px;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
}

.close-img-btn:hover {
  color: #ffffff;
}

.editor-content :deep(mark) {
  background-color: #fef08a;
  padding: 1px 4px;
  border-radius: 3px;
  color: inherit;
}

.editor-content :deep(.tiptap) {
  outline: none;
  min-height: 100%;
  color: var(--text-main, #111);
}

.editor-content :deep(p) {
  margin: 0 0 0.8em 0;
  color: var(--text-main, #111);
}

.editor-content :deep(h1) {
  font-size: 2em;
  font-weight: 700;
  margin: 0 0 0.5em 0;
  color: var(--text-main, #1a1a2e);
}

.editor-content :deep(h2) {
  font-size: 1.5em;
  font-weight: 600;
  margin: 0 0 0.5em 0;
  color: var(--text-main, #1a1a2e);
}

.editor-content :deep(h3) {
  font-size: 1.25em;
  font-weight: 600;
  margin: 0 0 0.5em 0;
  color: var(--text-main, #1a1a2e);
}

.editor-content :deep(blockquote) {
  border-left: 4px solid #6c47ff;
  padding-left: 16px;
  margin: 0.8em 0;
  color: var(--text-sub, #555);
  font-style: italic;
}

.editor-content :deep(code) {
  background: var(--toolbar-btn-bg, #f0edff);
  color: #a855f7;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
  font-family: monospace;
}

.editor-content :deep(ul),
.editor-content :deep(ol) {
  padding-left: 24px;
  margin: 0.5em 0;
}

.editor-content :deep(li) {
  margin: 0.2em 0;
}

.editor-content :deep(hr) {
  border: none;
  border-top: 1px solid var(--card-border, #eee);
  margin: 1.5em 0;
}

.editor-content :deep(s) {
  text-decoration: line-through;
  color: var(--text-muted, #999);
}

.editor-content :deep(.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: var(--text-muted, #bbb);
  pointer-events: none;
  height: 0;
  font-style: italic;
}

/* Suggestions Popup */
.suggestions-popup {
  position: absolute;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.14);
  z-index: 1000;
  min-width: 220px;
  max-width: 300px;
  max-height: 320px;
  overflow-y: auto;
  transition: opacity 0.1s ease;
}

.suggestion-item {
  padding: 10px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 14px;
  border-bottom: 1px solid #f5f5f5;
  transition: background 0.1s;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:first-child {
  border-radius: 12px 12px 0 0;
  background: #1a1a2e;
  color: #fff;
}

.suggestion-item:first-child .tamil-text-main {
  color: #fff;
  font-size: 18px;
}

.suggestion-item:first-child:hover {
  background: #2d2d4e;
}

.suggestion-item:not(:first-child):hover,
.suggestion-item:not(:first-child).selected {
  background: #f5f3ff;
}

.suggestion-item.selected:first-child {
  background: #1a1a2e;
}

.tamil-text-main {
  font-family: 'Noto Sans Tamil', sans-serif;
  font-size: 17px;
  font-weight: 500;
  color: #1a1a2e;
  flex: 1;
}

.suggestion-space-hint {
  font-size: 10px;
  color: #aaa;
  background: #f0f0f0;
  padding: 1px 6px;
  border-radius: 4px;
  font-family: 'Inter', sans-serif;
  letter-spacing: 0.03em;
}

.suggestion-item:first-child .suggestion-space-hint {
  background: rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.7);
}


/* ── Documents Sidebar Toggle Button (Toolbar) ── */
.btn-files-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--toolbar-btn-bg, #ffffff);
  border: 1px solid var(--toolbar-border, #e2e8f0);
  border-radius: 8px;
  padding: 5px 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main, #0f172a);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-files-toggle:hover {
  background: var(--toolbar-btn-hover, #f1f5f9);
}

.btn-files-toggle.active {
  background: #ecfdf5;
  border-color: #a7f3d0;
  color: #047857;
}

.files-toggle-icon {
  font-size: 14px;
}

.files-btn-title {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.files-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 6px;
  background: #d1fae5;
  color: #065f46;
  border-radius: 10px;
}

/* ── Editor Workspace (Files Left + Editor Center + AI Right) ── */
.editor-workspace {
  display: flex;
  flex-direction: row;
  flex: 1;
  min-height: 0;
  height: 100%;
  position: relative;
  background: var(--card-inner-bg, #ffffff);
  overflow: hidden;
}

.editor-workspace.with-sidebar .editor-wrapper {
  border-right: 1px solid var(--card-border, #e2e8f0);
}

.editor-workspace.with-files-sidebar .editor-wrapper {
  border-left: 1px solid var(--card-border, #e2e8f0);
}

.editor-workspace.is-full-page {
  height: 100%;
  min-height: 0;
}

/* ── Bottom Action Bar (Image 3: Desh Tamil Keyboard layout) ── */
.editor-bottom-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: #f8fafc;
  border-top: 1px solid var(--card-border, #e2e8f0);
  gap: 14px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.editor-bottom-bar.full-page-dock {
  position: sticky;
  bottom: 12px;
  margin: 0 auto;
  max-width: fit-content;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 9999px;
  box-shadow: 0 10px 25px -4px rgba(0, 0, 0, 0.1), 0 2px 6px -1px rgba(0, 0, 0, 0.04);
  padding: 6px 18px;
  gap: 16px;
  z-index: 40;
}

/* Zoom Controls Dock */
.zoom-controls-dock {
  display: inline-flex;
  align-items: center;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 9999px;
  padding: 2px 4px;
  gap: 2px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.zoom-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #475569;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s ease;
  line-height: 1;
}

.zoom-btn:hover:not(:disabled) {
  background: #f1f5f9;
  color: #0f172a;
}

.zoom-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.zoom-value-btn {
  border: none;
  background: transparent;
  padding: 2px 6px;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  border-radius: 4px;
  min-width: 44px;
  text-align: center;
}

.zoom-value-btn:hover {
  background: #f1f5f9;
}

.engine-mode-pill {
  display: inline-flex;
  align-items: center;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 9999px;
  padding: 3px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.mode-btn {
  padding: 5px 14px;
  border: none;
  background: transparent;
  font-size: 13.5px;
  font-weight: 600;
  color: #64748b;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mode-btn.active {
  background: #10b981;
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.35);
}

.bottom-stats-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

.stats-sep {
  color: #cbd5e1;
}

.bottom-tools-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bottom-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.bottom-action-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #0f172a;
}

.bottom-action-btn.voice-listening {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #dc2626;
  animation: pulseVoice 1.2s infinite;
}

@keyframes pulseVoice {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  50% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
}

.bottom-action-btn.copy-btn.copied {
  background: #dcfce7;
  border-color: #86efac;
  color: #15803d;
}

/* ── Files Sidebar (Left Standalone Panel) ── */
.files-sidebar {
  width: 250px;
  flex-shrink: 0;
  background: var(--card-bg, #ffffff);
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--card-border, #e2e8f0);
  height: 100%;
  animation: slideFilesSidebar 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
  user-select: none;
}

.files-sidebar.full-page-sidebar {
  width: 280px !important;
  background: #ffffff;
  border: 1px solid var(--card-border, #e2e8f0);
  border-radius: 16px;
  box-shadow: 0 4px 16px -2px rgba(0, 0, 0, 0.04);
  height: 100%;
  border-right: 1px solid var(--card-border, #e2e8f0);
}

.files-sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px 16px;
  border-bottom: 1px solid #f1f5f9;
}

.files-sidebar-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.files-folder-icon {
  font-size: 16px;
}

.files-sidebar-heading {
  font-size: 13.5px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.01em;
}

.files-count-badge {
  font-size: 11px;
  font-weight: 700;
  color: #166534;
  background: #dcfce7;
  padding: 1px 7px;
  border-radius: 10px;
}

.files-count-badge.at-limit {
  background: #fee2e2;
  color: #b91c1c;
}

.files-sidebar-collapse-btn {
  background: #f1f5f9;
  border: none;
  border-radius: 6px;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: #64748b;
  cursor: pointer;
  line-height: 1;
  transition: all 0.15s ease;
}

.files-sidebar-collapse-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

@keyframes slideFilesSidebar {
  from { opacity: 0; transform: translateX(-15px); }
  to { opacity: 1; transform: translateX(0); }
}

.files-sidebar-top {
  padding: 16px 14px 10px 14px;
}

/* New File Button (Exact look & feel from screenshot) */
.new-file-main-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: transparent;
  border: 1px dashed transparent;
  border-radius: 10px;
  color: #15803d;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s ease;
  outline: none;
}

.new-file-main-btn:hover:not(:disabled) {
  background: #f0fdf4;
  border-color: #86efac;
  transform: translateY(-1px);
}

.new-file-main-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  color: #94a3b8;
}

.plus-symbol {
  font-size: 20px;
  font-weight: 800;
  color: #16a34a;
  line-height: 1;
}

.new-file-label {
  flex: 1;
  text-align: left;
  letter-spacing: -0.01em;
}

.file-count-badge {
  font-size: 11px;
  font-weight: 700;
  color: #15803d;
  background: #dcfce7;
  padding: 2px 7px;
  border-radius: 10px;
}

.file-count-badge.at-limit {
  background: #fee2e2;
  color: #b91c1c;
}

.files-sync-status-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 0 10px;
  font-size: 11px;
  font-weight: 500;
  color: #64748b;
}

.sync-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  display: inline-block;
  transition: all 0.2s ease;
}

.sync-dot.syncing {
  background: #3b82f6;
  box-shadow: 0 0 6px rgba(59, 130, 246, 0.6);
  animation: pulseSync 1s infinite alternate;
}

.sync-dot.error {
  background: #f59e0b;
}

@keyframes pulseSync {
  from { opacity: 0.4; transform: scale(0.85); }
  to { opacity: 1; transform: scale(1.15); }
}

.sync-status-text {
  font-size: 10.5px;
  letter-spacing: -0.01em;
}

/* Files Scroll Area */
.files-scroll-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 12px 14px 12px;
}

.file-group-section {
  margin-top: 14px;
}

.group-header-label {
  font-size: 12.5px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 8px;
  padding-left: 8px;
  letter-spacing: -0.01em;
}

.group-items-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* File Item Card (Matching user screenshot green pill card) */
.file-item-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 12px;
  background: transparent;
  color: var(--text-main, #1e293b);
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
}

.file-item-card:hover {
  background: rgba(0, 0, 0, 0.04);
}

/* Active File Card - Soft Sage/Pastel Green like Screenshot */
.file-item-card.active {
  background: #dcfce7 !important;
  color: #166534 !important;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(22, 101, 52, 0.08);
}

.file-item-main {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.file-item-title {
  display: block;
  font-size: 14.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.file-rename-input {
  width: 100%;
  padding: 2px 6px;
  font-size: 14px;
  font-weight: 600;
  background: #ffffff;
  border: 1px solid #16a34a;
  border-radius: 6px;
  color: #166534;
  outline: none;
}

.file-item-actions {
  display: flex;
  align-items: center;
  gap: 3px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.file-item-card:hover .file-item-actions,
.file-item-card.active .file-item-actions {
  opacity: 1;
}

.file-action-icon-btn {
  background: transparent;
  border: none;
  font-size: 13px;
  color: inherit;
  opacity: 0.65;
  padding: 4px;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s;
}

.file-action-icon-btn:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.08);
}

.file-action-icon-btn.delete-btn {
  color: #64748b;
}

.file-action-icon-btn.delete-btn:hover {
  color: #ef4444;
  background: #fee2e2;
  opacity: 1;
}

/* ── AI Assistant Sidebar (Right Pane matching screenshot) ── */
.ai-assistant-sidebar {
  width: 360px;
  flex-shrink: 0;
  background: var(--card-bg, #ffffff);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
  animation: slideSidebar 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideSidebar {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

/* Sidebar Header */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px 10px;
  border-bottom: 1px solid var(--card-inner-border, #f1f5f9);
}

.sidebar-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar-spark-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main, #0f172a);
  letter-spacing: -0.01em;
}

.sidebar-close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted, #94a3b8);
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.sidebar-close-btn:hover {
  background: var(--toolbar-btn-hover, #f1f5f9);
  color: var(--text-main, #0f172a);
}

/* Mode Switcher */
.sidebar-mode-section {
  padding: 12px 18px 8px;
}

.mode-toggle-pill {
  display: flex;
  background: var(--toolbar-bg, #f1f5f9);
  border: 1px solid var(--card-inner-border, #e2e8f0);
  border-radius: 10px;
  padding: 3px;
  gap: 3px;
}

.mode-pill-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 7px 12px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-sub, #64748b);
  border-radius: 7px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.mode-pill-btn.active {
  background: var(--card-bg, #ffffff);
  color: var(--accent-indigo, #6366f1);
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.mode-timing-hint {
  font-size: 11px;
  color: var(--text-muted, #94a3b8);
  margin-top: 6px;
  padding-left: 2px;
}

/* Manual Scan Box */
.manual-scan-box {
  padding: 0 18px 8px;
}

.btn-manual-scan {
  width: 100%;
  padding: 8px 14px;
  background: linear-gradient(135deg, var(--accent-indigo, #6366f1), var(--accent-purple, #8b5cf6));
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.25);
}

.btn-manual-scan:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(99, 102, 241, 0.35);
}

.btn-manual-scan:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* Issues Status Bar */
.issues-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  border-top: 1px solid var(--card-inner-border, #f1f5f9);
}

.issue-count-label {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-sub, #475569);
}

.issues-spinner-circle {
  width: 13px;
  height: 13px;
  border: 2px solid var(--accent-indigo, #6366f1);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.bulk-actions-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-fix-all {
  background: var(--btn-primary-bg, #4f46e5);
  color: #ffffff;
  border: none;
  border-radius: 16px;
  padding: 4px 14px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-fix-all:hover {
  background: var(--btn-primary-hover, #4338ca);
  box-shadow: 0 2px 6px rgba(79, 70, 229, 0.3);
}

.btn-dismiss-all {
  background: transparent;
  border: 1px solid var(--card-border, #e2e8f0);
  color: var(--text-sub, #64748b);
  border-radius: 16px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-dismiss-all:hover {
  background: var(--toolbar-btn-hover, #f8fafc);
  color: var(--text-main, #0f172a);
}

/* Scroll Area for Cards */
.issues-scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 4px 18px 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.no-issues-placeholder {
  text-align: center;
  padding: 40px 16px;
  color: var(--text-muted, #94a3b8);
}

.no-issues-check-icon {
  width: 44px;
  height: 44px;
  margin: 0 auto 12px;
  background: #ecfdf5;
  color: #10b981;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
}

.no-issues-main-msg {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main, #0f172a);
  margin-bottom: 4px;
}

.no-issues-sub-msg {
  font-size: 12px;
  color: var(--text-muted, #64748b);
}

.credit-limit-sidebar-card {
  text-align: center;
  padding: 32px 18px;
  background: var(--card-inner-bg, #f8fafc);
  border: 1px dashed var(--credits-border, rgba(99, 102, 241, 0.3));
  border-radius: 12px;
  margin: 10px 0;
}

.limit-card-icon {
  font-size: 26px;
  margin-bottom: 8px;
}

.limit-card-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main, #0f172a);
  margin-bottom: 6px;
}

.limit-card-desc {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-sub, #64748b);
}

/* ── Individual Issue Card (Matches screenshot) ── */
.issue-card {
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--card-border, #e2e8f0);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.18s ease;
}

.issue-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.issue-card-top {
  margin-bottom: 10px;
}

.issue-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 12px;
  letter-spacing: 0.02em;
}

.issue-badge.clarity {
  background: #ecfdf5;
  color: #059669;
}

.issue-badge.grammar {
  background: #fef3c7;
  color: #d97706;
}

.issue-badge.spelling {
  background: #e0f2fe;
  color: #0284c7;
}

.issue-badge.tense {
  background: #fee2e2;
  color: #dc2626;
}

.issue-diff-box {
  margin-bottom: 10px;
}

.diff-original-row {
  margin-bottom: 6px;
}

.original-strikethrough-tag {
  display: inline-block;
  background: #fef2f2;
  color: #dc2626;
  font-weight: 600;
  font-size: 14px;
  padding: 3px 8px;
  border-radius: 5px;
  line-height: 1.4;
}

.original-strikethrough-tag s {
  text-decoration-thickness: 1.5px;
}

.diff-corrected-row {
  color: #16a34a;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.4;
}

.issue-explanation-desc {
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--text-sub, #475569);
  margin-bottom: 14px;
}

.issue-card-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-apply-card {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--btn-primary-bg, #4f46e5);
  color: #ffffff;
  border: none;
  border-radius: 16px;
  padding: 5px 18px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-apply-card:hover {
  background: var(--btn-primary-hover, #4338ca);
  box-shadow: 0 2px 6px rgba(79, 70, 229, 0.35);
}

.btn-dismiss-card {
  background: transparent;
  border: 1px solid var(--card-border, #e2e8f0);
  color: var(--text-sub, #64748b);
  border-radius: 16px;
  padding: 5px 14px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-dismiss-card:hover {
  background: var(--toolbar-btn-hover, #f8fafc);
  color: var(--text-main, #0f172a);
}

/* ── Quick Actions at Sidebar Bottom ── */
.sidebar-quick-actions {
  padding: 14px 18px 16px;
  border-top: 1px solid var(--card-border, #e2e8f0);
  background: var(--card-bg, #ffffff);
}

.quick-actions-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted, #94a3b8);
  margin-bottom: 10px;
  letter-spacing: -0.01em;
}

.quick-actions-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.quick-action-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
  color: var(--text-sub, #475569);
}

.quick-action-item:hover {
  background: var(--toolbar-btn-hover, #f1f5f9);
  color: var(--text-main, #0f172a);
}

.quick-action-symbol {
  font-size: 14px;
  width: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted, #64748b);
}

.quick-action-text {
  font-size: 13px;
  font-weight: 500;
}

/* ── Quick Action Modal ── */
.quick-action-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 16px;
}

.quick-action-modal {
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--card-border, #e2e8f0);
  border-radius: 14px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalPop {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.qa-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--card-inner-border, #e2e8f0);
}

.qa-modal-header h3 {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main, #0f172a);
}

.qa-close-btn {
  background: transparent;
  border: none;
  font-size: 16px;
  color: var(--text-muted, #94a3b8);
  cursor: pointer;
  padding: 4px;
}

.qa-modal-body {
  padding: 18px;
  max-height: 320px;
  overflow-y: auto;
}

.qa-loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  color: var(--text-sub, #64748b);
  font-size: 13.5px;
}

.qa-content-text {
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-main, #0f172a);
}

.qa-modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 18px;
  border-top: 1px solid var(--card-inner-border, #e2e8f0);
  background: var(--toolbar-bg, #f8fafc);
}

.qa-btn-copy, .qa-btn-insert {
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.qa-btn-copy {
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--card-border, #cbd5e1);
  color: var(--text-main, #0f172a);
}

.qa-btn-insert {
  background: #ea580c;
  border: none;
  color: #ffffff;
}

.qa-btn-done {
  padding: 6px 14px;
  background: transparent;
  border: none;
  color: var(--text-muted, #64748b);
  font-size: 12.5px;
  cursor: pointer;
}

@media (max-width: 900px) {
  .editor-workspace {
    flex-direction: column;
  }
  .ai-assistant-sidebar {
    width: 100%;
    max-width: 100%;
    height: 380px;
    border-left: none;
    border-top: 1px solid var(--card-border, #e2e8f0);
  }
}

/* Scrollbar Styling */
.editor-content::-webkit-scrollbar,
.suggestions-popup::-webkit-scrollbar,
.issues-scroll-area::-webkit-scrollbar {
  width: 7px;
  height: 7px;
}

.editor-content::-webkit-scrollbar-track,
.suggestions-popup::-webkit-scrollbar-track,
.issues-scroll-area::-webkit-scrollbar-track {
  background: var(--card-inner-bg, #f1f1f1);
  border-radius: 4px;
}

.editor-content::-webkit-scrollbar-thumb,
.suggestions-popup::-webkit-scrollbar-thumb,
.issues-scroll-area::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb, #cbd5e1);
  border-radius: 4px;
}

.editor-content::-webkit-scrollbar-thumb:hover,
.suggestions-popup::-webkit-scrollbar-thumb:hover,
.ai-panel-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* ── Action Buttons (Convert All, Clear, AI Help, Voice) — Ghost/Transparent Style ── */
.toolbar-btn.btn-convert,
.toolbar-btn.btn-clear,
.toolbar-btn.btn-ai,
.toolbar-btn.btn-voice {
  background: transparent;
  color: #555;
  border: 1.5px solid rgba(0, 0, 0, 0.18);
  font-weight: 600;
  padding: 0 14px;
  font-size: 12px;
  border-radius: 8px;
  transition: background 0.18s, color 0.18s, border-color 0.18s, box-shadow 0.18s;
  backdrop-filter: blur(4px);
}

.toolbar-btn.btn-convert:hover {
  background: rgba(102, 126, 234, 0.10);
  color: #5a6fd6;
  border-color: #7c8ef0;
}

.toolbar-btn.btn-clear:hover {
  background: rgba(231, 76, 60, 0.09);
  color: #e74c3c;
  border-color: #e74c3c;
}

.toolbar-btn.btn-ai {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.10), rgba(168, 85, 247, 0.08)) !important;
  border: 1px solid rgba(99, 102, 241, 0.35) !important;
  color: var(--accent-indigo, #6366f1) !important;
  font-weight: 600 !important;
  border-radius: 8px !important;
  padding: 6px 14px !important;
  box-shadow: 0 1px 3px rgba(99, 102, 241, 0.08);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.toolbar-btn.btn-ai:hover {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(168, 85, 247, 0.15)) !important;
  border-color: rgba(99, 102, 241, 0.6) !important;
  color: #4f46e5 !important;
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(99, 102, 241, 0.16);
}

.toolbar-btn.btn-ai.active {
  background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
  border-color: transparent !important;
  color: #ffffff !important;
  box-shadow: 0 3px 10px rgba(99, 102, 241, 0.32);
}

.grammar-sparkle-svg {
  flex-shrink: 0;
  transition: transform 0.22s ease;
}

.toolbar-btn.btn-ai:hover .grammar-sparkle-svg {
  transform: scale(1.18) rotate(6deg);
}

.toolbar-btn.btn-voice {
  min-width: 80px;
}
.toolbar-btn.btn-voice:hover {
  background: rgba(29, 185, 84, 0.10);
  color: #1db954;
  border-color: #1db954;
}
.toolbar-btn.btn-voice.active {
  background: rgba(231, 76, 60, 0.10);
  color: #e74c3c;
  border-color: #e74c3c;
  animation: voicePulseBtn 1.5s ease-in-out infinite;
}
.toolbar-btn.btn-voice.voice-error {
  background: rgba(230, 126, 34, 0.10);
  color: #e67e22;
  border-color: #e67e22;
}

@keyframes voicePulseBtn {
  0%, 100% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.5); }
  50%       { box-shadow: 0 0 0 6px rgba(231, 76, 60, 0); }
}

.voice-live {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mic-pulse {
  width: 8px; height: 8px;
  background: #fff;
  border-radius: 50%;
  animation: micBlink 0.8s ease-in-out infinite;
}
@keyframes micBlink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.2; }
}

/* ── Voice Status Bar ── */
.voice-status-bar {
  background: linear-gradient(90deg, #1db954 0%, #17a349 100%);
  color: #fff;
  padding: 8px 20px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: background 0.3s;
}
.voice-status-bar.error {
  background: linear-gradient(90deg, #e74c3c 0%, #c0392b 100%);
}

.voice-status-inner {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.voice-interim {
  font-style: italic;
  opacity: 0.85;
  background: rgba(0,0,0,0.15);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Sound wave animation */
.voice-waves {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 20px;
}
.voice-waves span {
  display: inline-block;
  width: 3px;
  background: rgba(255,255,255,0.9);
  border-radius: 2px;
  animation: wave 1s ease-in-out infinite;
}
.voice-waves span:nth-child(1) { height: 6px;  animation-delay: 0s; }
.voice-waves span:nth-child(2) { height: 14px; animation-delay: 0.1s; }
.voice-waves span:nth-child(3) { height: 20px; animation-delay: 0.2s; }
.voice-waves span:nth-child(4) { height: 14px; animation-delay: 0.3s; }
.voice-waves span:nth-child(5) { height: 6px;  animation-delay: 0.4s; }

@keyframes wave {
  0%, 100% { transform: scaleY(0.4); }
  50%       { transform: scaleY(1); }
}

.voice-error-inner {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  justify-content: space-between;
}
.dismiss-error {
  background: rgba(255,255,255,0.2);
  border: none;
  color: white;
  border-radius: 50%;
  width: 22px; height: 22px;
  cursor: pointer;
  font-size: 13px;
  display: flex; align-items: center; justify-content: center;
}
.dismiss-error:hover { background: rgba(255,255,255,0.35); }


/* ── Font Selector ── */
.toolbar-font-selector {
  position: relative;
  margin-left: 4px;
}

.font-selector-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 10px;
  border: 1.5px solid rgba(0,0,0,0.15);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
  color: #444;
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;
  max-width: 160px;
}
.font-selector-btn:hover {
  background: #f0f0f0;
  border-color: #bbb;
}

.font-preview {
  font-family: 'Noto Sans Tamil', sans-serif;
  font-size: 15px;
  color: #6c47ff;
}

.font-name {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11.5px;
  color: #555;
}

.font-caret {
  font-size: 10px;
  color: #999;
  margin-left: 2px;
}

.font-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.13);
  z-index: 2000;
  min-width: 220px;
  max-height: 340px;
  overflow-y: auto;
  padding: 6px 0;
}

.font-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 16px;
  cursor: pointer;
  transition: background 0.12s;
}
.font-option:hover {
  background: #f5f3ff;
}
.font-option.active {
  background: #ede9ff;
}

.font-sample {
  font-size: 18px;
  color: #1a1a2e;
  min-width: 52px;
  letter-spacing: 2px;
}

.font-label {
  font-size: 12px;
  color: #666;
  font-family: 'Inter', sans-serif;
}

/* ── Font Size Controls ── */
.font-size-wrapper {
  position: relative;
}

.font-size-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 62px;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.font-size-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 500;
  background: #fff;
  border: 1.5px solid rgba(108,71,255,0.2);
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.13);
  padding: 5px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px;
  min-width: 130px;
  max-height: 280px;
  overflow-y: auto;
}

.font-size-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.13s;
  color: #333;
}
.font-size-option:hover  { background: #f0edff; }
.font-size-option.active { background: #6c47ff; color: #fff; }
.font-size-option.active .size-label { color: #fff; }

.size-label {
  font-size: 11px;
  color: #666;
  font-family: 'Inter', sans-serif;
}
/* ── End Font Size Controls ── */





/* Responsive */
@media (max-width: 768px) {
  .tanglish-editor-container {
    min-height: 400px;
  }
  
  .editor-content {
    padding: 20px;
    font-size: 16px;
  }

  .toolbar {
    padding: 6px 10px;
    gap: 2px;
  }

  .toolbar-stats {
    display: none;
  }

  .tamil-text {
    font-size: 14px;
  }
  
  .tanglish-text {
    font-size: 11px;
    min-width: 60px;
  }
  
  .suggestions-popup {
    min-width: 220px;
    max-width: 280px;
  }
  
  .ai-assistant-panel {
    width: calc(100vw - 40px);
    max-width: 380px;
    right: 20px;
    bottom: 20px;
  }
}

/* Credit Limit Exhausted Banner - Minimal */
.credit-exhausted-banner {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: var(--credits-bg, rgba(99, 102, 241, 0.12));
  border: 1px solid var(--credits-border, rgba(99, 102, 241, 0.28));
  padding: 6px 14px;
  border-radius: 8px;
  margin: 10px 16px 4px;
  width: fit-content;
  backdrop-filter: blur(8px);
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.banner-msg {
  font-size: 13px;
  font-weight: 600;
  color: var(--credits-text, #6366f1);
  display: inline-flex;
  align-items: center;
}

.banner-login-btn {
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  color: #ffffff;
  border: none;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.banner-login-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.35);
}

</style>