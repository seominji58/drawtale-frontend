/** S-09 장면 계획 — 쪽마다 어느 자리에서, 주인공 · 다른 인물 · 소품이 어떻게 움직이고 밤낮이 어떤지 (2026-11-03).
 *  앞 쪽에서 끝난 모습(주인공 자리 · 밤낮)을 다음 쪽이 이어받아 시작한다 — 쪽이 바뀌어도 장면이 이어져 보이게.
 *  움직임은 그 쪽에 들어올 때 한 번만 (쪽은 아이가 넘긴다 — 자동 전환 아님, pt_docs 14 16장) */
import type { BookPage } from "@/types/story";
import { ACTION_PROP } from "@/features/story/choices";
import { LOCATIONS, locationFor } from "./locations";
import AR from "./props-ar.json";

/** 남녀 그림이 따로 있는 직업 (2026-11-03 사용자 「인물 묶음별로 남녀 그림」) — 그림 이름은 `${종류}-m` · `${종류}-f` */
const GENDERED = ["caveguide", "astronaut", "ranger", "lifeguard", "shopkeeper", "keeper", "police", "cook", "mail",
  "spacepolice", "spacekid"] as const;
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
  // 새로 그린 숨는 곳 (11/3, tools/art/gen_objects.py)
  [/담요|이불|침낭|잠자리 주머니|돗자리/, "props/blanket.webp", 0.3],
  [/텐트/, "props/tent.webp", 0.44],
  [/모래 언덕/, "props/dune.webp", 0.26],
  [/시소/, "props/seesaw.webp", 0.2],
  [/정자|기둥/, "props/pavilion.webp", 0.56],
  [/구령대/, "props/podium.webp", 0.24],
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
  [/빵(?!빵)/, "props/bread.webp", 0.08, "ground"],
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
  [/^(?!.*등대).*계단/s, "props/stairs.webp", 0.3, "ground"],   // 등대 돌계단 · 등대 안 계단에 장난감 계단이 섰다 (11/4)
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
  [/도토리|솔방울/, "props/acorns.webp", 0.06, "ground"],
  [/선물/, "props/gift.webp", 0.12, "ground"],
  [/인형/, "props/teddy.webp", 0.14, "ground"],
  // 「게」는 앞 글자와 떨어진 것만 — 「가게를」 · 「빨래집게가」에 꽃게가 섰다 (11/9 배치 검사)
  [/꽃게|작은 게|(?<![가-힣])게(?: 한|가|를|도)(?![가-힣])/, "props/crab.webp", 0.07, "ground"],
  [/깃발/, "props/flag.webp", 0.48, "ground"],
  [/우체통/, "props/mailbox.webp", 0.44, "ground"],
  [/다리를 건|나무다리|돌다리|다리 위|작은 다리/, "props/bridge.webp", 0.22, "ground"],
  [/수건|손수건/, "props/towel.webp", 0.07, "ground"],
  [/케이크|쿠키|과자|간식/, "props/cake.webp", 0.1, "ground"],
  [/우산/, "props/umbrella.webp", 0.34, "ground"],
  // 장난감 기차 그림이라 진짜 기차를 타는 말은 빼고 — 「기차에서 엄마에게 기대어 잠이 들었어요」에 동굴 바닥 장난감 기차 (11/9 배치 검사)
  [/기차(?!에서|를 ?타|에 ?타|를 탔|에 올|역|표|길|소리|가 (?:출발|도착|달|지나|멈|떠))/, "props/toytrain.webp", 0.1, "ground"],
  [/화분/, "props/flowerpot.webp", 0.16, "ground"],
  // 대본 인물로 나오지 않고 글에만 나오는 작은 동물 (인물로 나오면 인물 그림이 선다)
  // 「새 책 · 새 친구 · 새 둥지」의 새(new)는 빼고 — 조사가 붙거나 「작은 새」처럼 꾸밈말이 앞에 올 때만 (11/4, 씨앗 문장 120개가 잘못 걸렸다)
  [/(?:^|[^가-힣])새(?:를|가|는|도|들|한 마리|와|랑|의|야|에게)(?=[^가-힣]|$)|(?:작은|아기|파랑|파란|예쁜|노란|빨간|하얀|조그만|귀여운|어미|엄마|아빠|산|바다) ?새(?=[^가-힣]|$)/,
    "props/bird.webp", 0.12, "air"],
  [/박쥐/, "props/bat.webp", 0.14, "air"],
  [/토끼/, "props/rabbit.webp", 0.16, "ground"],
  [/다람쥐/, "props/squirrel.webp", 0.11, "ground"],
  // pt_docs 18 「장면 소품 보강」 (11/4) — A. 숨는 곳 그림을 옆에 놓인 물건으로도 (가림막보다 작게)
  [/담요|이불/, "props/blanket.webp", 0.12, "ground"],
  [/상자|박스/, "props/box.webp", 0.16, "ground"],
  [/모래 언덕/, "props/dune.webp", 0.16, "ground"],   // 「언덕」만이면 뒷산 언덕도 걸린다
  [/시소/, "props/seesaw.webp", 0.26, "ground"],
  [/텐트/, "props/tent.webp", 0.55, "ground"],
  // B. 장소 배경에만 있던 그림을 다른 장소에서도 (배경에 이미 있으면 SceneStage 가 또 놓지 않는다)
  // 「돌았어요」 · 「돌아왔어요」 빼고, 짧은 「돌」은 앞 글자와 떨어진 것만 — 「곰돌이 컵」에 부엌 바닥 돌멩이 (11/9 전체 배치 검사)
  [/돌멩이|작은 돌|돌탑|(?<![가-힣])돌(?:들|을 |이 | 위)/, "forest-stream/rocks.webp", 0.09, "ground"],
  [/바위/, "cave/rocks.webp", 0.3, "ground"],
  [/꽃(?!게)/, "forest-flowers/flowers.webp", 0.12, "ground"],
  [/식탁/, "home-kitchen/table.webp", 0.34, "ground"],
  // 등대는 소품으로 세우지 않는다 — 주인공 옆 땅에 아이 키만 한 등대가 장난감처럼 섰다 (11/4 사용자). 등대는 부두 배경(sea-pier)에 크게 있다
  [/버섯/, "forest/mushroom.webp", 0.1, "ground"],
  // C. 새로 그린 12장 (tools/art/gen_scene_props.py)
  [/나뭇잎|낙엽/, "props/leaves.webp", 0.07, "ground"],
  [/운동화|신발/, "props/sneakers.webp", 0.07, "ground"],
  [W1("나비"), "props/butterfly.webp", 0.08, "air"],
  [/발자국/, "props/footprints.webp", 0.04, "ground"],
  [/화살표/, "props/arrow.webp", 0.4, "ground"],
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
  [/(?:빨간|노란|초록|맛있는|커다란|작은) 사과|사과 (?:한|두|세|하나)|사과를 (?:따|먹|사각|건네|깎|닦|주|받|골|사)|사과(?:와|,)|사과가 (?:수북|주렁|떨어|데굴|열)/,
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
  ["hand", /손에 (?:들|쥐|꼭)|(?:들고|쥐고) |품에 (?:안|꼭)|꼭 안|껴안|안고 /],
];
function thingPose(text: string, at: number, end: number, spot: Spot, indoor = false): { pose?: ThingPose; subject?: string } {
  const from = Math.max(text.lastIndexOf(".", at), text.lastIndexOf("!", at), text.lastIndexOf("?", at), text.lastIndexOf("”", at)) + 1;
  const ends = [".", "!", "?", "”"].map((c) => text.indexOf(c, end)).filter((i) => i >= 0);
  const sentence = text.slice(from, ends.length ? Math.min(...ends) + 1 : text.length);
  if (indoor && spot === "air" && WINDOW_TEXT.test(sentence)) return { pose: "window" };
  const after = text.slice(end, from + sentence.length);
  const lead = /^[가-힣]{0,3}?(?:이|가|을|를|은|는|도)(?=[\s,]|$)|^(?:이|가|을|를|은|는|도)/.exec(after);
  if (!lead) return {};
  const rest = after.slice(lead[0].length);
  let pose = POSES.find(([, rx]) => rx.test(rest))?.[0];
  if (!pose) return {};
  if (spot === "air" && (pose === "water" || pose === "blown")) return {};   // 행성 · 새는 원래 떠 있고 날아다닌다
  if (pose === "head" && !/모자|왕관|나뭇잎|화관/.test(text.slice(at, end))) return {};
  // 주어: 소품 앞에서 마지막으로 「…이/가/은/는」 붙은 말. 「내 손에 쥐여 주었어요」면 주인공
  const before = text.slice(from, at);
  const subj = [...before.matchAll(/([가-힣{}:]+(?: [가-힣]+){0,2}?)(?:이|가|은|는|께서)\s/g)].pop()?.[1];
  // 「오늘 나는」처럼 주어 앞에 꾸밈말이 붙어도 마지막 낱말로 본다 (11/6 — 「오늘 나」가 주인공이 아닌 것으로 읽혔다)
  const subjLast = subj?.split(/\s+/).pop() ?? "";
  // 「나」 · 「내가」 와 같을 때만 — 「나비가」 · 「나무가」 는 주인공이 아니다
  const me = (w: string) => /^(?:나|내가)$|^\{이름\}/.test(w);
  const subject = /내 손|나에게|내게/.test(rest) || !subj || me(subj) || me(subjLast) ? "hero" : subj;
  // 입에 묾 · 등에 태움은 소품이 목적어(「공을 물고」)일 때만 — 「새가 벌레를 물고」의 새는 무는 쪽이다
  if ((pose === "mouth" || pose === "back") && !/(?:을|를|도)$/.test(lead[0])) return {};
  if (pose === "hand" || pose === "head" || pose === "mouth" || pose === "back") return { pose, subject };
  return { pose };
}

