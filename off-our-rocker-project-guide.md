# Off Our Rocker — Electron 프로젝트 세팅 가이드

## 기술 스택

| 영역 | 기술 | 버전 |
|------|------|------|
| 데스크탑 쉘 | Electron | 33.x |
| 빌드 도구 | electron-vite | 최신 |
| 프론트엔드 | React 19 + TypeScript | - |
| 스타일링 | Tailwind CSS 4 | - |
| 상태관리 | Zustand | 5.x |
| 라우팅 | React Router | 7.x |
| 에디터 | TipTap (추후 연동) | 2.x |
| DB | better-sqlite3 | - |
| ORM | Drizzle ORM | - |
| 아이콘 | lucide-react | - |
| 패키징 | electron-builder | - |

---

## 1. 프로젝트 생성

```bash
# electron-vite 공식 템플릿으로 생성
npm create @quick-start/electron@latest off-our-rocker -- --template react-ts

cd off-our-rocker
npm install
```

## 2. 의존성 설치

```bash
# 핵심 의존성
npm install zustand react-router-dom lucide-react

# DB
npm install better-sqlite3 drizzle-orm
npm install -D drizzle-kit @types/better-sqlite3

# 스타일
npm install -D tailwindcss @tailwindcss/vite

# 에디터 (TipTap) — 추후 연동, 일단 설치
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-character-count

# 유틸
npm install date-fns clsx

# 빌드/패키징
npm install -D electron-builder
```

## 3. 프로젝트 구조

