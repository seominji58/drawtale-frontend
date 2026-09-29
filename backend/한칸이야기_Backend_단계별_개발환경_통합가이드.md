# 한칸이야기 Backend 개발환경 및 단계별 운영 가이드
## 로컬 개발 → 공유 개발환경 → Docker 통합 → Azure 배포

> **대상:** Backend & Cloud 담당자  
> **목적:** 백엔드 개발자가 현재 무엇을 준비해야 하고, 어떤 작업은 이후 팀 통합/배포 단계에서 진행해야 하는지 구분한다.  
> **핵심 원칙:** 로컬 개발용 환경, 팀 공용 개발환경, 운영환경을 한 번에 섞지 않는다.

---

# 1. 먼저 결론

백엔드 개발은 아래 순서로 진행하는 것이 가장 이해하기 쉽다.

```text
1단계
내 PC에서 Backend 개발
(.venv + FastAPI + Local DB)

        ↓

2단계
Frontend / AI와 연동 시작
(공유 개발 DB 또는 공용 개발환경)

        ↓

3단계
Docker로 실행환경 통일
(Backend Container + AI Container)

        ↓

4단계
Azure 실제 배포
(Gateway + Private Backend + Private AI)

        ↓

5단계
운영 DB / Secret / Logging / CI/CD 정리
```

중요:

```text
Docker = 배포 후에만 사용하는 기술 X

공유 DB = 배포 후에만 만드는 DB X
```

둘 다 **개발 과정 중에도 필요할 수 있다.**

다만 시점과 목적이 다르다.

---

# 2. 각 단계에서 무엇을 사용하는가

| 단계 | Backend 실행 | DB | AI | Docker | Azure |
|---|---|---|---|---|---|
| 1. 개인 로컬 개발 | `.venv + uvicorn` | Local DB | Mock 가능 | 선택 | X |
| 2. 팀 통합 개발 | `.venv` 또는 Docker | Shared Dev DB | 실제 AI 연동 시작 | 선택/권장 | 일부 가능 |
| 3. Docker 통합 | Docker Container | Shared Dev DB 또는 DB Container | AI Container | O | X 또는 테스트 |
| 4. Azure 배포 | Docker | Production DB | Private AI Container | O | O |
| 5. 운영 | Docker | Production DB | 운영 AI | O | O |

---

# 3. 가장 먼저 해야 하는 것: 개인 로컬 개발환경

현재 Backend 담당자가 가장 먼저 해야 하는 것은 **자기 PC에서 Backend가 정상 실행되는 환경**을 만드는 것이다.

구조:

```text
내 PC

backend repository
├─ .venv
├─ app/
├─ tests/
├─ .env
└─ requirements.txt
```

실행:

```text
내 PC
  ↓
FastAPI
  ↓
Local DB
```

이 단계에서는 아직 Azure가 없어도 된다.

AI가 완성되지 않았다면 Mock Response를 사용해도 된다.

---

# 4. `.venv`는 각 개발자 PC의 로컬 Python 가상환경

`.venv`는 팀 공용 서버가 아니다.

각자 자신의 PC에서 생성한다.

```text
Backend 개발자 PC

backend/
└─ .venv/
```

다른 팀원이 Backend를 실행해야 한다면:

```text
다른 팀원 PC

backend/
└─ .venv/
```

를 별도로 만든다.

## Windows

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

## macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
```

가상환경 종료:

```bash
deactivate
```

`.venv`는 GitHub에 올리지 않는다.

공유하는 것은:

```text
requirements.txt
.env.example
README.md
```

이다.

---

# 5. 로컬 DB는 왜 먼저 사용하는가

초기에는 API 구조와 DB Schema가 계속 변경된다.

예:

```text
Character
Story
Job
JointCorrection
```

테이블이 계속 수정될 수 있다.

처음부터 팀 공용 DB 하나를 사용하면:

```text
내가 테이블 수정
       ↓
다른 팀원 개발환경 오류
       ↓
데이터 충돌
```

이 생기기 쉽다.

그래서 초기에는:

```text
Backend 개발자
      ↓
Local DB
```

로 개발하는 것이 편하다.

---

# 6. Local DB 선택

최종 DB를 PostgreSQL로 사용할 예정이라면 로컬 개발도 PostgreSQL을 맞추는 것이 좋다.

두 방법이 있다.

## 방법 1. PC에 PostgreSQL 직접 설치

```text
Backend .venv
      ↓
localhost PostgreSQL
```

예:

```env
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/oneframe
```

장점:

- 구조 단순
- Docker 없이 바로 개발 가능

단점:

- 개발자마다 PostgreSQL 설치 필요
- 버전 차이가 생길 수 있음

---

## 방법 2. PostgreSQL만 Docker로 실행

추천 가능한 방식:

```text
Backend
.venv + uvicorn

       ↓