/** 소품 움직임 (11/4 사용자 시안 https://claude.ai/artifact/FJL8Cu7vPSt9YzPdbxJBTw 「이렇게 진행해」).
 *  하늘 소품은 놓이면 늘 천천히, 공은 쪽 글에 굴렸어요 · 찼어요 · 던졌어요가 있을 때 한 번, 깃발 · 우산 · 나뭇잎은 바람 부는 쪽만.
 *  의자 · 상자 · 바위처럼 움직이지 않는 물건은 가만히 */
export type ThingMotion = "flutter" | "float" | "glide" | "sway" | "swim" | "drift" | "roll" | "wind" | "bounce" | "pop"
  | "spin" | "glow" | "grow" | "shrink" | "shake";
const ALWAYS_MOVING: Record<string, ThingMotion> = {
  "props/butterfly.webp": "flutter", "props/bird.webp": "float", "props/bat.webp": "float", "props/seagull.webp": "glide",
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
export interface SceneFx { bright: number; tears: { at: number; sentence: string }[] }
/** 장면 전체가 밝아지는 말 — 「반짝」 · 「깜빡」처럼 작은 빛은 소품만 빛나고 장면은 그대로 */
const BRIGHT = /환해|환하게|환히|환한 빛|밝아|밝혔|밝혀|밝은 빛|빛이 (?:났|나|들|비|퍼|쏟|가득|번|환)|빛으로 (?:가득|환)|햇살|햇빛|달빛이|불빛이|불이 (?:켜졌|켜지|들어왔|들어오)|불을 (?:켰|켜|밝)|눈부/;
const CRY = /울었|울고|울어|울먹|울음을 터|울음이 터|눈물|훌쩍|엉엉|글썽|흐느/;
const NOT_CRY = /그쳤|그치|닦았|닦아|닦고|멈췄|안 울|울지 않|울지 마|뚝 그|웃음이|웃었/;
export function sceneFx(text: string): SceneFx {
  const b = BRIGHT.exec(text);
  const tears: SceneFx["tears"] = [];
  const re = /[^.!?”]+[.!?”]*/g;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const sen = m[0];
    if (CRY.test(sen) && !NOT_CRY.test(sen)) tears.push({ at: m.index / Math.max(1, text.length), sentence: sen });
  }
  return { bright: b ? b.index / Math.max(1, text.length) : -1, tears };
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
};

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
  for (const [re, src, h, spot] of THINGS) {
    const m = re.exec(text);
    if (!m) continue;
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
    hits.push({ at, t: { src, h, ar: ar(src), spot, at, ...thingPose(text, at, at + word.length, spot, indoor) }, key: m[0] });
  }
  return hits.sort((a, b) => a.at - b.at).slice(0, MAX_THINGS).map((x) => x.t);
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
  /** 주인공이 보는 쪽 (-1 왼쪽 · 1 오른쪽 · 0 정하지 않음). 옮겨 가면 가는 쪽, 제자리면 앞 쪽에서 보던 쪽을 잇는다 —
   *  옮겨 갈 때만 뒤집으면 다음 쪽에서 원래 그림 방향으로 돌아가 옆 친구에게 등을 돌렸다 (11/5 사용자, 옆모습 주인공) */
  face: -1 | 0 | 1;
  /** 이 쪽에서 다가가는 인물 · 표지판 (props 의 id). 장면이 그 인물을 주인공이 가는 쪽 바로 앞에 세운다 —
   *  전에는 인물이 남는 자리에 서서 「어른에게 달려갔어요」에 그 사람 반대쪽으로 달려갔다 (11/5, 옆모습 주인공에서 보였다) */
  goal?: string;
}