```
off-our-rocker/
├── electron.vite.config.ts
├── package.json
├── tailwind.config.ts
│
├── resources/                    # 앱 아이콘, 로고 등 정적 리소스
│   ├── icon.ico
│   ├── icon.icns
│   └── icon.png
│
├── src/
│   ├── main/                     # Electron 메인 프로세스
│   │   ├── index.ts              # 앱 진입점, BrowserWindow 생성
│   │   ├── db/
│   │   │   ├── schema.ts         # Drizzle 스키마 정의
│   │   │   ├── connection.ts     # SQLite 연결
│   │   │   └── migrations/       # DB 마이그레이션
│   │   ├── ipc/
│   │   │   ├── works.ts          # 작품 CRUD IPC 핸들러
│   │   │   ├── chapters.ts       # 챕터 CRUD
│   │   │   ├── series.ts         # 시리즈 CRUD
│   │   │   ├── settings.ts       # 설정 읽기/쓰기
│   │   │   ├── ai.ts             # AI API 호출 (LLM, 이미지)
│   │   │   └── export.ts         # 파일 내보내기
│   │   └── utils/
│   │       ├── crypto.ts         # API 키 암호화/복호화
│   │       └── backup.ts         # 자동 백업
│   │
│   ├── preload/                  # Preload 스크립트
│   │   └── index.ts              # contextBridge로 IPC 노출
│   │
│   └── renderer/                 # React 렌더러 프로세스
│       ├── index.html
│       ├── main.tsx              # React 진입점
│       ├── App.tsx               # 라우팅 + 레이아웃
│       │
│       ├── assets/
│       │   ├── fonts/            # Pretendard, Noto Serif KR
│       │   └── logo.svg          # 기울어진 의자 로고
│       │
│       ├── styles/
│       │   └── globals.css       # Tailwind + 전역 스타일 + CSS 변수
│       │
│       ├── components/
│       │   ├── layout/
│       │   │   ├── AppLayout.tsx        # 전체 3-패널 레이아웃
│       │   │   ├── Sidebar.tsx          # 사이드바 컨테이너
│       │   │   ├── SidebarHeader.tsx    # 로고 + 검색
│       │   │   ├── SidebarFooter.tsx    # 새 작품/시리즈/설정/휴지통
│       │   │   └── InspectorPanel.tsx   # 우측 인스펙터 (향후)
│       │   │
│       │   ├── tree/
│       │   │   ├── WorkTree.tsx         # 작품 트리뷰 컨테이너
│       │   │   ├── TreeItem.tsx         # 트리 항목 (재귀)
│       │   │   ├── SeriesNode.tsx       # 시리즈 노드
│       │   │   ├── WorkNode.tsx         # 작품 노드
│       │   │   ├── ChapterNode.tsx      # 챕터 노드
│       │   │   └── ContextMenu.tsx      # 우클릭 메뉴
│       │   │
│       │   ├── editor/
│       │   │   ├── Editor.tsx           # 에디터 메인 컨테이너
│       │   │   ├── EditorToolbar.tsx    # 상단 서식 툴바
│       │   │   ├── EditorContent.tsx    # TipTap 에디터 영역
│       │   │   ├── StatusBar.tsx        # 하단 상태바
│       │   │   ├── FocusMode.tsx        # 집중 모드 래퍼
│       │   │   ├── PreviewMode.tsx      # 미리보기 모드
│       │   │   └── ImageBlock.tsx       # 삽화 블록
│       │   │
│       │   ├── dashboard/
│       │   │   ├── Dashboard.tsx        # 대시보드 메인
│       │   │   ├── SummaryCards.tsx     # 현황 요약 카드 4개
│       │   │   ├── RecentWorks.tsx      # 최근 작업
│       │   │   ├── GenreChart.tsx       # 장르 도넛 차트
│       │   │   ├── WritingCalendar.tsx  # 집필 캘린더 히트맵
│       │   │   └── GoalTracker.tsx      # 목표 추적
│       │   │
│       │   ├── settings/
│       │   │   ├── SettingsPage.tsx     # 설정 메인
│       │   │   ├── SettingsNav.tsx      # 세로 탭 네비
│       │   │   ├── GeneralSettings.tsx  # 일반 설정
│       │   │   ├── EditorSettings.tsx   # 에디터 설정
│       │   │   ├── AISettings.tsx       # AI 연동 설정
│       │   │   ├── ExportSettings.tsx   # 내보내기 설정
│       │   │   ├── ShortcutSettings.tsx # 단축키 설정
│       │   │   └── AboutSection.tsx     # 정보
│       │   │
│       │   └── ui/                      # 공통 UI 컴포넌트
│       │       ├── Button.tsx
│       │       ├── Toggle.tsx
│       │       ├── Slider.tsx
│       │       ├── Dropdown.tsx
│       │       ├── Badge.tsx
│       │       ├── Tooltip.tsx
│       │       ├── Toast.tsx
│       │       └── Modal.tsx
│       │
│       ├── stores/                # Zustand 상태 관리
│       │   ├── useAppStore.ts     # 전역 앱 상태 (사이드바 열림/닫힘 등)
│       │   ├── useWorkStore.ts    # 작품/챕터/시리즈 데이터
│       │   ├── useEditorStore.ts  # 에디터 상태 (현재 문서, 모드 등)
│       │   └── useSettingsStore.ts # 설정 상태
│       │
│       ├── hooks/                 # 커스텀 훅
│       │   ├── useIPC.ts          # IPC 통신 래퍼
│       │   ├── useAutoSave.ts     # 자동 저장
│       │   ├── useShortcuts.ts    # 키보드 단축키
│       │   └── useCharCount.ts    # 글자수/원고지 매수 계산
│       │
│       ├── lib/                   # 유틸리티
│       │   ├── constants.ts       # 상수 (장르, 상태 등)
│       │   ├── types.ts           # TypeScript 타입 정의
│       │   └── utils.ts           # 공통 유틸 함수
│       │
│       └── ipc/                   # 렌더러 측 IPC 타입
│           └── api.ts             # window.api 타입 정의
│
└── drizzle.config.ts              # Drizzle 설정
```

## 4. SQLite DB 스키마