PostgreSQL
Docker Container
```

즉 Backend는 로컬 Python으로 개발하면서 DB만 Docker로 실행할 수 있다.

이 경우 Docker는 **배포용이 아니라 로컬 개발 편의를 위해 사용하는 것**이다.

---

# 7. 공유 DB는 언제 만드는가

공유 DB는 보통 **Backend API 구조와 DB Schema가 어느 정도 안정된 뒤** 만든다.

추천 시점:

```text
FastAPI 기본 구조 완료
        ↓
DB Table / Schema 1차 확정
        ↓
Migration 작성
        ↓
Frontend 연동 시작
        ↓
Shared Development DB 생성
```

즉 개발 초반부터 반드시 필요한 것은 아니다.

하지만 Frontend 담당자나 다른 팀원이 실제 동일 데이터를 봐야 하기 시작하면 필요하다.

---

# 8. Shared Development DB란

팀원들이 함께 사용하는 **개발용 PostgreSQL DB**이다.

예:

```text
Backend 개발자
      │
Frontend 테스트
      │
통합 테스트 서버
      │
      ▼
Shared Development DB
```

예를 들어 개발 DB URL:

```env
DATABASE_URL=postgresql+psycopg://...@dev-db-host:5432/oneframe_dev
```

여기서 중요한 점:

```text
Shared Dev DB
≠
Production DB
```

이다.

---

# 9. 공유 DB를 운영 DB로 그대로 쓰면 안 되는 이유

개발 DB는 개발 과정에서:

- 테이블 삭제
- Migration 반복
- 테스트 데이터 삽입
- 더미 계정 생성
- 잘못된 데이터 저장

등이 계속 발생한다.

따라서 운영 DB와 분리하는 것이 원칙이다.

```text
Development

oneframe_dev
```

```text
Production

oneframe_prod
```

최소한 Database 자체를 분리하거나,
가능하면 Instance도 분리한다.

---

# 10. 개발 단계 DB 구조

추천 흐름:

```text
초기

Backend 개발자 PC
      ↓
Local PostgreSQL
```

그 다음:

```text
팀 통합개발

Frontend
Backend
AI
      ↓
Shared Development PostgreSQL
```

최종:

```text
Production

Azure Backend
      ↓
Production PostgreSQL
```

---

# 11. DB Schema 변경은 Alembic으로 관리

공유 DB를 사용하기 시작하면 테이블을 직접 수정하는 방식은 피한다.

예:

```text
내 PC에서 Column 추가
```

를 직접 SQL로 처리하는 대신:

```bash
alembic revision --autogenerate -m "add story status"
```

Migration 생성.

적용:

```bash
alembic upgrade head
```

이렇게 해야 팀 전체의 DB 구조를 동일하게 유지할 수 있다.

---

# 12. `.env`도 환경별로 분리

## Local

```text
.env.local
```

예:

```env
APP_ENV=local

DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/oneframe

AI_SERVICE_URL=http://127.0.0.1:8001
```

---

## Development

```text
.env.development
```

예:

```env
APP_ENV=development

DATABASE_URL=<SHARED_DEV_DATABASE_URL>

AI_SERVICE_URL=<DEV_AI_SERVICE_URL>
```

---

## Production

```text
.env.production
```

실제 파일 자체를 GitHub에 올리는 것은 금지한다.

운영에서는 Azure Secret / Environment Variable로 관리한다.

---

# 13. Docker는 실제 배포 이후에만 사용하는가?

아니다.

Docker는 크게 두 시점에서 사용한다.

## 1. 개발 중

목적:

```text
개발자 PC마다 환경이 다른 문제 방지
```

예:

```text
Windows
macOS
Azure Linux
```

에서도 동일 Docker Image를 실행한다.

---

## 2. 실제 배포

개발 단계에서 검증된 Docker Image를 Azure VM에서 그대로 실행한다.

즉:

```text
Local Docker
       ↓
같은 Image
       ↓
Azure Docker
```

로 가져가는 것이 목적이다.

---

# 14. 로컬에서는 반드시 Docker로 코딩해야 하나?

아니다.

Backend 개발자는 평소에는:

```text
.venv
+
uvicorn --reload
```

방식을 사용하는 것이 편하다.

왜냐하면 코드를 수정할 때마다 빠르게 반영되기 때문이다.

권장:

```text
일상 개발
→ .venv

통합 테스트
→ Docker

운영 배포
→ Docker
```

---

# 15. Docker를 쓰는 시점

## 초기 Backend Skeleton

Docker 없어도 됨.

```text
.venv
↓
FastAPI
↓
Local DB
```

---

## AI와 실제 통합 시작

Docker 사용 권장.

```text
backend-container
       ↓
ai-container
```

---

## Azure 배포

Docker 필수 수준으로 사용.

```text
Azure VM

