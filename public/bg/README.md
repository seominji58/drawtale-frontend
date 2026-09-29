장면 배경 24장이 들어갈 자리입니다.

파일 이름은 bg-{장소id}-{장면번호}.png 입니다.
  장소   space forest sea school town cave
  장면   0 맑음 · 1 흐림 · 2 빛이 돌아옴 · 3 노을
  예시   bg-forest-0.png

화풍과 프롬프트는 docs/art-direction.md 4.3 을 따릅니다.
가로 3:2, 아래 3분의 1은 캐릭터가 설 자리로 비워 둡니다.

파일을 다 넣은 뒤 src/api/mock/fixtures.ts 의
USE_REAL_BG 를 true 로 바꾸면 목 엔진이 이 파일을 씁니다.