```typescript
// src/main/db/schema.ts

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// 시리즈
export const series = sqliteTable('series', {
  id: text('id').primaryKey(),           // UUID
  title: text('title').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 작품
export const works = sqliteTable('works', {
  id: text('id').primaryKey(),
  seriesId: text('series_id').references(() => series.id),  // null이면 독립 작품
  title: text('title').notNull(),
  type: text('type').notNull(),          // 'novel' | 'short'
  genre: text('genre').notNull(),        // 'horror' | 'sf' | 'literary' | 'fantasy' | 'etc'
  status: text('status').notNull(),      // 'writing' | 'editing' | 'completed'
  targetWordCount: integer('target_word_count'),  // 목표 글자수
  deadline: text('deadline'),            // 마감일 (ISO string)
  sortOrder: integer('sort_order').default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 챕터 (장편의 하위 구조)
export const chapters = sqliteTable('chapters', {
  id: text('id').primaryKey(),
  workId: text('work_id').notNull().references(() => works.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').default(''),
  sortOrder: integer('sort_order').default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 단편 콘텐츠 (챕터가 없는 단편의 본문)
export const workContent = sqliteTable('work_content', {
  id: text('id').primaryKey(),
  workId: text('work_id').notNull().references(() => works.id, { onDelete: 'cascade' }),
  content: text('content').default(''),
  updatedAt: text('updated_at').notNull(),
});

// 삽화
export const illustrations = sqliteTable('illustrations', {
  id: text('id').primaryKey(),
  workId: text('work_id').notNull().references(() => works.id, { onDelete: 'cascade' }),
  chapterId: text('chapter_id').references(() => chapters.id, { onDelete: 'cascade' }),
  imagePath: text('image_path').notNull(),     // 로컬 파일 경로
  caption: text('caption'),
  prompt: text('prompt'),                       // AI 생성 시 사용한 프롬프트
  position: integer('position').default(0),     // 본문 내 위치 (문자 인덱스)
  createdAt: text('created_at').notNull(),
});

// 버전 히스토리
export const versions = sqliteTable('versions', {
  id: text('id').primaryKey(),
  workId: text('work_id').notNull().references(() => works.id, { onDelete: 'cascade' }),
  chapterId: text('chapter_id').references(() => chapters.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  wordCount: integer('word_count').notNull(),
  createdAt: text('created_at').notNull(),
});

// 태그
export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color'),                        // hex 컬러
});

// 작품-태그 연결
export const workTags = sqliteTable('work_tags', {
  workId: text('work_id').notNull().references(() => works.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
});

// 집필 기록 (캘린더 히트맵용)
export const writingLogs = sqliteTable('writing_logs', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),                // 'YYYY-MM-DD'
  wordCount: integer('word_count').notNull(),
  workId: text('work_id').references(() => works.id),
  createdAt: text('created_at').notNull(),
});

// 목표
export const goals = sqliteTable('goals', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  type: text('type').notNull(),                // 'work_deadline' | 'yearly_count' | 'daily_words'
  targetValue: integer('target_value'),
  currentValue: integer('current_value').default(0),
  workId: text('work_id').references(() => works.id),
  deadline: text('deadline'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 설정 (key-value)
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),              // JSON string
});

// 휴지통 (소프트 딜리트)
export const trash = sqliteTable('trash', {
  id: text('id').primaryKey(),
  originalTable: text('original_table').notNull(),
  originalId: text('original_id').notNull(),
  data: text('data').notNull(),                // JSON 직렬화된 원본 데이터
  deletedAt: text('deleted_at').notNull(),
});
```

## 5. 핵심 타입 정의

```typescript
// src/renderer/lib/types.ts

export type WorkType = 'novel' | 'short';
export type Genre = 'horror' | 'sf' | 'literary' | 'fantasy' | 'etc';
export type WorkStatus = 'writing' | 'editing' | 'completed';
export type EditorMode = 'normal' | 'focus' | 'preview';

export interface Series {
  id: string;
  title: string;
  description?: string;
  works: Work[];
  sortOrder: number;
}

export interface Work {
  id: string;
  seriesId?: string;
  title: string;
  type: WorkType;
  genre: Genre;
  status: WorkStatus;
  targetWordCount?: number;
  deadline?: string;
  chapters?: Chapter[];
  wordCount: number;         // 계산된 값
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Chapter {
  id: string;
  workId: string;
  title: string;
  content: string;
  wordCount: number;
  sortOrder: number;
}

export interface Illustration {
  id: string;
  workId: string;
  chapterId?: string;
  imagePath: string;
  caption?: string;
  prompt?: string;
  position: number;
}

export interface WritingLog {
  date: string;
  wordCount: number;
}

export interface Goal {
  id: string;
  title: string;
  type: 'work_deadline' | 'yearly_count' | 'daily_words';
  targetValue?: number;
  currentValue: number;
  deadline?: string;
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  accentColor: 'amber' | 'rose' | 'sage' | 'slate' | 'indigo';
  language: 'ko' | 'en';
  autoSaveInterval: number;
  autoBackup: boolean;
  backupInterval: 'daily' | 'weekly';
  dataPath: string;
  backupPath: string;
  openLastWork: boolean;
  showStartScreen: boolean;
  editor: EditorSettings;
  ai: AISettings;
  export: ExportSettings;
}

export interface EditorSettings {
  bodyFont: string;
  headingFont: string;
  fontSize: number;
  lineHeight: number;
  indent: boolean;
  indentSize: '1em' | '2em';
  spellcheck: boolean;
  currentLineHighlight: boolean;
  autoQuotes: boolean;
  autoEllipsis: boolean;
  countSpaces: boolean;
  manuscriptBase: 200 | 400;
  focusDarkness: number;
  focusWidth: number;
  typingSound: 'typewriter' | 'keyboard' | 'none';
}

export interface AISettings {
  llm: {
    provider: 'openai' | 'anthropic';
    apiKey: string;
    model: string;
  };
  image: {
    useSharedKey: boolean;
    apiKey: string;
    size: '1024x1024' | '1792x1024' | '1024x1792';
    quality: 'standard' | 'hd';
    style: 'natural' | 'vivid';
  };
}

export interface ExportSettings {
  format: 'md' | 'txt';
  includeFrontmatter: boolean;
  includeIllustrations: boolean;
  footnoteStyle: 'inline' | 'reference';
  exportPath: string;
}
```

