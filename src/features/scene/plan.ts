/** S-09 장면 계획 — 쪽마다 어느 자리에서, 주인공 · 다른 인물 · 소품이 어떻게 움직이고 밤낮이 어떤지 (2026-11-03).
 *  앞 쪽에서 끝난 모습(주인공 자리 · 밤낮)을 다음 쪽이 이어받아 시작한다 — 쪽이 바뀌어도 장면이 이어져 보이게.
 *  움직임은 그 쪽에 들어올 때 한 번만 (쪽은 아이가 넘긴다 — 자동 전환 아님, pt_docs 14 16장) */
import type { BookPage } from "@/types/story";
import { ACTION_PROP } from "@/features/story/choices";
import { LOCATIONS, locationFor } from "./locations";
import AR from "./props-ar.json";

/** 남녀 그림이 따로 있는 직업 (2026-11-03 사용자 「인물 묶음별로 남녀 그림」) — 그림 이름은 `${종류}-m` · `${종류}-f` */
const GENDERED = ["caveguide", "astronaut", "ranger", "lifeguard", "shopkeeper", "keeper", "police", "cook", "mail",
  "spacepolice", "spacekid", "diver", "diverkid"] as const;
type Gendered = (typeof GENDERED)[number];
export type PersonId = "friend" | "friend2" | "adult" | "grandma" | "grandpa" | "mom" | "dad" | "teacher" | "baby" | "dog" | "cat"
  | `${Gendered}-${"m" | "f"}` | "nurse" | "busdriver" | "classmates" | "bat" | "bird" | "rabbit" | "squirrel" | "alien" | "aunt";
type Kind = Exclude<PersonId, `${Gendered}-${"m" | "f"}`> | Gendered;
export type PropId = PersonId | "cover" | "sign";
/** 사람 · 동물 (옆에 서는 것). 숨을 것 · 표지판은 아니다 */
export const isPerson = (id: PropId) => id !== "cover" && id !== "sign";

/** 「숨었어요」에서 주인공 앞을 가리는 물건 — 대본 글에 나온 숨는 곳으로 고른다 (11/3 사용자 「우주에서 박스에 숨는데 대본은 잠자리 주머니」).
 *  [낱말, 그림(public/scenes/ 기준), 화면 높이 대비 키]. 글에서 먼저 나온 것. 맞는 그림이 없으면(담요 · 잠자리 주머니 · 틈 …)
 *  물건 없이 사라지기만 한다 — pt_docs 05 S-09-05 「배경만 남긴다」 */
const COVERS: [RegExp, string, number][] = [
  [/상자|박스|포대|궤짝/, "props/box.webp", 0.36],
  [/덤불|수풀|풀숲|나무(?= ?(?:뒤|뿌리|밑|아래|사이|옆))|화분|잎/, "props/bush.webp", 0.38],
  [/바위|돌멩이|돌 /, "cave-entrance/rocks.webp", 0.3],
  [/계단/, "props/stairs.webp", 0.36],   // 「구령대 계단 아래에 숨었어요」 (11/12: 숨는 쪽에서 계단이 빠졌다)
  [/틈|돌벽|굴 벽/, "cave/rocks.webp", 0.3],
  [/통나무/, "forest-trail/log.webp", 0.22],
  [/고깃배|보트|배 (?:뒤|안|밑|옆)/, "sea-pier/boat.webp", 0.26],
  // 장소 그림에 이미 있는 물건을 앞에 하나 더 (11/3 「대본에 들어갔는데 실제로 없는 오브젝트」)
  [/미끄럼틀/, "playground/slide.webp", 0.5],
  [/파라솔/, "sea/parasol.webp", 0.48],
  [/사물함/, "school-hallway/lockers.webp", 0.48],
  [/책장/, "school-library/shelf.webp", 0.38],
  [/책상/, "school-classroom/desks.webp", 0.32],
  [/식탁|탁자/, "home-kitchen/table.webp", 0.34],
  // 이미 있는 장소 그림을 숨는 곳으로 (11/11 전수 점검: 「소파 뒤 · 신발장 뒤 · 의자 뒤」에 숨을 것 없이 주인공이 그냥 사라졌다)
  [/소파|쿠션/, "home-living/sofa.webp", 0.34],
  [/침대/, "home-bedroom/bed.webp", 0.32],
  [/신발장|사물함|옷장|장롱|책꽂이/, "school-hallway/lockers.webp", 0.46],
  [/장난감 (?:상자|통)/, "home-bedroom/toybox.webp", 0.28],
  [/의자/, "space-ship/seat.webp", 0.32],
  [/버섯/, "forest/mushroom.webp", 0.34],
  // 새로 그린 숨는 곳 (11/3, tools/art/gen_objects.py)
  [/담요|이불|침낭|잠자리 주머니|돗자리/, "props/blanket.webp", 0.3],
  [/텐트/, "props/tent.webp", 0.44],
  [/모래 언덕/, "props/dune.webp", 0.26],
  [/시소/, "props/seesaw.webp", 0.2],
  [/정자|기둥/, "props/pavilion.webp", 0.56],
  [/구령대/, "props/podium.webp", 0.24],
  // 「커튼 뒤에 숨었어요」 (11/11, tools/art/gen_scene_props4.py): 숨을 그림이 없어 주인공이 그냥 사라졌다 (저장 이야기 3편)
  [/커튼/, "props/curtain.webp", 0.5],
];

/** 쪽 글에 나오면 주인공 옆에 놓는 물건 (11/3 사용자 「대본에 들어갔는데 실제로 없는 오브젝트」 · 「물건은 전부 만들어줘」 —
 *  카드 이야기 512가지에서 센 것, 아티팩트 「대본 인물 · 물건 목록」).
 *  [낱말, 그림(public/scenes 기준), 화면 높이 대비 키, 놓는 자리]. 가로세로 비율은 오린 그림에서 잰 값(props-ar.json).
 *  「공」 · 「게」 · 「새」처럼 짧은 낱말은 다른 낱말 속 글자가 걸리지 않게 낱말 단위로.
 *  놓는 자리: ground 땅(발끝), air 공중(새 · 박쥐 · 풍선), wall 벽(시계 — 실내에서만, 바깥이면 뺌) */
type Spot = "ground" | "air" | "wall";
const W1 = (w: string) => new RegExp(`(?:^|[^가-힣])${w}(?:을|를|이|가|은|는|과|와|도|랑|들|한 마리|의)?(?=[^가-힣]|$)`);
/** 소품 키는 주인공 키(장소 hero.h 0.52 = 아이 약 1.1m) 기준 실제 크기로 (11/9 사용자 「가로등 같은 것들은 사이즈가 여유가 있어야 하는데
 *  작은 소품들이랑 같은 사이즈인 것들이 있다」). 의자 · 울타리 · 대문 · 우체통 · 깃발 · 텐트 · 표지판 · 배 · 우주선 · 로켓이 0.14~0.36 이라
 *  손에 드는 물건과 비슷했다. 아주 큰 것은 화면에 들어오게 줄여 잡는다(텐트 · 우주선 · 로켓 0.55~0.6, 대문은 0.55 면 마을 집보다 커 0.45).
 *  자리가 없으면 SceneStage 가 0.75 · 0.55 배로 줄여 놓는다 */
const THINGS: [RegExp, string, number, Spot][] = [
  [/손전등/, "props/flashlight.webp", 0.1, "ground"],
  [/랜턴|등불/, "props/lantern.webp", 0.17, "ground"],
  [W1("공"), "props/ball.webp", 0.12, "ground"],
  [/빵(?!빵|집)/, "props/bread.webp", 0.08, "ground"],   // 「빵집 주인 아저씨」는 빵이 아니다 (11/11, 151번)
  [/의자/, "props/chair.webp", 0.3, "ground"],
  [/벤치/, "town-park/bench.webp", 0.28, "ground"],
  [/반창고/, "props/bandage.webp", 0.08, "ground"],
  [/풍선/, "props/balloons.webp", 0.3, "air"],
  // 11/3 밤 30장
  [/둥지/, "props/nest.webp", 0.1, "ground"],
  [/크레파스|크레용|도화지/, "props/crayons.webp", 0.1, "ground"],
  [/쿠션|방석/, "props/cushion.webp", 0.1, "ground"],
  [/깔개|매트|러그/, "props/rug.webp", 0.07, "ground"],
  [/울타리/, "props/fence.webp", 0.28, "ground"],
  [/대문/, "props/gate.webp", 0.45, "ground"],
  [/조개|불가사리/, "props/shells.webp", 0.07, "ground"],
  [/웅덩이/, "props/puddle.webp", 0.05, "ground"],
  // 「등대 아래 돌계단」은 등대 그림 쪽 (11/4). 전에는 「^(?!.*등대).*계단」이라 문장 처음부터 계단까지를 통째로 잡아, 그 사이의 구름다리 · 철문이
  // 「같은 낱말」로 지워지고 계단이 쪽 첫머리에 나타났다 (11/12 글이 말하는 물건 점검)
  [/(?<!(?:등대|구령대)[^.!?]{0,10})계단/, "props/stairs.webp", 0.3, "ground"],   // 구령대 계단은 구령대 그림   // 등대 돌계단 · 등대 안 계단에 장난감 계단이 섰다 (11/4)
  [/가방|배낭/, "props/backpack.webp", 0.14, "ground"],
  [/시계/, "props/clock.webp", 0.13, "wall"],
  [/모자/, "props/hat.webp", 0.08, "ground"],
  [/블록|블럭/, "props/blocks.webp", 0.1, "ground"],
  // 「책도 · 책들 · 책은」도 (11/4 「책을 떨어트렸어요」에 책이 안 나왔다). 「산책을」 · 「책상」 · 「책장」 빼고
  [/그림책|동화책|공책|(?<!산)책(?=을|이|도|들|은|는|과|만|한 권| 한)|책장을 넘/, "props/books.webp", 0.1, "ground"],
  [/갈매기/, "props/seagull.webp", 0.07, "air"],   // 11/4 나는 모습(가로로 긴 그림)이라 키를 낮춤
  [/우주선/, "props/spaceship.webp", 0.6, "ground"],
  [/양동이|삽으로|삽을|모래 삽/, "props/sandtoys.webp", 0.12, "ground"],
  [/우유|코코아|보리차|컵/, "props/milk.webp", 0.08, "ground"],
  [/도토리/, "props/acorns.webp", 0.06, "ground"],
  // 솔방울 (11/10 새 그림, 전에는 도토리 그림으로 대신했다. 저장 카드 이야기 64쪽)
  [/솔방울/, "props/pinecone.webp", 0.06, "ground"],
  [/선물/, "props/gift.webp", 0.12, "ground"],
  [/인형/, "props/teddy.webp", 0.14, "ground"],
  // 「게」는 앞 글자와 떨어진 것만 — 「가게를」 · 「빨래집게가」에 꽃게가 섰다 (11/9 배치 검사)
  [/꽃게|소라게|작은 게|꼬마 게|아기 게|(?<![가-힣])게(?: 한|가|를|도)(?![가-힣])/, "props/crab.webp", 0.07, "ground"],
  [/(?<!나뭇가지 |나뭇잎 |종이 |작은 |꼬마 )깃발/, "props/flag.webp", 0.48, "ground"],   // 「성 꼭대기에 나뭇가지 깃발을 꽂았어요」는 큰 깃발이 아니다 (11/11)
  [/우체통/, "props/mailbox.webp", 0.44, "ground"],
  // 구름다리(놀이터 기구) · 징검다리는 나무 다리가 아니다 (11/10 소품 점검: 놀이터 · 우주 「별 징검다리」에 나무 다리가 섰다)
  [/(?<!구름|징검)다리를 건|나무다리|돌다리|(?<!구름|징검)다리 위|작은 다리/, "props/bridge.webp", 0.22, "ground"],
  // 징검돌 그림 (숲 시냇물 배경의 그것). 「별 징검다리」(우주)는 별을 밟는 것이라 놓지 않는다
  [/(?<!별 ?)징검다리|징검돌/, "forest-stream/rocks.webp", 0.12, "ground"],
  [/수건|손수건/, "props/towel.webp", 0.07, "ground"],
  [/케이크|쿠키|과자|간식/, "props/cake.webp", 0.1, "ground"],
  [/우산/, "props/umbrella.webp", 0.34, "ground"],
  // 장난감 기차 그림이라 진짜 기차를 타는 말은 빼고 — 「기차에서 엄마에게 기대어 잠이 들었어요」에 동굴 바닥 장난감 기차 (11/9 배치 검사)
  [/기차(?!에서|를 ?타|에 ?타|를 탔|에 올|역|표|길|소리|가 (?:출발|도착|달|지나|멈|떠))/, "props/toytrain.webp", 0.1, "ground"],
  [/화분/, "props/flowerpot.webp", 0.16, "ground"],
  // 대본 인물로 나오지 않고 글에만 나오는 작은 동물 (인물로 나오면 인물 그림이 선다)
  // 「새 책 · 새 친구 · 새 둥지」의 새(new)는 빼고 — 조사가 붙거나 「작은 새」처럼 꾸밈말이 앞에 올 때만 (11/4, 씨앗 문장 120개가 잘못 걸렸다)
  // 「새들이 · 아기 새들이」(들 뒤에 조사)와 참새 · 비둘기 · 부엉이 · 올빼미 · 까치 · 까마귀 · 산새도 (11/12 전수 점검: 새 문장 80쪽에 새가 없었다)
  [/(?:^|[^가-힣])새(?:들)?(?:를|가|는|도|이|와|랑|의|야|에게|한 마리|두 마리)(?=[^가-힣]|$)|(?:^|[^가-힣])새들(?=[^가-힣]|$)|(?:작은|아기|파랑|파란|예쁜|노란|빨간|하얀|조그만|귀여운|어미|엄마|아빠|산|바다) ?새(?:들)?(?=[^가-힣]|이|가|은|는|도|을|를|와|에게|$)|참새|비둘기|부엉이|올빼미|까치(?!발)|까마귀|딱따구리|종달새|제비(?!꽃)/,
    "props/bird.webp", 0.12, "air"],
  [/박쥐/, "props/bat.webp", 0.14, "air"],
  [/토끼/, "props/rabbit.webp", 0.16, "ground"],
  [/(?<!솔방울 |도토리 |솔방울로 만든 )다람쥐/, "props/squirrel.webp", 0.11, "ground"],   // 「솔방울 다람쥐」는 만든 장난감 (11/12)
  // 고양이 · 강아지 그림은 대본 인물로만 쓰였다. 글에만 나오는 것도 (11/12 전수 점검). 「강아지 집 · 고양이 인형」은 아래 NOT_REAL · 자리 말로 걸러짐
  [/고양이/, "props/cat.webp", 0.14, "ground"],
  [/강아지(?! ?집)/, "props/dog.webp", 0.16, "ground"],
  // 그림이 없던 동물 (11/12 전수 점검, tools/art/gen_scene_props8.py)
  [/개구리/, "props/frog.webp", 0.07, "ground"],
  [/반딧불/, "props/firefly.webp", 0.05, "air"],
  [/금붕어|어항/, "props/fishbowl.webp", 0.13, "ground"],
  [/거북/, "props/turtle.webp", 0.08, "ground"],
  [/해파리/, "props/jellyfish.webp", 0.09, "ground"],
  // pt_docs 18 「장면 소품 보강」 (11/4) — A. 숨는 곳 그림을 옆에 놓인 물건으로도 (가림막보다 작게)
  [/담요|이불/, "props/blanket.webp", 0.12, "ground"],
  [/상자|박스/, "props/box.webp", 0.16, "ground"],
  [/모래 언덕/, "props/dune.webp", 0.16, "ground"],   // 「언덕」만이면 뒷산 언덕도 걸린다
  [/시소/, "props/seesaw.webp", 0.26, "ground"],
  // 「그네에 앉아」인데 그네 없는 길 · 공원이었다 (11/11 렌더 검사): 놀이터 배경의 그네 그림을 쪽 소품으로 (배경에 그네가 있으면 안 놓는다)
  [/그네/, "playground/swing.webp", 0.4, "ground"],
  [/텐트/, "props/tent.webp", 0.55, "ground"],
  // B. 장소 배경에만 있던 그림을 다른 장소에서도 (배경에 이미 있으면 SceneStage 가 또 놓지 않는다)
  // 「돌았어요」 · 「돌아왔어요」 빼고, 짧은 「돌」은 앞 글자와 떨어진 것만 — 「곰돌이 컵」에 부엌 바닥 돌멩이 (11/9 전체 배치 검사)
  // 돌 하나 (징검돌 그림에서 오려 낸 것, 11/10). 전에는 징검돌 그림을 작게 세워 「작은 돌에 걸려」가 돌 셋을 쌓은 것처럼 보였다
  [/돌멩이|작은 돌|(?<![가-힣])돌(?:들|을 |이 | 위)/, "props/pebble.webp", 0.05, "ground"],
  [/돌탑/, "forest-stream/rocks.webp", 0.09, "ground"],
  // 그루터기 (11/10 새 그림). 앉을 수 있는 아이 무릎 높이
  [/그루터기/, "props/stump.webp", 0.17, "ground"],
  [/바위/, "cave/rocks.webp", 0.3, "ground"],
  [/꽃(?!게|집)|장미/, "forest-flowers/flowers.webp", 0.12, "ground"],   // 「꽃집 주인」은 꽃이 아니다 (11/11, 108번)
  [/식탁/, "home-kitchen/table.webp", 0.34, "ground"],
  // 등대는 소품으로 세우지 않는다 — 주인공 옆 땅에 아이 키만 한 등대가 장난감처럼 섰다 (11/4 사용자). 등대는 부두 배경(sea-pier)에 크게 있다
  [/버섯/, "forest/mushroom.webp", 0.1, "ground"],
  // C. 새로 그린 12장 (tools/art/gen_scene_props.py)
  [/나뭇잎|낙엽/, "props/leaves.webp", 0.07, "ground"],
  // 주인공이 신고 있는 신발(끈을 묶었어요 · 신발 끝에 물이 · 신발을 신고)은 놓지 않는다: 「신발 끈을 꼭 묶었어요」에 주인공 발 옆에
  // 운동화 한 켤레가 또 놓였다 (11/11 사용자). 벗어 놓은 신발 · 신발장 앞 신발만
  [/(?:운동화|신발)(?!\s?(?:끈|끝|코|이 젖|이 흠뻑|이 축축|에 (?:흙|물|모래)|이 (?:벗겨|미끄))|장)(?!(?:을|를)?\s?(?:꼭\s?|다시\s?|얼른\s?)?신(?:고|었|은|어|는))/, "props/sneakers.webp", 0.07, "ground"],
  [new RegExp(`${W1("나비").source}|(?<![가-힣])나비들`), "props/butterfly.webp", 0.08, "air"],   // 「나비들이」 (11/12)
  [/발자국/, "props/footprints.webp", 0.04, "ground"],
  [/화살표/, "props/arrow.webp", 0.4, "ground"],
  // D. 글에 나오는데 그림이 없던 놀이터 · 바깥 물건 (11/11 사용자 994번 「터널이라는데 내용도 이상하고」, tools/art/gen_scene_props5.py).
  // 구름다리는 저장 이야기에서 「매달려 · 쇠막대 · 한 칸씩」이 대부분이라 매달리는 사다리. 모래 터널 · 터널을 파는 말은 빼고(아래 thingsFor)
  [/구름다리/, "props/monkeybars.webp", 0.4, "ground"],
  [/(?<!모래 )터널(?!을 (?:뚫|파))/, "props/tunnel.webp", 0.2, "ground"],
  [/안내소/, "props/booth.webp", 0.5, "ground"],
  [/정문|교문|철문/, "props/parkgate.webp", 0.45, "ground"],
  // E. 다른 장소 배경에만 있던 그림을 글이 말하면 소품으로 (11/11 글이 말하는 물건 전수 점검: 길 · 학교 · 바닷가에서 「가로등 · 화단 · 미끄럼틀 ·
  // 분수 · 쉼터」를 말해도 그림이 없었다). 배경에 이미 있으면 SceneStage 가 또 놓지 않는다
  [/미끄럼틀/, "playground/slide.webp", 0.42, "ground"],
  [/가로등/, "town/lamp.webp", 0.46, "ground"],
  [/화단/, "playground-path/flowerbed.webp", 0.14, "ground"],
  [/분수/, "town-park/fountain.webp", 0.26, "ground"],
  [/쉼터|정자/, "props/pavilion.webp", 0.5, "ground"],
  [/침대/, "home-bedroom/bed.webp", 0.3, "ground"],
  [/소파/, "home-living/sofa.webp", 0.26, "ground"],
  // 「책장이 점점 가까워졌어요」의 책장(책꽂이). 「책장이 사락사락 넘어가 · 책장을 넘겼어요」는 책의 쪽이라 빼고 (11/12)
  [/책꽂이|책장(?!(?:이|을|을 한 장|이 한 장)?\s?(?:[가-힣]+\s)?(?:넘|사락|팔락|펄럭))/, "school-library/shelf.webp", 0.4, "ground"],
  // 버스 안에서 탄 말(「버스를 타고 가다가 · 버스 창문에」)은 빼고, 버스가 서거나 지나가는 바깥 장면만 (11/12)
  [/버스(?! ?(?:를 타|에 타|안|창문|정류장|기사|를 기다))/, "town-busstop/bus.webp", 0.4, "ground"],
  // F. 새로 그린 5장 (11/11 글이 말하는 물건 점검, tools/art/gen_scene_props6.py). 줄넘기 줄 · 「그물 무늬」는 빼고
  [/정글짐/, "props/junglegym.webp", 0.42, "ground"],
  [/밧줄/, "props/rope.webp", 0.08, "ground"],
  [/연못/, "props/pond.webp", 0.12, "ground"],   // 「연못가에 앉았어요」도 연못이 있다 (11/12)
  [/(?<!거미|별 ?)그물(?! ?무늬| ?모양)/, "props/net.webp", 0.3, "ground"],   // 우주 「별 그물」은 고기잡이 그물이 아니다
  [/책상/, "props/desk.webp", 0.3, "ground"],
  // 숲 나무 다리 · 방파제 길 · 동굴 길의 「난간을 잡고 걸었어요」(11/11 사용자 「난간도 그려서 넣어줘」, gen_scene_props7.py). 아이 허리 높이
  [/난간/, "props/railing.webp", 0.22, "ground"],
  [/모래성/, "props/sandcastle.webp", 0.13, "ground"],
  [/행성/, "props/planet.webp", 0.14, "air"],
  [W1("지구"), "props/earth.webp", 0.14, "air"],
  [/종이 울|종을 |종소리|종이 땡/, "props/bell.webp", 0.1, "ground"],   // 「종이」 · 「하루 종일」 빼고
  [/바구니/, "props/basket.webp", 0.1, "ground"],
  [W1("지도"), "props/map.webp", 0.07, "ground"],
  [/물고기/, "props/fish.webp", 0.08, "air"],
  // D. 2차 14장 (11/6, tools/art/gen_scene_props2.py) — 카드 이야기 512편에서 글에 나오는데 그림이 없던 손에 드는 물건.
  // 「배가 꼬르륵」 · 「사과했어요」 · 「북쪽」 · 「소라게」처럼 다른 뜻은 빼고
  [/(?:작은|큰|나무|고깃|돛단|나룻|종이|아빠) ?배(?=를|가|에|는|도| 한| 하나|[^가-힣]|$)|배 한 척|배를 타|배에 (?:타|올)|배가 (?:들어|떠|둥둥|통통|출렁)|배 위에|배에서 내/,
    "props/boat.webp", 0.28, "ground"],
  [/별똥별/, "props/shootingstar.webp", 0.1, "air"],
  [/헬멧/, "props/helmet.webp", 0.1, "ground"],
  [/(?:빨간|노란|초록|맛있는|커다란|작은) 사과|사과 (?:한|두|세|하나)|사과를 (?:따|먹|사각|건네|깎|닦|주|받|골|사|하나|한 |두 |세 |쥐|들)|사과(?:와|,)|사과가 (?:수북|주렁|떨어|데굴|열)/,
    "props/apple.webp", 0.07, "ground"],
  [/식판/, "props/tray.webp", 0.06, "ground"],
  [/베개/, "props/pillow.webp", 0.09, "ground"],
  [/물뿌리개/, "props/wateringcan.webp", 0.1, "ground"],
  [/편지/, "props/letter.webp", 0.06, "ground"],
  [/리본/, "props/ribbon.webp", 0.07, "ground"],
  [/우주 ?장갑|우주복 장갑/, "props/spacegloves.webp", 0.07, "ground"],
  [/(?<!우주 |우주|우주복 )장갑/, "props/mittens.webp", 0.06, "ground"],
  [/(?:^|[^가-힣])북(?:을|를|이|가|은|는|과|와|도|에|소리를|소리가)?(?=[^가-힣]|$)/, "props/drum.webp", 0.11, "ground"],
  [/소라(?!게|빵)/, "props/conch.webp", 0.07, "ground"],
  [/로켓/, "props/rocket.webp", 0.6, "ground"],
];
/** 오린 그림의 가로 ÷ 세로 (tools/art/process_cast2.py 가 잰다). 없으면 1 */
const ar = (src: string) => (AR as Record<string, number>)[src] ?? 1;
/** 한 쪽에 놓는 물건은 이만큼까지 (내 소품 포함) */
const MAX_THINGS = 3;