export interface Env {
  night: boolean;
  /** 해가 떠 있는지 — 낮이면 늘 (11/4 사용자 「해나 달이 떠오르고 지는 그 부분들이 없는거 같은데」. 전에는 「해가 떴어요」
   *  카드 쪽에만 그려 대부분의 이야기에 해 · 달이 없었고, 밤이 되어도 해가 지는 장면이 없었다) */
  sun: boolean;
  /** 그 쪽의 날씨 효과 (쪽 글 · 배경 설명에 나올 때만, 바깥 장소만 — weatherFor) */
  weather: Weather | null;
}

export type Weather = "rain" | "storm" | "snow" | "fog" | "wind" | "rainbow";

export interface PagePlan {
  location: string;
  env: Env;
  hero: HeroPlan;
  props: PropPlan[];
  /** 쪽 글에 나온 물건 · 내 소품 — 주인공 옆 땅에 */
  things: ThingPlan[];
}

interface Picks { place?: string; problem?: string; action?: string; result?: string }

const SLOT = 0.52;
const FRIEND_RESULTS = new Set(["new_friend", "tears_stop", "thanked", "best_friend", "party_friend"]);
const ADULT_RESULTS = new Set(["adult_took", "party_lost", "party_friend"]);
const LOOP_ACTIONS: Record<string, number> = { wave: 3, jump: 2, dance: 2 };
/** 그 밖의 동작(2026-11-04 새 동작 9개 — 숨쉬기 · 헤엄 · 만세 …)은 쪽에 있는 동안 계속. 0 이면 첫 장에서 멈춘다 */
const KEEP_LOOPING = 1000;
const INDOOR = new Set(["cave", "home-living", "home-kitchen", "home-bedroom", "school-classroom", "school-cafeteria",
  "school-hallway", "school-music", "school-library", "space-ship", "cave-lake", "sea-lighthouse"]);

