#!/usr/bin/env python3
"""
Import the user's Steinsaltz Neviim (Prophets) source into DailyTanakh.

The Steinsaltz edition (R' Adin Even-Israel Steinsaltz, via Chabad.org) gives the
Prophets in an Orthodox-Jewish register, with Hebrew + English per verse and
section commentary (he+en). We use it as the authoritative source for Nevi'im:
  - Hebrew + English  -> replace (Steinsaltz, aligned with its commentary)
  - German + Russian  -> kept from the existing Sefaria data (extra translations)
  - Commentary        -> Steinsaltz section notes (he+en)
  - English book names -> Jewish transliteration used by the source
Ketuvim (Writings) is untouched (not part of this source).

Usage:  python3 scripts/import_steinsaltz.py [--src "<folder>"]
"""
import argparse, glob, html, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
TEXT_DIR = os.path.join(DATA, "text")
COMM_DIR = os.path.join(DATA, "commentary")
DEFAULT_SRC = "/Users/dalerkaliakbarov/Downloads/The Steinsaltz Neviim (Prophets)"

# folder -> (slug, English display name in Jewish transliteration)
MAP = {
    "Yehoshua_Joshua": ("joshua", "Yehoshua"),
    "Shoftim_Judges": ("judges", "Shofetim"),
    "Shmuel_I_I_Samuel": ("i-samuel", "Shmuel I"),
    "Shmuel_II_II_Samuel": ("ii-samuel", "Shmuel II"),
    "Melachim_I_I_Kings": ("i-kings", "Melakhim I"),
    "Melachim_II_II_Kings": ("ii-kings", "Melakhim II"),
    "Yeshayahu_Isaiah": ("isaiah", "Yeshayahu"),
    "Yirmiyahu_Jeremiah": ("jeremiah", "Yirmeyahu"),
    "Yechezkel_Ezekiel": ("ezekiel", "Yeḥezkel"),
    "Hoshea_Hosea": ("hosea", "Hoshea"),
    "Yoel_Joel": ("joel", "Yoel"),
    "Amos": ("amos", "Amos"),
    "Ovadiah_Obadiah": ("obadiah", "Ovadya"),
    "Yonah_Jonah": ("jonah", "Yona"),
    "Michah_Micah": ("micah", "Mikha"),
    "Nachum_Nahum": ("nahum", "Naḥum"),
    "Chavakuk_Habakkuk": ("habakkuk", "Ḥavakuk"),
    "Tzefaniah_Zephaniah": ("zephaniah", "Tzefanya"),
    "Chaggai_Haggai": ("haggai", "Ḥaggai"),
    "Zechariah": ("zechariah", "Zekharya"),
    "Malachi": ("malachi", "Malakhi"),
}

ST_HE = {"title": "תנ״ך שטיינזלץ — נביאים", "license": "© Steinsaltz Center", "by": "מהדורת הרב עדין אבן-ישראל שטיינזלץ"}
ST_EN = {"title": "The Steinsaltz Tanakh — Nevi'im", "license": "© Steinsaltz Center", "by": "Rabbi Adin Even-Israel Steinsaltz · via Chabad.org"}

TAG = re.compile(r"<[^>]+>")
WS = re.compile(r"\s+")
def clean(s):
    if not isinstance(s, str): return ""
    s = TAG.sub("", html.unescape(s))
    return WS.sub(" ", s).strip()