export interface ThingPlan {
  /** 그림 주소 (장면 그림이면 public/scenes 기준 경로, 내 소품이면 data URL) */
  src: string;
  /** 화면 높이 대비 키 · 가로 ÷ 세로 */
  h: number;
  ar: number;
  /** 땅 · 공중 · 벽 (내 소품은 땅) */
  spot?: Spot;
  /** 내 소품이면 그 이름 (그림 설명) */
  name?: string;
  /** 쪽 글에서 이 물건이 나온 자리 (글자 위치) — 그 문장의 말로 움직임을 고른다 */
  at?: number;
  /** 소품 움직임 (thingMotion) — 없으면 가만히 */
  motion?: ThingMotion;
  /** 대본 문장이 말한 자리 · 움직임 (thingPose) — 없으면 주인공 옆 땅 */
  pose?: ThingPose;
  /** 손에 듦 · 머리에 씀이면 그 사람 — "hero" 또는 그 쪽 인물 이름(PropPlan.name) · 그림(PropPlan.id) */
  holder?: string;
  /** 문장에서 소품 앞의 주어 (planPages 가 holder 로 바꾼다) */
  subject?: string;
  /** 붙박이 물건의 이어짐 열쇠 (이야기 안에서 같은 물건이면 같은 값). SceneStage 가 처음 놓은 자리 · 크기를 이 열쇠로 기억해
   *  다음 쪽에도 그대로 쓴다 (11/10 사용자 「사라지는 타이밍, 위치, 크기 다 중요해」) */
  keep?: string;
  /** 이 쪽 글에는 없고 앞 쪽에서 이어 온 것 (같은 배경 동안). 처음 나올 때의 움직임(떨어짐 · 굴러감)은 다시 하지 않는다 */
  kept?: boolean;
  /** 이 쪽에서 처음 나오는 물건이면 나레이션이 그 말에 왔을 때(0~1, readAt) 나타난다. 없으면 처음부터 (11/10 사용자 「소품 애니메이션을 대사에 맞춰서」) */
  appearAt?: number;
  /** 「할머니가 사과를 손에 쥐여 주었어요」: 처음엔 주는 사람(from) 손에, 나레이션이 주는 말(at)에 오면 받는 사람(holder) 손으로 옮겨 간다 */
  give?: { from: string; at: number };
}

/** 소품이 문장에서 어디 있나 · 어떻게 움직이나 (11/4 사용자 시안 https://claude.ai/artifact/Fe8gN919XC7rDqUaxHEAw4 「그렇게 진행하자」).
 *  water 바다에 떠내려감 · blown 바람에 날아감 · high 나무에 걸림 · fall 떨어짐 · head 머리에 씀 · hand 손에 듦
 *  window 실내에서 창밖에 보임 (새 · 나비 · 행성) — 창문 그림 안에만, 창문이 없는 방이면 놓지 않는다
 *  mouth 입에 묾 · back 등에 태움 (2026-11-06, pt_docs 20 2-a) — 4족형 주인공만. 사람은 보통 자리로 */
export type ThingPose = "water" | "blown" | "high" | "fall" | "head" | "hand" | "window" | "mouth" | "back";
/** 「창밖에 작은 새가」 — 실내 장면에서 공중 소품이 방 안을 날지 않게 (11/4 사용자) */
const WINDOW_TEXT = /창\s?밖|창문\s?밖|창문 너머|유리창|창가|창문으로|창문에|창문을/;
// 소품 낱말 바로 뒤에 조사(이 · 가 · 을 · 를 · 은 · 는 · 도)가 붙고 그 뒤에 오는 동사만 본다 — 「물방울이 바위 위로 떨어졌어요」의
// 바위 · 「벤치에 앉아 공을 안았어요」의 벤치처럼 그 동사의 주인이 아닌 소품이 걸리지 않게 (씨앗 문장 14,154개로 시험)
const POSES: [ThingPose, RegExp][] = [
  ["water", /떠내려|둥둥 떠|물에 떠|바다에 떠|파도에 (?:밀|쓸)|물결에 (?:밀|흔들)|물에 빠|바다에 빠|개울에 빠/],
  // 「바람에 날아가 나뭇가지에 걸렸대요」는 마지막 모습(걸림)이 먼저
  ["high", /(?:나무|나뭇가지|가지)에 (?:걸|매달|대롱)|나무 위에 (?:걸|있|매달)/],
  ["blown", /바람에 날아|날아가 버|날아갔|날려 갔|휙 날아|훨훨 날아/],
  ["fall", /떨어졌|떨어뜨|떨어트|툭 떨어|뚝 떨어/],
  // 「물었어요」는 「묻다」(물어봤다)이기도 해서 뺀다. 「물고기」는 띄어쓰기로 빠진다
  ["mouth", /입에 (?:물|넣)|입으로 물|(?:꼭|살짝|덥석|앙) 물|물고 |물어 (?:왔|날랐|옮)/],
  ["back", /(?<!발)등에 (?:태우|태웠|태워|업|얹|싣|실|올려|올렸)/],   // 「발등에 올려」 빼고
  ["head", /머리에 (?:쓰|썼|얹)|^\s*(?:(?:꾹|푹|눌러|살짝)\s*)*(?:쓰고|썼|써)/],
  // 「풍선이 둥실 내려와 친구 품에 쏙 안겼어요」 — 품에 · 손에 와 안겼 사이에 쏙 · 폭 · 꼭이 끼어도 (11/10)
  ["hand", /^\s*(?:꼭 |높이 |두 손에 |손에 )?(?:든|쥔|안은) [가-힣]|손에 (?:들|쥐|꼭)|(?<![가-힣])(?:들고|쥐고) |(?:높이|번쩍|두 손으로|살짝) 들(?:었|어|고)|들어 (?:주|보이|올리)|(?:품|손)에 (?:(?:쏙|폭|꼭|살포시|사뿐)\s*)?(?:안|들어|잡|쥐)|꼭 안|껴안|안고 |^\s*[가-힣]+(?:의)? 품(?: 안)?에서 /],   // 「곰 인형도 토토 품에서 흔들흔들」: 소품 바로 뒤 「누구 품에서」만 (11/11)
];
/** 사람을 가리키는 말 끝 (「~도」 주어를 사람일 때만 볼 때) */
const PERSON_TAIL = /(?:친구|엄마|아빠|할머니|할아버지|선생님|아저씨|아주머니|아줌마|이모|고모|삼촌|언니|오빠|형|누나|동생|안내원|선장님?|박사님?|요원|경찰관|지킴이|등대지기|소방관|의사|간호사)$/;
/** 손에 들고 쓰는 물건: 「할머니가 랜턴을 켰어요 · 아빠가 손전등을 흔들었어요」도 그 사람 손에 (11/12 전수 점검 40번: 랜턴이 땅에 놓였다) */
const HANDHELD = new Set(["props/lantern.webp", "props/flashlight.webp", "props/umbrella.webp", "props/basket.webp", "props/balloons.webp"]);
const HANDHELD_USE = /^\s*(?:(?:[가-힣]+,?\s){0,2})?(?:켰|켜고|켜며|켜자|켜서|켜 들|켜 주|비추|비췄|비춰|흔들었|흔들며|흔들고|흔들어|가려|가렸|쓰고|썼|펼쳤|펴 들|폈)/;
/** 물건 바로 뒤 「(다시 · 꼭) 쥐었어요 · 들었어요 · 안았어요 · 끌어안았어요」 */
const HOLD_NOW = /^\s*(?:(?:다시|꼭|살며시|살짝|두 손으로|단단히|소중히|조심조심|조심스럽게|얼른|번쩍|높이|주워|꺼내|집어|하나|하나를|한 개)\s?){0,3}(?:쥐었|쥐어|쥐고|쥐며|안았|안아|끌어안|들었|들어 보|집어 들|주워 들)/;
/** 꾸밈말(「작은 · 반짝이는」)은 주어가 아니다. 「나는」은 빼고 */
const ADNOMINAL = /^(?:작은|높은|낮은|같은|많은|적은|좋은|넓은|깊은|얕은|붉은|검은|밝은|맑은|젖은|늙은|낡은|굵은|얇은|짧은|둥근|동그란|커다란|조그만|반짝이는|빛나는|하는|있는|없는|웃는|우는|노는|자는|보는|오는|가는|새로운|따뜻한|차가운|예쁜|귀여운)$/;
/** 손에 들고 쓰는 물건의 낱말 (이어 들기에서 내려놓는 말을 찾을 때) */
const HELD_WORD: Record<string, RegExp> = { "props/lantern.webp": /랜턴|등불|초롱/, "props/flashlight.webp": /손전등/, "props/umbrella.webp": /우산/,
  "props/basket.webp": /바구니/, "props/balloons.webp": /풍선/ };
/** 사람 생김새(대본 character_sheet)에 지닌 물건 → 그 그림 */
const CARRIED: [RegExp, string][] = [[/lantern/i, "props/lantern.webp"], [/flashlight|torch/i, "props/flashlight.webp"], [/umbrella/i, "props/umbrella.webp"], [/basket/i, "props/basket.webp"]];
function thingPose(text: string, at: number, end: number, spot: Spot, indoor = false, src = ""): { pose?: ThingPose; subject?: string } {
  let from = Math.max(text.lastIndexOf(".", at), text.lastIndexOf("!", at), text.lastIndexOf("?", at), text.lastIndexOf("”", at)) + 1;
  // 「할머니가 “이제 갈 시간이야” 하며 랜턴을 켰어요」: 대사 뒤 「하며 · 하고 · 라고」로 이어지면 대사 앞까지 한 문장 (11/12 전수 점검: 주인공 손에 들렸다)
  if (text[from - 1] === "”" && /^\s*(?:하며|하고|하자|하면서|라고|이라고|하고는)\s/.test(text.slice(from))) {
    const open = text.lastIndexOf("“", from - 1);
    if (open >= 0) from = Math.max(text.lastIndexOf(".", open), text.lastIndexOf("!", open), text.lastIndexOf("?", open), text.lastIndexOf("”", open - 1)) + 1;
  }
  const ends = [".", "!", "?", "”"].map((c) => text.indexOf(c, end)).filter((i) => i >= 0);
  const sentence = text.slice(from, ends.length ? Math.min(...ends) + 1 : text.length);
  if (indoor && spot === "air" && WINDOW_TEXT.test(sentence)) return { pose: "window" };
  const after = text.slice(end, from + sentence.length);
  // 「도토리 하나를 주워 들고 · 랜턴 빛을 손으로 가려」처럼 낱말 뒤에 수 · 빛 말이 붙어도 (11/12 전수 점검)
  const lead = /^[가-힣]{0,3}?(?:이|가|을|를|은|는|도)(?=[\s,]|$)|^(?:이|가|을|를|은|는|도)|^\s(?:하나|한 개|두 개|세 개|몇 개|한 알|한 송이|한 줌|한 움큼|빛|불빛|불)(?:을|를|만|도|이)?(?=[\s,]|$)/.exec(after);
  // 「솔방울 다람쥐를 · 빵 봉투를 · 소라 껍데기를 꼭 안았어요」처럼 두 낱말 이름은 손에 듦일 때만 (11/12 전수 점검)
  // 「손전등으로 바위 옆을 비췄어요」도 든 것
  const lead2 = lead ? null : /^\s[가-힣]{1,4}(?:을|를)(?=\s)|^(?:으로|로)(?=\s)/.exec(after);
  if (!lead && !lead2) return {};
  const rest = after.slice((lead ?? lead2)![0].length);
  let pose = POSES.find(([, rx]) => rx.test(rest))?.[0];
  // 「물뿌리개를 다시 꼭 쥐었어요 · 마지막 블록을 들었어요 · 화분을 꼭 끌어안았어요」 (11/12 전수 점검: 땅에 놓였다)
  if (!pose && HOLD_NOW.test(rest)) pose = "hand";
  if (!pose && HANDHELD.has(src) && HANDHELD_USE.test(rest)) pose = "hand";
  if (lead2 && pose !== "hand") return {};
  if (!pose) return {};
  if (spot === "air" && (pose === "water" || pose === "blown")) return {};   // 행성 · 새는 원래 떠 있고 날아다닌다
  if (pose === "head" && !/모자|왕관|나뭇잎|화관/.test(text.slice(at, end))) return {};
  // 주어: 소품 앞에서 마지막으로 「…이/가/은/는」 붙은 말. 「내 손에 쥐여 주었어요」면 주인공
  const before = text.slice(from, at);
  // 「나는 작은 바구니를」의 「작은」 같은 꾸밈말은 주어가 아니다 (11/12 전수 점검: 주인공 손이 아니라 땅에 놓였다)
  const subj = [...before.matchAll(/([가-힣{}:]+(?: [가-힣]+){0,2}?)(?:이|가|은|는|께서)\s/g)].filter((m) => !ADNOMINAL.test(m[0].trim().split(/\s+/).pop()!)).pop()?.[1];
  // 「오늘 나는」처럼 주어 앞에 꾸밈말이 붙어도 마지막 낱말로 본다 (11/6 — 「오늘 나」가 주인공이 아닌 것으로 읽혔다)
  // 「할아버지도 손전등을 들고」 — 사람 말에 「도」가 붙으면 그 사람 (11/10 전수 점검: 주인공 손에 쥐여졌다)
  const also = [...before.matchAll(/([가-힣]+(?: [가-힣]+){0,2}?)도\s/g)].pop();
  if (also && PERSON_TAIL.test(also[1]) && (!subj || before.lastIndexOf(also[0]) > before.lastIndexOf(subj))) return pose === "hand" || pose === "head" ? { pose, subject: also[1] } : { pose };
  const subjLast = subj?.split(/\s+/).pop() ?? "";
  // 「나」 · 「내가」 와 같을 때만 — 「나비가」 · 「나무가」 는 주인공이 아니다
  const me = isMe;
  // 「친구 품에 안겼어요」 · 「아저씨 손에 들어왔어요」 — 품 · 손의 주인이 든 사람 (소품이 주어라 앞에서 주어를 찾으면 주인공이 됐다)
  // 「공을 꼭 안고 엄마 품에 기댔어요」의 엄마는 공을 든 사람이 아니다: 품 · 손에 「안기다 · 들어가다 · 쥐다」일 때만 (11/11 전수 점검)
  // 「곰 인형도 토토 품에서 흔들흔들」처럼 품 · 손 안에서 하는 것도 그 사람이 든 것
  const owner = (/([가-힣]+(?: [가-힣]+)?)(?:의)? (?:품|손)에 (?:(?:쏙|폭|꼭|살포시|사뿐|가득)\s*)?(?:안|들어|잡|쥐|놓|담|올려)/.exec(rest)
    ?? /([가-힣]+(?: [가-힣]+)?)(?:의)? (?:품|손)(?: 안)?에서/.exec(rest))?.[1];
  // 「손전등을 든 엄마 · 등불을 든 동굴 안내원이」 — 든 사람이 뒤에 온다 (11/10 전수 점검: 땅에 놓였다)
  const heldBy = /^\s*(?:꼭 |높이 |두 손에 |손에 )?(?:든|쥔|안은) ([가-힣]+(?: [가-힣]+){0,2}?)(?:이|가|은|는|도|와|과|께서|였|이었|이에요|예요|$|[\s,.!])/.exec(rest)?.[1];
  if (heldBy && pose === "hand") return { pose, subject: me(heldBy) ? "hero" : heldBy };
  if (owner && pose === "hand" && !/^(?:내|나의|제)$/.test(owner)) return { pose, subject: owner };
  // 「안내원의 손전등이 · 아저씨 손전등이 길을 비춰 줬어요」: 물건 앞에 붙은 사람이 그 물건을 든 사람 (11/12 전수 점검)
  const ownerBefore = /([가-힣]+?(?: [가-힣]+?)?)(?:의)? $/.exec(text.slice(Math.max(from, at - 14), at))?.[1];
  if (pose === "hand" && ownerBefore && PERSON_TAIL.test(ownerBefore)) return { pose, subject: ownerBefore };
  const subject = /내 손|내 품|나에게|내게/.test(rest) || !subj || me(subj) || me(subjLast) ? "hero" : subj;
  // 입에 묾 · 등에 태움은 소품이 목적어(「공을 물고」)일 때만 — 「새가 벌레를 물고」의 새는 무는 쪽이다
  if ((pose === "mouth" || pose === "back") && !/(?:을|를|도)$/.test((lead ?? lead2)![0])) return {};
  if (pose === "hand" || pose === "head" || pose === "mouth" || pose === "back") return { pose, subject };
  return { pose };
}

/** 이 이야기 주인공 이름 (planPages 가 계획하는 동안만). 서버가 {이름} 자리에 실제 이름을 넣어 보내서, 「토토는 공을 손에 꼭 쥐었어요」 ·
 *  「토토가 친구에게 솔방울을 줬어요」의 토토를 주인공으로 알아보려면 이름을 알아야 한다 (11/10) */
let heroWord: string | null = null;
/** 「나 · 내가 · 나는 · {이름}…」 또는 주인공 이름(+조사) */
const isMe = (w: string) => /^(?:나|내가|나는)$|^\{이름\}/.test(w)
  || (!!heroWord && (w === heroWord || (w.startsWith(heroWord) && /^(?:이|가|는|은|도|이는|이가|이도|에게|한테)?$/.test(w.slice(heroWord.length)))));

/** 주는 말 (소품이 목적어일 때만): 건네다 · 쥐여 주다 · 나눠 주다 · 내밀다 · 선물하다 · 주다 */
const GIVE = /건네|건넸|쥐여 ?주|쥐여 ?줬|쥐어 ?주|쥐어 ?줬|나눠 ?주|나눠 ?줬|나누어 ?주|내밀었|내밀어|선물했|선물로 주|(?:을|를|하나|한 개|두 개)\s?(?:씩\s?)?(?:[가-힣{}]+(?:에게|한테|께)\s)?(?:주었|줬|주셨|드렸)/;
/** 소품을 누가 누구에게 주나. 주는 사람: 그 문장의 주어(없거나 나면 주인공). 받는 사람: 「…에게 · 한테」, 없으면 주는 사람이 주인공이면
 *  그 쪽 첫 인물, 아니면 주인공. at 은 주는 말의 글자 자리 */
export function giveOf(text: string, at: number): { giver: string; receiver: string | null; verb: number } | null {
  const from = Math.max(text.lastIndexOf(".", at), text.lastIndexOf("!", at), text.lastIndexOf("?", at), text.lastIndexOf("”", at)) + 1;
  const ends = [".", "!", "?"].map((c) => text.indexOf(c, at)).filter((i) => i >= 0);
  const stop = ends.length ? Math.min(...ends) + 1 : text.length;
  const after = text.slice(at, stop);
  // 「사과를」 · 「꽃 한 송이를」 · 「사과 두 개를」처럼 수량이 끼어도 그 물건이 목적어
  if (!/^[가-힣]+(?:\s(?:하나|한|두|세|네|몇)\s?[가-힣]{0,2})?(?:을|를)(?=[\s,]|$)/.test(after)) return null;
  const g = GIVE.exec(after);
  if (!g) return null;
  const before = text.slice(from, at);
  const me = isMe;
  const subj = [...before.matchAll(/([가-힣{}:]+(?: [가-힣]+){0,2}?)(?:이|가|은|는|께서)\s/g)].pop()?.[1];
  const giver = !subj || me(subj) || me(subj.split(/\s+/).pop() ?? "") ? "hero" : subj;
  // 받는 사람: 「…에게」 바로 앞 낱말 하나 (「솔방울을 토토에게」가 「솔방울을 토토」로 잡혔다). 「과일 가게 할머니께」처럼 호칭이면 앞 낱말까지
  const toM = /([가-힣{}:]+)(?:에게|한테|께)(?=[\s,]|$)/.exec(text.slice(from, stop));
  // 「친구 손에 · 친구 품에 쥐여 주었어요」도 받는 사람 (11/10 전수 점검: 주인공 손에 남았다)
  const to = toM?.[1] ?? /([가-힣{}:]+)(?:의)? (?:손|품|손바닥)에(?=[\s,]|$)/.exec(text.slice(from, stop))?.[1];
  const receiver = to ? (me(to) || /^(?:나|내|저)$/.test(to) ? "hero" : to) : giver === "hero" ? null : "hero";
  return { giver, receiver, verb: at + g.index };
}

/** 소품 움직임 (11/4 사용자 시안 https://claude.ai/artifact/FJL8Cu7vPSt9YzPdbxJBTw 「이렇게 진행해」).
 *  하늘 소품은 놓이면 늘 천천히, 공은 쪽 글에 굴렸어요 · 찼어요 · 던졌어요가 있을 때 한 번, 깃발 · 우산 · 나뭇잎은 바람 부는 쪽만.
 *  의자 · 상자 · 바위처럼 움직이지 않는 물건은 가만히 */
export type ThingMotion = "flutter" | "float" | "glide" | "sway" | "swim" | "drift" | "roll" | "wind" | "bounce" | "pop"
  | "spin" | "glow" | "grow" | "shrink" | "shake";
const ALWAYS_MOVING: Record<string, ThingMotion> = {
  "props/butterfly.webp": "flutter", "props/firefly.webp": "float", "props/frog.webp": "bounce", "props/bird.webp": "float", "props/bat.webp": "float", "props/seagull.webp": "glide",
  "props/balloons.webp": "sway", "props/fish.webp": "swim", "props/planet.webp": "drift", "props/earth.webp": "drift",
  "props/shootingstar.webp": "glide",
};
const WIND_MOVING = new Set(["props/flag.webp", "props/umbrella.webp", "props/leaves.webp"]);
const BALL_MOVES = /굴렸|굴러|굴리|데굴|찼어|차서|뻥 찼|던졌|던져/;
const LIGHT_SRC = new Set(["props/flashlight.webp", "props/lantern.webp"]);
/** 빛 · 밝음 말 (11/10 사용자 「환해졌어요 — 빛 관련 표현 범위를 넓혀서 불이 들어오게」). 소품 빛남 · 장면 밝아짐이 같이 쓴다.
 *  켜다 · 밝다 · 환하다 · 비추다 · 빛 · 반짝 · 번쩍 · 눈부시다 · 불빛 · 햇살 · 달빛 · 별빛 · 반딧불 … */
const LIGHT_WORDS = /켰|켜졌|켜지|켜져|켜 ?두|켜 ?놓|불이 (?:들어|켜|반짝|환)|불을 (?:밝|켜|비)|불빛|밝혔|밝혀|밝아|밝게|밝은 빛|밝았|환해|환하|환히|환한|비췄|비추|비춰|빛나|빛났|빛이|빛을|빛으로|반짝|번쩍|눈부|초롱초롱|깜빡|햇살|햇빛|달빛|별빛|반딧불|은은하게/;
const LIGHT_ON = LIGHT_WORDS;
/** 불이 꺼짐 — 손전등 · 등불이 빛나지 않는다 */
const LIGHT_OFF = /꺼졌|꺼지|꺼져|껐|끄고|끄니/;

/** 쪽 연출 (11/10 사용자 「빛 번짐 · 환해졌다 · 눈물 같은 연출이 없다」). 쪽 글의 말로만 고른다 — 대본 AI 를 바꾸지 않는다.
 *  bright: 장면이 환해지는 말의 자리 (나레이션이 그 자리에 오면 따뜻한 빛이 번진다). 없으면 -1
 *  tears: 우는 문장들 — 누가 우는지는 장면(SceneStage)이 그 문장의 인물 이름 · 「나」로 정한다.
 *  「울음을 그쳤어요」 · 「눈물을 닦았어요」 · 「울지 않았어요」는 울지 않는 것 */
/** 글자 자리 → 나레이션 진행(0~1) 어림 (11/10 사용자 「타이밍도 맞춘 거야?」). 글자 수 비율이면 문장 사이 쉼 · 따옴표 대사의
 *  쉼이 빠져 쪽 뒷부분일수록 연출이 일찍 나왔다. 글자마다 읽는 시간에 쉬는 자리(마침표 · 쉼표 · 따옴표 …)의 쉼을 더해 잰다 */
const PAUSE: Record<string, number> = { ".": 4.5, "!": 4.5, "?": 4.5, "…": 4, ",": 2.5, "“": 1.5, "”": 2, "\"": 1.5, "'": 0.8, "~": 1, "\n": 3 };
const readCost = (ch: string) => PAUSE[ch] ?? (ch === " " ? 0.35 : /[가-힣A-Za-z0-9]/.test(ch) ? 1 : 0.5);
export function readAt(text: string, i: number): number {
  let before = 0, all = 0;
  for (let k = 0; k < text.length; k++) {
    const c = readCost(text[k]);
    if (k < i) before += c;
    all += c;
  }
  return all ? Math.min(1, before / all) : 0;
}

