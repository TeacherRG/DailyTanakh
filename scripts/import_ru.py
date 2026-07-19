#!/usr/bin/env python3
"""
Import the user's Russian Jewish translation of Nevi'im + Ketuvim (.docx) as the
`ru` version for every book. The source is a full Orthodox Russian translation
("Йеошуа", "Г-сподь", verse markers "(1) …").

Structure: a short paragraph = chapter header (e.g. "1", "1 псалом", "Глава 1");
the following paragraph(s) hold the verses inline as "(n) text".

Usage:
  python3 scripts/import_ru.py            # validate only (no writes)
  python3 scripts/import_ru.py --write    # apply to data/text/<slug>.json
"""
import argparse, glob, html, json, os, re, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
TEXT_DIR = os.path.join(DATA, "text")
SRC = "/Users/dalerkaliakbarov/Downloads/DailyTanakh"

RU_ATTR = {"title": "Танах с русским переводом (издание Мосад а-Рав Кук / Ф. Гурфинкель)",
           "license": "© правообладатель", "by": "Еврейский русский перевод (личные файлы пользователя)"}

MAP = {
    "joshua": "Пророки/Книга Йошуа.docx",
    "judges": "Пророки/Книга Шофтим.docx",
    "i-samuel": "Пророки/Книга Шмуэль I.docx",
    "ii-samuel": "Пророки/Книга Шмуэль II.docx",
    "i-kings": "Пророки/Книга Мелахим I (Цари I).docx",
    "ii-kings": "Пророки/Книга Мелахим II (Цари II).docx",
    "isaiah": "Пророки/Книга Йешаягу.docx",
    "jeremiah": "Пророки/Книга Йирмиягу.docx",
    "ezekiel": "Пророки/Книга Йехезкеля.docx",
    "hosea": "Пророки/Трей Асар/Книга Ошеа.docx",
    "joel": "Пророки/Трей Асар/Книга Йоэля.docx",
    "amos": "Пророки/Трей Асар/Книга Амоса.docx",
    "obadiah": "Пророки/Трей Асар/Книга Овадьи.docx",
    "jonah": "Пророки/Трей Асар/Книга Йоны.docx",
    "micah": "Пророки/Трей Асар/Книга Михи.docx",
    "nahum": "Пророки/Трей Асар/Книга Нахума.docx",
    "habakkuk": "Пророки/Трей Асар/Книга Хавакука.docx",
    "zephaniah": "Пророки/Трей Асар/Книга Цфаньи.docx",
    "haggai": "Пророки/Трей Асар/Книга Хагая.docx",
    "zechariah": "Пророки/Трей Асар/Книга Захарии.docx",
    "malachi": "Пророки/Трей Асар/Книга Малахи.docx",
    "psalms": "Писания/Теилим (Псалмы).docx",
    "proverbs": "Писания/Мишлей (Книга притчей Соломоновых).docx",
    "job": "Писания/Книга Иова.docx",
    "song-of-songs": "Писания/Мегилот/Шир а-Ширим (Песнь Песней).docx",
    "ruth": "Писания/Мегилот/Свиток Рут.docx",
    "lamentations": "Писания/Мегилот/Свиток Эйха.docx",
    "ecclesiastes": "Писания/Мегилот/Свиток Коэлет (Екклесиаст).docx",
    "esther": "Писания/Мегилот/Эстер.docx",
    "daniel": "Писания/Книга Даниэля.docx",
    "ezra": "Писания/Книга Эзры.docx",
    "nehemiah": "Писания/Книга Нехемии.docx",
    "i-chronicles": "Писания/Книга Диврей а-ямим I (Паралипоменон).docx",
    "ii-chronicles": "Писания/Книга Диврей а-ямим II (Паралипоменон).docx",
}

VERSE = re.compile(r"\((\d+)(?:\s*[-–]\s*(\d+))?\)")
WS = re.compile(r"\s+")

