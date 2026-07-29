#!/usr/bin/env python3
"""
Импорт детской энциклопедии («Иллюстрированная энциклопедия Торы для детей», © mychitas.app)
из PDF в data/kids.json — 114 глав пересказа всех книг Невиим и Ктувим для детей 10–15 лет.

Разбор вёрстки (layout-режим pypdf):
  * границы глав — по заголовкам из оглавления (в теле нумерация идёт внутри книги);
  * буквица (drop cap) стоит в начале ВТОРОЙ строки абзаца — возвращается на место;
  * врезки-цитаты и «Вопрос для размышления» — выключены по центру;
  * разрядка в заголовках («ВО ПРО С Д ЛЯ») — схлопывается;
  * переносы слов по дефису — склеиваются.

Использование:  python3 scripts/import_kids.py [--pdf ПУТЬ] [--write]
"""
import argparse, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
DEFAULT_PDF = "/Users/dalerkaliakbarov/Desktop/Design.pdf"

# раздел энциклопедии -> книги Танаха в приложении
BOOK_MAP = {
    "Йеошуа": ["joshua"],
    "Шофтим": ["judges"],
    "Шмуэль I": ["i-samuel"],
    "Шмуэль II": ["ii-samuel"],
    "Мелахим I": ["i-kings"],
    "Мелахим II": ["ii-kings"],
    "Йешаяу": ["isaiah"],
    "Ирмеяу": ["jeremiah"],
    "Йехезкель": ["ezekiel"],
    "Трей-Асар": ["hosea", "joel", "amos", "obadiah", "jonah", "micah",
                  "nahum", "habakkuk", "zephaniah", "haggai", "zechariah", "malachi"],
    "Теилим": ["psalms"],
    "Мишлей": ["proverbs"],
    "Иов": ["job"],
    "Шир а-Ширим и Коэлет": ["song-of-songs", "ecclesiastes"],
    "Рут": ["ruth"],
    "Эстер": ["esther"],
    "Даниэль": ["daniel"],
    "Эзра и Нехемья": ["ezra", "nehemiah"],
    "Эйха и Диврей а-Ямим": ["lamentations", "i-chronicles", "ii-chronicles"],
}
SECTION_OF = {  # раздел Танаха для оформления
    **{b: "neviim" for b in ["Йеошуа", "Шофтим", "Шмуэль I", "Шмуэль II", "Мелахим I",
                             "Мелахим II", "Йешаяу", "Ирмеяу", "Йехезкель", "Трей-Асар"]},
    **{b: "ketuvim" for b in ["Теилим", "Мишлей", "Иов", "Шир а-Ширим и Коэлет", "Рут",
                              "Эстер", "Даниэль", "Эзра и Нехемья", "Эйха и Диврей а-Ямим"]},
}

ws = lambda s: re.sub(r"\s+", " ", s).strip()
key = lambda s: re.sub(r"[^а-яёa-z0-9]", "", ws(s).lower())

def despace(s):
    """«ВО ПРО  С Д ЛЯ» -> «ВОПРОС ДЛЯ» (разрядка заголовков)."""
    t = s.strip()
    if not t or re.search(r"[а-яё]{4}", t):
        return ws(t)
    parts = re.split(r"\s{2,}", t)
    joined = " ".join(p.replace(" ", "") for p in parts)
    return joined if joined else ws(t)

def dehyphen(lines):
    out = ""
    for l in lines:
        l = l.strip()
        if not out:
            out = l
        elif out.endswith("-") and l[:1].islower():
            out = out[:-1] + l
        else:
            out += " " + l
    return ws(out)

def read_toc(reader):
    toc, book = [], None
    for i in (1, 2):
        for line in (reader.pages[i].extract_text() or "").split("\n"):
            s = ws(line)
            if not s or s == "Оглавление":
                continue
            m = re.match(r"^(\d+)\.(.+)$", s)
            if m:
                toc.append({"n": int(m.group(1)), "title": m.group(2).strip(), "book": book})
            else:
                book = s
    return toc

