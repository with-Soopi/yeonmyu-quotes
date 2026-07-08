# 오늘의 연뮤 문장 🎭

연극/뮤지컬 대사가 매일 자정에 바뀌는 아이폰 홈 화면 위젯.
같은 날에는 항상 같은 대사가 나오고, 작품마다 고유한 배경색이 입혀집니다.

## 파일 구성

| 파일 | 설명 |
|---|---|
| `quotes.csv` | 대사 원본 DB (엑셀에서 편집 가능) |
| `convert.py` | quotes.csv → quotes.json 변환 스크립트 |
| `quotes.json` | 위젯이 읽는 최종 데이터 (mood 태그·색상 포함) |
| `widget.js` | Scriptable 위젯 스크립트 |

## 1. 데이터 수정 & 변환

대사를 추가/수정하려면 `quotes.csv`를 고친 뒤 터미널에서:

```bash
cd ~/Claude_0/오늘의-연뮤-문장
python3 convert.py
```

- `lyrics or line` 컬럼의 `\n` 표기는 자동으로 실제 줄바꿈으로 변환됩니다.
- **mood 태그와 색상을 직접 고치고 싶으면 `quotes.json`에서 수정하세요.**
  재변환해도 JSON에서 고친 `moods`/`color` 값은 덮어쓰지 않고 보존됩니다.
- 새 대사에는 mood가 비어 있을 수 있으니 JSON에서 채워주면 됩니다.
- 배경색은 작품별로 자동 배정되고, 배경 밝기에 따라 글자색이
  자동으로 밝은색/어두운색으로 정해집니다.

## 2. GitHub에 올리기 (맥북)

### 처음 한 번만

1. [github.com](https://github.com)에서 **New repository** 클릭
   - 이름 예시: `yeonmyu-quotes`
   - **Public**으로 생성 (raw URL 접근에 필요. 비공개로 하려면 토큰이 필요해서 복잡해져요)
2. 터미널에서:

```bash
cd ~/Claude_0/오늘의-연뮤-문장
git init
git add quotes.csv convert.py quotes.json widget.js README.md
git commit -m "오늘의 연뮤 문장 초기 커밋"
git branch -M main
git remote add origin https://github.com/<내아이디>/yeonmyu-quotes.git
git push -u origin main
```

> `git push`에서 로그인을 물어보면: 처음이라면 `brew install gh` 후
> `gh auth login`으로 브라우저 로그인하는 게 제일 편합니다.

3. GitHub 저장소 페이지에서 `quotes.json` 클릭 → 우측 **Raw** 버튼 클릭
   → 주소창의 URL 복사. 이런 형태입니다:

```
https://raw.githubusercontent.com/<내아이디>/yeonmyu-quotes/main/quotes.json
```

4. `widget.js` 맨 위의 `JSON_URL = ""` 따옴표 안에 붙여넣기.

### 이후 데이터를 고칠 때마다

```bash
cd ~/Claude_0/오늘의-연뮤-문장
python3 convert.py
git add -A && git commit -m "대사 업데이트" && git push
```

위젯은 다음 갱신 때(늦어도 다음날 자정) 새 데이터를 받아옵니다.

## 3. Scriptable 설치 & 위젯 추가 (아이폰)

1. App Store에서 **Scriptable** 설치 (무료)
2. widget.js 내용을 아이폰으로 가져오기 — 둘 중 편한 방법으로:
   - **AirDrop**: 맥에서 widget.js를 AirDrop → 아이폰에서 Scriptable로 열기
   - **복붙**: GitHub 저장소에서 widget.js 열어 전체 복사 →
     Scriptable 앱에서 **+** 눌러 새 스크립트 만들고 붙여넣기
3. 스크립트 이름을 `오늘의 연뮤 문장`으로 저장
4. 앱 안에서 한 번 실행(▶)해서 미리보기가 뜨는지 확인
5. 홈 화면 빈 곳을 길게 누름 → 좌측 상단 **+** → **Scriptable** 검색
   → 원하는 크기(소/중/대) 선택 → **위젯 추가**
6. 추가된 위젯을 길게 눌러 **위젯 편집** →
   - **Script**: `오늘의 연뮤 문장` 선택
   - **When Interacting**: Run Script (기본값)

끝! 매일 자정이 지나면 새 대사로 바뀝니다.

## 위젯 동작 정리

- **소형**: 대사를 짧게 자른 한 문장 + 작품명
- **중형**: 대사 전문 + 장르·작품명·넘버 제목
- **대형**: 대사 전문 + mood 태그 + 장르·작품명·넘버 제목
- **네트워크 실패 시**: 마지막으로 성공한 데이터를 캐시에서 표시
  (하단에 `⌁` 표시가 붙어요)
- **폰트**: 기본 시스템 폰트. 세리프 느낌을 원하면 widget.js 상단
  `QUOTE_FONT`를 `"georgia"`로 바꾸면 됩니다.
