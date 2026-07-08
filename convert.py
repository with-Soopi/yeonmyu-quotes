#!/usr/bin/env python3
"""quotes.csv → quotes.json 변환 스크립트.

사용법:
    python3 convert.py

- quotes.csv의 "lyrics or line" 컬럼에서 문자 그대로의 "\\n"을 실제 줄바꿈으로 변환
- MOODS(기본 mood 태그)를 병합하되, 이미 quotes.json에 있는 항목의
  moods/color는 보존한다 → JSON에서 직접 수정해도 재실행 시 덮어쓰지 않음
- 작품(work)별 배경색을 자동 배정하고, 배경 밝기에 따라 글자색을
  자동으로 밝게/어둡게 결정한다
"""

import csv
import json
import hashlib
import colorsys
from pathlib import Path

HERE = Path(__file__).parent
CSV_PATH = HERE / "quotes.csv"
JSON_PATH = HERE / "quotes.json"

# ── 기본 mood 태그 (id → 태그 목록) ─────────────────────────────
# 대사를 읽고 배정한 초기값. quotes.json에서 자유롭게 수정하세요.
# (JSON에서 수정한 값이 우선하며, 재실행해도 덮어쓰지 않습니다)
MOODS = {
    1:  ["유쾌", "냉소"],
    2:  ["설렘", "사랑", "위로"],
    3:  ["위로", "용기"],
    4:  ["간절함", "슬픔"],
    5:  ["자유", "용기", "위로"],
    6:  ["당당함", "자기애", "결의"],
    7:  ["쓸쓸함", "자유"],
    8:  ["유쾌", "설렘"],
    9:  ["결의", "희망", "용기"],
    10: ["위로", "자기애"],
    11: ["냉소", "허무"],
    12: ["평온", "설렘"],
    13: ["벅참", "용기", "자부심"],
    14: ["희망", "설렘", "두려움"],
    15: ["결의", "용기"],
    16: ["절박함"],
    17: ["유쾌", "설렘"],
    18: ["위로", "결의", "희망"],
    19: ["야망", "당당함", "유쾌"],
    20: ["긴장감", "서늘함"],
    21: ["신비", "긴장감"],
    22: ["위로", "설렘", "용기"],
    23: ["결의", "벅참"],
    24: ["열정", "벅참"],
    25: ["희망", "그리움"],
    26: ["분노", "결의"],
    27: ["결의", "확신"],
    28: ["자유", "결의", "용기"],
    29: ["당당함", "자기애", "유쾌"],
    30: ["낭만", "설렘"],
    31: ["유쾌", "용기"],
    32: ["위로", "사랑"],
    33: ["흥겨움", "용기"],
    34: ["사랑", "위로"],
    35: ["위로", "희망"],
    36: ["당당함", "유쾌"],
    37: ["희망", "설렘", "용기"],
    38: ["평온", "위로"],
}

# ── 색상 배정 ────────────────────────────────────────────────
# 작품명 해시 → 색상. 같은 작품은 언제나 같은 색이 나오고,
# 작품이 추가/삭제돼도 기존 작품의 색은 바뀌지 않는다.

def color_for_work(work: str) -> str:
    h = int(hashlib.md5(work.encode("utf-8")).hexdigest(), 16)
    hue = (h % 360) / 360.0
    # 채도/명도는 몇 가지 무대 톤 중에서 해시로 선택 (어두운 톤 위주 + 밝은 톤 일부)
    tones = [
        (0.42, 0.30),  # 깊고 어두운 톤
        (0.38, 0.36),
        (0.45, 0.26),
        (0.33, 0.42),
        (0.30, 0.80),  # 밝은 파스텔 톤
        (0.35, 0.34),
    ]
    sat, lig = tones[(h // 360) % len(tones)]
    r, g, b = colorsys.hls_to_rgb(hue, lig, sat)
    return "#{:02X}{:02X}{:02X}".format(round(r * 255), round(g * 255), round(b * 255))


def text_color_for(bg_hex: str) -> str:
    """WCAG 상대 휘도 기준으로 배경 대비 가독성 좋은 글자색을 고른다."""
    r, g, b = (int(bg_hex[i:i + 2], 16) / 255.0 for i in (1, 3, 5))

    def lin(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
    return "#1C1C1E" if luminance > 0.35 else "#FAF6EF"


def main():
    # 기존 JSON이 있으면 moods/color 사용자 수정을 보존
    existing = {}
    if JSON_PATH.exists():
        for q in json.loads(JSON_PATH.read_text(encoding="utf-8")):
            existing[q["id"]] = q

    quotes = []
    with open(CSV_PATH, encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            qid = int(row["ID"])
            work = row["performance"].strip()
            prev = existing.get(qid, {})
            color = prev.get("color") or color_for_work(work)
            quotes.append({
                "id": qid,
                "genre": row["genre"].strip(),
                "work": work,
                "song": (row.get("numberTitle") or "").strip(),
                "text": row["lyrics or line"].replace("\\n", "\n").strip(),
                "moods": prev.get("moods") or MOODS.get(qid, []),
                "color": color,
                "textColor": text_color_for(color),
            })

    JSON_PATH.write_text(
        json.dumps(quotes, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    works = {q["work"] for q in quotes}
    print(f"quotes.json 생성 완료: 대사 {len(quotes)}개, 작품 {len(works)}개")


if __name__ == "__main__":
    main()