export type JoyKind = "heart" | "star" | "flower";
export type HeroGesture = "bow" | "nod" | "shiver" | "crouch";
export interface SceneFx {
  bright: number; tears: { at: number; sentence: string; pos?: number; other?: boolean; before?: string }[]; spins: { at: number; before: string }[];
  /** 깜빡이는 빛 (11/10 사용자 「깜빡이다 — 소품이면 그 소품, 아니면 장면 전체」). at: 그 말의 자리, start · end: 그 문장 (글자 위치) */
  /** light: 불빛 말 — 아니면(별 · 반딧불이) 그 소품이 화면에 있을 때만 깜빡인다 */
  blinks: { at: number; start: number; end: number; sentence: string; light: boolean }[];
  /** 물방울이 떨어지는 장면 (11/10 「물방울 연출이 없다」) — 위에서 똑똑. 자리는 그 말 */
  drip: number;
  /** 주인공 몸짓 (11/10 사용자 「꾸벅 끄덕 떨기 웅크리기 연출」): 관절 없이 그림을 통째로 움직여 어느 형태든 된다. before 는 빙글과 같다 */
  gestures: { at: number; before: string; kind: HeroGesture }[];
  /** 만화 기호 연출 (11/10 「보글보글 물방울 같은 연출이 아쉽다」) — 그 문장의 사람 머리 옆 · 발밑 · 몸 둘레에 */
  marks: { at: number; sentence: string; kind: MarkKind }[];
  /** 기쁨 · 고마움 (11/10 사용자 「고맙다 · 기쁘다 긍정일 땐 하트 · 꽃 같은 기분 좋은 연출」) — 그 사람 머리 위로 피어오른다 */
  joys: { at: number; sentence: string; pos?: number; kind: JoyKind; other?: boolean }[];
  /** 울음이 그친 자리 (눈물을 닦았어요 · 울음을 그쳤어요) — 그 사람 눈물이 멈춘다 */
  calms: { at: number; sentence: string; pos?: number }[];
}
/** 기쁨 말 → 연출. 위에서부터 먼저 맞는 것. 「~지 않았어요 · 못 · 비웃」은 기쁨이 아니다 */
const JOYS: [JoyKind, RegExp][] = [
  ["heart", /고마워|고맙|고마운|감사|사랑|좋아해|좋아한|친구가 (?:됐|되었|되어)|단짝|(?<!(?:무릎|다리|몸|머리|가방|배)(?:을|를)? )꼭 안|안아 주|따뜻해졌|마음이 따뜻/],
  ["star", /기뻤|기뻐|기쁜|기쁨|신났|신나|신이 나|해냈|성공|최고|야호|만세|와아|우와|뿌듯|자랑스러|좋은 생각|생각이 (?:번쩍|떠올|났)|번뜩/],
  ["flower", /행복|활짝 웃|웃게 (?:했|만들|해)|웃겼|웃음을 (?:주|선물)|웃음꽃|웃었|웃으며|웃으면서|웃는|까르르|웃기 시작|웃음이|웃음을 (?:터|참|짓)|웃음보|웃음소리|빵 터|푸하하|하하|호호|헤헤|킥킥|낄낄|키득|깔깔|방긋|싱긋|빙그레|미소|즐거|재미있|재밌|반가/],
];
const MAKE_HAPPY = /(?:를|을) (?:웃게|웃겼|기쁘게|행복하게|즐겁게)/;
const NOT_JOY = /(?<!들어가지 )않았|않아|않고|못 했|못했|비웃|아니었/;
/** 슬프거나 걱정하는 쪽 — 옆 인물이 손을 흔들지 않는다 (11/10 「우는데 손 흔들면서 웃어버리니 이상」) */
/** 인사하는 말 — 이 말이 있는 쪽에서만 등장인물이 손을 흔든다 (11/10 「등장하고 나서 기본값이 손 흔들기 같아」 — 전에는 이름만 나와도 흔들었다) */
export const GREET_TEXT = /안녕|인사|손을 (?:흔들|들어|번쩍)|손 ?흔들|반가|어서 와|어서 오|(?<!노래를 |노래 )(?:불렀|부르며|불러)|이리 와|여기야|안녕히|잘 가|또 만나|만나서/;
/** 함께 움직이는 말 — 그 인물이 주인공 뒤에서 같이 옮겨 간다 (11/10 「따라다닌다 · 함께하는 연출」) */
export const FOLLOW_TEXT = /따라(?:왔|오|갔|가|다니|다녔|붙)|뒤따라|쫓아(?:왔|오|갔|가)|(?:함께|같이) (?:뛰|걸|달|갔|가|뛰어|걸어|달려|돌아|다녔)|나란히|손을 (?:꼭 )?(?:잡고|맞잡고)|뒤를 졸졸|졸졸/;
export const SAD_TEXT = /(?<![가-힣])(?:울었|울고|울어|우는|울먹)|친구가 없|놀 친구가 없|아무도 없|혼자|외톨이|심심|눈물|훌쩍|엉엉|걱정|슬퍼|슬픈|슬펐|속상|무서|겁이 나|겁나|외로|쓸쓸|시무룩|풀이 죽|다쳤|다친|아파|아팠|넘어졌|넘어져|길을 잃|잃어버|놓쳤|화가 났|화났|뾰로통|깜짝 놀|덜덜|어두워|캄캄|도와 ?줘|어떡해|어쩌지|큰일/;
const CALM = /눈물이 (?:쏙|싹) 들어|눈물이 (?:말랐|마르)|눈물을 참|울음을 그쳤|울음이 그쳤|울음을 멈|눈물을 닦|눈물이 그쳤|눈물이 멈|뚝 그쳤|울지 않았/;
/** 빙글 돌기 (11/10 사용자 「돌았어요는 그림을 좌우 반전으로 왔다 갔다」). 「돌아왔어요 · 돌고래 · 돌멩이」는 걸리지 않게 */
const DIZZY = /어지러|어질어질|머리가 (?:빙|핑|뱅)|눈앞이|눈이 (?:빙|핑|뱅)|정신이|휘청|비틀/;
const SPIN = /(?:빙글|뱅글|빙그르|핑그르|팽그르|뱅뱅|빙빙)(?![가-힣]* (?:둘러|돌아보|살펴|찾))|한 바퀴|두 바퀴|세 바퀴|빙 돌|(?<!(?:을|를|길|목|이|가) )돌았어|맴돌|제자리에서 돌/;
/** 몸짓 말 → 연출. 「꾸벅꾸벅 졸았어요」 · 「떨어졌어요」는 걸리지 않게 */
export type MarkKind = "zzz" | "note" | "anger" | "sweat" | "surprise" | "question" | "bubble" | "splash" | "dust" | "steam" | "sparkle";
/** 기호 연출 낱말. 한 문장에 하나 — 위에서부터 먼저 맞는 것 */
const MARKS: [MarkKind, RegExp][] = [
  ["zzz", /잠이 들|잠들|쿨쿨|새근새근|드르렁|코를 골|졸았|졸고|꾸벅\s*꾸벅|낮잠|잠을 잤|잠을 자|자고 있|꿈나라/],
  // 노래를 듣거나 노래가 들린 것은 그 사람이 부른 게 아니다 (저장 이야기 점검 11/10)
  ["note", /노래(?:를 (?:불|부르|했)|했|하며|하면서|하고|불렀|부르)|흥얼|콧노래|랄랄라|룰루|휘파람을 (?:불|휙)|피리를 (?:불|불었)|딩동댕/],
  // 「씩씩하게」는 용감하다는 뜻 — 화남은 「씩씩거렸」만
  ["anger", /화가 (?:났|나|잔뜩)|화났|씩씩거|부글부글 (?:화|끓)|뿔이 났|약이 올|성이 났|뾰로통/],
  // 헉헉 · 후다닥은 뛰는 것 — 당황한 땀이 아니다
  ["sweat", /당황|진땀|땀을 (?:뻘뻘|흘|닦)|땀이 (?:뻘뻘|송골|줄줄|삐질|났)|땀방울|쩔쩔|안절부절|허둥지둥/],
  ["surprise", /깜짝 (?:놀|이야)|깜짝이야|어머나|어머(?!니)|헉(?!헉)|앗|으악|놀랐|놀라서|놀라 |화들짝|어이쿠|아이쿠|이럴 수가/],
  ["question", /궁금|갸우뚱|갸웃|어리둥절|고개를 갸|이상하다|이상했|무슨 일|뭘까|무엇일까|어디 갔|어디로 갔|왜 그럴|알쏭달쏭/],
  ["splash", /첨벙|풍덩|퐁당|물보라|물장구|철벙|찰방/],
  // 동굴 천장의 물방울 · 파도 거품은 그 사람의 물방울이 아니다 — 물속에서 숨 쉬거나 헤엄칠 때만
  ["bubble", /보글보글|뽀글뽀글|거품을 (?:뽀|보|뿜|내)|숨을 (?:뽀|보)|(?:물속|물 속|바닷속|바다 속)(?:에서|으로|을) (?:헤엄|숨|첨벙|쏙|풍덩|들어|놀|둥둥|살랑)|잠수/],
  // 쿵쿵 걷기 · 쿵 소리 · 먼지가 폴폴(장소)은 빼고, 넘어지거나 주저앉을 때만
  ["dust", /털썩|풀썩|와당탕|철퍼덕|엉덩방아|쿵,? (?:넘어|주저|떨어|앉|엉덩|굴러)|그만 쿵|뛰어내|폴짝 내려/],
  // 먹거나 마시는 것이 김이 날 때만 — 따끈한 철봉 · 꽃 냄새는 아니다
  ["steam", /(?:따끈|뜨끈|모락모락|김이).{0,14}(?:먹|마시|마셨|후후|호호|한 입|냠냠)|(?:먹|마시|마셨|후후 불|호호 불).{0,10}(?:따끈|뜨끈|모락모락|김)/],
  // 눈물 · 이를 닦은 것, 별이 반짝반짝 빛나는 것은 아니다 — 무엇을 깨끗하게 했을 때
  ["sparkle", /깨끗해(?:졌|지)|깨끗하게 (?:닦|치우|씻|정리|청소)|말끔(?:해|하게)|반짝반짝하게 (?:닦|만들)|새것처럼|윤이 (?:나|반짝)|청소를 (?:다|끝)/],
];
/** 기호 연출에서 뺄 말 — 「가슴이 쿵쾅」 · 「쿵쿵 뛰는 가슴」은 먼지가 아니다 */
const NOT_MARK = /가슴이 (?:쿵|두근)|마음이 쿵/;
const GESTURES: [HeroGesture, RegExp][] = [
  ["bow", /꾸벅|허리를 (?:숙여|굽혀|굽히)|고개 숙여 인사|고개를 숙여 인사|절을 (?:했|하)/],
  ["nod", /끄덕/],
  // 몸 털기(「툭툭 털고 달려갔어요」 카드)도 좌우로 잘게 흔들기로. 「털어놓았어요」는 빼고
  ["shiver", /덜덜|부들부들|오들오들|벌벌|바들바들|후들후들|몸을 떨|떨렸|떨리|떨었|떨며|떨고|털었|털고|털어(?!놓)/],
  ["crouch", /웅크|움츠|오므리|오므렸|날개를 (?:꼭 |살며시 |가만히 )?접|쪼그|몸을 (?:작게|낮추|낮췄|낮춰|동그랗게)/],
];
const DOZE = /꾸벅\s*꾸벅\s*졸|꾸벅\s*졸/;
/** 검사 도구(tools/scene-check/organic.ts)가 같은 말을 찾게 */
export const FX_WORDS = { get spin() { return SPIN; }, gestures: GESTURES, doze: DOZE };
/** 장면 전체가 밝아지는 말 — 「반짝」 · 「깜빡」처럼 작은 빛은 소품만 빛나고 장면은 그대로 */
// 「멀리서 불빛이 보였어요」 · 「별이 빛났어요」는 장면 전체가 밝아지는 것이 아니다 (저장 이야기 점검 11/10)
const BRIGHT = /어둠이 (?:물러|걷|사라)|환해|환하게 (?:빛|밝|비|보|켜)|환히|환한 빛|밝아(?:졌|지|져)|밝혔|밝혀|빛이 (?:가득|퍼|쏟|환)|빛으로 (?:가득|환)|불이 (?:[가-힣]+,? ){0,3}(?:켜졌|켜져|켜지|들어왔)|불을 (?:[가-힣]+,? ){0,3}(?:켰|켜|밝)|불빛에|불빛이 (?:[가-힣]+,? ){0,3}(?:비|퍼|가득|환|새어|새|켜)|등불이 (?:[가-힣]+,? ){0,3}(?:켜|비)|빛이 새어 나왔|환한 (?:불빛|빛)|빛이 (?:[가-힣]+,? ){0,3}(?:들어왔|쏟아)|해가 (?:(?!지|저물|졌)(?![가-힣]*(?:이|가|은|는) )[가-힣]+,? ){0,3}(?:떴|떠올|뜨|솟|올라왔|올라오|나왔|얼굴을|빼꼼)|해님이 (?:(?!지|저물|졌)(?![가-힣]*(?:이|가|은|는) )[가-힣]+,? ){0,3}(?:떴|떠올|뜨|솟|올라|나왔|방긋|얼굴을|빼꼼)|밤이 지나|동이 트|날이 (?:밝|새|샜)|아침이 (?:밝|됐|되|왔)|햇(?:살|빛)이 (?:[가-힣]+,? ){0,3}(?:가득|쏟|들어|비)/;
// 낱말 첫머리의 「울」만 — 「기울었어요 · 배울게요」의 울은 울음이 아니다 (11/11 전수 점검: 고개가 갸웃 기울었는데 눈물)
const CRY = /(?<![가-힣])(?:울었|울고|울어|울먹)|울음을 터|울음이 터|눈물|훌쩍|엉엉|글썽|흐느/;
// 「갈매기가 끼룩끼룩 울었어요 · 냉장고만 웅웅 울었어요 · 시간이 훌쩍 갔어요」는 우는 것이 아니다 (11/11 전수 점검: 주인공 눈에서 눈물)
const NOT_CRY = /(?:끼룩|부엉부엉|웅웅|맴맴|개굴|짹짹|꼬끼오|음매|멍멍|야옹|귀뚤|뻐꾹|까악|찌르르)[가-힣]*,? (?:[가-힣]+ ){0,3}울|(?:갈매기|산새|매미|귀뚜라미|뻐꾸기|까마귀|냉장고|사이렌)(?:이|가|들이|만)? (?:[가-힣]+ ){0,2}울|훌쩍 (?:갔|지나|뛰|넘|커|컸|자랐|날아|올라|떠나)|시간이 훌쩍|눈물(?:이|을)? (?:[가-힣]+ )?(?:말랐|마르|말랐)|눈물방울이 (?:[가-힣]+ ){0,2}(?:빛나|반짝)|눈물(?:방울)?이 (?:[가-힣]+ ){0,3}사라|눈물이 (?:하나도 |이제 |더는 )*없|눈물 대신|눈물 자국|닦자|닦으|닦는|그쳤|그치|닦았|닦아|닦고|멈췄|안 울|울지 않|울지 마|뚝 그|웃음이|웃었|쏙 들어|들어갔|참았|참고|꾹 참|눈물이 (?:싹|쏙)|눈물이 뚝 (?:그|멈)|눈물을 (?:거두|멈)/;   // 「눈물이 뚝뚝 떨어졌어요」는 우는 것 (11/10)
/** 문장의 주인 (저장 이야기 3,069편 점검 11/10 — 「천장에서 물방울이 떨어졌어요」 · 「새들이 노래했어요」의 연출이 주인공에게 났다).
 *  "hero" 주인공 · "other" 이름 없는 사람(친구 · 아저씨 …) · 인물 이름 · null(사람이 아닌 것이 주어 — 연출 없음).
 *  주어를 쓰지 않은 문장은 주인공 (그림책은 「나」를 자주 뺀다) */
const PERSON_WORD = /^(?:친구|친구들|엄마|아빠|할머니|할아버지|선생님|아저씨|아주머니|아줌마|이모|고모|삼촌|언니|오빠|형|누나|동생|아기|아이|아이들|요원|경찰관|주인|안내원|대장|선장|박사|의사|간호사|아가씨|모두|다들|가족)$|(?<!해|햇|달|별|구름|바람|하늘|꽃|나무)님$|(?:아저씨|아주머니|선생님|요원|할머니|할아버지|친구)$/;
const BODY_WORD = /^(?:눈물|눈|마음|가슴|얼굴|몸|웃음|미소|땀|땀방울|기분|목소리|코|입|귀|손|발|배|머리|볼|어깨|다리|날개|꼬리|숨|숨소리|용기|힘|무릎|팔|이마|눈가|잠|생각|좋은 생각|꿈|걱정|겁|배꼽|울음|울음소리|눈물방울)$/;
/** 「창가 구석에서 · 복도 끝에서 친구가」의 창가 · 복도는 주어가 아니라 자리 — 「가 · 도」로 끝나는 자리 낱말 (11/11 전수 점검: 친구가 우는데 주인공이 울었다) */
const PLACE_GA = /^(?:창가|시냇가|바닷가|강가|냇가|물가|길가|호숫가|연못가|개울가|우물가|냇물가|복도|인도|차도|보도)$/;
/** 마디를 끝내는 말 (「~고 · ~며 · ~자 · ~니 · ~는데 · ~지만」, 쉼표). 자 · 니로 끝나는 이름씨(혼자 · 의자 · 할머니 · 주머니)는 빼고 */
const CLAUSE_END = /[가-힣]*(?:고|며|면서|어서|아서|해서|여서|는데|은데|지만|더니|다가|려고)(?=[\s,]|$)|[가-힣]*(?<!혼|의|모|상|과|액|남|여|사|전|왕|글|숫|감|부|피)자(?=[\s,]|$)|[가-힣]*(?:보|오|가|하|주|되|나|켜|열|으|들|서|치)니(?=[\s,]|$)|,/g;
/** 앞 마디와 주어가 바뀌기 쉬운 끝 (「엄마가 안아 주자 · 가 보니 · 열어 주었는데」 다음은 다른 사람 · 나) */
const SWITCH_END = /(?:자|니|는데|은데)$/;
/** 연출 말(at) 이 있는 마디의 주어. 그 마디에 사람 주어가 있으면 그 사람, 「~자 · ~니」 뒤 「눈물이 났어요」처럼 몸 낱말만 있으면 주인공.
 *  못 정하면 undefined (문장 전체로 본다). 11/11 사용자 「행위의 주체를 이상하게 찾는 대본 전수 검사」:
 *  「토토가 가까이 가 보니 친구가 울고 있었어요」 · 「엄마가 문을 열어 주었는데 친구가 울고」가 문장 맨 앞 사람으로 읽혔다 */
function subjectNear(t: string, people: string[], hero: string | null | undefined, at: number): string | null | undefined {
  const pre = t.slice(0, at);
  const cands: { end: number; who: string }[] = [];
  for (const m of pre.matchAll(/(?:^|[^가-힣])(나는|내가|나도|난|우리는|우리가|우리도)(?=[\s,]|$)/g)) cands.push({ end: m.index! + m[0].length, who: "hero" });
  for (const m of pre.matchAll(/([가-힣]+)(이|가|께서|은|는|도|이는|이가|이도)(?=[\s,]|$)/g)) {
    const w = m[1], end = m.index! + m[0].length;
    if (hero && w === hero) { cands.push({ end, who: "hero" }); continue; }
    const named = people.find((n) => n && (n === w || n.replace(/\s+/g, "").endsWith(w) || n.split(/\s+/).includes(w)));
    if (named) cands.push({ end, who: named });
    else if (PERSON_WORD.test(w)) cands.push({ end, who: "other" });
  }
  cands.sort((a, b) => a.end - b.end);
  const last = cands[cands.length - 1];
  // 문장 첫머리 잇는 말(「그러자 · 그러니 · 그런데」)은 마디 끝이 아니다 (「그러자 친구 눈물이 그쳤어요」)
  const ends = [...pre.matchAll(CLAUSE_END)].filter((e) => (!last || e.index! >= last.end) && !/^\s*(?:그러자|그러니|그런데|그러다|그러고|그리고|그러면서)$/.test(e[0]));
  if (last && !ends.length) return last.who;
  // 몸 낱말이 주어인 마디(「눈물이 났어요 · 웃음이 났어요」): 바로 앞에 사람이 붙어 있으면 그 사람(「친구 눈물이」), 아니면
  // 앞 마디가 다른 사람이 「~자 · ~니」로 끝났거나(「엄마가 꼭 안아 주자 눈물이 쏙 들어갔어요」) 사람 주어가 없으면
  // (「발자국이 있어서 자꾸 웃음이 났어요」) 나
  const bodyHere = /^(?:눈물|웃음|마음|가슴|미소|용기|기분)(?:이|가|도)(?=[\s,]|$)/.test(t.slice(at));
  if (!bodyHere) return undefined;
  const ownerWord = /([가-힣]+?)(?:의)?\s$/.exec(pre)?.[1];
  if (ownerWord) {
    if (ownerWord === "내" || ownerWord === "제" || ownerWord === hero) return "hero";
    const named = people.find((n) => n && (n === ownerWord || n.split(/\s+/).includes(ownerWord)));
    if (named) return named;
    if (PERSON_WORD.test(ownerWord)) return "other";
  }
  const lastEnd = ends[ends.length - 1];
  if (lastEnd && (!last || SWITCH_END.test(lastEnd[0].trim()))) return "hero";
  return undefined;
}
export function subjectOf(sen: string, people: string[], hero?: string | null, at?: number, fallback: string | null = "hero"): string | null {
  const t = sen.replace(/“[^”]*”/g, (q) => " ".repeat(q.length));
  if (at !== undefined) {
    const near = subjectNear(t, people, hero, at);
    if (near !== undefined) return near;
  }
  // 「내 마음이 · 내 숨소리가」처럼 내 것이 주어여도 주인공
  if (/(?:^|[^가-힣])(?:나는|내가|나도|난 |우리는|우리가|우리 둘|우리도|{이름})|(?:^|[^가-힣])내 [가-힣]+(?:이|가|은|는|도)(?=[\s,]|$)/.test(t)) return "hero";
  // 이름은 글자 그대로 찾는다 (정규식 기호가 섞여도)
  // 조사 없이 쓰인 이름(「토토 손에 · 토토 옆에 · 토토 덕분에」)은 주어가 아니다 (11/11 전수 점검: 「아빠가 토토 손에 쥐여 주며 웃었어요」에 주인공이 웃었다)
  if (hero && t.split(/[\s,]+/).some((w) => w.startsWith(hero) && /^(?:이|가|는|은|도|이는|이가|이도)$/.test(w.slice(hero.length)))) return "hero";
  // 「친구 눈에서 눈물이 · 민지의 볼에」 — 누구의 눈 · 얼굴인지 적혀 있으면 그 사람 (11/10)
  // 「친구 얼굴을 보니 눈물이 났어요」의 얼굴은 보는 대상이라 그 사람이 아니다: 「을」은 「볼을 타고」처럼 눈물이 흐르는 자리일 때만 (11/11)
  const owner = /([가-힣]+)(?:의)? (?:눈|두 눈|눈가|볼|얼굴|뺨)(?:에서|에|이|가|은|[을를](?= 타고| 따라))?(?=[\s,]|$)/.exec(t)?.[1];
  if (owner && owner !== "내" && owner !== "제") {
    const named = people.find((n) => n && (n === owner || n.split(/\s+/).includes(owner)));
    if (named) return named;
    if (PERSON_WORD.test(owner)) return "other";
  }
  if (owner === "내" || owner === "제") return "hero";
  for (const m of t.matchAll(/([가-힣]+)(이|가|은|는|께서|도)(?=[\s,]|$)/g)) {
    const w = m[1];
    const named = people.find((n) => n && (n === w || n.replace(/\s+/g, "").endsWith(w) || n.split(/\s+/).includes(w)));
    if (named) return named;
    if (PERSON_WORD.test(w)) return "other";
    // 「친구 눈물이 뚝뚝 · 엄마 목소리가」: 몸 낱말 바로 앞에 사람이 붙어 있으면(「의」 없이) 그 사람 것 (11/11 사용자: 친구 눈물인데 주인공 눈에서 눈물)
    if (BODY_WORD.test(w)) {
      const before = /([가-힣]+?)(?:의)?\s$/.exec(t.slice(0, m.index))?.[1];
      if (before) {
        if (before === "내" || before === "제" || before === hero) return "hero";
        const owner = people.find((n) => n && (n === before || n.replace(/\s+/g, "").endsWith(before) || n.split(/\s+/).includes(before)));
        if (owner) return owner;
        if (PERSON_WORD.test(before)) return "other";
      }
      continue;
    }
    if (/^(?:그때|오늘|이번|그날|그런데|그래서|이제|어느새|드디어|정말|모두|다시)$/.test(w) || PLACE_GA.test(w + m[2])) continue;
    // 「웅덩이 옆 · 책꽂이 앞에서 친구가」의 웅덩이 · 책꽂이는 자리, 「물어도 · 그래도」는 이음말 — 주어가 아니다 (11/11 전수 점검)
    if (/^\s*(?:옆|앞|뒤|위|아래|밑|안|속|끝|쪽|근처|사이|가운데|구석|너머)(?:에|에서|으로|쪽)?(?=[\s,])/.test(t.slice(m.index! + m[0].length))) continue;
    if (m[2] === "도" && /(?:[어아해워와봐여져쳐돼]|그래|가까이)$/.test(w)) continue;
    // 「빙글빙글 돌기도 했어요 · 춤도 추었어요 · 인사도 했어요」의 「도」는 하는 일이지 주어가 아니다 (11/12)
    if (m[2] === "도" && /(?:[가-힣]기|춤|노래|인사|박수|손뼉|장난|구경|청소|공부|숙제)$/.test(w)) continue;
    if (w + m[2] === "가까이" || w + m[2] === "어디선가" || (m[2] === "가" && /(?:[어아]|다가)$/.test(w) && w.length >= 2)) continue;   // 「기어가 보니 · 걸어가니」
    // 받침 뒤 「는 · 은」은 꾸밈말(웃는 · 반짝이는)일 때가 많다 — 「이 · 가」 주어만 사람이 아닌 것으로 본다
    // 「돌벽도 숨어 버렸어요 · 박쥐들도 날갯짓」— 사람이 아닌 것에 「도」가 붙어도 그것이 주어 (11/10 전수 점검)
    if (m[2] === "이" || m[2] === "가" || m[2] === "도") return null;
  }
  return fallback;
}
/** 따옴표 말 뒤에 이어지는 말 (“…” 하고 · 라고 · 하며) — 앞 문장과 이어 누가 하는지 본다 */
const CONT = /^\s*(?:하고|라고|하며|하면서|하자|하니|하는|이라고|고 )/;
/** 이어 붙인 문장(앞 문장 + 이 조각)에서 찾은 자리를 글 전체 자리로 — 앞 문장에서 찾았으면 이 조각 첫머리 */
const posIn = (m: RegExpExecArray, sen: string, i: number) => m.index + Math.max(0, i - (sen.length - m[0].length));
/** 따옴표 대사를 같은 길이의 빈칸으로 — 「달님 뜨면 환해질 거야」 같은 바람 · 앞일 말로 장면이 바뀌지 않게 (자리는 그대로) */
const unquoted = (t: string) => t.replace(/“[^”]*”/g, (q) => " ".repeat(q.length));
/** 그 말이 있는 마디 끝까지 (누가 하는지 볼 글): 「뱅글뱅글, 도토리 팽이가 나무뿌리 위에서 돌았어요」처럼 주어가 그 말 뒤에 오면
 *  말 앞부분만 보던 장면이 주인공이 도는 것으로 읽었다 (11/12 전수 점검 40번). 마디는 「…고 · …며 · …자 · …니」나 문장 끝에서 끊는다 */