## 6. CSS 변수 (디자인 토큰)

```css
/* src/renderer/styles/globals.css */

@import 'tailwindcss';

:root {
  /* 다크 테마 (기본) */
  --bg-base: #0f0f17;
  --bg-surface: #1a1a2e;
  --bg-elevated: #1e1e30;
  --bg-overlay: #252540;

  --text-primary: #e8e0d0;
  --text-secondary: #8a8278;
  --text-muted: #5a5550;

  --accent-amber: #d4a574;
  --accent-amber-hover: #e0b585;
  --accent-amber-dim: rgba(212, 165, 116, 0.15);

  --border-default: #2a2a3e;
  --border-active: #d4a574;

  --status-writing: #5b9bd5;
  --status-editing: #e8a838;
  --status-completed: #6bc96b;

  --genre-horror: #d4a574;
  --genre-sf: #5bbcd5;
  --genre-literary: #d57a8c;
  --genre-fantasy: #9b7ad5;

  /* 사이드바 */
  --sidebar-width: 280px;
  --sidebar-collapsed-width: 60px;

  /* 에디터 */
  --editor-max-width: 780px;
  --editor-focus-width: 680px;

  /* 트랜지션 */
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease;
  --transition-slow: 300ms ease;
}

/* 라이트 테마 */
[data-theme='light'] {
  --bg-base: #faf8f5;
  --bg-surface: #f0ede8;
  --bg-elevated: #ffffff;
  --bg-overlay: #e8e4de;

  --text-primary: #2a2520;
  --text-secondary: #6a6460;
  --text-muted: #9a9590;

  --border-default: #d8d4ce;
}

/* 폰트 */
@font-face {
  font-family: 'Pretendard';
  src: url('../assets/fonts/Pretendard-Regular.woff2') format('woff2');
  font-weight: 400;
}
@font-face {
  font-family: 'Pretendard';
  src: url('../assets/fonts/Pretendard-SemiBold.woff2') format('woff2');
  font-weight: 600;
}
@font-face {
  font-family: 'Pretendard';
  src: url('../assets/fonts/Pretendard-Bold.woff2') format('woff2');
  font-weight: 700;
}

body {
  font-family: 'Pretendard', -apple-system, sans-serif;
  background-color: var(--bg-base);
  color: var(--text-primary);
  overflow: hidden;
  user-select: none;
}

/* 에디터 영역만 텍스트 선택 허용 */
.editor-content {
  user-select: text;
}

/* 스크롤바 커스텀 */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--text-muted);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}
```

## 7. App.tsx 라우팅 구조

```tsx
// src/renderer/App.tsx

import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './components/dashboard/Dashboard';
import { Editor } from './components/editor/Editor';
import { SettingsPage } from './components/settings/SettingsPage';

export default function App() {
  return (
    <HashRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/work/:workId" element={<Editor />} />
          <Route path="/work/:workId/chapter/:chapterId" element={<Editor />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/:tab" element={<SettingsPage />} />
        </Routes>
      </AppLayout>
    </HashRouter>
  );
}
```

## 8. IPC 통신 구조