def load_book(folder, src):
    """Returns (en_chapters, commentary). NOTE: we deliberately ignore the
    Steinsaltz Hebrew because it is the *elucidated* text (biblical words woven
    with explanatory additions), not the bare Masoretic pasuk. The Hebrew column
    keeps the pure Masoretic text from Sefaria; Steinsaltz supplies the English
    translation and the section commentary."""
    chs = sorted(glob.glob(os.path.join(src, folder, "chapter_*.json")),
                 key=lambda p: int(re.search(r"(\d+)", os.path.basename(p)).group(1)))
    en, commentary = [], {}
    for ci, path in enumerate(chs, start=1):
        d = json.load(open(path, encoding="utf-8"))
        verses = d.get("verses", [])
        en_ch = []
        vmap = {}
        for vi, v in enumerate(verses, start=1):
            en_ch.append(clean(v.get("text_en")))
            items = []
            for c in (v.get("commentary") or []):
                te, th = clean(c.get("comment_en")), clean(c.get("comment_he"))
                if not (te or th): continue
                items.append({
                    "en": "Steinsaltz", "he": "שטיינזלץ", "src": "Steinsaltz",
                    "titleEn": clean(c.get("title_en")), "titleHe": clean(c.get("title_he")),
                    "textEn": te, "textHe": th,
                })
            if items: vmap[str(vi)] = items
        en.append(en_ch)
        if vmap: commentary[str(ci)] = vmap
    return en, commentary

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=DEFAULT_SRC)
    args = ap.parse_args()
    if not os.path.isdir(args.src):
        raise SystemExit(f"source folder not found: {args.src}")

    master_path = os.path.join(DATA, "books.json")
    master = json.load(open(master_path, encoding="utf-8"))
    by_slug = {b["slug"]: b for b in master["books"]}

    for folder, (slug, en_name) in MAP.items():
        st_en, commentary = load_book(folder, args.src)
        if not st_en:
            print(f"  ! no chapters for {folder}"); continue
        tpath = os.path.join(TEXT_DIR, f"{slug}.json")
        if not os.path.exists(tpath):
            print(f"  ! missing baseline {slug}.json — run fetch_sefaria first"); continue
        old = json.load(open(tpath, encoding="utf-8"))
        he = old.get("text", {}).get("he") or []
        nch = len(he)

        # Align Steinsaltz English to the Masoretic verse structure.
        en, mismatch = [], 0
        for ci in range(nch):
            target = len(he[ci])
            src_ch = st_en[ci] if ci < len(st_en) else []
            if len(src_ch) != target:
                mismatch += 1
            en.append([(src_ch[i] if i < len(src_ch) else "") for i in range(target)])

        # Keep only commentary within the Masoretic range.
        comm = {}
        for cs, vmap in commentary.items():
            ci = int(cs)
            if ci < 1 or ci > nch:
                continue
            vc = len(he[ci - 1])
            kept = {vs: items for vs, items in vmap.items() if 1 <= int(vs) <= vc}
            if kept:
                comm[cs] = kept
        commentary = comm

        text = {"he": he, "en": en}
        attribution = {}
        if old.get("attribution", {}).get("he"):
            attribution["he"] = old["attribution"]["he"]
        attribution["en"] = ST_EN
        for lang in ("de", "ru"):
            arr = old.get("text", {}).get(lang)
            if arr and any(arr):
                text[lang] = arr
                if old.get("attribution", {}).get(lang):
                    attribution[lang] = old["attribution"][lang]

        verse_counts = old.get("verseCounts") or [len(c) for c in he]
        names = dict(old.get("names") or {})
        names["en"] = en_name
        langs = [l for l in ("he", "en", "de", "ru") if l in text and any(text[l])]
        has_comm = bool(commentary)

        rec = {
            "slug": slug, "sefaria": old.get("sefaria", slug), "section": "neviim",
            "names": names, "chapters": nch, "verseCounts": verse_counts,
            "langs": langs, "attribution": attribution, "text": text,
        }
        json.dump(rec, open(tpath, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

        cpath = os.path.join(COMM_DIR, f"{slug}.json")
        if commentary:
            json.dump({"slug": slug, "chapters": commentary}, open(cpath, "w", encoding="utf-8"),
                      ensure_ascii=False, separators=(",", ":"))
        elif os.path.exists(cpath):
            os.remove(cpath)

        # update master metadata
        m = by_slug.get(slug) or {"slug": slug, "section": "neviim"}
        m.update({
            "names": names, "chapters": len(he), "verseCounts": verse_counts,
            "langs": langs, "totalVerses": sum(verse_counts), "hasCommentary": has_comm,
        })
        by_slug[slug] = m
        ncomm = sum(len(v) for v in commentary.values())
        warn = f" · ⚠ en-misaligned-ch={mismatch}" if mismatch else ""
        print(f"  ✓ {slug:12} {nch:3} ch · {sum(verse_counts):5} v · langs={langs} · comm={ncomm}{warn}")

    # rebuild ordered books list + totals + attribution
    master["books"] = [by_slug[b["slug"]] for b in master["books"] if b["slug"] in by_slug]
    master["totals"] = {
        "books": len(master["books"]),
        "chapters": sum(b["chapters"] for b in master["books"]),
        "verses": sum(b["totalVerses"] for b in master["books"]),
    }
    master.setdefault("attribution", {})
    master["attribution"]["steinsaltz"] = ST_EN
    json.dump(master, open(master_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"\n== books.json updated: {master['totals']} ==")

if __name__ == "__main__":
    main()
