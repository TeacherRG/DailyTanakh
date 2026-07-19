#!/usr/bin/env python3
"""
Merge Russian commentary translations (produced by the translation workflow as
partial JSON files) back into data/commentary/<slug>.json.

Partial format (one file per task), written to <scratchpad>/rucomm/<slug>__<id>.json:
  { "slug": "...", "chapters": { "<ch>": { "<v>": [ {"textRu": "...", "titleRu": "..."}, ... ] } } }
The per-verse array is positional: it lines up 1:1 with that verse's item list in
the commentary file (same length & order). Extra/short entries are skipped safely.

Usage: python3 scripts/merge_ru_commentary.py <partials_dir>
"""
import glob, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COMM_DIR = os.path.join(ROOT, "data", "commentary")

def main():
    pdir = sys.argv[1] if len(sys.argv) > 1 else None
    if not pdir or not os.path.isdir(pdir):
        raise SystemExit("usage: merge_ru_commentary.py <partials_dir>")
    partials = sorted(glob.glob(os.path.join(pdir, "*.json")))
    by_slug = {}
    for p in partials:
        try:
            d = json.load(open(p, encoding="utf-8"))
        except Exception as e:
            print(f"  ! bad partial {os.path.basename(p)}: {e}"); continue
        by_slug.setdefault(d["slug"], []).append(d)

    total_applied = 0
    for slug, parts in sorted(by_slug.items()):
        cpath = os.path.join(COMM_DIR, f"{slug}.json")
        if not os.path.exists(cpath):
            print(f"  ! no commentary file for {slug}"); continue
        comm = json.load(open(cpath, encoding="utf-8"))
        applied = 0
        for part in parts:
            for ch, vmap in part.get("chapters", {}).items():
                tgt_ch = comm["chapters"].get(str(ch))
                if not tgt_ch:
                    continue
                for v, arr in vmap.items():
                    items = tgt_ch.get(str(v))
                    if not items:
                        continue
                    for i, tr in enumerate(arr):
                        if i >= len(items) or not isinstance(tr, dict):
                            continue
                        ru = (tr.get("textRu") or "").strip()
                        if ru:
                            items[i]["textRu"] = ru
                            applied += 1
                        tru = (tr.get("titleRu") or "").strip()
                        if tru:
                            items[i]["titleRu"] = tru
        json.dump(comm, open(cpath, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        total_applied += applied
        print(f"  ✓ {slug:15} applied {applied} ru translations")
    print(f"\nTotal ru translations applied: {total_applied}")

if __name__ == "__main__":
    main()