def page_blocks(raw, titles=frozenset()):
    """Страница -> список блоков: (тип, текст). Тип: title|head|callout|question-head|para.

    titles — множество нормализованных заголовков глав из оглавления: заголовок
    может стоять как после «Глава № N», так и после подписи раздела
    («Часть первая · псалмы 1–41»), поэтому опознаём его по самому тексту.
    """
    blocks = []
    for chunk in re.split(r"\n\s*\n", raw):
        lines = [l for l in chunk.split("\n") if l.strip()]
        if not lines:
            continue
        # колонтитул энциклопедии (+ «КНИГА X» в том же блоке) / номер страницы
        flat = ws("".join(lines)).replace(" ", "")
        if flat[:16].upper().startswith("ИЛЛЮСТРИРОВАННАЯ"):
            continue
        if re.fullmatch(r"\d{1,3}", ws("".join(lines))):
            continue

        # начало главы — строка, совпадающая с заголовком из оглавления
        ti = next((i for i, l in enumerate(lines) if key(l) in titles), None)
        if ti is not None:
            blocks.append(("title", ws(lines[ti])))
            lines = lines[ti + 1:]
            if not lines:
                continue

        indents = [len(l) - len(l.lstrip()) for l in lines]
        # Буквица стоит в начале ВТОРОЙ строки абзаца и может нести открывающую
        # кавычку («С), если абзац начинается с прямой речи.
        cap = ""
        if len(lines) >= 2:
            m2 = re.match(r"^([«„\"]?[А-ЯЁ])\s{2,}(\S.*)$", lines[1].lstrip())
            if lines[0].lstrip()[:1].islower() and m2:
                cap = m2.group(1)
                lines = [lines[0], " " * indents[1] + m2.group(2)] + lines[2:]

        text = dehyphen(lines)
        if cap:
            text = cap + text

        # «Вопрос для размышления» (заголовок набран в разрядку): текст вопроса
        # обычно идёт в том же блоке, реже — следующим блоком
        if lines[0].replace(" ", "").upper() == "ВОПРОСДЛЯРАЗМЫШЛЕНИЯ":
            if len(lines) > 1:
                blocks.append(("question", dehyphen(lines[1:])))
            else:
                blocks.append(("question-head", "ВОПРОС ДЛЯ РАЗМЫШЛЕНИЯ"))
            continue
        if re.fullmatch(r"КНИГА\s+.+", despace(text), re.I):
            continue

        # у обычного абзаца строки продолжения начинаются с нулевого отступа,
        # у врезки/цитаты — все строки с отступом
        flush_left = any(x == 0 for x in indents)
        if len(lines) == 1 and indents[0] == 0 and len(text) <= 70 \
                and text.rstrip()[-1:] not in ".!?…»,;:" and text[:1].isupper():
            blocks.append(("head", text))
        elif not flush_left:
            blocks.append(("callout", text))
        else:
            blocks.append(("para", text))
    return blocks