backend-container
ai-container
```

---

# 16. Backend와 AI Docker 관계

현재 인프라는:

```text
Azure Compute Server
16GB RAM

├─ backend-container
└─ ai-container
```

구조를 기본으로 한다.

중요한 것은:

```text
같은 서버
≠
같은 Container
```

이다.

각 Container는 별도 실행환경이다.

---

# 17. Docker Private Network

Backend와 AI는 Private Docker Network 안에서 통신한다.

```text
oneframe-private

backend-container
       │
       │ HTTP
       ▼
ai-container
```

AI는 외부 인터넷에서 직접 호출하지 않는다.

Backend가:

```text
http://ai:8001/internal/v1/analyze
```

형태로 호출한다.

---

# 18. 왜 AI를 Private로 두는가

Frontend에서 AI에 직접 접근하면:

```text
Frontend
↓
AI
```

AI Endpoint가 인터넷에 노출된다.

그러면:

- 인증 통제 어려움
- AI Server 직접 공격 가능
- Model Endpoint 노출
- Backend Job 관리 불가능

문제가 생긴다.

따라서:

```text
Frontend
    ↓
Gateway
    ↓
Backend
    ↓
AI
```

구조를 유지한다.

---

# 19. Backend도 Container Port 자체는 Private

운영 환경에서는:

```text
Internet
    ↓
HTTPS :443
    ↓
Gateway / Reverse Proxy
    ↓
Backend :8000
```

로 구성한다.

즉:

```text
Backend Container :8000
```

자체를 인터넷에 직접 노출하지 않는다.

---

# 20. 개발환경에서는 localhost로만 열 수 있음

로컬 테스트:

```text
127.0.0.1:8000
```

으로 Bind.

예:

```bash
docker run \
  -p 127.0.0.1:8000:8000 \
  oneframe-backend
```

그러면 같은 PC에서는 접근 가능하지만 다른 PC에서는 접근할 수 없다.

---

# 21. Docker Compose는 언제 사용하는가

Backend와 AI를 동시에 실행할 때 유용하다.

예:

```yaml
services:

  backend:
    build: .
    env_file:
      - .env
    ports:
      - "127.0.0.1:8000:8000"
    networks:
      - oneframe-private

  ai:
    image: oneframe-ai
    expose:
      - "8001"
    networks:
      - oneframe-private

networks:
  oneframe-private:
    driver: bridge
```

여기서:

```text
Backend
ports 사용

AI
expose 사용
```

한다.

로컬에서는 Backend만 내 PC Browser에서 접근할 수 있게 하고,
AI는 내부 통신만 허용한다.

---

# 22. AI가 아직 완성되지 않은 경우

Backend 개발이 A1 일정에 막히면 안 된다.

따라서 초기에는 Mock AI Service를 사용할 수 있다.

예:

```json
{
  "bbox": [10, 20, 200, 400],
  "joints": [],
  "model_version": "mock-v1"
}
```

Backend는:

```text
AI 실제 구현 여부와 상관없이
API Contract 기준
```

으로 먼저 개발한다.

---

# 23. Backend 개발 우선순위

## 1주차

### 환경

- Python 설치
- `.venv`
- requirements
- `.env.example`
- FastAPI 실행

### 기본 Backend

```text
GET /health
```

---

## 2주차

### DB

- SQLAlchemy
- PostgreSQL
- Alembic
- 기본 Entity

예:

```text
Character
Story
Job
JointCorrection
```

---

## 3주차

### Storage

Azure Blob Storage Service 작성.

```text
upload image
↓
Blob
↓
URL / Path 저장
```

---

## 4주차

### AI 연동

초기:

```text
Mock AI
```

이후:

```text
Actual AI Private API
```

연결.

---

## 5주차

### OpenAI / TTS

```text
Backend
├─ Story Generation
├─ Moderation
└─ TTS
```

연결.

---

## 6주차

### Job

AI 작업이 오래 걸리는 경우:

```text
POST request
      ↓
job_id 반환
      ↓
Frontend polling
```

구조 구현.

---

## 7주차

### Docker

```text
Backend
AI
DB(optional)
```

통합 테스트.

---

## 8주차

### Azure

```text
Gateway
↓
Backend Container
↓
AI Container
```

배포.

---

# 24. Backend 주요 API

Frontend가 사용하는 Backend Endpoint:

```text
POST  /api/v1/characters
GET   /api/v1/jobs/{id}
PATCH /api/v1/characters/{id}/joints
POST  /api/v1/stories
```

Backend 상태:

```text
GET /health
```

---

# 25. AI Private API

Backend만 호출:

```text
GET  /internal/v1/health

POST /internal/v1/analyze

POST /internal/v1/render
```

Frontend는 이 Endpoint를 모른다.

---

# 26. Blob Storage 역할

DB에 이미지 Binary를 직접 넣기보다는:

```text
Blob Storage