function upToClause(sen: string, at: number): string {
  const rest = sen.slice(at);
  const e = /[가-힣](?:고|며|면서|자|니까?|는데|더니|다가|어서|아서|해서|지만)(?=[\s,])|[.!?”]/.exec(rest);
  return sen.slice(0, e ? at + e.index + e[0].length : sen.length);
}
export function sceneFx(text: string): SceneFx {
  const bAt = firstHit(text, BRIGHT, NOT_BRIGHT);
  const tears: SceneFx["tears"] = [];
  const re = /[^.!?”]+[.!?”]*/g;
  let prev = "", told = "";
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const sen = CONT.test(m[0]) ? prev + m[0] : m[0];
    // 앞 문장(대사만 있는 문장은 건너뜀) — 「친구가 울고 있었어요. 훌쩍훌쩍, 작은 어깨가 들썩였어요」처럼 주어를 뺀 우는 문장은 앞 문장의 사람 (11/11)
    const before = told;
    if (!sen.trimStart().startsWith("“") || CONT.test(m[0])) told = sen;
    prev = sen;
    // 자리는 우는 말(「울었어요」)이 나오는 곳 — 문장 첫머리면 「민지가 혼자」를 읽을 때 벌써 떨어졌다 (11/10)
    // 묻는 말 · 따옴표 대사는 우는 것이 아니다 — 「“왜 울어?” 하고 나는 물었어요」에서 주인공 눈에 눈물이 났다 (11/10)
    // 「왜 울어?」 · 「왜 울고 있지?」처럼 우는 걸 묻는 말, 「훌쩍이는 소리가 들렸어요」는 상대(등장인물)가 우는 것 —
    // 전에는 주어가 없어 주인공이 먼저 울었고, 묻는 말을 빼니 다음 쪽에서 친구가 울지 않았다 (11/10)
    const asks = sen.includes("?") || /소리(?:가|를|에)(?=\s)/.test(sen);
    if (!asks && sen.trimStart().startsWith("“")) continue;
    const c = CRY.exec(sen);
    if (c && !NOT_CRY.test(sen)) tears.push({ at: readAt(text, posIn(m, sen, c.index)), sentence: sen, pos: c.index, other: asks || undefined, before: before || undefined });
  }
  // 도는 말: 그 문장에서 그 말 앞부분(누가 도는지 — 장면이 정한다)과 자리
  const spins: SceneFx["spins"] = [];
  const re2 = /[^.!?”]+[.!?”]*/g;
  for (let m = re2.exec(text); m; m = re2.exec(text)) {
    // 어지럽거나 무섭게 도는 것(「머리가 빙글빙글」 · 「눈앞이 빙빙」 · 「어지러워서」)은 신나서 도는 게 아니다 (11/10)
    const c = m[0].includes("?") || DIZZY.test(m[0]) || SAD_TEXT.test(m[0]) ? null : SPIN.exec(m[0]);
    if (c) spins.push({ at: readAt(text, m.index + c.index), before: upToClause(m[0], c.index) });
  }
  const gestures: SceneFx["gestures"] = [];
  const re4 = /[^.!?”]+[.!?”]*/g;
  for (let m = re4.exec(text); m; m = re4.exec(text)) {
    for (const [kind, gre] of GESTURES) {
      if (kind === "bow" && DOZE.test(m[0])) continue;
      const g = gre.exec(m[0]);
      // 「목소리가 작게 떨렸어요」는 몸이 떠는 게 아니다 (11/11 중의적 말 점검)
      if (g && kind === "shiver" && /목소리(?:가|도|는|까지)?\s*(?:[가-힣]+\s*)?$/.test(m[0].slice(0, g.index))) continue;
      if (g) gestures.push({ at: readAt(text, m.index + g.index), before: upToClause(m[0], g.index), kind });
    }
  }
  gestures.sort((a, b) => a.at - b.at);
  const joys: SceneFx["joys"] = [];
  const calms: SceneFx["calms"] = [];
  const re3 = /[^.!?”]+[.!?”]*/g;
  let prev3 = "";
  for (let m = re3.exec(text); m; m = re3.exec(text)) {
    // 「친구가 “푸하하!” 하고 웃음을 터뜨렸어요」는 따옴표에서 끊겨 「하고 웃음을…」이 주어 없는 문장이 돼 꽃이 주인공에게 갔다 (11/10)
    const sen = CONT.test(m[0]) ? prev3 + m[0] : m[0];
    prev3 = sen;
    const cm = CALM.exec(sen);
    if (cm) calms.push({ at: readAt(text, posIn(m, sen, cm.index)), sentence: sen, pos: cm.index });
    // 묻는 말(「어떻게 하면 웃을까?」)은 기쁨이 아니다. 따옴표 대사(「“고마워!”」)는 기쁨
    if (NOT_JOY.test(sen) || sen.includes("?")) continue;
    // 우는 문장은 기쁨이 아니다 (11/10 사용자: 「무릎을 꼭 안고 훌쩍훌쩍 울었어요」에 하트가 나고 친구가 빙글 돌았다)
    if (CRY.test(sen) && !NOT_CRY.test(sen)) continue;
    // 신나다가 일이 생기는 문장 (11/11 전수 점검: 「신나게 놀다 보니 어두워졌어요」에 별이 났다)
    if (/그만|넘어졌|넘어져|어두워졌|깜깜해졌|길을 잃|다쳤|놓쳤|잃어버렸|떨어뜨렸|사라졌/.test(sen)) continue;
    for (const [kind, re] of JOYS) {
      const j = re.exec(sen);
      // 「친구를 웃게 했어요」 · 「기쁘게 해 주었어요」는 「~를」 쪽 사람이 기뻐한다 (주어 「나는」이 있어도)
      if (j) { joys.push({ at: readAt(text, posIn(m, sen, j.index)), sentence: sen, pos: j.index, kind, other: MAKE_HAPPY.test(sen) || undefined }); break; }
    }
  }
  const marks: SceneFx["marks"] = [];
  const re5 = /[^.!?”]+[.!?”]*/g;
  let prev5 = "";
  for (let m = re5.exec(text); m; m = re5.exec(text)) {
    const sen = CONT.test(m[0]) ? prev5 + m[0] : m[0];
    prev5 = sen;
    if (NOT_MARK.test(m[0])) continue;
    for (const [kind, re] of MARKS) {
      const k = re.exec(m[0]);
      if (k) { marks.push({ at: readAt(text, m.index + k.index), sentence: sen, kind }); break; }
    }
  }
  // 「눈물이 뚝뚝 떨어졌어요 · 땀이 뚝뚝」은 물방울 연출이 아니라 눈물 (11/10 사용자: 장면 전체에 비처럼 물방울이 떨어졌다)
  let dr: RegExpExecArray | null = null;
  const reD = /[^.!?”]+[.!?”]*/g;
  for (let m = reD.exec(text); m && !dr; m = reD.exec(text)) {
    if (/눈물|땀|침|콧물|튀어|튀었|튀며|튀고/.test(m[0])) continue;
    const d = /물방울(?:이|들이)? (?:똑|뚝|떨어|톡|퐁)|(?:똑똑|똑, 똑|뚝뚝) (?:떨어|물방울)|물방울 (?:떨어지는|소리)|빗방울이 (?:똑|뚝|떨어)/.exec(m[0]);
    if (d) { d.index += m.index; dr = d; }
  }
  // 깜빡이는 빛 — 눈을 깜빡 · 깜빡 잊었어요 · 깜빡 졸았어요는 빼고 (대사 안은 빼고)
  const blinks: SceneFx["blinks"] = [];
  const reB = /[^.!?]+[.!?]*/g;
  const uq = unquoted(text);
  for (let m = reB.exec(uq); m; m = reB.exec(uq)) {
    const k = /깜빡|깜박|반짝 켜졌다|켜졌다 꺼졌다|껌뻑/.exec(m[0]);
    if (k && !/눈(?:을|이|만|도)? (?:[가-힣]+ )?(?:깜빡|깜박|껌뻑)|깜빡 (?:잊|졸|했)|깜빡했|깜박 (?:잊|졸)/.test(m[0]))
      blinks.push({ at: readAt(text, m.index + k.index), start: m.index, end: m.index + m[0].length, sentence: m[0],
        light: /불빛|불이|불을|등불|전등|손전등|가로등|등대|랜턴|헬멧|초롱|램프|신호등/.test(m[0]) });
  }
  return { blinks, drip: dr ? readAt(text, dr.index) : -1, bright: bAt >= 0 ? readAt(text, bAt) : -1, tears, spins, gestures, joys, calms, marks };
}
function thingMotion(t: ThingPlan, text: string, weather: Weather | null): ThingMotion | undefined {
  const src = t.src;
  // 내 소품: 대본 자리가 있으면 그 자리의 움직임(떨어짐 · 떠내려감 …)만 — 둘이 겹치면 한쪽이 지워진다
  if (t.name !== undefined) return t.pose ? undefined : mineMotion(text, t.name, weather);
  if (ALWAYS_MOVING[src]) return ALWAYS_MOVING[src];
  if (src === "props/ball.webp" && BALL_MOVES.test(text)) return "roll";
  // 손전등 · 등불은 쪽 글에 불을 켬 · 밝힘 · 비춤이 있으면 (어느 문장이든) 빛난다 — 「손전등을 들고 … 앞을 비췄어요」
  // 꺼지면 빛나지도 사라지지도 않고 그대로 놓여 있다 (「등불이 꺼졌어요」가 사라짐 shrink 에 걸렸다)
  if (LIGHT_SRC.has(src)) return LIGHT_OFF.test(text) ? undefined : LIGHT_ON.test(text) ? "glow" : undefined;
  // 장면 물건도 그 물건이 나온 문장의 말대로 (11/9 테스트 4번 「소품 연출이 고정적」) — 반짝 · 빙글 · 커짐 · 사라짐 · 흔들림 …
  if (t.at !== undefined && t.at >= 0 && !t.pose) {
    const m = sentenceMotion(text, t.at);
    if (m) return m;
  }
  if (weather === "wind" && WIND_MOVING.has(src)) return "wind";
  return undefined;
}

/** 내 소품 움직임 (pt_docs 20 2-b, 2026-11-06 — 「살짝 흔들기 · 통통 튀기, 그림 전체를 움직이는 정도부터」).
 *  아이가 그린 그림 한 장이라 관절 없이 그림 전체를 움직인다. 그 소품이 나온 문장에서 소품 뒤의 말을 본다 —
 *  굴러 → 한 번 굴러감, 둥실 · 날아다니 → 늘 둥실, 흔들 · 살랑 → 늘 흔들, 통통 · 폴짝 · 튀어 → 통통 튀기,
 *  바람 부는 쪽이면 바람에 흔들림. 아무 말이 없으면 쪽에 들어올 때 한 번 통통 — 「내가 그린 것이 나왔다」를 알아보게.
 *  자리(손에 듦 · 떠내려감 …)는 장면 그림과 같이 thingPose 가 정한다 */
const MINE_MOVES: [ThingMotion, RegExp][] = [
  // 11/9 — 빙글 · 반짝 · 커짐 · 사라짐 · 흔들림 (테스트 4번). 위에서부터 먼저 맞는 것
  ["shrink", /사라졌|사라지|사라져|녹았|녹아|작아졌|작아지|꺼졌/],
  ["grow", /커졌|커지|자랐|자라났|부풀|활짝|피어났|피었|펼쳐졌/],
  ["spin", /빙글|뱅글|빙그르|핑그르|팽그르|돌았|돌아갔|뱅뱅|빙빙/],
  // 불을 켬 · 밝힘도 빛남 (11/10 사용자 「소품에 불이 들어오거나 그러지 않네」) — 전에는 「손전등을 켰어요」가 걸리지 않았다
  ["glow", LIGHT_WORDS],
  ["shake", /덜컹|부르르|덜덜|흔들렸|흔들리|들썩였|쿵쾅|와르르/],
  ["roll", /굴러|굴렸|굴리|데굴|떼굴/],
  ["float", /둥실|둥둥|떠다니|날아다니|훨훨|떠올랐|떠올라/],
  ["sway", /흔들|살랑|하늘하늘|나풀|펄럭/],
  ["bounce", /통통|콩콩|폴짝|깡충|튀어|튀었|튀며|튀고|들썩/],
];
export function mineMotion(text: string, name: string, weather: Weather | null): ThingMotion {
  const at = mentionAt(text, name);
  const m = at >= 0 ? sentenceMotion(text, at) : undefined;
  return m ?? (weather === "wind" ? "wind" : "pop");
}

/** 물건이 나온 자리부터 그 문장 끝까지의 말로 고른 움직임 (앞 문장의 말이 걸리지 않게). 없으면 undefined */
function sentenceMotion(text: string, at: number): ThingMotion | undefined {
  const ends = [".", "!", "?", "”"].map((c) => text.indexOf(c, at)).filter((i) => i >= 0);
  const after = text.slice(at, ends.length ? Math.min(...ends) + 1 : text.length);
  for (const [m, re] of MINE_MOVES) if (re.test(after)) return m;
  return undefined;
}

/** 내 소품이 글에 나온 자리 (없으면 -1). 한 글자 이름은 낱말 단위 — 「꽃집 앞에서 깡충깡충 … 빨간 꽃」의 꽃은 뒤의 것 */
function mentionAt(text: string, name: string): number {
  const last = name.trim().split(/\s+/).pop() ?? "";
  if (!last) return -1;
  if (last.length > 1) return text.indexOf(last);
  const m = new RegExp(`(?:^|[^가-힣])(${last})(?:을|를|이|가|은|는|과|와|도|랑|이랑)?(?=[^가-힣]|$)`).exec(text);
  return m ? m.index + m[0].indexOf(last) : -1;
}

/** 내 소품 이름이 쪽 글에 나오나 — 이름 그대로(띄어쓰기 무시) 또는 마지막 낱말(「노란 우산」 → 「우산」) */
function mentions(text: string, name: string): boolean {
  const flat = text.replace(/\s+/g, "");
  const whole = name.replace(/\s+/g, "");
  const last = name.trim().split(/\s+/).pop() ?? "";
  if (whole && flat.includes(whole) && whole.length >= 2) return true;
  if (!last) return false;
  // 한 글자 이름(「해」 · 「공」)은 다른 낱말 속 글자(「해요」 · 「공원」)가 걸리지 않게 낱말 단위로
  if (last.length === 1) return new RegExp(`(?:^|[^가-힣])${last}(?:을|를|이|가|은|는|과|와|도|랑|이랑)?(?=[^가-힣]|$)`).test(text);
  return flat.includes(last);
}

/** 낱말 바로 뒤가 이러면 그 물건이 아니라 그림 · 이야기 · 별명이다 — 「물고기 그림」 · 「꽃 그림」 · 「물고기 이야기」 ·
 *  「돌멩이 박사님」 · 「별 스티커」 · 「토끼 인형」에 도서실 바닥 물고기 · 교실 꽃밭 · 우주선 안 돌멩이가 섰다 (11/9 배치 검사, 카드 이야기 160편) */
const NOT_REAL = /^ ?(?:그림|이야기|스티커|인형|장난감|사진|모양|무늬|박사|노래|풍선|뛰기|흉내|춤)/;   // 「토끼 뛰기」 놀이에 토끼
/** 그 장소에서만 놓는 물건. 물에 사는 것 · 모래 놀이는 바다 · 물가 · 모래밭에서만 — 「양동이 속 장미」(꽃집)에 모래놀이 양동이,
 *  달의 「웅덩이」에 물웅덩이가 섰다 (11/9). 장소 이름(세부 장소 포함)의 앞 낱말로 본다 */
const WATER = /^(?:sea|forest-stream|cave-lake)/, SAND = /^(?:sea|playground)/;
const ONLY_AT: Record<string, (loc: string, indoor: boolean) => boolean> = {
  "props/fish.webp": (l) => WATER.test(l),
  "props/crab.webp": (l) => l.startsWith("sea"),
  "props/shells.webp": (l) => l.startsWith("sea"),
  "props/conch.webp": (l) => l.startsWith("sea"),
  "props/seagull.webp": (l) => l.startsWith("sea"),
  "props/sandcastle.webp": (l) => SAND.test(l) && l !== "sea-underwater",
  "props/sandtoys.webp": (l) => SAND.test(l) && l !== "sea-underwater",
  "props/dune.webp": (l) => l.startsWith("sea") && l !== "sea-underwater",
  // 창밖 운동장 웅덩이가 교실 바닥에 섰다. 우주의 「웅덩이」는 물이 아니다
  "props/puddle.webp": (l, indoor) => !indoor && !l.startsWith("space"),
  // 대문 · 우체통은 바깥에만: 「창밖에서 … 대문 앞에서」에 거실 바닥에 대문이 섰다 (11/10 이어짐 검사)
  "props/gate.webp": (_l, indoor) => !indoor,
  "playground/swing.webp": (l, indoor) => !indoor && !l.startsWith("space") && !l.startsWith("sea-underwater"),
  "props/mailbox.webp": (_l, indoor) => !indoor,
  // 구름다리 · 터널 · 안내소 · 정문도 바깥에만 (「아빠 무릎에 앉아 구름다리 이야기를 했어요」는 집 안), 바닷속 · 우주 빼고
  "playground/slide.webp": (l, indoor) => !indoor && !l.startsWith("space") && !l.startsWith("sea-underwater"),
  "town/lamp.webp": (l, indoor) => !indoor && !l.startsWith("space") && !l.startsWith("sea-underwater") && !l.startsWith("cave"),
  "playground-path/flowerbed.webp": (l, indoor) => l === "school-hallway" || (!indoor && !l.startsWith("space") && !l.startsWith("sea") && !l.startsWith("cave")),
  "town-park/fountain.webp": (l, indoor) => !indoor && !l.startsWith("space") && !l.startsWith("sea-underwater") && !l.startsWith("cave"),
  // 정자는 숲 · 공원 · 마을 바깥 (동굴 · 우주 · 바닷속 「쉼터」는 다른 모양이라 놓지 않는다)
  "props/pavilion.webp": (l, indoor) => l === "cave-entrance" || l === "cave-lake" || (!indoor && !/^(?:space|sea-underwater|cave)/.test(l)),   // 동굴 입구 · 동굴 호수 쉼터 (11/12)
  "props/junglegym.webp": (l, indoor) => !indoor && !/^(?:space|sea|cave)/.test(l),
  "props/pond.webp": (l, indoor) => !indoor && !/^(?:space|sea|cave)/.test(l),
  "props/net.webp": (l) => !l.startsWith("space"),
  "props/turtle.webp": (l) => l.startsWith("sea"),
  "props/jellyfish.webp": (l) => l.startsWith("sea"),
  "props/frog.webp": (l) => !/^(?:space|sea)/.test(l),
  "props/firefly.webp": (l) => !/^(?:space|sea)/.test(l),
  "props/railing.webp": (l) => !l.startsWith("space") && l !== "sea-underwater",
  // 방 책상은 방 안에만, 교실은 배경에 책상들이 있다
  "props/desk.webp": (l, indoor) => indoor && l !== "school-classroom",
  "home-living/sofa.webp": (_l, indoor) => indoor,
  "school-library/shelf.webp": (_l, indoor) => indoor,
  "town-busstop/bus.webp": (l, indoor) => !indoor && !/^(?:space|sea|cave|forest)/.test(l),
  // 침대는 방 안에만 (보건실 · 우주선 침실 포함)
  "home-bedroom/bed.webp": (_l, indoor) => indoor,
  ...Object.fromEntries(["monkeybars", "tunnel", "booth", "parkgate"].map((n) => [`props/${n}.webp`,
    (l: string, indoor: boolean) => !indoor && !l.startsWith("sea-underwater") && (n === "booth" ? l !== "space" : !l.startsWith("space"))])),   // 안내소는 행성 · 우주선 안내소(「행성 안내소가 보였어요」)도, 큰 붙박이라 자리가 없으면 빠진다
};
/** 몸에 걸친 물건 (11/11 사용자 「발자국이라면서 신발 있고」): 「장갑을 끼고 · 가방을 메고 · 헬멧 끈을 채우고 · 담요를 두르고」는 그 사람이 지닌 것이라
 *  땅에 따로 세우지 않는다. 신발은 THINGS 정규식에서 거른다 */
const WORN_SRC = new Set(["props/mittens.webp", "props/spacegloves.webp", "props/helmet.webp", "props/backpack.webp", "props/blanket.webp", "props/hat.webp"]);
const WORN_AFTER = /^[가-힣]{0,2}\s?(?:(?:을|를|이|가|도)\s?)?(?:꼭\s|다시\s|얼른\s|단단히\s|꽉\s|살짝\s|둘둘\s|폭\s)?(?:끼(?:고|었|운|워)|꼈|메(?:고|었|은)|멨|매(?:고|었|은)|입(?:고|었|은)|두르|둘렀|둘러|쓰고|썼|쓴|끈)/;

/** 쪽마다 놓을 물건 — 내 소품이 먼저(같은 낱말이면 내가 그린 것), 그다음 장면 그림. 글에서 먼저 나온 순.
 *  loc 은 그 쪽의 장소 (모르면 장소로 거르지 않는다) */
