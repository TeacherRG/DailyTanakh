#!/usr/bin/env python3
"""
DailyTanakh — build-time data pipeline.

Fetches the *real*, license-clean Nevi'im + Ketuvim corpus from the Sefaria API
and bundles it as static JSON so the app works fully offline at runtime.

Sources (all public-domain except RU, which is CC-BY-NC, attributed in-app):
  he : Tanach with Nikkud                                   (Public Domain)
  en : The Holy Scriptures: A New Translation (JPS 1917)    (Public Domain)
  de : Die Heilige Schrift, Dr. Simon Bernfeld, Berlin 1902 (Public Domain)
  ru : Da Project / D. Slivniak, 2011                       (CC-BY-NC)

Outputs:
  data/books.json                 master metadata + cycle inputs
  data/text/<slug>.json           full verse text per book, per language
  data/commentary/<slug>.json     per-verse classical commentary (featured chapters)

Usage:
  python3 scripts/fetch_sefaria.py                 # full corpus + featured commentary
  python3 scripts/fetch_sefaria.py --books Ruth,Jonah
  python3 scripts/fetch_sefaria.py --no-commentary
  python3 scripts/fetch_sefaria.py --force         # ignore cached book files
"""
import argparse, concurrent.futures as cf, html, json, os, re, subprocess, sys, time, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
TEXT_DIR = os.path.join(DATA, "text")
COMM_DIR = os.path.join(DATA, "commentary")
API = "https://www.sefaria.org/api"
UA = "DailyTanakh/1.0 (offline study app; build-time fetch)"

VERSIONS = {
    "he": ("vhe", "Tanach with Nikkud"),
    "en": ("ven", "The Holy Scriptures: A New Translation (JPS 1917)"),
    "de": ("ven", "Die Heilige Schrift, trans. Dr. Simon Bernfeld, Berlin, 1902 - German [de]"),
    "ru": ("ven", "Russian Torah translation, by Dmitri Slivniak, Ph.D., edited by Dr. Itzhak Streshinsky. Da Project, 2011 [ru]"),
}
ATTRIB = {
    "he": {"title": "Tanach with Nikkud", "license": "Public Domain", "by": "Westminster Leningrad / Masoretic"},
    "en": {"title": "The Holy Scriptures (JPS 1917)", "license": "Public Domain", "by": "Jewish Publication Society, 1917"},
    "de": {"title": "Die Heilige Schrift (Bernfeld, 1902)", "license": "Public Domain", "by": "Dr. Simon Bernfeld, Berlin 1902"},
    "ru": {"title": "Танах (Да Project, 2011)", "license": "CC-BY-NC", "by": "Д. Сливняк, ред. И. Стрешинский, Da Project 2011"},
}

