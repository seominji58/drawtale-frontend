import { describe, expect, it } from "vitest";
import { planPages } from "./plan";
import type { BookPage } from "@/types/story";

const page = (n: number, stage: BookPage["stage"], characters: { name: string; slot: string }[] = []): BookPage =>
  ({ page: n, stage, action: "breathe", text: "별이 반짝였어요.", childWords: "", scene: { location: "", characters } });

describe("카드의 기본 어른 · 친구는 대본 인물 그림으로 (11/4)", () => {
  const sheet = { "별이 대장": "a woman astronaut in a white space suit" };

  it("대본에 우주 대원이 있으면 인물 없는 결과 쪽의 「어른」도 우주 대원", () => {
    const plans = planPages(
      [page(1, "place"), page(2, "problem"), page(3, "action", [{ name: "별이 대장", slot: "right-middle" }]), page(4, "result")],
      { place: "space", result: "adult_took" }, sheet);
    const last = plans[3].props.filter((p) => p.id !== "sign");
    expect(last.map((p) => p.id)).toEqual(["astronaut-f"]);
    expect(last[0].name).toBe("별이 대장");
  });

  it("대본 인물이 없으면 예전처럼 기본 어른", () => {
    const plans = planPages([page(1, "place"), page(2, "result")], { place: "space", result: "adult_took" }, {});
    expect(plans[1].props.map((p) => p.id)).toContain("adult");
  });
});