export function thingsFor(text: string, mine: { name: string; png: string; height: number }[] = [], indoor = false,
  skip: Set<string> = new Set(), loc = ""): ThingPlan[] {
  const hits: { at: number; t: ThingPlan; key: string }[] = [];
  for (const p of mine) {
    if (!mentions(text, p.name)) continue;
    const last = p.name.trim().split(/\s+/).pop() ?? p.name;
    const at = mentionAt(text, p.name) >= 0 ? mentionAt(text, p.name) : text.indexOf(last);
    // 대본이 말한 자리(손에 듦 · 머리에 씀 · 떠내려감 · 날아감 · 떨어짐)는 장면 그림과 같이 (11/6)
    hits.push({ at, t: { src: p.png, h: p.height, ar: 1, name: p.name, ...(at >= 0 ? thingPose(text, at, at + last.length, "ground", indoor) : {}) }, key: last });
  }
  // 대사 속 말(「“꽃밭에 가 볼까?”」)은 화면에 놓지 않는다 — 대사를 지운 글에서 찾는다 (자리는 그대로) (11/11 전수 점검 693건)
  const said = unquoted(text);
  for (const [re, src, h, spot] of THINGS) {
    const m = re.exec(said);
    if (!m) continue;
    {
      const from = Math.max(said.lastIndexOf(".", m.index), said.lastIndexOf("!", m.index), said.lastIndexOf("?", m.index)) + 1;
      const ends = [".", "!", "?"].map((c) => said.indexOf(c, m.index)).filter((k) => k >= 0);
      const sen = said.slice(from, ends.length ? Math.min(...ends) + 1 : said.length);
      const after = said.slice(m.index + m[0].length, m.index + m[0].length + 8);
      // 「로켓이 없었어요 · 담요도 없이 · 집에 두고 와서」 — 없다고 한 물건 (20건)
      // 없다는 말은 그 물건 바로 뒤에서만: 「빈 그네가 아무도 없이 흔들렸어요」의 그네는 있다 (11/12 글이 말하는 물건 점검)
      if (/^[가-힣]{0,2}\s?(?:도|이|가|은|는|을|를)?\s?(?:하나도 |아무것도 |어디에도 |어디서도 |더는 |이제 |아직 )?(?:없|안 보|보이지 않)/.test(said.slice(m.index + m[0].length))
        || /두고 (?:와|왔|나)|놓고 (?:와|왔)|안 가져|못 가져|가져오지 않/.test(sen)) continue;
      // 「주머니 속 조개를 만지니」 — 주머니 · 가방 속 물건은 보이지 않는다 (11/11 렌더 검사: 앞 쪽 조개가 화면 반대편에 다시 섰다)
      if (/(?:주머니|가방|배낭|호주머니) ?(?:속|안)(?:의|에|에서|에 든)? ?$/.test(said.slice(Math.max(0, m.index - 10), m.index))) continue;
      // 「이불처럼 포근 · 별처럼 반짝 · 작은 나무 같아」 — 비유 (33건)
      if (/^[가-힣]{0,1}\s?(?:처럼|같|모양)/.test(after)) continue;
      // 「모래성에 깃발을 꽂았어요」 — 꽂는 깃발은 작아 큰 깃발 그림이 아니다
      if (src === "props/flag.webp" && /꽂/.test(sen)) continue;
      // 「종이배」는 큰 배 그림이 아니다
      if (src === "props/boat.webp" && /종이 ?배/.test(m[0])) continue;
      // 「구름 이불 · 나뭇잎 이불 · 잎 이불」은 천 이불이 아니다 (11/11 전수 점검: 우주 · 숲에 담요가 깔렸다)
      if (src === "props/blanket.webp" && /(?:구름|나뭇잎|잎|꽃잎|눈|별빛|햇살|낙엽|이끼|풀) ?$/.test(said.slice(Math.max(0, m.index - 4), m.index))) continue;
      // 몸에 걸친 물건 (모자는 「머리에 쓰고」면 머리 자리로 가니 「친구 모자 끝」처럼 남이 쓴 것만)
      if (WORN_SRC.has(src) && (src !== "props/hat.webp" ? WORN_AFTER.test(said.slice(m.index + m[0].length).replace(/^(?:을|를|이|가|도)/, ""))
        : /(?:친구|엄마|아빠|할머니|할아버지|선생님|아저씨|아주머니|언니|오빠|형|누나|동생)(?:의)? $/.test(said.slice(Math.max(0, m.index - 6), m.index)))) continue;
      // 「하늘다람쥐에게 주는 선물이었어요 · 기사님들께 드리는 선물이라고」: 선물은 앞에서 말한 물건(도토리 · 쿠키)이라 선물 상자를 세우지 않는다 (11/12 전수 점검)
      if (src === "props/gift.webp" && /^(?:이었|였|이에요|예요|이야|이라고|이라는|이란|로\s|으로\s|이랍니다)/.test(said.slice(m.index + m[0].length))) continue;
      // 「정문까지 데려다 줬어요」는 갈 곳이라 이 쪽에는 아직 없다 (11/11 994번: 6쪽부터 정문이 섰는데 8쪽에 「드디어 정문이 보였어요」)
      if (/^(?:까지|으로|로)\s?(?:데려다|바래다|모셔다)/.test(said.slice(m.index + m[0].length))) continue;
      // 모래 터널 이야기의 「터널 속」 (11/11)
      if (src === "props/tunnel.webp" && /모래[^.!?]{0,6}터널|터널을 (?:뚫|파)/.test(said)) continue;
    }
    if (spot === "wall" && !indoor) continue;   // 바깥에는 걸 벽이 없다
    if (skip.has(src)) continue;
    if (loc && ONLY_AT[src] && !ONLY_AT[src](loc, indoor)) continue;
    // 내 소품이 같은 낱말이면 장면 그림은 빼고 내가 그린 것만
    if (hits.some((x) => m[0].includes(x.key) || x.key.includes(m[0].replace(/[^가-힣]/g, "").slice(0, 3)))) continue;
    // 낱말 단위 정규식(W1)은 앞 글자와 뒤 조사까지 잡는다 — 자리 판단(thingPose)은 낱말 바로 뒤의 조사를 보므로 낱말만으로 줄인다.
    // 전에는 「공을 손에 꼭 쥐었어요」의 공 · 나비 · 지구 · 지도가 자리를 못 받았다 (11/6)
    // (낱말 단위 정규식만 — 「웅덩이」 · 「물고기」처럼 끝 글자가 조사 같은 낱말을 자르지 않게)
    const wordRe = re.source.startsWith("(?:^|[^가-힣])");
    const lead0 = wordRe && /^[^가-힣]/.test(m[0]) ? 1 : 0;
    const word = wordRe ? m[0].slice(lead0).replace(/(?:을|를|이|가|은|는|과|와|도|랑|들|한 마리|의)$/, "") : m[0];
    const at = m.index + lead0;
    if (NOT_REAL.test(text.slice(at + word.length))) continue;
    // 처음 나온 자리에서 자리 말이 없으면 뒤에 다시 나온 자리에서 손 · 머리를 찾는다 — 「노란 등불이 다가왔어요. 등불을 든 엄마가」
    // 처음 문장만 보아 등불이 땅에 놓였다 (11/10 전수 점검)
    let pose = thingPose(text, at, at + word.length, spot, indoor, src);
    if (!pose.pose) {
      const g = new RegExp(re.source, "g");
      g.lastIndex = m.index + m[0].length;
      for (let m2 = g.exec(text); m2; m2 = g.exec(text)) {
        const l2 = wordRe && /^[^가-힣]/.test(m2[0]) ? 1 : 0;
        const w2 = wordRe ? m2[0].slice(l2).replace(/(?:을|를|이|가|은|는|과|와|도|랑|들|한 마리|의)$/, "") : m2[0];
        const p2 = thingPose(text, m2.index + l2, m2.index + l2 + w2.length, spot, indoor, src);
        if (p2.pose === "hand" || p2.pose === "head") { pose = p2; break; }
      }
    }
    hits.push({ at, t: { src, h, ar: ar(src), spot, at, ...pose }, key: m[0] });
  }
  // 한도를 넘으면 큰 물건(대문 · 쉼터 · 구름다리 …)을 먼저 남기고 작은 것(꽃 · 돌)을 뺀다: 작은 것이 먼저 나와 큰 붙박이가 빠졌다 (11/12)
  const keep = new Set([...hits].sort((a, b) => (b.t.h >= 0.28 ? 1 : 0) - (a.t.h >= 0.28 ? 1 : 0) || a.at - b.at).slice(0, MAX_THINGS));
  return hits.filter((x) => keep.has(x)).sort((a, b) => a.at - b.at).map((x) => x.t);
}
export function coverFor(text: string): { src: string; h: number } | null {
  let best: { src: string; h: number } | null = null, at = Infinity;
  for (const [re, src, h] of COVERS) {
    const m = re.exec(text);
    if (m && m.index < at) { at = m.index; best = { src, h }; }
  }
  return best;
}

export interface PropPlan {
  id: PropId;
  /** 대본 인물이면 가로 자리(0~1) — 없으면 layout 의 소품 자리 */
  x?: number;
  /** 대본 인물 이름 (같은 인물이 앞 쪽에도 있었는지 볼 때) */
  name?: string;
  /** 이 쪽에서 들어오면 어느 쪽에서 걸어오는지. 없으면 처음부터 서 있다 */
  enter?: "left" | "right";
  /** 걸어 들어오는 사람이 등장하는 자리 (나레이션 진행 0~1) — 그 말에 오기 전까지 화면 밖에서 기다린다. 없으면 쪽 시작부터 */
  enterAt?: number;
  /** 숨을 것(cover)의 그림 · 키 */
  src?: string;
  h?: number;
}

export interface HeroPlan {
  /** 가로 자리(0~1) — 시작 · 끝 */
  from: number;
  to: number;
  move: "none" | "walk" | "run";
  /** 제자리 동작을 몇 번 하고 멈출지 (손 흔들기 · 점프 · 춤). 0 이면 멈춘 그림 */
  loops: number;
  /** 「넘어졌어요」 — 살짝 기울어 주저앉은 자세 */
  fallen: boolean;
  /** 손이 거의 안 움직이는 쪽 (가만히 · 숨쉬기 · 떨기) — 대본에서 주인공이 든 소품을 손에 쥐여 줄 수 있다 */
  calm: boolean;
  /** 「숨었어요」 — out: 이 쪽에서 앞 물건 뒤로 천천히 사라지고 그대로 숨어 있다, gone: 이미 숨어 있다(행동 단계 다음 쪽).
   *  다시 나타나지 않는다 (11/3 사용자 「숨기 했으면 다시 나타나면 안되는데」 — pt_docs 05 S-09-05 「2초 뒤 다시 나타난다」와 다름) */
  hide: "out" | "gone" | null;
  /** 날고 있는지 (날개형) — 날아오르는 말부터 앉는 · 걷는 말까지 이어진다 */
  fly?: boolean;
  /** 주인공이 보는 쪽 (-1 왼쪽 · 1 오른쪽 · 0 정하지 않음). 옮겨 가면 가는 쪽, 제자리면 앞 쪽에서 보던 쪽을 잇는다 —
   *  옮겨 갈 때만 뒤집으면 다음 쪽에서 원래 그림 방향으로 돌아가 옆 친구에게 등을 돌렸다 (11/5 사용자, 옆모습 주인공) */
  face: -1 | 0 | 1;
  /** 이 쪽에서 다가가는 인물 · 표지판 (props 의 id). 장면이 그 인물을 주인공이 가는 쪽 바로 앞에 세운다 —
   *  전에는 인물이 남는 자리에 서서 「어른에게 달려갔어요」에 그 사람 반대쪽으로 달려갔다 (11/5, 옆모습 주인공에서 보였다) */
  goal?: string;
  /** 「그루터기에 앉아」 · 「벤치에 올라」의 자리 (그림 이름: stump · chair · rocks …). 장면이 주인공을 그 물건 앞에 세운다 (11/10) */
  seat?: string;
  /** 앞 쪽과 같은 배경이고 제자리 쪽: 앞 쪽에서 실제로 선 자리(앉은 자리 · 비켜 선 자리)를 잇는다 (11/10) */
  stay?: boolean;
}

export interface Env {
  night: boolean;
  /** 해가 떠 있는지 — 낮이면 늘 (11/4 사용자 「해나 달이 떠오르고 지는 그 부분들이 없는거 같은데」. 전에는 「해가 떴어요」
   *  카드 쪽에만 그려 대부분의 이야기에 해 · 달이 없었고, 밤이 되어도 해가 지는 장면이 없었다) */
  sun: boolean;
  /** 그 쪽의 날씨 효과 (쪽 글 · 배경 설명에 나올 때만, 바깥 장소만 — weatherFor) */
  weather: Weather | null;
  /** 어두운 곳 (11/10 「어두운 숲 · 캄캄한 동굴」) — 밤은 아니라 해 · 달 · 별은 그대로, 장면만 어둑하게 */
  dim?: boolean;
  /** 이 쪽에서 실내 불이 켜진다 — 나레이션이 불빛 말에 오면 밤 어둠도 걷힌다 */
  lightsOn?: boolean;
  /** 앞 쪽에서 환해진 빛(불빛 · 환하게 빛났어요)이 이어진다 — 쪽 처음부터 따뜻한 빛이 번져 있다 (바깥 밤이어도) */
  glow?: boolean;
}

export type Weather = "rain" | "storm" | "snow" | "fog" | "wind" | "rainbow";

export interface PagePlan {
  location: string;
  env: Env;
  hero: HeroPlan;
  props: PropPlan[];
  /** 쪽 글에 나온 물건 · 내 소품 — 주인공 옆 땅에 */
  things: ThingPlan[];
  /** 이야기 안 쪽 열쇠 (이야기마다 다른 값 + 쪽 번호). 장면이 쪽 사이 자리를 기억하는 데 쓴다 */
  key?: string;
}

interface Picks { place?: string; problem?: string; action?: string; result?: string }

const SLOT = 0.52;
const FRIEND_RESULTS = new Set(["new_friend", "tears_stop", "thanked", "best_friend", "party_friend"]);
const ADULT_RESULTS = new Set(["adult_took", "party_lost", "party_friend"]);
const LOOP_ACTIONS: Record<string, number> = { wave: 3, jump: 2, dance: 2 };
/** 그 밖의 동작(2026-11-04 새 동작 9개 — 숨쉬기 · 헤엄 · 만세 …)은 쪽에 있는 동안 계속. 0 이면 첫 장에서 멈춘다 */
const KEEP_LOOPING = 1000;
const INDOOR = new Set(["cave", "home-living", "home-kitchen", "home-bedroom", "school-classroom", "school-cafeteria",
  "school-hallway", "school-music", "school-library", "space-ship", "cave-lake", "sea-lighthouse", "town-shop"]);

export const isIndoor = (location: string) => INDOOR.has(location);
/** 해 · 달을 띄우는 곳 — 바깥이고, 하늘이 따로 그려진 곳(바닷속 빛줄기 · 우주 별 · 행성의 달)은 뺀다 */
const NO_SKY_BODIES = new Set(["sea-underwater", "space", "space-planet"]);
export const hasSkyBodies = (location: string) => !INDOOR.has(location) && !NO_SKY_BODIES.has(location);
/** 쪽 글로 밤 · 아침 (「돌아왔어요」처럼 엉뚱한 말이 걸리지 않게 말 덩어리로) */
// 밤은 밤을 바로 말할 때만 (11/10 사용자 「어두워졌어요에 밤이 직접 없으면 그냥 어두워져야」) — 「어두워졌어요 · 깜깜해」는 어두운 곳(DARK_TEXT)
const NIGHT_TEXT = /밤이 (?:되|깊|왔|찾아)|(?:캄캄한|깜깜한|어두운|까만|컴컴한) 밤|밤하늘|밤바다|밤바람|밤 (?:골목|하늘|길|숲|바다)|그날 밤|달빛|달님이 (?:[가-힣]+,? ){0,3}(?:떴|떠올|뜨|나왔|얼굴)|달이 (?:[가-힣]+,? ){0,3}(?:떴|떠올|휘영|뜨|나왔)|해가 (?:[가-힣]+,? ){0,3}(?:졌|지고|지자|지는|져서|저물|뉘엿|넘어갔|넘어가|숨었|숨어|사라졌)|해님이 (?:[가-힣]+,? ){0,3}(?:졌|지고|숨|넘어|사라)|노을|저녁이 (?:되|왔)|별(?:이|들이) (?:떴|총총|하나둘)|하늘에 (?:작은 )?별(?:이|들이)/;
/** 어두운 곳 — 「어두운 숲 · 캄캄한 동굴 · 깜깜한 방 · 어둠 속 · 불이 꺼졌어요」. 「어둡지 않았어요」 · 「어두운 색」은 아니다 */
/** 나는 말 — 날개형 주인공을 띄운다. 「날개를 팔랑팔랑 흔들며 도착했어요」처럼 날갯짓하며 옮겨 가는 것도 */
export const FLY_TEXT = /날아|날았|날고|날며|날면서|날개를 (?:활짝 )?(?:펴|펼|펄럭|파닥)|날개를 [가-힣]+ (?:흔들|펄럭|파닥|퍼덕)이?(?:며|면서|고) [가-힣 ]{0,12}(?:도착|갔|왔|날|올라|다녔|돌)|훨훨|하늘(?:로|높이) (?:훨훨 |높이 |둥실 )?(?:날|올라|솟|떠)|(?:몸이|내 몸이) (?:둥실 )?높이 떠|파닥파닥 (?:날(?!갯)|올)|퍼덕퍼덕 (?:날(?!갯)|올)/;
/** 내려앉는 말 — 날기를 멈춘다 */
const LAND_TEXT = /앉았|앉아|내려앉|내려왔|내려와|착지|땅에 (?:내려|섰)|걸었|걸어|총총|아장|뒤뚱/;
/** 실내 불이 켜지는 말 (11/10 「불빛이 한 번 켜진 이야기에서 다음에 또 꺼진다」) — 한 번 켜지면 꺼진다는 말까지 밝다 */
const LIGHTS_ON = /불빛이 (?:새어|새|비|퍼|가득|환|켜)|새어 나오|불이 (?:[가-힣]+,? ){0,3}(?:켜졌|켜져|켜지|들어왔|들어와)|불을 (?:[가-힣]+,? ){0,3}(?:켰|켜|밝)|환한 (?:교실|방|복도|불)|밝은 (?:교실|방|불)|(?<!손)전등(?:을|이) (?:[가-힣]+,? ){0,3}(?:켰|켜)|등불을 (?:켰|켜)|환해|밝아(?:졌|지|져)/;
const LIGHTS_OFF = /(?:불|등불|전등|불빛)이 (?:[가-힣]+,? ){0,3}(?:꺼졌|꺼지|꺼져|나갔)|불을 (?:[가-힣]+,? ){0,3}(?:껐|끄)|정전/;
export const DARK_TEXT = /(?:어두운|어둑한|어둑어둑한|캄캄한|깜깜한|컴컴한|껌껌한|새까만|시커먼) (?!색|옷|머리|털|눈)[가-힣]+|어둑어둑|어두웠|어두워(?:졌|지|져)|캄캄해|깜깜해|컴컴해|껌껌해|깜깜했|캄캄했|컴컴했|깜깜하게 (?:바뀌|변|보|되|물들)|깜깜하고|캄캄하고|어두컴컴|어둠 속|어둠이 (?:깔|내려|가득|짙)|(?:불|전등|등불|불빛|빛)이 (?:[가-힣]+,? ){0,3}(?:꺼졌|꺼지|꺼져|나갔|사라졌|사라지)|구름이 (?:해|달)을 가려|정전/;
// 「밤새 깜깜했던 바다가 금빛으로」처럼 지나간 어둠은 아니다
/** 지난 일 · 앞일 · 다른 뜻 — 「어젯밤 · 밤새 · 해가 지기 전에」는 지금 밤이 아니고, 「내일 아침」은 지금 아침이 아니다 */
const NOT_NIGHT = /어젯밤|어제 밤|밤새|지기 전|지면|지려고|지려나|기다렸던 밤/;
const NOT_MORNING = /내일 아침|아침이 (?:기다려|오면|올 때까지|오기)|아침에 (?:만나|다시)|해가 다시 (?:뜨면|올)/;
/** 얼굴 · 마음이 밝아진 것은 장면이 밝아진 것이 아니다 (저장 이야기 점검 11/10: 「얼굴이 활짝 밝아졌어요」에 화면이 환해졌다) */
const NOT_BRIGHT = /(?:얼굴|표정|마음|눈빛|목소리|기분|눈|미소)(?:이|도|은|는|가)? (?:[가-힣]+ )?(?:환해|환하|밝아|밝게|환히|밝았)/;
/** 그 말이 마지막으로 나온 자리 (대사 · 묻는 말 · 아니라는 말이 섞인 문장은 빼고). 없으면 -1 — 한 쪽에 밤 · 아침이 둘 다면 나중 것이 이긴다 */
function lastHit(text: string, re: RegExp, not?: RegExp): number {
  let at = -1;
  const u = unquoted(text);
  for (const m of u.matchAll(/[^.!?]+[.!?]*/g)) {
    if (m[0].includes("?") || (not && not.test(m[0]))) continue;
    const h = re.exec(m[0]);
    if (h) at = m.index! + h.index;
  }
  return at;
}
function firstHit(text: string, re: RegExp, not?: RegExp): number {
  const u = unquoted(text);
  for (const m of u.matchAll(/[^.!?]+[.!?]*/g)) {
    if (m[0].includes("?") || (not && not.test(m[0]))) continue;
    const h = re.exec(m[0]);
    if (h) return m.index! + h.index;
  }
  return -1;
}
const NOT_DARK = /어둡지 않|안 어두|어둠이 (?:무섭지|사라|걷|물러)|(?:깜깜|캄캄|어두웠|컴컴|어둑)(?:했|하)?던 |(?:깜깜한|어두운|캄캄한|컴컴한) [가-힣]+(?:도|이|가|은|는) (?:이제|하나도|조금도|더는|더 이상|참 |다르게|포근)|(?:밑|속|뒤|틈|안쪽)(?:은|는) (?:[가-힣]+ )?(?:깜깜하|캄캄하|어둡|컴컴하)|눈앞이 (?:캄캄|깜깜|까매)|(?:어두운|깜깜한) 게|무섭지 않|안 무서/;
// 햇살 · 햇빛이 들어오면 낮 (11/10 점검: 우주선 창으로 금빛 햇살이 들어왔는데 밤이었다)
const MORNING_TEXT = /아침이 (?:밝|됐|되|왔|찾아)|해가 (?:(?!지|저물|졌)(?![가-힣]*(?:이|가|은|는) )[가-힣]+,? ){0,3}(?:떴|떠올|뜨|솟|올라왔|올라오|나왔|얼굴을|빼꼼)|해님이 (?:(?!지|저물|졌)(?![가-힣]*(?:이|가|은|는) )[가-힣]+,? ){0,3}(?:떴|떠올|뜨|솟|올라|나왔|방긋|얼굴을|빼꼼)|새로 뜬 해|밤이 지나|동이 트|날이 (?:밝|새|샜)|아침 (?:해|햇살|햇빛|볕|바다|인사|노래|이슬)|아침을 알|다음 날 아침|이튿날|햇(?:살|빛)이 (?:[가-힣]+,? ){0,3}(?:들|비|쏟|가득|창)/;
/** 날씨 — [종류, 쪽 글, 배경 설명(영어)]. 앞에 있는 것이 먼저 (폭풍이면 비도 함께 그린다).
 *  「눈이 반짝」(사람 눈) · 「비가 그쳤어요」 · rainbow 속 rain 은 걸리지 않게 (11/4 사용자 「민감하지 않은 선에서만」) */
const WEATHER: [Weather, RegExp, RegExp][] = [
  ["storm", /천둥|번개|우르릉/, /\b(thunder\w*|lightning|thunderstorm)\b/i],
  ["rain", /비가 (?:와|오|내|쏟|주룩|후두둑|뚝)|빗방울|소나기|장대비|빗소리|보슬비|이슬비/, /\b(rain|rainy|raining|raindrops?|drizzl\w*)\b/i],
  ["snow", /눈이 (?:와|오|내|펑펑|소복)|눈송이|함박눈|눈사람|눈밭/, /\b(snow\w*)\b/i],
  ["fog", /안개/, /\b(fog|foggy|mist|misty)\b/i],
  ["wind", /바람이 (?:세|쌩|휭|불|휘|몰|솔솔|씽)|강풍|회오리/, /\b(windy|gusty|gusts?|breezy|blowing wind)\b/i],
  ["rainbow", /무지개/, /\brainbows?\b/i],
];
/** 그 쪽의 날씨. 실내 · 바닷속 · 우주 · 행성은 늘 없음 */
/** 쪽 글에서 밤낮 · 날씨가 바뀌는 말이 처음 나오는 자리 (글 길이 대비 0~1). 없으면 0 — 장면은 나레이션이 이 자리에
 *  왔을 때 어두워지고 해가 달로 바뀐다. 쪽에 들어오자마자 바뀌어 나레이션보다 먼저 밤이 됐다 (11/9 테스트 5번) */
export function envCueAt(text: string): number {
  const hits = [NIGHT_TEXT, MORNING_TEXT, ...WEATHER.map(([, ko]) => ko)]
    .map((re) => text.search(re)).filter((k) => k >= 0);
  return hits.length && text.length ? readAt(text, Math.min(...hits)) : 0;
}

export function weatherFor(text: string, background: string, location: string): Weather | null {
  if (!hasSkyBodies(location)) return null;
  for (const [w, ko, en] of WEATHER) if (ko.test(text) || en.test(background)) return w;
  return null;
}

/** 대본 인물의 생김새(영어) · 이름(한국어)으로 그림을 고른다 (2026-11-03 — public/scenes/props).
 *  위에서부터 먼저 맞는 것, 생김새가 먼저. 영어는 낱말 단위로 ("woman" 의 man, "location" 의 cat 이 걸리지 않게).
 *  동물 · 직업을 가족보다 먼저 본다 — 「매점 아주머니」 · 「동굴 안내원」이 엄마 그림으로, 「아기 다람쥐」가 아기 그림으로
 *  나오던 것 (카드 이야기 512가지 인물 93명, 아티팩트 「대본 인물 · 물건 목록」). 직업은 남녀 그림 (genderOf).
 *  그림이 없는 것(물건)은 세우지 않는다 */