uploads/
results/
```

에 파일 저장.

DB에는:

```text
character_id
upload_blob_path
result_blob_path
```

와 같은 Metadata 저장.

---

# 27. Local / Development / Production 정리

## LOCAL

```text
내 PC

Backend .venv
↓
Local DB

AI = Mock 또는 localhost
```

---

## DEVELOPMENT

```text
팀 통합 테스트

Frontend
Backend
AI
↓
Shared Development DB
↓
Shared Blob
```

---

## PRODUCTION

```text
Azure

HTTPS Gateway
↓
Private Backend
↓
Private AI

Backend
├─ Production DB
├─ Blob
├─ OpenAI
└─ TTS
```

---

# 28. 공유 DB는 이렇게 이해하면 된다

잘못된 이해:

```text
배포하기 전
Local DB

배포하고 나면
Shared DB
```

정확한 이해:

```text
개발 초기
Local DB

      ↓

팀 통합 시작
Shared Development DB

      ↓

실제 배포
Production DB
```

즉 **Shared DB는 배포 전에 이미 사용할 수 있다.**

---

# 29. Docker도 이렇게 이해하면 된다

잘못된 이해:

```text
개발할 때
Docker X

배포하면
Docker O
```

정확한 이해:

```text
개발 초반
Docker 선택

       ↓

통합 테스트
Docker 권장

       ↓

Azure 배포
Docker 사용
```

---

# 30. Backend 담당자가 지금 당장 할 것

현재 단계에서는 아래까지만 먼저 하면 된다.

```text
1. Backend Repo 구조 정리

2. Python 3.11

3. .venv 생성

4. requirements 작성

5. .env.example 작성

6. FastAPI 실행

7. /health

8. PostgreSQL Local 연결

9. SQLAlchemy / Alembic 환경 구성

10. API Schema 설계
```

아직 당장 하지 않아도 되는 것:

```text
Azure Production 배포

Production DB

Production Reverse Proxy

실제 CI/CD 자동배포

AI GPU Server

운영 Logging 시스템
```

---

# 31. Backend 담당 작업 단계

## 지금

```text
Local Development
```

목표:

```text
내 PC에서 Backend가 완전히 돌아감
```

---

## Backend API 기본 구현 후

```text
Team Integration
```

목표:

```text
Frontend / AI가 Backend와 통신 가능
```

---

## 통합 완료 후

```text
Docker Integration
```

목표:

```text
다른 PC에서도 같은 환경 재현
```

---

## 발표/서비스 직전

```text
Azure Deployment
```

목표:

```text
실제 웹 서비스로 접속 가능
```

---

# 32. 최종 Backend 개발 흐름

```text
Git Clone
   ↓
Local .venv
   ↓
FastAPI
   ↓
Local PostgreSQL
   ↓
API 개발
   ↓
Alembic Migration
   ↓
Shared Development DB
   ↓
Frontend Integration
   ↓
AI Private API Integration
   ↓
Blob / OpenAI / TTS
   ↓
Docker Integration
   ↓
Azure Deployment
   ↓
Production DB
```

---

# 33. Backend 담당 최종 책임

Backend 담당자는 다음을 책임진다.

```text
Backend
├─ FastAPI
├─ API Contract
├─ Session / Auth
├─ PostgreSQL
├─ Alembic
├─ Blob Storage
├─ AI Private API Client
├─ OpenAI
├─ Moderation
├─ TTS
├─ Job Management
├─ Timeout / Error
├─ Secret
├─ Logging
├─ Docker
└─ Azure Deployment
```

하지만 모든 것을 첫날부터 만드는 것이 아니다.

```text
Local
↓
Integration
↓
Docker
↓
Deployment
```

순서로 확장한다.

---

# 34. 가장 중요한 정리

### `.venv`

```text
각 개발자 PC마다 생성
Backend 로컬 개발용
```

### Local DB

```text
개발 초반
Backend 혼자 개발할 때 사용
```

### Shared Development DB

```text
Frontend / Backend / AI 통합이 시작될 때 사용
배포 전에도 사용 가능
```

### Docker

```text
개발 중 통합 테스트에도 사용
실제 배포에도 사용
```

### Production DB

```text
실제 Azure 서비스 배포 단계에서 사용
개발 DB와 분리
```

### Azure

```text
개발 후반/통합 이후 실제 서비스 배포용
```

---

# 최종 한 줄

> **현재 Backend 개발자는 먼저 자기 PC의 `.venv + FastAPI + Local PostgreSQL` 환경을 완성하고, API 구조가 안정되면 Shared Development DB와 AI를 연결하며, 통합 단계에서 Docker로 실행환경을 고정하고, 마지막에 Azure의 Private Backend / Private AI 구조로 배포한다.**
