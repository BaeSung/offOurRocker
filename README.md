# Off Our Rocker

한국어 작가를 위한 데스크톱 집필 앱.

소설·단편을 체계적으로 관리하고, 집중해서 글을 쓸 수 있는 환경을 제공합니다.

## 주요 기능

### 에디터
- 리치 텍스트 편집 (굵게, 기울임, 밑줄, 취소선, 제목, 인용문, 구분선)
- 이미지 삽입 및 크기·정렬 조작
- AI 삽화 생성 (DALL-E)
- 자동 저장 (10초~5분 간격 설정)
- 글자수, 원고지 매수, 읽기 시간 실시간 표시
- 3가지 모드: 일반 / 집중 모드 / 미리보기

### 작품 관리
- 장편소설 (챕터 구조) & 단편소설 지원
- 시리즈로 작품 묶기
- 장르 분류 (공포, SF, 순문학, 판타지, 기타)
- 작품 상태 추적 (집필중 → 퇴고중 → 완료)
- 목표 글자수 & 마감일 설정
- 표지 이미지 업로드 또는 AI 생성

### 자료실
- 인물 사전: 등장인물 이름, 역할, 설명 관리
- 세계관 메모: 장소, 세력, 설정, 역사 등 분류별 기록

### 대시보드
- 집필 통계 요약 (총 작품수, 총 글자수, 주간 활동)
- 최근 작업 목록에서 바로 이어쓰기
- 장르 분포 차트 & 월간 집필 캘린더

### AI 기능
- AI 맞춤법 검사 (OpenAI / Anthropic)
- 개별·일괄 수정 적용
- API 키 OS 수준 암호화 저장

### 버전 관리 & 백업
- 챕터별 스냅샷 생성·복원·삭제
- DB 수동 백업 & 자동 백업 (일간/주간)
- DB 내보내기/가져오기 (PC 이전 시)

### 내보내기
- Markdown / 텍스트 / HTML 내보내기
- 인쇄 지원

### 기타
- 다크/라이트/시스템 테마
- 5종 포인트 컬러
- 에디터 폰트·크기·줄간격·너비 커스터마이징
- 전체 검색 (작품·챕터·본문)
- 휴지통 (복원·영구 삭제)

## 설치

### Microsoft Store
> 심사 대기 중 — 승인 후 Microsoft Store에서 "Off Our Rocker"를 검색하세요.

### GitHub Releases
[Releases 페이지](https://github.com/BaeSung/offOurRocker/releases)에서 최신 설치 파일을 다운로드하세요.

## 개발 환경 설정

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm dev

# 프로덕션 빌드
pnpm build

# Windows 설치 파일 빌드
pnpm build:win

# MS Store (AppX) 빌드
pnpm build:appx
```

## 기술 스택

| 영역 | 기술 |
|------|------|
| 데스크톱 | Electron 33 |
| 빌드 | electron-vite |
| 프론트엔드 | React 19 + TypeScript |
| 에디터 | TipTap 3 |
| 스타일링 | Tailwind CSS |
| 상태관리 | Zustand |
| DB | SQLite (better-sqlite3 + Drizzle ORM) |
| 패키징 | electron-builder |

## 배포 상태

| 채널 | 상태 |
|------|------|
| GitHub Releases | v0.1.0 배포 완료 |
| Microsoft Store | 세금/결제 유효성 검사 대기 중 (AppX 패키지 업로드 완료) |

## 라이선스

MIT