const KINDS: [Kind, RegExp, RegExp][] = [
  // 동물 · 외계인 (「아기 박쥐」 · 「엄마 새」가 아기 · 엄마 그림으로 가지 않게 맨 앞)
  ["caveguide", /\b(cave guide|bat keeper)\b/, /동굴 안내|박쥐 지킴이/],
  ["bat", /\bbats?\b/, /박쥐/],
  ["bird", /\b(birds?|sparrow|owl|chick)\b/, /새$|새들|참새|부엉이/],
  ["rabbit", /\b(rabbits?|bunny|bunnies)\b/, /토끼/],
  ["squirrel", /\bsquirrels?\b/, /다람쥐/],
  ["alien", /\baliens?\b/, /외계인/],
  // 직업 (「숲 해설가 선생님」은 숲 지킴이 — 더 좁은 것이 먼저). 우주 경찰관은 11/4 부터 따로 그림(별 배지 우주복)
  ["spacepolice", /\b(space police|police\b.*\b(space|helmet))\b/, /우주 ?경찰/],
  ["astronaut", /\b(astronaut|spacesuit|space suit|space police|space guide|spaceship captain|space station|space explorer|moon base)\b/, /우주|선장|대장/],
  ["ranger", /\b(forest ranger|ranger|forest guide)\b/, /숲 지킴이|숲 해설|숲 선생/],
  // 잠수부 (11/10, 바닷속 쪽 인물): 안전 요원보다 먼저 (「diver」 생김새에 lifeguard 가 같이 나올 때)
  ["diver", /\b(scuba|diver|divers|wetsuit|diving suit|diving mask)\b/, /잠수/],
  ["lifeguard", /\blifeguard\b/, /안전 ?요원|바다 지킴이|바닷가 지킴이|해변 지킴이|구조대/],
  ["caveguide", /\bguide\b.*\bcave\b|\bcave\b.*\bguide\b/, /안내원/],
  ["police", /\bpolice\b/, /경찰/],
  ["cook", /\b(school cook|cook|lunch lady|chef|nutrition)\b/, /급식|조리|영양|요리사/],
  ["mail", /\b(mail carrier|mailman|postman|postal)\b/, /우체부|집배원/],
  ["nurse", /\bnurse\b/, /보건|간호/],
  ["busdriver", /\bbus driver\b/, /버스 기사|기사님/],
  ["classmates", /\b(classmates|group of [a-z ]*(children|kids|friends))\b/, /친구들|반 아이들/],
  ["grandma", /\b(grandmother|grandma|granny|old woman|old lady)\b/, /할머니/],
  ["grandpa", /\b(grandfather|grandpa|old man)\b/, /할아버지/],
  ["shopkeeper", /\b(baker|bakery|shopkeeper|florist|flower shop|fruit (shop|stall|seller)|stationery|snack shop|shop owner|guesthouse)\b/,
    /빵집|가게|꽃집|문구점|매점|민박|사장님|주인/],
  ["keeper", /\b(playground keeper|park keeper|school guard|gate keeper|safety keeper|safety vest|crossing guard)\b/, /지킴이/],
  ["teacher", /\b(teacher|librarian)\b/, /선생님|사서/],
  ["baby", /\b(baby|toddler|infant)\b/, /아기/],
  ["dog", /\b(dog|puppy)\b/, /강아지|멍멍/],
  ["cat", /\b(cat|kitten)\b/, /고양이|야옹/],
  // 이모 · 고모는 엄마와 다른 그림 (11/4 — 엄마 + 이모가 똑같은 엄마 그림으로 나란히 섰다)
  ["aunt", /\baunt\b/, /이모|고모/],
  ["mom", /\b(mother|mom|mommy|woman|lady)\b/, /엄마|어머니|아주머니|아줌마/],
  ["dad", /\b(father|dad|daddy|uncle|man)\b/, /아빠|아버지|삼촌|아저씨/],
  ["adult", /\b(adult|grown-?up|doctor|driver|farmer|guard|staff|worker|clerk)\b/, /어른|의사|직원/],
  ["friend2", /\b(girl|sister)\b/, /여자\s*아이|언니|누나|여동생/],
  ["friend", /\b(boy|child|kid|friend|student|classmate|brother)\b/, /친구|아이|오빠|동생/],
];
/** 직업 그림의 남녀 — 생김새(영어)와 이름(한국어)의 낱말로. 모르면 남 */
function genderOf(desc: string, name: string): "m" | "f" {
  return /\b(woman|female|lady|girl|mother|aunt|grandmother|she|her)\b/.test(desc) || /언니|아주머니|아줌마|이모|엄마|누나|할머니|여자/.test(name)
    ? "f" : "m";
}
export function personKind(desc: string, name = ""): PersonId | null {
  const d = desc.toLowerCase();
  // 동물 · 직업 · 할머니 · 할아버지(선생님 앞까지)는 생김새 · 이름 모두 가족보다 먼저 — 「놀이터 지킴이」의 생김새가 「a man …」이라
  // 아빠 그림으로 가던 것. 그다음 나머지를 생김새 → 이름 순으로
  const cut = KINDS.findIndex(([k]) => k === "teacher");
  const first = KINDS.slice(0, cut), rest = KINDS.slice(cut);
  const k = first.find(([, en]) => en.test(d))?.[0] ?? first.find(([, , ko]) => ko.test(name))?.[0]
    ?? rest.find(([, en]) => en.test(d))?.[0] ?? rest.find(([, , ko]) => ko.test(name))?.[0] ?? null;
  if (!k) return null;
  // 아이 친구는 옷차림(우주복 · 구명조끼 …)보다 아이 그림이 먼저 — 우주 이야기의 「친구」(a little girl … space suit) 15명이
  // 어른 우주비행사 그림으로 섰다 (11/4 대본 검사). 외계인 · 동물은 그대로
  // 우주복 입은 아이는 아이 우주복 그림 (11/4)
  if (CHILD.test(d) && !GROWN.test(d) && !NOT_KID.has(k)) {
    return SPACE_SUIT.test(d) ? `spacekid-${genderOf(d, name)}` : DIVE_SUIT.test(d) ? `diverkid-${genderOf(d, name)}` : "friend";
  }
  return (GENDERED as readonly string[]).includes(k) ? (`${k}-${genderOf(d, name)}` as PersonId) : (k as PersonId);
}
const CHILD = /\b(?:(?:little|small|young) (?:girl|boy)|girl|boy|child|kid|toddler)\b/;
const SPACE_SUIT = /\b(space ?suit|spacesuit|astronaut)\b/;
const DIVE_SUIT = /\b(scuba|diver|wetsuit|diving suit|diving mask|swim goggles)\b/;
/** 바닷속 쪽 인물은 잠수부 그림으로 (11/10 사용자 「바다 속에 등장하는 인물 캐릭터는 잠수부로」). 아이는 아이 잠수복, 동물 · 외계인 · 아기는 그대로.
 *  대본이 생김새에 diving suit 를 넣게 했지만(백엔드 UNDERWATER_RULE) 바닷가 쪽에서 정한 생김새가 그대로 오기도 해 화면에서도 바꾼다 */
const KID_IDS = new Set(["friend", "friend2", "spacekid-m", "spacekid-f", "diverkid-m", "diverkid-f"]);
const KEEP_UNDERWATER = new Set(["dog", "cat", "bat", "bird", "rabbit", "squirrel", "alien", "baby", "classmates"]);
export function asDiver(id: PersonId): PersonId {
  if (KEEP_UNDERWATER.has(id) || id.startsWith("diver")) return id;
  const sex = id === "friend2" ? "f" : id === "friend" ? "m" : personSex(id) ?? (id === "teacher" ? "f" : "m");
  return KID_IDS.has(id) ? `diverkid-${sex}` : `diver-${sex}`;
}
const GROWN = /\b(?:adult|man|woman|mother|father|grand\w*|teacher|officer|owner)\b/;
const NOT_KID = new Set(["alien", "bat", "bird", "rabbit", "squirrel", "dog", "cat", "baby", "classmates", "friend", "friend2"]);

/** 손에 듦 · 머리에 씀: 문장의 주어를 그 쪽에 선 인물로 (이름 낱말이 겹치거나 같은 그림 종류). 못 찾으면 자리 없이 땅에 */
/** 동물이 있는 자리 · 움직임: 「나무 틈에서 하늘다람쥐가 고개를 쏙 내밀었어요」는 나무 위(high), 「하늘다람쥐가 슝 날아올랐어요」는 공중을 미끄러지듯
 *  (11/12 전수 점검 40번: 땅에 가만히 있었다) */
const TREE_ANIMALS = new Set(["props/squirrel.webp", "props/bird.webp", "props/cat.webp", "props/bat.webp"]);
function animalPlace(t: ThingPlan, text: string): Partial<ThingPlan> {
  if (!TREE_ANIMALS.has(t.src) || t.at === undefined) return {};
  const s0 = Math.max(text.lastIndexOf(".", t.at), text.lastIndexOf("!", t.at), text.lastIndexOf("?", t.at), text.lastIndexOf("”", t.at)) + 1;
  const ends = [".", "!", "?"].map((c) => text.indexOf(c, t.at!)).filter((i) => i >= 0);
  const sen = text.slice(s0, ends.length ? Math.min(...ends) + 1 : text.length);
  if (/날아올|날아갔|날아가|날았|슝 날|활공|훨훨/.test(text.slice(t.at, s0 + sen.length))) return { spot: "air", motion: "glide" };
  if (/나무 (?:틈|구멍|위|꼭대기|가지)|나뭇가지|가지 위|둥지(?:에서|에|안|속)/.test(sen) && !/(?:나무|나뭇가지|가지|둥지)(?:에서|에|로)? (?:내려|떨어)/.test(sen)) return { pose: "high" };
  return {};
}
/** 켜진 랜턴 · 손전등이 땅에 혼자 있지 않게: 「안내원 선생님의 손전등이 켜졌어요 · 손전등 불빛이 다가왔어요」는 앞에 붙은 사람, 없으면
 *  그 쪽에 사람이 하나뿐이면 그 사람 손에 (11/12 전수 점검: 땅에 놓이거나, 숨는 쪽에서는 아예 빠졌다) */
function lightHolder(t: ThingPlan, text: string, props: PropPlan[]): Partial<ThingPlan> {
  if (!LIGHT_SRC.has(t.src) || t.at === undefined) return {};
  const s0 = Math.max(text.lastIndexOf(".", t.at), text.lastIndexOf("!", t.at), text.lastIndexOf("?", t.at)) + 1;
  const ends = [".", "!", "?"].map((c) => text.indexOf(c, t.at!)).filter((i) => i >= 0);
  const sen = text.slice(s0, ends.length ? Math.min(...ends) + 1 : text.length);
  if (!/불빛|빛|켜졌|켜지|켰|비추|비췄|비춰|다가|반짝/.test(sen)) return {};
  const people = props.filter((q) => isPerson(q.id));
  const before = /([가-힣]+?)(?:의)? $/.exec(text.slice(s0, t.at))?.[1];
  const named = before && people.find((q) => (q.name ?? "").includes(before) || (q.name ?? "").split(/\s+/).some((w) => w && before.includes(w)));
  const who = named ?? (people.length === 1 ? people[0] : undefined);
  return who ? { pose: "hand", holder: who.name ?? who.id } : {};
}
function holderOf(t: ThingPlan, props: PropPlan[], heroName?: string | null): Partial<ThingPlan> {
  if (t.pose !== "hand" && t.pose !== "head" && t.pose !== "mouth" && t.pose !== "back") return {};
  // 이야기 글에는 아이 이름이 들어가 있다 — 「하루가 손전등을 들고 · 하루 손에 쥐여 주며」도 주인공 (11/10 전수 점검: 땅에 놓였다)
  const heroSubj = !!heroName && !!t.subject && t.subject.replace(/\s+/g, "").startsWith(heroName);
  if (t.subject === "hero" || heroSubj) return { holder: "hero", subject: undefined };
  // 입에 묾 · 등에 태움은 4족형 주인공만 (다른 인물이면 보통 자리로)
  if (t.pose === "mouth" || t.pose === "back") return { pose: undefined, subject: undefined };
  const subj = (t.subject ?? "").replace(/\s+/g, "");
  const words = (t.subject ?? "").split(/\s+/).map((w) => w.replace(/님$/, "")).filter((w) => w.length >= 2 && !TITLES.has(w));
  const kind = personKind("", t.subject ?? "");
  const who = props.filter((q) => isPerson(q.id)).find((q) => {
    const n = (q.name ?? "").replace(/\s+/g, "");
    return (n && (n.includes(subj) || subj.includes(n) || words.some((w) => n.includes(w))))
      || (kind && (q.id === kind || q.id.split("-")[0] === kind.split("-")[0]))
      || (/친구/.test(subj) && /^(?:friend|friend2|spacekid)/.test(q.id));
  });
  // 「숲 지킴이 아저씨가」처럼 이름이 「지킴이」에서 잘려 「아저씨」만 남아도, 그 쪽에 사람이 하나면 그 사람 (11/10 전수 점검)
  const only = props.filter((q) => isPerson(q.id));
  const one = !who && only.length === 1 && PERSON_TAIL.test(subj) ? only[0] : undefined;
  return who ?? one ? { holder: (who ?? one)!.name ?? (who ?? one)!.id, subject: undefined } : { pose: undefined, subject: undefined };
}

/** 손이 거의 안 움직이는 쪽 동작 — 주인공이 든 소품은 이때만 손에 (손 흔들기 · 춤처럼 팔이 움직이면 소품이 손에서 떨어져 보인다) */
const CALM_ACTIONS = new Set(["idle", "breathe", "shiver"]);

/** 장소 카드 → 카드로 세우는 어른 그림 (* 는 이야기마다 남 · 여) */
const PLACE_ADULT: Record<string, string> = {
  home: "mom", playground: "keeper-*", school: "teacher", town: "police-*", forest: "ranger-*", sea: "lifeguard-*",
  space: "spacepolice-*", cave: "caveguide-*",
};
/** 이름에서 빼고 보는 호칭 (「경찰관 아저씨」의 「아저씨」) */
const TITLES = new Set(["아저씨", "아주머니", "아줌마", "선생님", "언니", "오빠", "누나", "할머니", "할아버지", "삼촌", "이모", "고모"]);
/** 그림의 성별 (호칭으로 이어 쓸 때) */
const personSex = (k: PersonId): "m" | "f" | null =>
  /-f$/.test(k) || k === "mom" || k === "aunt" || k === "grandma" || k === "nurse" ? "f" : /-m$/.test(k) || k === "dad" || k === "grandpa" ? "m" : null;

/** 대본 자리 → 가로 자리. 주인공은 왼쪽 가운데라 인물은 오른쪽 */
const SLOT_X: Record<string, number> = { "right-middle": 0.78, "right-bottom": 0.66, "left-middle": 0.24 };

/** 쪽마다 계획. place 는 장소 카드 id (말로 정한 장소면 부르지 않는다).
 *  인물: 대본이 그 쪽에 적은 인물(scene.characters)이 먼저다 — 글에 나오는 사람이 화면에 나온다.
 *  대본에 인물이 없는 쪽만 고른 카드로 정한다 (친구 카드면 친구, 어른 카드면 어른) */
/** 붙박이 물건: 한 번 나오면 배경이 같은 동안 그 자리에 그대로 둔다 (11/10 사용자 「새 둥지가 3쪽부터 사라져, 장소가 바뀔 때 사라지게」).
 *  저장 카드 이야기 1,024편 중 663편에서 같은 배경인데 글에 낱말이 빠진 쪽에서 사라졌다. 들고 다니는 것(공 · 손전등 · 책 · 담요 …)은 뺀다 */
const KEEP_THINGS = new Set(["nest", "tent", "arrow", "bench", "chair", "table", "flag", "mailbox", "gate", "fence", "bridge", "stairs",
  "monkeybars", "tunnel", "booth", "parkgate", "slide", "lamp", "flowerbed", "fountain", "pavilion", "bed", "junglegym", "pond", "desk", "railing",
  "seesaw", "boat", "sandcastle", "flowerpot", "flowers", "mushroom", "puddle", "rocks", "pebble", "dune", "rocket", "spaceship", "rug",
  "clock", "log", "cushion", "footprints", "stump", "shells", "swing"]);
/** 집이라고 분명히 말하는 쪽 (11/11 사용자 「추천대로」): 어느 장소 이야기든 집 장면으로 옮긴다. 동굴 이야기 끝 「엄마가 집에 도착해
 *  침대에 눕혀 주었어요」가 동굴 호수 장면이었고, 「할아버지 집 이불 속에」의 이불이 숲에 놓였다. 「집에 가고 싶어」 같은 바람 · 앞일은 아니다 */
const HOME_TEXT = /집(?:에|으로)\s?(?:무사히\s|드디어\s)?(?:도착|돌아왔|돌아와|들어왔|들어와|왔어요|와서|오자|오니|갔어요|돌아갔)|숙소(?:에서|에|로)\s?(?:[가-힣]+\s){0,3}(?:누|잠|눕)|집 (?:이불|침대|안|방|거실)|(?:침대|이불 속)에\s?(?:눕|누워|누웠|쏙)/;
const HOME_BED = /침대|이불|베개|잠이 들|잠들|눕|누워|누웠/;
/** 가슴 · 마음이 뛰는 말 (움직임이 아님) */
/** 그 쪽에서 그 자리에서 무엇을 하는 사람 (주어 + 그 자리의 일). 지난 일 · 먼 곳 · 꿈 · 전화 · 안 보임은 빼고 */
const ON_SCENE = /열어 주|웃|건네|다가|안아|쓰다듬|데려다|손을 (?:꼭 )?잡|따라|비춰|붙여 주|도와|내밀|토닥|업어|꺼내 주|나와|나왔|들고 (?:있|서|왔)|앉아|서 있|기다리고/;
const NOT_ON_SCENE = /꿈|전화|사진|그림|보낸|멀리서|어디|안 보|보이지|없었|없어|생각|떠올|말해 주었|해 준 말|기억|들려|목소리|부르는 소리|이야기|소포|편지/;
function calledIn(text: string, heroName?: string | null): string[] {
  const out: string[] = [];
  for (const sen of text.replace(/“[^”]*”/g, " ").split(/(?<=[.!?])\s*/)) {
    if (!ON_SCENE.test(sen) || NOT_ON_SCENE.test(sen)) continue;
    // 「초인종이 울려서 엄마가 문을 열어 주었어요」: 사람인 주어를 찾을 때까지
    for (const m of sen.matchAll(/(?:^|\s)((?:[가-힣]+ )?[가-힣]+?)(?:이|가|께서|도)\s/g)) {
      const w = m[1].trim();
      if (!w || w === heroName || !PERSON_TAIL.test(w.split(" ").pop()!) || /친구들|사람|아이|인형/.test(w)) continue;
      if (!out.includes(w)) out.push(w);
      break;
    }
  }
  return out;
}
/** 쪽 동작마다 주인공 문장에 있으면 그 동작을 하는 말 */
const ACTION_SAY: Record<string, RegExp> = {
  jump: /뛰|폴짝|깡충|점프|껑충|펄쩍|들썩|만세|팔짝/, run: /달려|달렸|달리|뛰어|뛰었|뛰며|후다닥|타다닥|헐레벌떡|쌩/,
  walk: /걸|걸음|다가|나아|따라|돌아서|돌아왔|돌아갔|나갔|나섰|나서|갔어요|왔어요|건너|지나|살금|뚜벅|콩콩|총총|기어|올라|내려|향했|이동/,
  dance: /춤|덩실|빙글|흔들흔들|들썩/, wave: /흔들|인사|안녕|반가/,
};
/** 주인공이 가만히 있는 말: 걷기 · 뛰기 쪽 (숨기는 숨으러 가는 것이라 뺀다) · 제자리 동작 쪽 */
const STILL_MOVE = /앉아|앉았|앉은 채|누워|누웠|잠이 들|잠들|쳐다보|바라보았|올려다보|내려다보|기다렸|멈춰 섰|멈췄|가만히 서|서 있(?:어요|었어요|었|었다)|입을 벌|꼼짝/;
const STILL_LOOP = /앉아|앉았|앉은 채|누워|누웠|잠이 들|잠들|쳐다보|바라보았|올려다보|내려다보|숨었|숨어|숨죽|기다렸|멈춰 섰|멈췄|가만히|입을 벌|꼼짝|울었|울고|훌쩍|엉엉/;
const HEART_BEAT = /(?:가슴|심장|마음)(?:이|은|도|까지)? (?:[가-힣]+,? ){0,3}뛰[가-힣]*/;
/** 주인공이 옮겨 가는 말 (걷기 · 뛰기 동작을 그대로 둘 때) */
const MOVE_WORDS = /걸어|걸었|걷|달려|달렸|달리|뛰어|뛰었|뛰며|뛰다|다가|갔어요|갔다|왔어요|건너|지나|올라|내려|따라|향해|도망|산책|다다다|타다닥|사뿐|살금살금|걸음|성큼|폴짝|깡충|총총|돌아왔|돌아갔|들어갔|나갔|나왔|가까워|멀어|와서|찾아와|찾아갔/;
/** 가는 길 · 보이기만 · 바람 (그곳에 있는 게 아님): 「미끄럼틀로 가는 길에 · 교실을 향해 · 창밖으로 운동장이 · 저기 도서관이 보였어요」 */
// 「낚싯대를 번쩍 들어 보였어요」의 보였다는 보이기만 한 것이 아니다 (11/11)
const NOT_THERE = /(?<!들어 |내어 |꺼내 |흔들어 )보였|(?<!들어 |꺼내 )보여|창밖|창문 너머|저기|저 멀리|생각|꿈|그림/;
/** 그곳 말 바로 뒤가 가는 길이면 아직 거기 있는 게 아님 (「미끄럼틀로 가는 길에 · 교실을 향해」). 문장 다른 곳의 「무지개 쪽으로」는 상관없다 */
const ON_THE_WAY = /^[^.!?]{0,10}?(?:가는 길|가다가|가려|향해|쪽으로|가고 싶|까지 가)/;
/** [그곳 말, 맞는 장면, 쓸 수 있는 장소(카드) · 지금 장면 조건, 주인공이 주어여야 하나] */
const AT_SCENE: [RegExp, string, (place: string, loc: string) => boolean, boolean][] = [
  [/(?:부엌|식탁)(?:에서|에|으로|로)\s?[^.!?]{0,18}?(?:씻|앉|먹|놓|섰|서 있|들어|돌아|차렸|도왔)/, "home-kitchen", (_p, l) => l.startsWith("home"), true],
  // 집 마당 · 골목: 주인공이 거기 있다고 하거나(「골목을 걸었어요」) 집에 막 돌아온 쪽(「집으로 돌아왔어요. 대문 앞에서 엄마가」)만.
  // 「창밖에서 소리가 들렸어요. 대문 앞에서 친구가 울고」는 집 안 (needHero, 아래 arrived)
  [/(?:대문 앞|마당|골목)(?:에서|에|으로|로|을)/, "home", (_p, l) => l === "home-living", true],
  // 마당 · 대문에서 안으로 들어가거나 방 안 말이면 거실 (「대문 안으로 들어갔어요 · 유자 냄새가 방 안에 퍼졌어요」)
  [/(?:대문 안|현관|집 안)(?:으로|에)\s?[^.!?]{0,6}?들어|방 안에|거실에|거실로/, "home-living", (_p, l) => l === "home", false],
  // 가게 안 (빵집 · 꽃집 · 문구점 안에 있거나 들어감, 문을 열고 들어감): 가게 안 장면 town-shop (11/11 새로 그림)
  [/(?:빵집|가게|꽃집|문구점|약국|서점|과일 가게)(?: 안에| 안으로| 안|에서|에|으로|로)\s?[^.!?]{0,16}?(?:숨었|숨어|달려갔|들어갔|들어가|들어섰|들어왔|있는 어른)|(?:빵집|가게|꽃집|문구점) 문을 (?:열고|활짝)/, "town-shop", () => true, true],
  [/시장(?:에서|에|으로|로)\s?[^.!?]{0,14}?(?:도착|들어|걸었|돌아다|구경)/, "town-market", () => true, true],
  [/놀이터(?:에서|에|으로|로)\s?[^.!?]{0,10}?(?:들어갔|도착|놀|뛰|왔어요|돌아왔)/, "playground", (p) => p === "town" || p === "playground", true],
  // 방파제에 있는 쪽은 나무 바닥 부두 배경 (모래사장 배경이었다, 11/11 글이 말하는 물건 점검)
  [/방파제(?:에|에서|위|위에서|위를|입구에|끝에|끝까지|를|로|으로)?\s?[^.!?]{0,10}?(?:도착|걸|섰|서 있|앉|올라|달려|뛰|낚시|갔)/, "sea-pier", (p) => p === "sea", false],
  // 교문을 지나는 · 교문 앞에 선 쪽은 학교 바깥 (교실 배경에 「교문을 지났어요」였다, 11/11 글이 말하는 물건 점검 772번)
  [/교문(?:을|에|앞에|앞에서|옆에|옆에서|으로)?\s?[^.!?]{0,14}?(?:지나|지났|섰|서 있|도착|기다렸|기다리|배웅|마중)/, "school", (p) => p === "school", false],
  // 우주선 안 배경인데 「로켓 문 앞에 내려섰어요 · 저기 멀리 빨간 로켓」은 바깥 (11/12)
  [/(?:로켓|우주선) (?:문 )?(?:앞|옆|밖)(?:에|에서|으로)\s?[^.!?]{0,8}?(?:내려|섰|서 있|도착|달려|걸어)/, "space", (p) => p === "space", true],
  [/(?:그네|미끄럼틀)(?:에|까지|를|을|에서)?\s?[^.!?]{0,8}?(?:앉|타|데려다|올라|내려)|그네가[^.!?]{0,10}흔들/, "playground", (p) => p === "playground", false],
  // 놀이 기구를 지나며 노는 말(「구름다리를 건너고 긴 터널을 지났어요」)은 기구가 있는 놀이터, 벤치 길이 아니다 (11/11 사용자 994번).
  // 모래 터널은 빼고
  [/(?:구름다리|(?<!모래 )터널)(?:를|을|에|에서|위를|위에서|아래로|속을|속으로)?\s?[^.!?]{0,6}?(?:건너|지나|지났|매달|기어|통과|빠져)/, "playground", (p) => p === "playground", false],
  [/(?:시냇물|시냇가|개울|냇가)(?: 옆| 앞)?(?:에서|에|으로|로|을)\s?[^.!?]{0,8}?(?:지나|걸|앉|섰|놀|도착|건너)/, "forest-stream", (p) => p === "forest", false],
];
/** 주인공이 지금 있는 곳을 글이 분명히 말하면 그 장면, 아니면 undefined (가는 길 · 보이기만 · 다른 사람만 거기 있는 문장은 빼고) */
export function whereHeroIs(text: string, place: string, loc: string): string | undefined {
  for (const sen of text.replace(/“[^”]*”/g, " ").split(/(?<=[.!?])\s*/)) {
    if (NOT_THERE.test(sen)) continue;
    for (const [rx, to, can, needHero] of AT_SCENE) {
      const m = rx.exec(sen);
      if (to === loc || !can(place, loc) || !m || ON_THE_WAY.test(sen.slice(m.index))) continue;
      // 「토토와 친구는 · 나와 엄마는」처럼 주인공이 함께 하는 것도 주인공
      const withHero = /데려다|우리|(?:^|\s)나와 /.test(sen) || (!!heroWord && sen.includes(heroWord + "와 "));
      if (needHero && subjectOf(sen, [], heroWord) !== "hero" && !withHero && !(to === "home" && HOME_TEXT.test(text))) continue;
      return to;
    }
  }
  return undefined;
}
/** 집에 온 뒤 다시 나가는 말 (없으면 다음 쪽도 집) */
const LEAVE_HOME = /밖으로|밖에 나|나갔|나가|나왔|나서|집을 나|떠났|숲|바다|동굴|놀이터|학교|마을|공원|시장|우주/;
/** 꿈 쪽: 꿈 글에 나온 물건만 놓고, 현실에서 이어 오던 물건은 잠시 뺀다(깨면 다시). 「꿈속에서 나뭇잎 배를 타고」에 캠핑장 텐트가 있었다 */
const DREAM_TEXT = /꿈\s?속|꿈에서|꿈나라|꿈을 꾸|꿈을 꿨/;
/** 이어 가는 작은 물건(꽃 · 돌 · 조개 …)은 최근 것 2개까지: 버스 정류장에 의자 · 화분 · 꽃이 쌓였다(이어 온 물건 2개 이상 908쪽) */
const SMALL_KEEP = new Set(["flowers", "pebble", "shells", "mushroom", "puddle", "footprints", "cushion", "flowerpot"]);
const SMALL_KEEP_MAX = 2;