export const isIndoor = (location: string) => INDOOR.has(location);
/** 해 · 달을 띄우는 곳 — 바깥이고, 하늘이 따로 그려진 곳(바닷속 빛줄기 · 우주 별 · 행성의 달)은 뺀다 */
const NO_SKY_BODIES = new Set(["sea-underwater", "space", "space-planet"]);
export const hasSkyBodies = (location: string) => !INDOOR.has(location) && !NO_SKY_BODIES.has(location);
/** 쪽 글로 밤 · 아침 (「돌아왔어요」처럼 엉뚱한 말이 걸리지 않게 말 덩어리로) */
const NIGHT_TEXT = /밤이 (?:되|깊|왔)|캄캄해|깜깜해|어두워졌|해가 (?:졌|지|저물|뉘엿)|노을|저녁이 (?:되|왔)|달이 (?:떴|떠올|휘영)|별이 (?:떴|반짝)/;
const MORNING_TEXT = /아침이 (?:밝|됐|되|왔)|해가 (?:떴|떠올|뜨|솟)|날이 밝/;
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
  return hits.length && text.length ? Math.min(...hits) / text.length : 0;
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
  if (CHILD.test(d) && !GROWN.test(d) && !NOT_KID.has(k)) return SPACE_SUIT.test(d) ? `spacekid-${genderOf(d, name)}` : "friend";
  return (GENDERED as readonly string[]).includes(k) ? (`${k}-${genderOf(d, name)}` as PersonId) : (k as PersonId);
}
const CHILD = /\b(?:(?:little|small|young) (?:girl|boy)|girl|boy|child|kid|toddler)\b/;
const SPACE_SUIT = /\b(space ?suit|spacesuit|astronaut)\b/;
const GROWN = /\b(?:adult|man|woman|mother|father|grand\w*|teacher|officer|owner)\b/;
const NOT_KID = new Set(["alien", "bat", "bird", "rabbit", "squirrel", "dog", "cat", "baby", "classmates", "friend", "friend2"]);