def parse(pdf_path):
    from pypdf import PdfReader
    reader = PdfReader(pdf_path)
    toc = read_toc(reader)

    titles = frozenset(key(t["title"]) for t in toc)
    pages = []
    for i in range(3, len(reader.pages)):
        raw = reader.pages[i].extract_text(extraction_mode="layout") or ""
        pages.append(page_blocks(raw, titles))

    # позиции заголовков глав
    pos, at = [], (0, 0)
    for t in toc:
        target = key(t["title"])
        found = None
        pi, bi = at
        while pi < len(pages) and not found:
            start = bi if pi == at[0] else 0
            for j in range(start, len(pages[pi])):
                if key(pages[pi][j][1]) == target:
                    found = (pi, j); break
            pi += 1
        if not found:
            print(f"  ! не найден заголовок главы {t['n']}: {t['title']}", file=sys.stderr)
            continue
        pos.append((t, found))
        at = (found[0], found[1] + 1)

    chapters = []
    for idx, (t, (pi, bi)) in enumerate(pos):
        end = pos[idx + 1][1] if idx + 1 < len(pos) else (len(pages), 0)
        seq = []
        p, b = pi, bi + 1
        while (p, b) < end and p < len(pages):
            if b >= len(pages[p]):
                p += 1; b = 0; continue
            seq.append(pages[p][b]); b += 1

        ch = {"n": t["n"], "book": t["book"], "title": t["title"],
              "intro": "", "blocks": [], "questions": []}
        expect_q = False
        for kind, text in seq:
            if kind == "title":
                continue
            if kind == "question":
                ch["questions"].append(text); expect_q = False; continue
            if kind == "question-head":
                expect_q = True; continue
            if expect_q:
                ch["questions"].append(text); expect_q = False; continue
            # первый блок главы (до первого подзаголовка) — вступление
            if not ch["blocks"] and not ch["intro"] and kind in ("para", "callout"):
                ch["intro"] = text; continue
            if kind == "head":
                ch["blocks"].append({"h": text, "p": []})
            elif kind == "callout":
                if not ch["blocks"]:
                    ch["blocks"].append({"h": "", "p": []})
                ch["blocks"][-1]["p"].append({"q": text})
            else:
                if not ch["blocks"]:
                    ch["blocks"].append({"h": "", "p": []})
                cur_ps = ch["blocks"][-1]["p"]
                # абзац, разорванный границей страницы: продолжение начинается
                # со строчной буквы, а предыдущий абзац не закончен
                if cur_ps and isinstance(cur_ps[-1], str) and text[:1].islower() \
                        and cur_ps[-1].rstrip()[-1:] not in ".!?…»":
                    prev = cur_ps[-1].rstrip()
                    cur_ps[-1] = (prev[:-1] + text) if prev.endswith("-") else (prev + " " + text)
                else:
                    cur_ps.append(text)
        chapters.append(ch)
    return chapters

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", default=DEFAULT_PDF)
    ap.add_argument("--write", action="store_true")
    args = ap.parse_args()

    chapters = parse(args.pdf)
    print(f"глав: {len(chapters)}")

    books, seen = [], {}
    for c in chapters:
        bk = c["book"]
        if bk not in seen:
            seen[bk] = {"title": bk, "slugs": BOOK_MAP.get(bk, []),
                        "section": SECTION_OF.get(bk, "neviim"), "chapters": []}
            books.append(seen[bk])
            if bk not in BOOK_MAP:
                print(f"  ! нет сопоставления книги: {bk!r}", file=sys.stderr)
        seen[bk]["chapters"].append(c["n"])

    paras = sum(len([x for x in b["p"] if isinstance(x, str)]) for c in chapters for b in c["blocks"])
    quotes = sum(len([x for x in b["p"] if isinstance(x, dict)]) for c in chapters for b in c["blocks"])
    qs = sum(len(c["questions"]) for c in chapters)
    heads = sum(len(c["blocks"]) for c in chapters)
    print(f"книг: {len(books)} · разделов: {heads} · абзацев: {paras} · врезок: {quotes} · вопросов: {qs}")

    bad = [c["n"] for c in chapters if not c["intro"] or paras == 0]
    noq = [c["n"] for c in chapters if not c["questions"]]
    if bad: print(f"  ! главы без вступления: {bad}", file=sys.stderr)
    if noq: print(f"  ! главы без вопроса: {noq}", file=sys.stderr)

    out = {
        "title": "Иллюстрированная энциклопедия Торы для детей",
        "subtitle": "Танах: Пророки и Писания",
        "credit": "© mychitas.app",
        "ages": "10–15",
        "total": len(chapters),
        "books": books,
        "chapters": chapters,
    }
    if args.write:
        path = os.path.join(DATA, "kids.json")
        json.dump(out, open(path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        print(f"записано: {path} ({os.path.getsize(path)/1024:.0f} КБ)")
    else:
        c = chapters[0]
        print(f"\n--- глава {c['n']}: {c['title']} ({c['book']}) ---")
        print("вступление:", c["intro"][:150])
        for b in c["blocks"][:3]:
            print(f"  § {b['h']}")
            for p in b["p"][:2]:
                print("     ", (p["q"][:120] + "  [врезка]") if isinstance(p, dict) else p[:120])
        print("вопрос:", (c["questions"] or ["—"])[0][:120])

if __name__ == "__main__":
    main()