/** 그 물건이 치워지거나 없어지는 말: 그 쪽까지만 있고 다음 쪽부터는 잇지 않는다 */
const GONE_AFTER = /^.{0,14}?(?:무너|부서|사라졌|사라지|치웠|치우|떠내려|날아가|날아갔|가져갔|가져가|주워|주웠|집어|들고 갔|넣었|넣어|쓸려|녹아|터졌|떠났|떠나)/;
/** 앉는 · 올라가는 · 기대는 자리 (그 문장에서 자리 낱말이 동사보다 앞) → 장면 그림 이름 */
const SEAT_WORDS: [RegExp, string][] = [[/그루터기/, "stump"], [/벤치/, "chair"], [/의자/, "chair"], [/바위/, "rocks"], [/통나무/, "log"],
  [/소파/, "sofa"], [/구름 침대|침대 같은|침대처럼/, ""], [/침대/, "bed"], [/등대[^.]{0,6}계단/, "lighthouse"], [/그네/, "swing"], [/시소/, "seesaw"], [/계단/, "stairs"], [/방석/, "cushion"], [/돌(?:멩이)?(?=에|위)/, "rocks"]];
const SIT_VERB = /앉|올라가|올라섰|누워|누웠|기대/;
const nameOfSrc = (src: string) => src.split("/").pop()!.replace(/\.webp$/, "");
/** 주인공(나 · 이름)이 앉는 문장의 자리. 다른 인물만 앉는 문장(「아기 토끼가 옆에 앉았어요」)은 주인공이 「나란히 · 같이」일 때만 */
export function seatOf(text: string): string | undefined {
  for (const sen of text.split(/(?<=[.!?”])\s*/)) {
    const v = sen.search(SIT_VERB);
    if (v < 0) continue;
    if (subjectOf(sen, [], heroWord, v) !== "hero" && !/나란히|같이|함께|우리/.test(sen)) continue;
    for (const [rx, kind] of SEAT_WORDS) {
      const m = rx.exec(sen);
      // 「구름 침대 · 침대처럼」은 장면의 앉는 자리가 아니다 (빈 이름)
      if (m && m.index < v) return kind || undefined;
    }
  }
  return undefined;
}

/** 앞 쪽이 끝났을 때 모습 (책 화면 S09Story 의 prevEnv 와 같은 셈, 검사 도구가 같이 쓴다): 그 쪽에서 「환해졌어요 · 불을 켰어요」로
 *  밝아졌으면 밝아진 채로 */
export function envAfter(prev: PagePlan, prevText: string, next?: PagePlan): Env {
  const e = prev.env, lit = sceneFx(prevText).bright >= 0;
  return { ...e, dim: !!e.dim && !lit, night: e.night && !(e.lightsOn && lit), glow: !!e.glow || (lit && !!next?.env.glow) };
}

