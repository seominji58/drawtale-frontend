import { marked } from "marked";
import terms from "./terms.md?raw";
import privacy from "./privacy.md?raw";

/** 가입할 때 서버에 함께 보내 어느 판에 동의했는지 남긴다 (백엔드 users.consent_version).
 *  terms.md · privacy.md 를 고치면 이 값도 바꾼다. 원본 초안은 pt_docs legal/ 에 있다 */
export const LEGAL_VERSION = "2026-11-03-draft2";

export type LegalKind = "terms" | "privacy";

export const LEGAL_TITLE: Record<LegalKind, string> = {
  terms: "이용약관",
  privacy: "개인정보 처리방침",
};

// 우리가 쓴 문서만 그린다 (이용자 입력이 아니다)
const HTML: Record<LegalKind, string> = {
  terms: marked.parse(terms, { async: false }),
  privacy: marked.parse(privacy, { async: false }),
};

/** 약관 본문. 시범 운영 중이라 맨 위에 초안임을 알린다 */
export default function LegalDoc({ kind }: { kind: LegalKind }) {
  return (
    <div className="legal">
      <div className="box warn">
        시범 운영 중인 초안입니다. 〔정하는 중〕으로 적힌 곳은 정해지는 대로 채우고, 바뀌면 미리 알려 드립니다.
      </div>
      <div className="legal-body" dangerouslySetInnerHTML={{ __html: HTML[kind] }} />
    </div>
  );
}