```typescript
// src/preload/index.ts

import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // 작품
  works: {
    getAll: () => ipcRenderer.invoke('works:getAll'),
    getById: (id: string) => ipcRenderer.invoke('works:getById', id),
    create: (data: any) => ipcRenderer.invoke('works:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('works:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('works:delete', id),
  },
  // 챕터
  chapters: {
    getByWorkId: (workId: string) => ipcRenderer.invoke('chapters:getByWorkId', workId),
    save: (id: string, content: string) => ipcRenderer.invoke('chapters:save', id, content),
    create: (data: any) => ipcRenderer.invoke('chapters:create', data),
    delete: (id: string) => ipcRenderer.invoke('chapters:delete', id),
  },
  // 시리즈
  series: {
    getAll: () => ipcRenderer.invoke('series:getAll'),
    create: (data: any) => ipcRenderer.invoke('series:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('series:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('series:delete', id),
  },
  // 설정
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
  },
  // AI
  ai: {
    spellCheck: (text: string) => ipcRenderer.invoke('ai:spellCheck', text),
    generateImage: (prompt: string, options: any) => ipcRenderer.invoke('ai:generateImage', prompt, options),
    testConnection: (provider: string, apiKey: string) => ipcRenderer.invoke('ai:testConnection', provider, apiKey),
  },
  // 내보내기
  export: {
    toMarkdown: (workId: string) => ipcRenderer.invoke('export:toMarkdown', workId),
    toText: (workId: string) => ipcRenderer.invoke('export:toText', workId),
    selectDirectory: () => ipcRenderer.invoke('export:selectDirectory'),
  },
  // 집필 기록
  writingLog: {
    getByMonth: (year: number, month: number) => ipcRenderer.invoke('writingLog:getByMonth', year, month),
    record: (data: any) => ipcRenderer.invoke('writingLog:record', data),
  },
  // 시스템
  system: {
    getAppVersion: () => ipcRenderer.invoke('system:getAppVersion'),
    selectDirectory: () => ipcRenderer.invoke('system:selectDirectory'),
  },
};

contextBridge.exposeInMainWorld('api', api);
```

## 9. v0 코드 통합 방법

v0에서 받은 4개 화면 코드를 아래 순서로 통합:

### Step 1: 공통 UI 먼저
v0 코드에서 반복 사용된 버튼, 토글, 배지 등을 `components/ui/`로 추출

### Step 2: 사이드바 (프롬프트 #1)
v0 코드 → `components/layout/Sidebar.tsx` + `components/tree/` 하위 파일들로 분리

### Step 3: 에디터 (프롬프트 #2)
v0 코드 → `components/editor/` 하위 파일들로 분리.
textarea를 TipTap으로 교체하는 건 이후 단계.

### Step 4: 설정 (프롬프트 #3)
v0 코드 → `components/settings/` 하위 파일들로 분리

### Step 5: 대시보드 (프롬프트 #4)
v0 코드 → `components/dashboard/` 하위 파일들로 분리

### Step 6: 라우팅 연결
App.tsx에서 각 화면을 라우트로 연결.
사이드바 항목 클릭 → `/work/:id` 네비게이션
설정 버튼 → `/settings`
대시보드 버튼 → `/`

---

## 10. 개발 순서 로드맵

### Phase 1: 뼈대 (현재)
- [x] v0 UI 프로토타입 4개
- [ ] Electron 프로젝트 생성
- [ ] v0 코드 통합
- [ ] 라우팅 연결
- [ ] 기본 네비게이션 동작

### Phase 2: DB + 데이터
- [ ] SQLite 연결 + 스키마 생성
- [ ] IPC 핸들러 구현
- [ ] 더미 데이터 → 실제 DB 데이터로 전환
- [ ] CRUD 동작 확인

### Phase 3: 에디터 핵심
- [ ] TipTap 에디터 연동
- [ ] 마크다운 입출력
- [ ] 자동 저장
- [ ] 글자수/원고지 카운트
- [ ] 버전 히스토리
- [ ] 집중 모드 / 미리보기 모드

### Phase 4: AI 연동
- [ ] OpenAI API 연동 (맞춤법, DALL-E)
- [ ] Anthropic API 연동
- [ ] API 키 암호화 저장
- [ ] 연결 테스트

### Phase 5: 내보내기 + 마무리
- [ ] MD/TXT 내보내기
- [ ] 자동 백업
- [ ] 집필 기록 (캘린더)
- [ ] 목표 관리
- [ ] 테마 전환 (다크/라이트)

### Phase 6: 배포
- [ ] electron-builder 패키징
- [ ] Windows/macOS 빌드
- [ ] GitHub 릴리즈
- [ ] README + 문서
