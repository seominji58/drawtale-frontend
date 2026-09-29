선택지 아이콘 24장이 들어갈 자리입니다.

경로는 /icons/{kind}/{id}.png 입니다.
id 는 kind 안에서만 유일하므로 폴더로 갈라 둡니다
(장소에 해를 넣으면 결과의 sun 과 부딪힙니다).

  place/    space  forest  sea  school  town  cave
  problem/  lost  rain  hungry  dark  fall  alone
  action/   ask  run  hide  help  wait  shout
  result/   home  friend  gift  sun  sleep  party

예시: public/icons/place/forest.png

화풍과 프롬프트는 docs/art-direction.md 를 따릅니다.
투명 배경 정사각 PNG 입니다.

파일을 다 넣은 뒤 src/api/mock/fixtures.ts 의
USE_REAL_ICONS 를 true 로 바꾸면 목 엔진이 이 파일을 씁니다.
실서버에서는 GET /api/steps 가 iconUrl 을 내려주므로
백엔드도 같은 경로 규칙을 쓰기로 합의해야 합니다 (docs/id-conventions.md 1절).