export function planPages(pages: BookPage[], picks: Picks, sheet: Record<string, string> = {},
  mine: { name: string; png: string; height: number }[] = [], heroName?: string | null, form?: string | null): PagePlan[] {
  // 주인공 이름을 계획하는 동안만 둔다 (주기 · 손에 듦 · 앉기에서 「토토가 …」를 주인공으로, isMe)
  heroWord = heroName?.trim() || null;
  try { return planPagesWith(pages, picks, sheet, mine, heroName, form); } finally { heroWord = null; }
}
function planPagesWith(pages: BookPage[], picks: Picks, sheet: Record<string, string>,
  mine: { name: string; png: string; height: number }[], heroName?: string | null, form?: string | null): PagePlan[] {
  const place = picks.place!;
  const out: PagePlan[] = [];
  let darkCard = false, nightSaid = false;
  let x = SLOT, loc: string | undefined, night = false, dimOn = false, lit = false, glow = false, flying: boolean = false;
  let face: -1 | 0 | 1 = 0;
  // 이야기 열쇠: 글로 만든 짧은 값이라 다시 계획해도(새로고침 · 주소 새로 받음) 같다
  const story = [...pages.map((p) => p.text).join("|")].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7).toString(36);
  // 같은 배경 동안 이어 가는 붙박이 물건 (배경이 바뀌면 비운다)
  let kept: ThingPlan[] = [], keptLoc: string | undefined;
  // 앞 쪽에 놓였던 물건 이름 → 열쇠 (같은 배경일 때만). 들고 다니는 것도 다음 쪽 글에 또 나오면 같은 자리에 (쪽마다 옮겨 다니지 않게)
  let lastKeys = new Map<string, string>();
  const stageIdx = (s: string) => ["place", "problem", "action", "result"].indexOf(s);
  // 숨는 곳은 행동 쪽들의 글에서 한 번 정해 쪽이 바뀌어도 같은 물건
  const cover = coverFor(pages.filter((p) => p.stage === "action").map((p) => p.text).join(" "));
  // 표지판 색: 글이 「초록색 표지판」이라 하면 그 쪽부터 끝까지 초록 판 (11/11 사용자 994번 「초록 표지판」에 나무색 표지판)
  let signSrc: string | undefined;
  // 대본이 쪽마다 등장인물을 적은 이야기(장면 계획)는 대본을 따른다 — 인물이 없는 쪽은 비워 둔다.
  // 카드로 사람(어른 · 친구)을 세우는 것은 장면 계획이 없는 예전 이야기만 (11/4 사용자 — 주인공 혼자 로켓 창밖을 보는
  // 마지막 쪽에 결과 카드 때문에 남자 어른이 섰다)
  const planned = pages.some((p) => Array.isArray(p.scene?.characters));
  // 인물 이름 → 그림. 대본이 같은 사람을 쪽마다 다르게 적으면(「우주 경찰관」 → 「경찰관 아저씨」 · 「아저씨」) 뒤의 이름은
  // 생김새 설명이 없어 호칭만으로 평범한 아저씨 그림이 섰다 (11/4 팀원 시험 — 우주 경찰관 이야기 마지막 쪽).
  // 설명이 없는 이름은 ① 이름 낱말이 겹치는 인물 ② 호칭뿐이면 앞에 나온 같은 성별 인물의 그림을 이어 쓴다
  const sheetKey = (n: string) => Object.keys(sheet).find((k) => k.replace(/\s+/g, "") === n.replace(/\s+/g, ""));
  const sheetDesc = (n: string) => { const k = sheetKey(n) ?? Object.keys(sheet).find((x) => x.includes(n) || n.includes(x)); return k ? sheet[k] : ""; };
  const seenKinds: { name: string; kind: PersonId }[] = [];
  const renamed = new Map<string, PersonId>();
  // 카드로 세우는 어른 · 친구(장면 계획이 없는 짧은 이야기 · 예전 이야기)는 장소에 맞는 그림 — 우주에서 「어른에게 물어봤어요」면
  // 평범한 어른이 아니라 우주 경찰관 (11/4). 남녀는 이야기 첫 글로 정해 한 이야기 안에서는 같다
  const sex: "m" | "f" = [...(pages[0]?.text ?? "")].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 2 ? "f" : "m";
  const cardAdult = (PLACE_ADULT[place]?.replace("*", sex) ?? "adult") as PersonId;
  const cardFriend = (place === "space" ? `spacekid-${sex}` : "friend") as PersonId;
  const kindOfName = (name: string): PersonId | null => {
    const key = sheetKey(name);
    if (key) return personKind(sheet[key], name);
    const core = name.split(/\s+/).map((w) => w.replace(/님$/, "")).filter((w) => w.length >= 2 && !TITLES.has(w));
    const byWord = Object.keys(sheet).find((k) => core.some((w) => k.includes(w)));
    if (byWord) return personKind(sheet[byWord], byWord);
    const sex = /아저씨|할아버지|삼촌|형|오빠/.test(name) ? "m" : /아주머니|아줌마|할머니|이모|고모|언니|누나/.test(name) ? "f" : null;
    if (!core.length && sex) {
      const prev = [...seenKinds].reverse().find((v) => personSex(v.kind) === sex);
      if (prev) return prev.kind;
    }
    return personKind("", name);
  };
  // 미리 한 번 훑어, 한 쪽에 같은 그림이 둘 서는 이름은 이야기 전체에서 다른 그림으로 정해 둔다
  for (const p of pages) {
    const used = new Set<PersonId>();
    for (const c of p.scene?.characters ?? []) {
      let k = renamed.get(c.name) ?? kindOfName(c.name);
      if (!k) continue;
      if (used.has(k)) {
        // 성별은 바꾸지 않는다 — 남자아이 둘째가 여자아이 그림으로 서서 목소리와 어긋났다 (11/10). 친구는 같은 그림 그대로
        k = k === "mom" ? "aunt" : k === "teacher" ? "aunt" : k;
        if (!renamed.has(c.name)) renamed.set(c.name, k);
      }
      used.add(k);
    }
  }
  for (const [pi, p] of pages.entries()) {
    const prevLoc = loc;
    loc = locationFor(place, p, loc);
    if (place !== "home") {
      if (HOME_TEXT.test(p.text)) loc = HOME_BED.test(p.text) ? "home-bedroom" : "home-living";
      else if (prevLoc?.startsWith("home") && !LEAVE_HOME.test(p.text)) loc = prevLoc;   // 집에 온 뒤로는 나간다는 말이 없으면 집
    }
    // 주인공이 실제로 그곳에 있다고 분명히 말하면 그 장면 (대본이 적은 자리 · 장소 카드보다 앞): 「부엌에서 방울토마토를 씻었어요」가 거실,
    // 「그네에 앉아」가 산책길, 집 이야기 「빵집 안 포대 뒤에 숨었어요」가 거실이었다 (11/11 사용자 「대본 내용이랑 뒷배경이 안 맞는 것」)
    const there = whereHeroIs(p.text, place, loc);
    if (there) loc = there;
    // 가게 안에 들어갔으면 나온다는 말(「밖으로 나왔어요 · 빵집 앞 의자에」)이 없는 한 가게 안: 「빵집 안 포대 뒤에 숨었어요」 다음
    // 「할아버지가 웃고 있었어요 · 오븐에서 빵 냄새」가 바깥 시장 거리였다 (11/11)
    else if (prevLoc === "town-shop" && loc.startsWith("town") && !/나왔|나와|나가|나섰|밖으로|밖에 나|앞 의자|(?:빵집|가게|꽃집|문구점) 앞|골목|거리/.test(p.text)) loc = "town-shop";
    // 장소 카드 밖 장면으로 옮겼으면(놀이터 · 빵집) 나간다는 말이 없는 한 다음 쪽도 그곳: 7쪽 「놀이터로 들어갔어요」 다음 8쪽
    // 「친구와 그네를 탔어요」가 다시 마을 거리였다 (11/11). 집은 위에서 따로 잇는다
    else if (prevLoc && !prevLoc.startsWith("home") && !LOCATIONS[place]?.some((s) => s.id === prevLoc) && !/나왔|나와|나가|나섰|떠났|돌아왔|돌아갔|돌아가|집으로|밖으로/.test(p.text)) loc = prevLoc;
    // 물고기(지느러미형) 주인공은 바다에서 늘 바닷속 — 모래사장 · 방파제 글이어도 물 밖에 세우지 않는다 (11/10 사용자 「물고기는 바다 안에서」)
    if (form === "finned" && place === "sea") loc = "sea-underwater";
    const st = stageIdx(p.stage);
    // 밤: 「어두워졌어요」부터 이어진다. 결과 「해가 떴어요」에서 밝아지고, 「잠이 들었어요」는 밤.
    // 카드가 아니어도 쪽 글에 밤이 되거나(해가 졌어요 · 밤이 되었어요) 아침이 오면(해가 떴어요) 그 쪽부터 바꾼다 (11/4)
    if (picks.problem === "dark" && st >= 1 && !darkCard) { night = true; darkCard = true; }
    // 문장마다 본다 — 대사 · 묻는 말 · 지난 일(어젯밤) · 앞일(내일 아침)은 빼고, 한 쪽에 둘 다 있으면 나중에 나온 것 (11/10 저장 이야기 전수 점검)
    const nightAt = lastHit(p.text, NIGHT_TEXT, NOT_NIGHT), mornAt = lastHit(p.text, MORNING_TEXT, NOT_MORNING);
    const morningHere = mornAt >= 0 && mornAt > nightAt;
    if (nightAt >= 0 || mornAt >= 0) { night = !morningHere; nightSaid = !morningHere; }
    // 밤이라는 말 없이 카드로만 어두웠는데 실내(동굴 · 방)에서 바깥으로 나왔으면 그 어둠은 그곳의 어둠이었다: 굴 밖에 달 · 별이 떴다 (11/10)
    if (night && !nightSaid && !!prevLoc && isIndoor(prevLoc) && !!loc && !isIndoor(loc)) night = false;
    // 바깥에서 환한 빛이 나오고 밤이라는 말이 없으면 낮 (「굴 밖으로 나오자 환한 빛이 눈부셨어요」에 달 · 별이 떴다)
    if (night && !!loc && !isIndoor(loc) && nightAt < 0 && BRIGHT.test(p.text)) night = false;
    if (p.stage === "result" && picks.result === "sun") night = false;
    if (p.stage === "result" && picks.result === "sleep") night = true;
    const sun = !night;
    // 어두운 곳: 그 쪽에서 어두워지면 다음 쪽들도 어둑하다 — 밝아지는 말(불빛 · 환해졌어요) · 아침이 오면 걷힌다.
    // 같은 쪽에서 밝아지면 장면이 그 말에서 걷어 낸다(SceneStage). 밤이면 밤이 이긴다
    const darkHere = lastHit(p.text, DARK_TEXT, NOT_DARK) >= 0;
    const brightHere = lastHit(p.text, BRIGHT, NOT_BRIGHT) >= 0;
    const offHere = lastHit(p.text, LIGHTS_OFF) >= 0;
    const dimNow = !night && (dimOn || darkHere) && !morningHere;
    if (darkHere) dimOn = true;
    if (brightHere || morningHere || (p.stage === "result" && picks.result === "sun")) dimOn = false;
    // 환해진 빛은 이야기가 바꾸기 전까지 이어진다 (11/10 사용자 「환해진 화면이 다음 쪽에 다시 까매진다 — 연출은 이야기가 바뀌지 않으면 유지」).
    // 바깥도 — 밤하늘은 그대로 두고 빛만 번져 있다. 꺼졌어요 · 다시 어두워졌어요 · 아침(낮이 되면 빛이 필요 없다)에서 끝난다
    const glowIn = glow;
    if (offHere || darkHere || morningHere) glow = false;
    // 빛이 번져 남는 것은 어둡거나 밤일 때만 — 낮에 「햇빛이 든 자리」로 빛이 번져 다음 쪽까지 남았다 (11/10 전수 점검)
    if (brightHere && !morningHere && !offHere && (night || dimNow || darkHere || lit)) glow = true;
    // 실내 불: 켜지면 꺼진다는 말이 있을 때까지 밤이어도 밝다 (실내만 — 바깥 밤하늘은 그대로)
    const indoorHere = !!loc && isIndoor(loc);
    const turnsOn = indoorHere && lastHit(p.text, LIGHTS_ON, NOT_BRIGHT) >= 0 && !offHere;
    const litHere = indoorHere && lit;
    if (offHere) lit = false;
    else if (turnsOn) lit = true;
    // 불을 켜면 어둑함 기억도 지운다: 동굴에서 손전등을 켠 뒤 굴 밖으로 나오자 지난 어둑함이 되살아나 다시 어두워졌다 (11/10 전체 대본 점검)
    if (turnsOn) dimOn = false;
    // 날기: 날아오르는 말부터 앉는 · 걷는 말까지 (쪽마다 오르내리지 않게)
    // 주인공이 나는 문장일 때만 (11/10 점검: 「비눗방울이 날아왔어요 · 꽃향기가 날아왔어요 · 새가 날아올랐어요」에 주인공이 날기 시작했다)
    // 대사를 먼저 지우고 자른다 — 「“저기 날아가네!”」가 「!」에서 반으로 갈려 대사로 안 보였다 (11/10 전수 점검)
    const flyHere = unquoted(p.text).split(/(?<=[.!?])\s*/).some((t) => {
      const m = FLY_TEXT.exec(t);
      if (!m) return false;
      // 「날아가는 우주선 · 날던 새」처럼 뒤 말을 꾸미면 주인공이 나는 게 아니다
      const word = t.slice(m.index).split(/\s/)[0];
      if (/(?:는|던|은)$/.test(word) && /^\s+[가-힣]/.test(t.slice(m.index + word.length))) return false;
      const before = t.slice(0, m.index);
      // 「우주선은 · 새는 날아갔어요」 — 은 · 는 앞이 주인공(나 · 이름 · 우리)이 아니면 그것이 난다
      const topic = [...before.matchAll(/([가-힣]+)(?:은|는)(?=[\s,]|$)/g)].map((x) => x[1]).pop();
      if (topic && !/^(?:나|난|우리|내)$/.test(topic) && !(heroName && topic.startsWith(heroName))) return false;
      // 나는 말 바로 앞의 「~이 · ~가」가 다른 것이면 그것이 난다 — 「나는 친구의 별 연이 날아갔다고 말했어요」 (11/10 전수 점검)
      const near = [...before.matchAll(/([가-힣]+)(?:이|가)(?=[\s,]|$)/g)].map((x) => x[1]).pop();
      if (near && !/^(?:내|제|몸|나)$/.test(near) && !(heroName && near.startsWith(heroName))) return false;
      return subjectOf(before, [], heroName, before.length) === "hero";
    });
    const landHere = !flyHere && LAND_TEXT.test(p.text);
    const fly: boolean = flyHere || (flying && !landHere);
    flying = fly;

    const props: PropPlan[] = [];
    if (/초록\S*\s?표지판/.test(p.text)) signSrc = "props/sign-green.webp";
    const sign: PropPlan = signSrc ? { id: "sign", src: signSrc } : { id: "sign" };
    const actionProp = picks.action ? ACTION_PROP[picks.action] : undefined;
    const prevProps = out.length ? out[out.length - 1].props.map((q) => q.id) : [];
    const keep = (card: "adult" | "friend", enter: "left" | "right") => {
      const id = card === "adult" ? cardAdult : cardFriend;
      if (!planned) props.push(prevProps.includes(id) ? { id } : { id, enter });
    };
    if (!planned && picks.problem === "crying" && st >= 1 && st <= 2) props.push({ id: cardFriend });
    if (p.stage === "action" && actionProp) {
      if (actionProp === "adult") keep("adult", "left");
      if (actionProp === "friend" && !props.some((q) => q.id === cardFriend)) keep("friend", "right");
      if (actionProp === "sign") props.push(sign);
      if (actionProp === "cover" && cover) props.push({ id: "cover", ...cover });
    }
    if (p.stage === "result" && picks.result) {
      if (FRIEND_RESULTS.has(picks.result)) keep("friend", "right");
      if (ADULT_RESULTS.has(picks.result)) keep("adult", "left");
      if (picks.result === "found_way") props.push(sign);
    }
    // 글이 표지판을 말하면(「저 앞에 표지판이 보였어요」) 카드가 아니어도 세운다 (11/12). 배경 표지판이 있으면 SceneStage 가 또 세우지 않는다
    if (!props.some((q) => q.id === "sign") && /표지판(?!처럼| 같| 그림)/.test(p.text.replace(/“[^”]*”/g, " "))) {
      props.push(sign);
    }
    // 대본 인물이 있으면 사람은 그것으로 바꾼다 (표지판 · 숨을 것은 카드대로 둔다)
    // 대본 인물 목록에서 빠졌는데 글에서 그 자리에서 무엇을 하는 사람(「엄마가 문을 열어 주었어요 · 기사님이 웃어 주었어요」)도 세운다
    // (11/12 전수 점검: 대본 목록에 「친구」만 있어 문을 열어 준 엄마가 없었다). 대본 인물과 같은 사람(이름 · 그림 종류가 같음)은 빼고
    const listed = p.scene?.characters ?? [];
    const called = Array.isArray(p.scene?.characters) ? calledIn(p.text, heroName).filter((n) => {
      const k = kindOfName(n);
      // 호칭만(「아저씨가 방긋 웃었어요」)이면 대본에 사람이 있을 때 그 사람이다 (11/12 전체 검사: 숲 지킴이 옆에 아저씨가 또 섰다)
      if (listed.length && /^(?:아저씨|아주머니|아줌마|선생님|언니|오빠|형|누나|이모|고모|삼촌|사장님|기사님|선장님|박사님|어른|직원)$/.test(n.split(" ").pop()!)) return false;
      return k && !listed.some((c) => c.name === n || c.name.includes(n) || n.includes(c.name) || kindOfName(c.name) === k);
    }) : [];
    // 글로 세운 사람은 대본 인물(오른쪽)과 겹치지 않게 왼쪽 칸 (11/12 전체 검사: 문을 열어 준 엄마가 친구와 겹쳤다)
    const scripted = [...listed, ...called.map((name) => ({ name, slot: listed.length ? "left-middle" : "right-middle" }))]
      .map((c) => ({ c, kind: kindOfName(c.name) }))
      .filter((v): v is { c: { name: string; slot: string }; kind: PersonId } => !!v.kind);
    for (const v of scripted) if (!seenKinds.some((q) => q.name === v.c.name)) seenKinds.push({ name: v.c.name, kind: v.kind });
    // 같은 그림이 한 쪽에 둘이면 다른 친구 그림으로 (친구 둘)
    // 한 번 바꾼 이름은 이야기 전체에서 그 그림 (11/4 — 사서 선생님이 혼자일 때는 선생님, 담임과 함께일 때는 다른 어른 그림이었다)
    for (const v of scripted) if (renamed.has(v.c.name)) v.kind = renamed.get(v.c.name)!;
    const usedKinds = new Set<PersonId>();
    for (const v of scripted) {
      if (usedKinds.has(v.kind)) {
        v.kind = v.kind === "mom" ? "aunt" : v.kind === "teacher" ? "aunt" : v.kind;
        renamed.set(v.c.name, v.kind);
      }
      usedKinds.add(v.kind);
    }
    if (scripted.length) {
      const prev = out.length ? out[out.length - 1].props : [];
      const prevNames = prev.map((q) => q.name).filter(Boolean);
      for (let k = props.length - 1; k >= 0; k--) if (isPerson(props[k].id)) props.splice(k, 1);
      // 앞 쪽에 있던 사람은 그 자리 그대로 (11/10 점검: 대본이 쪽마다 인물 순서 · 칸을 바꿔 적어 친구가 0.78 → 0.66 → 0.78 로
      // 쪽마다 자리를 바꿨다). 새로 온 사람은 대본 칸, 그 칸에 이미 누가 있으면 빈 칸
      const xs = new Map<string, number>();
      // 같은 곳에서 앞서 나왔던 사람(한 쪽 빠졌다 다시 나옴 — 대본이 그 쪽 인물 목록에서 빠뜨림)도 그 자리 그대로
      const seenHere = (name: string) => {
        for (let k = out.length - 1; k >= 0 && out[k].location === loc; k--) {
          const q = out[k].props.find((v) => v.name === name);
          if (q) return q;
        }
        return undefined;
      };
      for (const { c } of scripted) {
        const was = prev.find((q) => q.name === c.name)?.x ?? seenHere(c.name)?.x;
        if (was != null && ![...xs.values()].includes(was)) xs.set(c.name, was);
      }
      for (const { c } of scripted) {
        if (xs.has(c.name)) continue;
        const taken = [...xs.values()];
        const want = SLOT_X[c.slot];
        xs.set(c.name, want != null && !taken.includes(want) ? want : [0.78, 0.66, 0.9].find((v) => !taken.includes(v)) ?? 0.66);
      }
      // 그 쪽 글에 이미 있던 사람(「친구가 울고 있었어요 · 엄마가 기다리고 있었어요 · 선생님이 보였어요」)은 걸어 들어오지 않고
      // 처음부터 서 있다 — 「나타났어요 · 왔어요 · 다가왔어요」면 들어온다 (11/10 점검: 책상에 엎드려 우는 친구가 걸어 들어왔다)
      const THERE = /있었|있어요|있네|있는 게|보였|보여요|앉아|기다리고/;
      const COMES = /나타|왔|와서|와요|오셨|오고|등장|들어오|달려오|뛰어오|다가오/;
      const already = (name: string) => {
        const sen = p.text.split(/(?<=[.!?”])\s*/).find((t) => t.replace(/“[^”]*”/g, " ").includes(name));
        return !!sen && THERE.test(sen) && !COMES.test(sen);
      };
      // 등장 자리: 그 사람(이름 · 호칭, 이름 없으면 「한 아이 · 누군가」)이 처음 나오는 문장의 시작. 바로 앞에 붙은 대사(「“여기 있었구나!”
      // 선생님 목소리였어요」)가 있으면 그 대사부터. 쪽 앞부분(2할 안)이면 처음부터 (11/11 전수 점검: 쪽 끝에 나오는 사람 349쪽이
      // 쪽이 시작되자마자 걸어 들어왔다)
      const entryAt = (name: string): number | undefined => {
        const words = name.split(/\s+/).map((w) => w.replace(/님$/, "")).filter((w) => w.length >= 2 && !TITLES.has(w));
        const keys = [name, ...words];
        const GENERIC = /(?:한|어떤|작은|낯선|모르는) (?:아이|여자아이|남자아이|친구|사람|어른|아저씨|아주머니|할머니|할아버지)|누군가|(?:여자|남자)아이가/;
        const u = unquoted(p.text);
        for (const m of u.matchAll(/[^.!?]+[.!?]*/g)) {
          const sen = m[0];
          if (!keys.some((k) => sen.includes(k)) && !GENERIC.test(sen)) continue;
          let at = m.index! + (sen.length - sen.trimStart().length);
          // 바로 앞이 대사면 그 대사의 시작으로
          const before = p.text.slice(0, at).trimEnd();
          if (before.endsWith("”")) { const q = before.lastIndexOf("“"); if (q >= 0) at = q; }
          const f = at / Math.max(1, p.text.length);
          return f < 0.2 ? undefined : readAt(p.text, at);
        }
        return undefined;
      };
      for (const { c, kind } of scripted) {
        // 왼쪽 칸 사람은 왼쪽에서 들어온다 (글로 세운 사람, 11/12)
        // 글로 세운 사람(문을 열어 준 엄마 …)은 그 자리에 이미 있던 사람: 걸어 들어오지 않는다
        const enter = called.includes(c.name) || prevNames.includes(c.name) || already(c.name) || (!!seenHere(c.name) && !COMES.test(p.text)) ? undefined
          : (xs.get(c.name) ?? 1) < 0.5 ? "left" as const : "right" as const;
        props.push({ id: kind, name: c.name, x: xs.get(c.name), enter, ...(enter ? { enterAt: entryAt(c.name) } : {}) });
      }
    }

    // 주인공: 걷기 · 뛰기는 옮겨 가고, 제자리 동작은 몇 번 하고 멈춘다
    // 대본 동작이 걷기 · 뛰기여도 쪽 글에 움직이는 말이 없고 「가슴이 콩닥콩닥 뛰었어요 · 마음이 콩콩 뛰었어요」뿐이면 제자리:
    // 「토토가 살며시 물었어요. 가슴이 두근두근 뛰었어요」에 주인공이 걸어갔다 (11/11 사용자 「중의적 표현들도 다 감수하고 대본 검사」)
    // 숨는 쪽은 숨을 곳으로 옮겨 가는 것이라 그대로 (「바위 뒤에 숨었어요 … 가슴이 쉬지 않고 뛰었어요」)
    const stillHeart = (p.action === "walk" || p.action === "run") && HEART_BEAT.test(p.text) && !/숨었|숨어|숨는|몸을 숨|숨겼/.test(p.text)
      && !MOVE_WORDS.test(p.text.replace(/“[^”]*”/g, " ").replace(new RegExp(HEART_BEAT.source, "g"), " "));
    // 주인공이 가만히 있다고 하는 쪽(「풀밭에 누워 · 입을 벌린 채 쳐다보았어요 · 앉아서 기다렸어요」)은 대본 동작(걷기 · 뛰기 · 점프 · 춤 ·
    // 손 흔들기)을 하지 않는다: 하늘다람쥐가 날아오르는 쪽에 주인공이 폴짝 뛰었다 (11/12 전수 점검 280쪽). 주인공 문장에 그 동작 말이 있으면 그대로
    const heroSens = p.text.replace(/“[^”]*”/g, " ").split(/(?<=[.!?])\s*/).filter((sen) => sen.trim() && subjectOf(sen, props.map((q) => q.name ?? ""), heroName, undefined, "hero") === "hero");
    const doing = ACTION_SAY[p.action];
    const heroStill = !!doing && heroSens.some((sen) => (p.action === "walk" || p.action === "run" ? STILL_MOVE : STILL_LOOP).test(sen)) && !heroSens.some((sen) => doing.test(sen));
    const move = stillHeart || (heroStill && (p.action === "walk" || p.action === "run")) ? "none" : p.action === "walk" ? "walk" : p.action === "run" ? "run" : "none";
    let from = x, to = x;
    let goal: string | undefined;
    if (move !== "none") {
      // 걷기 · 뛰기는 늘 같은 길로 (11/9 사용자 결정) — 화면 왼쪽 1/3 에서 출발해 2/3 까지 오른쪽으로 간다.
      // 다가가는 사람 · 표지판(goal)은 그 앞(오른쪽 끝 쪽)에 선다(SceneStage). 전에는 앞 쪽의 자리에서 출발해, 자리가 겹치면
      // 출발 · 도착이 거의 같아 제자리 걸음이 되거나 쪽마다 방향이 바뀌었다
      // 「엄마 곁으로 기어갔어요 · 친구에게 달려갔어요」 — 글이 다가간다고 말한 대본 인물이 먼저 (11/10: 엄마는 왼쪽에 섰는데 주인공은
      // 늘 오른쪽으로 가 엄마에게서 멀어졌다). 그 사람을 주인공이 가는 쪽 바로 앞에 세운다(SceneStage)
      const TOWARD = /^(?:의)? ?(?:곁|옆|쪽|앞|품|에게|한테|께)(?:으로|로)? ?[가-힣]*(?:갔|왔|가|와|다가|달려|기어|뛰어|걸어|안겼)/;
      const toward = props.find((q) => {
        if (!q.name) return false;
        for (let i = p.text.indexOf(q.name); i >= 0; i = p.text.indexOf(q.name, i + 1)) {
          if (TOWARD.test(p.text.slice(i + q.name.length))) return true;
        }
        return false;
      });
      goal = (toward ?? props.find((q) => q.id === "sign") ?? props.find((q) => q.id === "adult" || q.id === cardAdult)
        ?? props.find((q) => q.id === "friend" || q.id === cardFriend))?.id;
      // 주인공이 다가가는 사람은 처음부터 그 자리에 — 늦게 들어오면 주인공이 빈 자리로 달려간다 (11/11)
      for (const q of props) if (q.id === goal) delete q.enterAt;
      from = 1 / 3;
      to = 2 / 3;
    }
    if (loc === "sea-underwater") {
      for (const q of props) if (isPerson(q.id)) q.id = asDiver(q.id as PersonId);
      if (goal && isPerson(goal as PropId)) goal = asDiver(goal as PersonId);
    }
    // 숨기: 카드(숨었어요)뿐 아니라 쪽 글이 「숨었어요 · 쏙 숨 · 몸을 숨겼어요」면 그 쪽에서 숨고, 「나왔어요 · 고개를 내밀」면 다시 보인다
    // (11/10 사용자 「숨었다가 나오면 이야기 상 표현돼야 하는데 그냥 진행」)
    const HIDE_TEXT = /(?:숨었|숨어|숨는|쏙 숨|몸을 숨|숨겼|숨어 있|숨죽)/;
    const OUT_TEXT = /(?:나왔|나와|빠져나|고개를 (?:내밀|쏙)|빼꼼|밖으로)/;
    // 「숨었어요」 카드는 행동 단계 **첫 쪽**에서만 숨긴다. 다음 쪽은 글대로(아직 숨어 있다 · 찾는 중이면 계속, 찾았다 · 나왔다면 보인다).
    // 전에는 행동 단계 모든 쪽에 걸려 「여기 있었구나! · 바위 뒤에서 뛰어나왔어요」 쪽에도 주인공이 안 보였다 (11/11 전수 점검 129편)
    const hidingCard = p.stage === "action" && picks.action === "hide" && !out.some((_, k) => pages[k].stage === "action");
    // 숨는 사람이 주인공일 때만 — 「토끼가 숨었어요 · 공이 어디 숨었을까?」에 주인공이 사라졌다 (11/10). 묻는 말 · 따옴표 대사도 빼고
    // 「어젯밤 내가 숨었던 바위 · 숨었었어」 — 지난 일은 숨기가 아니다. 대사는 먼저 지우고 문장을 자른다 (11/11 전수 점검)
    const said = unquoted(p.text);
    const PAST_HIDE = /숨었던|숨었었|숨던|어젯밤|아까 숨|(?:숨어|숨은 채) [가-힣]*(?:던|기다린|지낸|있던|버틴) /;
    const heroHides = said.split(/(?<=[.!?])\s*/).some((sen) => HIDE_TEXT.test(sen) && !sen.includes("?") && !PAST_HIDE.test(sen)
      && !/숨바꼭질|숨은 그림|숨을 (?:쉬|크게|고르|내쉬|들이)/.test(sen) && subjectOf(sen.slice(0, sen.search(HIDE_TEXT)), [], heroName, sen.search(HIDE_TEXT)) === "hero");
    const hidingText = heroHides && !OUT_TEXT.test(p.text);
    // 앞 쪽에서 숨은 주인공은 이 쪽 글이 「아직 숨어 있다」고 할 때만 계속 숨는다 — 그 밖에는 다시 보인다.
    // 전에는 나온다는 말이 없으면 끝까지 숨어 주인공 없이 이야기가 이어졌다 (11/10 「한 번 숨은 주인공이 다시 나타나지 않았다」)
    const STILL_HIDING = /숨어 (?:있|서|지켜|기다)|숨은 채|꼭꼭 숨|숨죽|가만히 (?:숨|있|기다|웅크)|몸을 (?:웅크|낮)/;
    // 찾았다는 말 — 「여기 있었구나 · 찾았다 · 있었네」(대사여도)면 보인다
    const FOUND = /찾았|발견|여기 있|있었구나|있었네|거기 있|숨었구나|나왔|나와/;
    const stillHidden = !hidingCard && !hidingText && out.length > 0 && out[out.length - 1].hero.hide !== null && !OUT_TEXT.test(p.text) && !FOUND.test(p.text)
      && (said.split(/(?<=[.!?])\s*/).some((sen) => STILL_HIDING.test(sen) && !PAST_HIDE.test(sen) && subjectOf(sen.slice(0, sen.search(STILL_HIDING)), [], heroName, sen.search(STILL_HIDING)) === "hero")
        // 「친구가 나를 찾으러 왔어요」 — 찾는 중이면 아직 숨어 있다 (찾았어요 · 발견하면 보인다)
        || (/(?:를|을) 찾(?:으러|고 있|아 ?다니|는)|찾으며|술래/.test(p.text) && !/찾았|발견|여기 있/.test(p.text)));
    const hiding = hidingCard || hidingText || stillHidden;
    const hide = !hiding ? null : out.some((q) => q.hero.hide) ? "gone" : "out";
    if (hiding) { from = to = SLOT; }
    if (to !== from) face = to > from ? 1 : -1;
    const weather = weatherFor(p.text, p.scene?.background ?? "", loc);
    // 숨기 카드 쪽은 숨을 것만 — 단 다른 사람이 손에 든 것(「손전등을 든 엄마가 찾으러 왔어요」)은 그 사람 손에 (11/10 전수 점검)
    const hideCard = p.stage === "action" && picks.action === "hide";
    const fresh: ThingPlan[] = thingsFor(p.text, mine, isIndoor(loc), new Set([
        ...props.filter((q) => ["bird", "bat", "rabbit", "squirrel", "cat", "dog"].includes(q.id)).map((q) => `props/${q.id}.webp`),
        ...(loc === "space-ship" ? ["props/spaceship.webp", "props/rocket.webp"] : []),
        // 숨는 곳으로 선 그림(미끄럼틀 · 정자 · 커튼 …)은 소품으로 또 세우지 않는다 (11/11 미끄럼틀 · 쉼터 소품을 더하면서)
        ...props.filter((q) => q.id === "cover" && q.src).map((q) => q.src!),
      ]), loc).map((t) => ({ ...t, motion: thingMotion(t, p.text, weather), ...holderOf(t, props, heroName) }))
      .map((t) => (t.holder || t.pose ? t : { ...t, ...lightHolder(t, p.text, props) }))
      .map((t) => (t.holder || t.pose ? t : { ...t, ...animalPlace(t, p.text) }))
      // 앞 쪽에서 나무 위에 있던 동물은 내려온다는 말이 없으면 그대로 나무 위 (11/12: 5쪽 나무 틈 하늘다람쥐가 6쪽에 땅에 있었다)
      .map((t) => (t.pose || t.spot === "air" || !TREE_ANIMALS.has(t.src) || !out.length || out[out.length - 1].location !== loc
        // 앞 쪽에서 날아가 「옆 나무로 사뿐히 내려앉았어요」면 이 쪽은 나무 위
        || !out[out.length - 1].things.some((x) => x.src === t.src && (x.pose === "high" || (x.spot === "air" && /나무(?:로|에|위로|가지로)[^.!?]{0,12}(?:내려앉|앉았|앉아)/.test(pages[pi - 1]?.text ?? ""))))
        || /내려|떨어|뛰어내|나왔|기어 나/.test(p.text) ? t : { ...t, pose: "high" as const }))
      // 숨어 있는 쪽도 큰 붙박이(「대문이 열리고 엄마가 나왔어요」의 대문)는 세운다 (11/12 글이 말하는 물건 점검)
      .filter((t) => !hideCard || (!!t.holder && t.holder !== "hero") || t.h >= 0.28);
    // 배경이 바뀌면 이어 오던 물건은 여기서 끝 (숨기 쪽도 그대로 둔다: 숨은 곳 앞에서 사라지면 어색하다)
    const dream = DREAM_TEXT.test(p.text);
    if (!dream && loc !== keptLoc) { kept = []; keptLoc = loc; lastKeys = new Map(); }
    // 주기: 「할머니가 사과를 쥐여 주었어요」면 할머니 손 → 받는 사람 손. 받는 사람을 모르면(주인공이 줬는데 「…에게」가 없음) 그 쪽 첫 인물
    for (const [k, t] of fresh.entries()) {
      if (t.at === undefined || t.name !== undefined) continue;
      const gv = giveOf(p.text, t.at);
      if (!gv) continue;
      const holderFor = (who: string) => (who === "hero" ? "hero" : holderOf({ ...t, pose: "hand", subject: who }, props, heroName).holder);
      const firstPerson = props.find((q) => isPerson(q.id));
      const from = holderFor(gv.giver);
      const to = gv.receiver ? holderFor(gv.receiver) : firstPerson ? (firstPerson.name ?? firstPerson.id) : undefined;
      if (!to || from === to) continue;
      fresh[k] = { ...t, pose: "hand", holder: to, subject: undefined, motion: undefined,
        ...(from ? { give: { from, at: readAt(p.text, gv.verb) } } : { appearAt: readAt(p.text, gv.verb) }) };
    }
    const things: ThingPlan[] = [];
    for (const t of dream ? [] : fresh) {
      const n = nameOfSrc(t.src);
      if (t.name !== undefined || !KEEP_THINGS.has(n)) {
        // 앞 쪽에도 있던 것이면 그 자리 (손에 든 것 · 날아가는 것은 그 쪽 자리대로)
        things.push(t.pose ? t : { ...t, keep: lastKeys.get(n) ?? `${story}:${pi}:${n}` });
        continue;
      }
      // 같은 물건이 다시 나오면 앞의 그것 (자리 · 크기를 잇는다). 손에 들거나 치우면 다음 쪽부터 잇지 않는다
      const old = kept.find((k) => nameOfSrc(k.src) === n);
      // 앞 쪽에 있던 것이면(치운다고 했어도 다음 쪽에 또 나오면 그것) 같은 열쇠: 「무너진 조개 집을 다시 올려」가 다른 자리에 섰다
      const keep = old?.keep ?? lastKeys.get(n) ?? `${story}:${pi}:${n}`;
      // 치움 · 없어짐은 그 물건이 목적어 · 주어일 때만: 「편지를 우체통에 넣었어요」의 우체통은 그대로 (11/10 이어짐 검사)
      const after = t.at !== undefined ? p.text.slice(t.at) : "";
      const asPlace = /^\S*?(?:에서|에게|에|안|속|위|옆|앞|뒤|아래|밑|쪽|으로|로)(?=\s|$|[.,!?”])/.test(after.split(/\s/)[0] ?? "");
      // 「친구 모래성이 무너져」: 남의 것이 무너진 말이면 앞에서 이어 온 주인공 것은 그대로 (11/11 이어짐 검사)
      const othersOne = !!old && t.at !== undefined && /(?:친구|동생|형|누나|언니|오빠|다른)(?:의)?\s$/.test(p.text.slice(Math.max(0, t.at - 6), t.at));
      const goneAfter = t.pose === "hand" || t.pose === "head" || (!asPlace && !othersOne && GONE_AFTER.test(after));
      // 손에 든 것도 앞 쪽에 놓였던 것이면 같은 열쇠: 손에 들 수 없는 그림(춤추는 쪽 …)이라 땅에 놓이면 앞 쪽 그 자리에 (11/12 전체 검사 524번)
      things.push(t.pose ? (old ? { ...t, keep } : t) : { ...t, keep });
      kept = kept.filter((k) => k !== old);
      if (!t.pose && !goneAfter) kept.push({ ...t, keep });
    }
    // 작은 물건은 최근 것 2개까지 (이 쪽 글에 나온 것은 빼고 센다). 넘는 오래된 것은 이어 가기에서 아주 뺀다(다시 나타났다 사라지지 않게)
    if (!dream) {
      const smallOld = kept.filter((k) => SMALL_KEEP.has(nameOfSrc(k.src)) && !things.some((t) => nameOfSrc(t.src) === nameOfSrc(k.src)));
      const dropSmall = new Set(smallOld.slice(0, Math.max(0, smallOld.length - SMALL_KEEP_MAX)));
      kept = kept.filter((k) => !dropSmall.has(k));
    }
    // 이 쪽 글에 없는 이어 온 물건: 처음 자리 그대로, 움직임 없이. 글에서 먼저 나온 것 다음에 (자리를 먼저 잡게 하지는 SceneStage)
    // 꿈 쪽은 꿈 글에 나온 물건만 (이어 가기 열쇠도 주지 않는다, 깨면 현실 물건이 그 자리에 다시)
    if (dream) things.push(...fresh.map((t) => ({ ...t, keep: undefined })));
    else for (const k of kept) if (!things.some((t) => nameOfSrc(t.src) === nameOfSrc(k.src)))
      things.push({ ...k, kept: true, motion: undefined, at: undefined, pose: undefined, holder: undefined });
    // 생김새에 지닌 물건(「a lantern」)이 글에 나오면 그 사람 손에: 「커다란 까만 눈이 랜턴 빛에 빛났어요」에 랜턴이 땅에 놓였다 (11/12 전수 점검)
    for (const [k, t] of things.entries()) {
      if (t.holder || t.pose || t.name !== undefined || !HANDHELD.has(t.src)) continue;
      const owner = props.find((q) => isPerson(q.id) && q.name && CARRIED.some(([rx, src]) => src === t.src && rx.test(sheetDesc(q.name!))));
      if (owner) things[k] = { ...t, pose: "hand", holder: owner.name, keep: undefined, kept: undefined };
    }
    // 들고 있던 물건(랜턴 · 손전등 · 우산 · 바구니 · 풍선)은 그 사람이 같은 곳에 있는 동안 계속 든다: 2쪽에 켠 랜턴이 3쪽에 없었다 (11/12)
    const prevHeld = out.length && out[out.length - 1].location === loc ? out[out.length - 1].things.filter((t) => t.pose === "hand" && t.holder && HANDHELD.has(t.src)) : [];
    for (const t of dream ? [] : prevHeld) {
      if (things.some((x) => x.src === t.src)) continue;
      const here = t.holder === "hero" || props.some((q) => (q.name ?? q.id) === t.holder);
      // 내려놓음 · 줌 · 끔은 그 물건을 말한 문장에서만 (「도토리를 놓아 두었어요」에 할머니 랜턴이 사라졌다)
      const word = HELD_WORD[t.src];
      const dropped = !!word && p.text.split(/(?<=[.!?])\s*/).some((sen) => word.test(sen) && /내려놓|내려 놓|두고|놓아 두|놓았|건네|주었|줬|넣었|껐|끄고|접었|날아가|놓쳤|잃어|떨어뜨/.test(sen));
      if (!here || dropped) continue;
      things.push({ ...t, at: undefined, appearAt: undefined, give: undefined, motion: undefined, kept: true });
    }
    // 이 쪽에서 처음 나오는 물건(앞 쪽에 없던 것)은 나레이션이 그 말에 왔을 때 나타난다. 주기는 주는 사람 손에서 이미 보인다
    for (const [k, t] of things.entries()) {
      if (t.kept || t.at === undefined || t.appearAt !== undefined || t.give) continue;
      if (t.keep && lastKeys.has(nameOfSrc(t.src))) continue;
      things[k] = { ...t, appearAt: readAt(p.text, t.at) };
    }
    if (!dream) lastKeys = new Map(things.filter((t) => t.keep).map((t) => [nameOfSrc(t.src), t.keep!]));
    const seat = move === "none" ? seatOf(p.text) : undefined;
    out.push({
      location: loc,
      env: { night: night && !litHere, sun, weather, dim: dimNow && !litHere && !glowIn, lightsOn: turnsOn && !litHere, glow: glowIn && !litHere && !morningHere },
      hero: { from, to, move, loops: heroStill ? 0 : LOOP_ACTIONS[p.action] ?? (p.action === "idle" ? 0 : KEEP_LOOPING), fallen: p.stage === "problem" && picks.problem === "fall", hide, fly,
        calm: move === "none" && CALM_ACTIONS.has(p.action), face, goal, seat, stay: move === "none" && pi > 0 && prevLoc === loc && !hiding },
      props,
      // 대본 인물로 이미 선 동물은 글에 나와도 또 놓지 않고, 우주선 안에서는 우주선을 놓지 않는다 (위 fresh)
      things,
      key: `${story}:${pi}`,
    });
    x = to;
  }
  return out;
}

export const knownPlace = (place?: string) => !!place && !!LOCATIONS[place];