/** 손에 듦 · 머리에 씀: 문장의 주어를 그 쪽에 선 인물로 (이름 낱말이 겹치거나 같은 그림 종류). 못 찾으면 자리 없이 땅에 */
function holderOf(t: ThingPlan, props: PropPlan[]): Partial<ThingPlan> {
  if (t.pose !== "hand" && t.pose !== "head" && t.pose !== "mouth" && t.pose !== "back") return {};
  if (t.subject === "hero") return { holder: "hero", subject: undefined };
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
  return who ? { holder: who.name ?? who.id, subject: undefined } : { pose: undefined, subject: undefined };
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
const SLOT_X: Record<string, number> = { "right-middle": 0.78, "right-bottom": 0.66 };

/** 쪽마다 계획. place 는 장소 카드 id (말로 정한 장소면 부르지 않는다).
 *  인물: 대본이 그 쪽에 적은 인물(scene.characters)이 먼저다 — 글에 나오는 사람이 화면에 나온다.
 *  대본에 인물이 없는 쪽만 고른 카드로 정한다 (친구 카드면 친구, 어른 카드면 어른) */
export function planPages(pages: BookPage[], picks: Picks, sheet: Record<string, string> = {},
  mine: { name: string; png: string; height: number }[] = []): PagePlan[] {
  const place = picks.place!;
  const out: PagePlan[] = [];
  let x = SLOT, loc: string | undefined, night = false;
  let face: -1 | 0 | 1 = 0;
  const stageIdx = (s: string) => ["place", "problem", "action", "result"].indexOf(s);
  // 숨는 곳은 행동 쪽들의 글에서 한 번 정해 쪽이 바뀌어도 같은 물건
  const cover = coverFor(pages.filter((p) => p.stage === "action").map((p) => p.text).join(" "));
  // 대본이 쪽마다 등장인물을 적은 이야기(장면 계획)는 대본을 따른다 — 인물이 없는 쪽은 비워 둔다.
  // 카드로 사람(어른 · 친구)을 세우는 것은 장면 계획이 없는 예전 이야기만 (11/4 사용자 — 주인공 혼자 로켓 창밖을 보는
  // 마지막 쪽에 결과 카드 때문에 남자 어른이 섰다)
  const planned = pages.some((p) => Array.isArray(p.scene?.characters));
  // 인물 이름 → 그림. 대본이 같은 사람을 쪽마다 다르게 적으면(「우주 경찰관」 → 「경찰관 아저씨」 · 「아저씨」) 뒤의 이름은
  // 생김새 설명이 없어 호칭만으로 평범한 아저씨 그림이 섰다 (11/4 팀원 시험 — 우주 경찰관 이야기 마지막 쪽).
  // 설명이 없는 이름은 ① 이름 낱말이 겹치는 인물 ② 호칭뿐이면 앞에 나온 같은 성별 인물의 그림을 이어 쓴다
  const sheetKey = (n: string) => Object.keys(sheet).find((k) => k.replace(/\s+/g, "") === n.replace(/\s+/g, ""));
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
        k = k === "friend" ? "friend2" : k === "friend2" ? "friend" : k === "mom" ? "aunt" : k === "teacher" ? "adult" : k;
        if (!renamed.has(c.name)) renamed.set(c.name, k);
      }
      used.add(k);
    }
  }
  for (const p of pages) {
    loc = locationFor(place, p, loc);
    const st = stageIdx(p.stage);
    // 밤: 「어두워졌어요」부터 이어진다. 결과 「해가 떴어요」에서 밝아지고, 「잠이 들었어요」는 밤.
    // 카드가 아니어도 쪽 글에 밤이 되거나(해가 졌어요 · 밤이 되었어요) 아침이 오면(해가 떴어요) 그 쪽부터 바꾼다 (11/4)
    if (picks.problem === "dark" && st >= 1) night = true;
    if (NIGHT_TEXT.test(p.text)) night = true;
    if (MORNING_TEXT.test(p.text)) night = false;
    if (p.stage === "result" && picks.result === "sun") night = false;
    if (p.stage === "result" && picks.result === "sleep") night = true;
    const sun = !night;

    const props: PropPlan[] = [];
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
      if (actionProp === "sign") props.push({ id: "sign" });
      if (actionProp === "cover" && cover) props.push({ id: "cover", ...cover });
    }
    if (p.stage === "result" && picks.result) {
      if (FRIEND_RESULTS.has(picks.result)) keep("friend", "right");
      if (ADULT_RESULTS.has(picks.result)) keep("adult", "left");
      if (picks.result === "found_way") props.push({ id: "sign" });
    }
    // 대본 인물이 있으면 사람은 그것으로 바꾼다 (표지판 · 숨을 것은 카드대로 둔다)
    const scripted = (p.scene?.characters ?? [])
      .map((c) => ({ c, kind: kindOfName(c.name) }))
      .filter((v): v is { c: { name: string; slot: string }; kind: PersonId } => !!v.kind);
    for (const v of scripted) if (!seenKinds.some((q) => q.name === v.c.name)) seenKinds.push({ name: v.c.name, kind: v.kind });
    // 같은 그림이 한 쪽에 둘이면 다른 친구 그림으로 (친구 둘)
    // 한 번 바꾼 이름은 이야기 전체에서 그 그림 (11/4 — 사서 선생님이 혼자일 때는 선생님, 담임과 함께일 때는 다른 어른 그림이었다)
    for (const v of scripted) if (renamed.has(v.c.name)) v.kind = renamed.get(v.c.name)!;
    const usedKinds = new Set<PersonId>();
    for (const v of scripted) {
      if (usedKinds.has(v.kind)) {
        v.kind = v.kind === "friend" ? "friend2" : v.kind === "friend2" ? "friend" : v.kind === "mom" ? "aunt" : v.kind === "teacher" ? "adult" : v.kind;
        renamed.set(v.c.name, v.kind);
      }
      usedKinds.add(v.kind);
    }
    if (scripted.length) {
      const prevNames = out.length ? out[out.length - 1].props.map((q) => q.name).filter(Boolean) : [];
      for (let k = props.length - 1; k >= 0; k--) if (isPerson(props[k].id)) props.splice(k, 1);
      scripted.forEach(({ c, kind }, k) => props.push({
        id: kind, name: c.name, x: SLOT_X[c.slot] ?? (k ? 0.66 : 0.78),
        enter: prevNames.includes(c.name) ? undefined : "right",
      }));
    }

    // 주인공: 걷기 · 뛰기는 옮겨 가고, 제자리 동작은 몇 번 하고 멈춘다
    const move = p.action === "walk" ? "walk" : p.action === "run" ? "run" : "none";
    let from = x, to = x;
    let goal: string | undefined;
    if (move !== "none") {
      // 걷기 · 뛰기는 늘 같은 길로 (11/9 사용자 결정) — 화면 왼쪽 1/3 에서 출발해 2/3 까지 오른쪽으로 간다.
      // 다가가는 사람 · 표지판(goal)은 그 앞(오른쪽 끝 쪽)에 선다(SceneStage). 전에는 앞 쪽의 자리에서 출발해, 자리가 겹치면
      // 출발 · 도착이 거의 같아 제자리 걸음이 되거나 쪽마다 방향이 바뀌었다
      goal = (props.find((q) => q.id === "sign") ?? props.find((q) => q.id === "adult" || q.id === cardAdult)
        ?? props.find((q) => q.id === "friend" || q.id === cardFriend))?.id;
      from = 1 / 3;
      to = 2 / 3;
    }
    const hiding = p.stage === "action" && picks.action === "hide";
    const hide = !hiding ? null : out.some((q) => q.hero.hide) ? "gone" : "out";
    if (hiding) { from = to = SLOT; }
    if (to !== from) face = to > from ? 1 : -1;
    const weather = weatherFor(p.text, p.scene?.background ?? "", loc);
    out.push({
      location: loc,
      env: { night, sun, weather },
      hero: { from, to, move, loops: LOOP_ACTIONS[p.action] ?? (p.action === "idle" ? 0 : KEEP_LOOPING), fallen: p.stage === "problem" && picks.problem === "fall", hide,
        calm: move === "none" && CALM_ACTIONS.has(p.action), face, goal },
      props,
      // 대본 인물로 이미 선 동물은 글에 나와도 또 놓지 않고, 우주선 안에서는 우주선을 놓지 않는다
      things: p.stage === "action" && picks.action === "hide" ? []
        : thingsFor(p.text, mine, isIndoor(loc), new Set([
          ...props.filter((q) => ["bird", "bat", "rabbit", "squirrel"].includes(q.id)).map((q) => `props/${q.id}.webp`),
          ...(loc === "space-ship" ? ["props/spaceship.webp", "props/rocket.webp"] : []),
        ]), loc).map((t) => ({ ...t, motion: thingMotion(t, p.text, weather), ...holderOf(t, props) })),
    });
    x = to;
  }
  return out;
}

export const knownPlace = (place?: string) => !!place && !!LOCATIONS[place];