def paragraphs(path):
    xml = zipfile.ZipFile(path).read("word/document.xml").decode("utf-8", "ignore")
    out = []
    for p in re.findall(r"<w:p[ >].*?</w:p>", xml, re.S):
        t = "".join(re.findall(r"<w:t(?: [^>]*)?>(.*?)</w:t>", p, re.S))
        t = WS.sub(" ", html.unescape(t)).strip()
        if t:
            out.append(t)
    return out

def is_header(t):
    if VERSE.search(t):
        return None
    if len(t) > 26:
        return None
    m = re.search(r"\d+", t)
    if not m:
        return None
    # allow "1", "1 псалом", "Глава 1", "Псалом 1"
    if re.fullmatch(r"(глава|псалом|песнь|плач)?\s*\d+\s*(псалом|глава)?", t.strip(), re.I):
        return int(m.group())
    return None

def parse(path):
    ps = paragraphs(path)
    chapters = []
    buf = ""
    have = False
    def flush():
        nonlocal buf
        if not have:
            buf = ""; return
        verses = {}
        ms = list(VERSE.finditer(buf))
        for i, m in enumerate(ms):
            s = m.end(); e = ms[i + 1].start() if i + 1 < len(ms) else len(buf)
            txt = buf[s:e].strip(" \t—–-")
            a = int(m.group(1)); b = int(m.group(2)) if m.group(2) else a
            for v in range(a, b + 1):
                verses[v] = txt
        n = max(verses) if verses else 0
        chapters[-1] = [verses.get(v, "") for v in range(1, n + 1)]
        buf = ""
    for t in ps:
        h = is_header(t)
        if h is not None:
            flush(); chapters.append([]); have = True
        elif have:
            buf += " " + t
    flush()
    return chapters

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true")
    args = ap.parse_args()
    books = json.load(open(os.path.join(DATA, "books.json"), encoding="utf-8"))["books"]
    exp = {b["slug"]: b["verseCounts"] for b in books}

    total_mismatch_ch = 0
    for slug, rel in MAP.items():
        path = os.path.join(SRC, rel)
        if not os.path.exists(path):
            print(f"  ! MISSING FILE {slug}: {rel}"); continue
        ru = parse(path)
        e = exp.get(slug, [])
        got = [len(c) for c in ru]
        mism = [i + 1 for i in range(max(len(got), len(e))) if (i >= len(got) or i >= len(e) or got[i] != e[i])]
        total_mismatch_ch += len(mism)
        flag = f" ⚠ ch-diff={mism[:6]}" if mism else ""
        print(f"  {slug:15} ch got/exp={len(got)}/{len(e)} verses={sum(got)}{flag}")

        if args.write:
            tpath = os.path.join(TEXT_DIR, f"{slug}.json")
            rec = json.load(open(tpath, encoding="utf-8"))
            he = rec["text"].get("he") or []
            nch = len(he)
            # align ru to Masoretic verse structure
            aligned = []
            for ci in range(nch):
                target = len(he[ci])
                src_ch = ru[ci] if ci < len(ru) else []
                aligned.append([(src_ch[i] if i < len(src_ch) else "") for i in range(target)])
            rec["text"]["ru"] = aligned
            if "langs" not in rec: rec["langs"] = []
            if "ru" not in rec["langs"]: rec["langs"].append("ru")
            rec["langs"] = [l for l in ("he", "en", "de", "ru") if l in rec["text"] and any(rec["text"][l])]
            rec.setdefault("attribution", {})["ru"] = RU_ATTR
            json.dump(rec, open(tpath, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

    print(f"\nTotal chapters with verse-count diff: {total_mismatch_ch}")
    if args.write:
        # refresh books.json langs to reflect ru everywhere
        bpath = os.path.join(DATA, "books.json")
        master = json.load(open(bpath, encoding="utf-8"))
        for b in master["books"]:
            tp = os.path.join(TEXT_DIR, f"{b['slug']}.json")
            if os.path.exists(tp):
                b["langs"] = json.load(open(tp, encoding="utf-8")).get("langs", b.get("langs"))
        json.dump(master, open(bpath, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print("books.json langs refreshed.")

if __name__ == "__main__":
    main()
