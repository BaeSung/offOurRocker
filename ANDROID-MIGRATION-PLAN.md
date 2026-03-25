# Off Our Rocker — Android 앱 마이그레이션 계획서

> 작성일: 2026-03-25
> 현재 버전: 1.0.7 (Electron 데스크톱)
> 목표: Capacitor 기반 Android 앱 제작

---

## 1. 전략: Capacitor (Ionic) 래핑

기존 React + TipTap 웹 코드를 최대한 재사용하고, Electron IPC 레이어만 Capacitor 플러그인으로 교체한다.

**선택 이유:**
- 기존 코드 재사용률 ~80%
- TipTap 에디터를 그대로 사용 가능 (WebView 기반)
- React, Zustand, Tailwind, Radix UI 모두 그대로 동작
- 네이티브 기능(파일, SQLite 등)은 Capacitor 플러그인으로 대체

---

## 2. 사전 준비 (직접 수행)

- [ ] **Android Studio 설치** — https://developer.android.com/studio
- [ ] **JDK 17 이상 설치** — Android Studio 번들 JDK 사용 가능
- [ ] **Android SDK 설치** — Android Studio 초기 설정 시 자동 설치
- [ ] **에뮬레이터 또는 실기기 준비** — USB 디버깅 활성화
- [ ] **환경 변수 설정**
  - `ANDROID_HOME` → Android SDK 경로 (보통 `%LOCALAPPDATA%\Android\Sdk`)
  - `PATH`에 `platform-tools` 추가
- [ ] **Node.js 18+ 확인** (이미 설치되어 있을 것)

### 확인 명령어
```bash
# Android SDK 확인
adb --version

# Java 확인
java --version

# Node 확인
node --version
```

---

## 3. 마이그레이션 단계

### Phase 1: 프로젝트 세팅
1. 현재 프로젝트 복제 (별도 디렉토리)
2. Capacitor 초기화 (`@capacitor/core`, `@capacitor/cli`)
3. Vite 설정을 순수 웹 빌드로 변경 (electron-vite → vite)
4. Android 플랫폼 추가 (`npx cap add android`)
5. 기본 빌드 & 에뮬레이터 실행 확인

### Phase 2: Electron IPC 제거 & 대체
기존 아키텍처: `Renderer → preload (IPC) → Main Process → SQLite`
새 아키텍처: `React App → Capacitor Plugin → Native SQLite`

| 기존 (Electron) | 대체 (Capacitor) | 비고 |
|-----------------|-------------------|------|
| `better-sqlite3` | `@capacitor-community/sqlite` | 스키마 동일하게 유지 |
| Electron IPC handlers (23개) | 서비스 레이어 (TypeScript) | DB 직접 접근으로 변경 |
| `preload/index.ts` | 제거 | IPC 브릿지 불필요 |
| `electron` BrowserWindow | Capacitor WebView | 자동 처리 |
| `fs` (파일 시스템) | `@capacitor/filesystem` | 경로 체계 변경 |
| `dialog` (파일 선택) | `@capacitor/filesystem` + 커스텀 UI | 네이티브 다이얼로그 제한적 |
| `shell.openExternal` | `@capacitor/browser` | 외부 링크 열기 |
| OS Credential Manager | `@capacitor-community/secure-storage` | API 키 암호화 저장 |

### Phase 3: 기능별 이식 (우선순위순)

#### P0 — 핵심 (먼저 구현)
- [ ] SQLite 연결 및 DB 초기화
- [ ] 작품 목록 (사이드바 → 모바일 드로어)
- [ ] 에디터 (TipTap) 기본 동작
- [ ] 챕터 CRUD
- [ ] 자동 저장
- [ ] 설정 (테마, 폰트, 에디터 옵션)

#### P1 — 중요
- [ ] 대시보드
- [ ] 검색
- [ ] 내보내기 (Markdown, TXT)
- [ ] 스냅샷 (버전 관리)
- [ ] 휴지통

#### P2 — 부가 기능
- [ ] AI 맞춤법 검사 (API 호출은 동일, CORS 설정 변경)
- [ ] AI 이미지 생성
- [ ] 캐릭터 사전
- [ ] 플롯 타임라인
- [ ] 마인드맵
- [ ] 세계관 노트
- [ ] 목표 관리

#### P3 — 재설계 필요
- [ ] Git 연동 → **클라우드 동기화로 대체 검토** (Firebase, Supabase 등)
- [ ] EPUB 내보내기 → 모바일용 라이브러리 탐색
- [ ] 인쇄 → Android 공유 기능으로 대체
- [ ] DB 백업 → 클라우드 백업 또는 로컬 파일 내보내기

### Phase 4: 모바일 UI 재설계

| 데스크톱 UI | 모바일 대안 |
|-------------|-------------|
| 좌측 사이드바 (작품 트리) | 햄버거 메뉴 + 드로어 |
| 상단 에디터 툴바 | 하단 플로팅 툴바 또는 버블 메뉴 |
| 대시보드 그리드 | 세로 스크롤 카드 레이아웃 |
| 설정 페이지 | 네이티브 스타일 설정 화면 |
| 모달 다이얼로그 | 바텀 시트 |
| 우클릭 컨텍스트 메뉴 | 롱프레스 메뉴 |
| 키보드 단축키 | 제거 (터치 기반 조작) |

### Phase 5: 빌드 & 배포
- [ ] APK 빌드 테스트
- [ ] 서명 키 생성
- [ ] Google Play Console 계정 (개발자 등록비 $25 일회성)
- [ ] 스토어 등록 (스크린샷, 설명, 아이콘)
- [ ] AAB 빌드 & 업로드

---

## 4. 기술 스택 비교

| 항목 | 현재 (Desktop) | Android 버전 |
|------|---------------|-------------|
| 런타임 | Electron 33 | Capacitor 6 |
| 빌드 | electron-vite | Vite 6 |
| UI | React 19 + Tailwind | 동일 |
| 에디터 | TipTap 3 | 동일 (WebView) |
| 상태관리 | Zustand 5 | 동일 |
| DB | better-sqlite3 | @capacitor-community/sqlite |
| 파일 | Node.js fs | @capacitor/filesystem |
| 암호화 | Windows Credential Manager | @capacitor-community/secure-storage |
| Git | simple-git | 제거 (클라우드 동기화 대체) |

---

## 5. 예상 리스크

| 리스크 | 영향도 | 대응 |
|--------|--------|------|
| TipTap 모바일 터치 UX | 높음 | 터치 친화적 툴바 구현, 충분한 테스트 |
| SQLite 플러그인 호환성 | 중간 | Drizzle ORM 대신 raw SQL로 전환 가능성 |
| 성능 (WebView 기반) | 중간 | 큰 문서에서 에디터 성능 모니터링 필요 |
| 파일 접근 권한 | 낮음 | Android 13+ Scoped Storage 대응 |

---

## 6. 작업 역할 분담

| 작업 | 담당 |
|------|------|
| 환경 세팅 (Android Studio 등) | 직접 |
| 프로젝트 생성 & 코드 작성 | Claude |
| 빌드 명령 실행 | Claude (에러 해결 포함) |
| 에뮬레이터/실기기 테스트 | 직접 |
| UI/UX 피드백 | 직접 |
| 코드 수정 | Claude |
| 스토어 등록 | 직접 |

---

## 7. 시작하려면

1. 위 "사전 준비" 체크리스트 완료
2. 이 프로젝트와 별도 디렉토리에 복제할 경로 결정 (예: `D:/project/offOurRocker-android`)
3. Claude에게 "안드로이드 마이그레이션 시작" 이라고 말하기