# Canonical Jewish order; Sefaria title + names in en/ru/de/he.
NEVIIM = [
    ("joshua","Joshua",      "Joshua","Йеошуа","Josua","יְהוֹשֻׁעַ"),
    ("judges","Judges",      "Judges","Шофтим","Richter","שׁוֹפְטִים"),
    ("i-samuel","I Samuel",  "I Samuel","Шмуэль I","1. Samuel","שְׁמוּאֵל א׳"),
    ("ii-samuel","II Samuel","II Samuel","Шмуэль II","2. Samuel","שְׁמוּאֵל ב׳"),
    ("i-kings","I Kings",    "I Kings","Млахим I","1. Könige","מְלָכִים א׳"),
    ("ii-kings","II Kings",  "II Kings","Млахим II","2. Könige","מְלָכִים ב׳"),
    ("isaiah","Isaiah",      "Isaiah","Йешаяѓу","Jesaja","יְשַׁעְיָהוּ"),
    ("jeremiah","Jeremiah",  "Jeremiah","Ирмеяѓу","Jeremia","יִרְמְיָהוּ"),
    ("ezekiel","Ezekiel",    "Ezekiel","Йехезкель","Hesekiel","יְחֶזְקֵאל"),
    ("hosea","Hosea",        "Hosea","Ѓошеа","Hosea","הוֹשֵׁעַ"),
    ("joel","Joel",          "Joel","Йоэль","Joel","יוֹאֵל"),
    ("amos","Amos",          "Amos","Амос","Amos","עָמוֹס"),
    ("obadiah","Obadiah",    "Obadiah","Овадья","Obadja","עֹבַדְיָה"),
    ("jonah","Jonah",        "Jonah","Йона","Jona","יוֹנָה"),
    ("micah","Micah",        "Micah","Миха","Micha","מִיכָה"),
    ("nahum","Nahum",        "Nahum","Нахум","Nahum","נַחוּם"),
    ("habakkuk","Habakkuk",  "Habakkuk","Хаваккук","Habakuk","חֲבַקּוּק"),
    ("zephaniah","Zephaniah","Zephaniah","Цфанья","Zefanja","צְפַנְיָה"),
    ("haggai","Haggai",      "Haggai","Хаггай","Haggai","חַגַּי"),
    ("zechariah","Zechariah","Zechariah","Зхарья","Sacharja","זְכַרְיָה"),
    ("malachi","Malachi",    "Malachi","Малахи","Maleachi","מַלְאָכִי"),
]
KETUVIM = [
    ("psalms","Psalms",            "Psalms","Теѓиллим","Psalmen","תְּהִלִּים"),
    ("proverbs","Proverbs",        "Proverbs","Мишлей","Sprüche","מִשְׁלֵי"),
    ("job","Job",                  "Job","Ийов","Hiob","אִיּוֹב"),
    ("song-of-songs","Song of Songs","Song of Songs","Шир ѓа-Ширим","Hoheslied","שִׁיר הַשִּׁירִים"),
    ("ruth","Ruth",                "Ruth","Рут","Rut","רוּת"),
    ("lamentations","Lamentations","Lamentations","Эйха","Klagelieder","אֵיכָה"),
    ("ecclesiastes","Ecclesiastes","Ecclesiastes","Коѓелет","Prediger","קֹהֶלֶת"),
    ("esther","Esther",            "Esther","Эстер","Ester","אֶסְתֵּר"),
    ("daniel","Daniel",            "Daniel","Даниэль","Daniel","דָּנִיֵּאל"),
    ("ezra","Ezra",                "Ezra","Эзра","Esra","עֶזְרָא"),
    ("nehemiah","Nehemiah",        "Nehemiah","Нехемья","Nehemia","נְחֶמְיָה"),
    ("i-chronicles","I Chronicles","I Chronicles","Диврей ѓа-Ямим I","1. Chronik","דִּבְרֵי הַיָּמִים א׳"),
    ("ii-chronicles","II Chronicles","II Chronicles","Диврей ѓа-Ямим II","2. Chronik","דִּבְרֵי הַיָּמִים ב׳"),
]
BOOKS = [dict(slug=s, sefaria=t, section="neviim", names={"en":en,"ru":ru,"de":de,"he":he})
         for (s,t,en,ru,de,he) in NEVIIM] + \
        [dict(slug=s, sefaria=t, section="ketuvim", names={"en":en,"ru":ru,"de":de,"he":he})
         for (s,t,en,ru,de,he) in KETUVIM]

# Chapters to pull classical commentary for (famous / high study value).
FEATURED = {
    "joshua":[1,24], "i-samuel":[1,3,17], "isaiah":[1,6,40,53], "jeremiah":[1],
    "ezekiel":[1,37], "amos":[5], "jonah":[1,2,3,4], "micah":[6], "zechariah":[8],
    "psalms":[1,8,19,23,27,90,100,121,126,130,145,150], "proverbs":[1,3,31],
    "job":[1,38], "song-of-songs":[1], "ruth":[1,2,3,4], "lamentations":[1],
    "ecclesiastes":[1,3,12], "esther":[1], "daniel":[1,3],
}
COMMENTATORS = ["Rashi","Ibn Ezra","Radak","Metzudat David","Metzudat Zion",
                "Malbim","Ralbag","Sforno","Ramban","Gersonides","Rashbam","Targum Jonathan"]
COMM_RANK = {c: i for i, c in enumerate(COMMENTATORS)}

FOOTNOTE_RE = re.compile(r"<i[^>]*\bclass=\"footnote\"[^>]*>.*?</i>", re.S)
SUP_RE = re.compile(r"<sup[^>]*>.*?</sup>", re.S)
TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"[ \t ]+")

def clean(s):
    if not isinstance(s, str): return ""
    s = FOOTNOTE_RE.sub("", s)
    s = SUP_RE.sub("", s)
    s = s.replace("<br>", " ").replace("<br/>", " ").replace("<br />", " ")
    s = TAG_RE.sub("", s)
    s = html.unescape(s)
    s = WS_RE.sub(" ", s).strip()
    return s

def curl(url, tries=4):
    for i in range(tries):
        p = subprocess.run(["curl","-s","--compressed","--max-time","45","-H",f"User-Agent: {UA}",url],
                           capture_output=True, text=True)
        if p.returncode == 0 and p.stdout.strip():
            try: return json.loads(p.stdout)
            except json.JSONDecodeError: pass
        time.sleep(0.6*(i+1))
    return None

def curl_g(base, params, tries=4):
    args = ["curl","-s","--compressed","--max-time","45","-G",base,"-H",f"User-Agent: {UA}"]
    for k,v in params.items(): args += ["--data-urlencode", f"{k}={v}"]
    for i in range(tries):
        p = subprocess.run(args, capture_output=True, text=True)
        if p.returncode == 0 and p.stdout.strip():
            try: return json.loads(p.stdout)
            except json.JSONDecodeError: pass
        time.sleep(0.6*(i+1))
    return None

def get_shape(sefaria):
    d = curl(f"{API}/shape/{urllib.parse.quote(sefaria)}")
    if isinstance(d, list) and d:
        ch = d[0].get("chapters")
        if isinstance(ch, list) and all(isinstance(x,int) for x in ch):
            return ch
    return None

def book_languages(sefaria):
    """Return set of our target langs that actually exist for this book."""
    d = curl(f"{API}/texts/versions/{urllib.parse.quote(sefaria)}")
    have = {"he"}  # he/en always present for Tanakh
    have.add("en")
    if not isinstance(d, list): return have
    titles = {(v.get("versionTitle") or "") for v in d}
    for lang in ("de","ru"):
        want = VERSIONS[lang][1]
        if want in titles: have.add(lang)
    return have

def fetch_chapter(sefaria, ch, langs):
    """Return dict lang -> [verse,...] for one chapter."""
    ref = f"{sefaria}.{ch}"
    out = {}
    # he + en together
    d = curl_g(f"{API}/texts/{urllib.parse.quote(ref)}",
               {"context":"0", VERSIONS['he'][0]:VERSIONS['he'][1], VERSIONS['en'][0]:VERSIONS['en'][1]})
    if d:
        out["he"] = [clean(x) for x in (d.get("he") or [])]
        out["en"] = [clean(x) for x in (d.get("text") or [])]
    for lang in ("de","ru"):
        if lang not in langs: continue
        d2 = curl_g(f"{API}/texts/{urllib.parse.quote(ref)}", {"context":"0", "ven":VERSIONS[lang][1]})
        if d2:
            out[lang] = [clean(x) for x in (d2.get("text") or [])]
    return out

def fetch_book_text(book, force=False):
    slug, sefaria = book["slug"], book["sefaria"]
    path = os.path.join(TEXT_DIR, f"{slug}.json")
    if os.path.exists(path) and not force:
        try:
            existing = json.load(open(path, encoding="utf-8"))
            if existing.get("chapters") and existing.get("text"):
                return existing
        except Exception:
            pass
    shape = get_shape(sefaria)
    if not shape:
        print(f"  ! no shape for {sefaria}", file=sys.stderr); return None
    nch = len(shape)
    langs = book_languages(sefaria)
    text = {l: [None]*nch for l in ("he","en","de","ru")}
    def one(ci):
        return ci, fetch_chapter(sefaria, ci+1, langs)
    with cf.ThreadPoolExecutor(max_workers=4) as ex:
        for ci, chap in ex.map(one, range(nch)):
            for l in ("he","en","de","ru"):
                if l in chap: text[l][ci] = chap[l]
    # drop languages with no content
    present = [l for l in ("he","en","de","ru") if any(text[l])]
    text = {l: text[l] for l in present}
    verse_counts = [len(v) if v else 0 for v in (text.get("he") or text.get("en") or [[]]*nch)]
    rec = {
        "slug": slug, "sefaria": sefaria, "section": book["section"],
        "names": book["names"], "chapters": nch, "verseCounts": verse_counts,
        "langs": present, "attribution": {l: ATTRIB[l] for l in present},
        "text": text,
    }
    json.dump(rec, open(path,"w",encoding="utf-8"), ensure_ascii=False, separators=(",",":"))
    print(f"  ✓ {slug}: {nch} ch · langs={present}")
    return rec

def fetch_commentary_verse(sefaria, ch, vs):
    ref = f"{sefaria}.{ch}.{vs}"
    d = curl(f"{API}/links/{urllib.parse.quote(ref)}?with_text=1")
    if not isinstance(d, list): return []
    items = []
    for l in d:
        if l.get("category") != "Commentary": continue
        ct = l.get("collectiveTitle") or {}
        name_en = ct.get("en") or ""
        base = name_en.split(" on ")[0].strip()
        he_t = clean(l.get("he"))
        en_t = clean(l.get("text"))
        if not (he_t or en_t): continue
        items.append({"en": base, "he": ct.get("he") or "", "rank": COMM_RANK.get(base, 99),
                      "src": l.get("sourceRef",""), "textHe": he_t, "textEn": en_t})
    # keep known commentators first, cap per verse
    items.sort(key=lambda x: x["rank"])
    seen, kept = set(), []
    for it in items:
        key = (it["en"], it["src"])
        if key in seen: continue
        seen.add(key)
        kept.append({k: it[k] for k in ("en","he","src","textHe","textEn")})
        if len(kept) >= 8: break
    return kept

def fetch_book_commentary(book, force=False):
    slug, sefaria = book["slug"], book["sefaria"]
    chs = FEATURED.get(slug)
    if not chs: return None
    path = os.path.join(COMM_DIR, f"{slug}.json")
    if os.path.exists(path) and not force:
        return json.load(open(path, encoding="utf-8"))
    tpath = os.path.join(TEXT_DIR, f"{slug}.json")
    if not os.path.exists(tpath): return None
    tb = json.load(open(tpath, encoding="utf-8"))
    vcounts = tb["verseCounts"]
    chapters = {}
    for ch in chs:
        if ch < 1 or ch > len(vcounts): continue
        nv = vcounts[ch-1]
        def one(v): return v, fetch_commentary_verse(sefaria, ch, v)
        vmap = {}
        with cf.ThreadPoolExecutor(max_workers=5) as ex:
            for v, items in ex.map(one, range(1, nv+1)):
                if items: vmap[str(v)] = items
        if vmap: chapters[str(ch)] = vmap
    rec = {"slug": slug, "chapters": chapters}
    json.dump(rec, open(path,"w",encoding="utf-8"), ensure_ascii=False, separators=(",",":"))
    total = sum(len(v) for v in chapters.values())
    print(f"  ✓ commentary {slug}: {len(chapters)} ch / {total} verses")
    return rec

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--books", default="")
    ap.add_argument("--no-commentary", action="store_true")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    os.makedirs(TEXT_DIR, exist_ok=True); os.makedirs(COMM_DIR, exist_ok=True)
    sel = [b for b in BOOKS if (not args.books or b["slug"] in args.books.split(","))]

    print(f"== Text: {len(sel)} books ==")
    metas = []
    for b in sel:
        rec = fetch_book_text(b, force=args.force)
        if rec:
            metas.append({
                "slug": rec["slug"], "section": rec["section"], "names": rec["names"],
                "sefaria": rec["sefaria"], "chapters": rec["chapters"],
                "verseCounts": rec["verseCounts"], "langs": rec["langs"],
                "totalVerses": sum(rec["verseCounts"]),
                "hasCommentary": rec["slug"] in FEATURED,
            })

    if not args.no_commentary:
        print("== Commentary (featured) ==")
        for b in sel:
            try: fetch_book_commentary(b, force=args.force)
            except Exception as e: print(f"  ! commentary {b['slug']}: {e}", file=sys.stderr)

    # master metadata — keep canonical order; merge with any pre-existing (for partial runs)
    master_path = os.path.join(DATA, "books.json")
    by_slug = {m["slug"]: m for m in metas}
    if os.path.exists(master_path) and (args.books):
        try:
            prev = json.load(open(master_path, encoding="utf-8"))
            for m in prev.get("books", []):
                by_slug.setdefault(m["slug"], m)
        except Exception: pass
    ordered = [by_slug[b["slug"]] for b in BOOKS if b["slug"] in by_slug]
    master = {
        "generated": True,
        "sections": {"neviim":{"en":"Prophets","ru":"Невиим (Пророки)","de":"Propheten","he":"נְבִיאִים"},
                     "ketuvim":{"en":"Writings","ru":"Ктувим (Писания)","de":"Schriften","he":"כְּתוּבִים"}},
        "attribution": ATTRIB,
        "books": ordered,
        "totals": {"books": len(ordered),
                   "chapters": sum(m["chapters"] for m in ordered),
                   "verses": sum(m["totalVerses"] for m in ordered)},
    }
    json.dump(master, open(master_path,"w",encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"\n== books.json: {master['totals']} ==")

if __name__ == "__main__":
    main()
