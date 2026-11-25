#!/usr/bin/env python3
"""
Paragraph-level access to a .docx for the AI report update (Word export of inspections).

  docx-paragraphs.py extract <in.docx>                       → JSON list of paragraphs on stdout
  docx-paragraphs.py apply <in.docx> <edits.json> <out.docx> → applies edits, prints a JSON summary

Paragraphs are numbered across document.xml, header*.xml and footer*.xml. Only "leaf"
paragraphs (no nested paragraphs, e.g. the content of text boxes) are units. Paragraphs with
pictures, fields or objects are marked fixed and never changed.

Edit: {"id": int, "action": "replace"|"delete"|"insert_after"|"swap", "text": str, "old": str, "red": bool}
- replace: paragraph text becomes `text` (formatting of the first text run is kept)
- delete: paragraph is removed (inside a table cell it is emptied instead – a cell needs a paragraph)
- insert_after: new paragraph with the same formatting after paragraph `id`
- swap: replaces `old` by `text` inside one text run (formatting and fields stay; allowed
  in fixed paragraphs, e.g. the year in a header with a page number field)
"\n" in text becomes a line break, "\t" a tab.
"""
import json
import re
import sys
import zipfile
from html import unescape

RED = "CC0000"
PARTS_RE = re.compile(r"^word/(document|header\d*|footer\d*)\.xml$")
TAG_RE = re.compile(r"<(/?)(w:p|w:tbl|w:tr|w:tc)(?=[\s>/])([^>]*?)(/?)>")
TEXT_RE = re.compile(r"<w:t(?:\s[^>]*)?>([^<]*)</w:t>|<w:tab/>|<w:br(?:\s[^>]*)?/>|<w:cr/>")
FIXED_RE = re.compile(r"<w:drawing|<w:pict|<w:fldChar|<w:instrText|<w:fldSimple|<w:object|<mc:AlternateContent")
RUN_RE = re.compile(r"<w:r(?:\s[^>]*)?>(.*?)</w:r>", re.S)
RPR_RE = re.compile(r"<w:rPr>.*?</w:rPr>|<w:rPr/>", re.S)
PPR_RE = re.compile(r"<w:pPr>.*?</w:pPr>|<w:pPr/>", re.S)


def part_order(name):
    # document first, then headers, then footers
    kind = 0 if "document" in name else 1 if "header" in name else 2
    return (kind, name)


def scan(xml):
    """Leaf paragraphs of one XML part: list of dicts with span and table position."""
    out = []
    p_stack = []  # [start, has_child]
    tbl_stack = []  # [table_no, row, cell]
    table_count = 0
    for m in TAG_RE.finditer(xml):
        closing, tag, _, selfclose = m.group(1), m.group(2), m.group(3), m.group(4)
        if tag == "w:p":
            if selfclose:
                continue
            if not closing:
                if p_stack:
                    p_stack[-1][1] = True
                p_stack.append([m.start(), False])
            elif p_stack:
                start, has_child = p_stack.pop()
                if not has_child:
                    pos = None
                    if tbl_stack:
                        t = tbl_stack[-1]
                        pos = {"table": t[0], "row": t[1], "cell": t[2], "key": "/".join(f"{x[0]}.{x[1]}.{x[2]}" for x in tbl_stack)}
                    out.append({"start": start, "end": m.end(), "pos": pos})
        elif tag == "w:tbl" and not selfclose:
            if not closing:
                table_count += 1
                tbl_stack.append([table_count, 0, 0])
            elif tbl_stack:
                tbl_stack.pop()
        elif tag == "w:tr" and not closing and not selfclose and tbl_stack:
            tbl_stack[-1][1] += 1
            tbl_stack[-1][2] = 0
        elif tag == "w:tc" and not closing and not selfclose and tbl_stack:
            tbl_stack[-1][2] += 1
    out.sort(key=lambda p: p["start"])
    return out


def para_text(pxml):
    parts = []
    for m in TEXT_RE.finditer(pxml):
        tok = m.group(0)
        if tok.startswith("<w:tab"):
            parts.append("\t")
        elif tok.startswith("<w:br") or tok.startswith("<w:cr"):
            parts.append("\n")
        else:
            parts.append(unescape(m.group(1)))
    return "".join(parts)


def load(path):
    z = zipfile.ZipFile(path)
    parts = sorted([n for n in z.namelist() if PARTS_RE.match(n)], key=part_order)
    xmls = {n: z.read(n).decode("utf-8") for n in parts}
    paras = []
    for name in parts:
        for p in scan(xmls[name]):
            pxml = xmls[name][p["start"]:p["end"]]
            paras.append({
                "id": len(paras),
                "part": name.split("/")[-1].replace(".xml", ""),
                "partName": name,
                "start": p["start"],
                "end": p["end"],
                "pos": p["pos"],
                "text": para_text(pxml),
                "fixed": bool(FIXED_RE.search(pxml)),
            })
    return z, xmls, paras


def esc(text):
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def set_red(rpr):
    if not rpr or rpr == "<w:rPr/>":
        return f'<w:rPr><w:color w:val="{RED}"/></w:rPr>'
    rpr = re.sub(r"<w:color\s[^>]*/>", "", rpr)
    return rpr.replace("<w:rPr>", f'<w:rPr><w:color w:val="{RED}"/>', 1)


def build_runs(text, rpr):
    runs = []
    for i, line in enumerate(text.split("\n")):
        if i > 0:
            runs.append(f"<w:r>{rpr}<w:br/></w:r>")
        for j, chunk in enumerate(line.split("\t")):
            if j > 0:
                runs.append(f"<w:r>{rpr}<w:tab/></w:r>")
            if chunk:
                runs.append(f'<w:r>{rpr}<w:t xml:space="preserve">{esc(chunk)}</w:t></w:r>')
    return "".join(runs)


def rebuild(pxml, text, red):
    """Same paragraph (opening tag + properties), new text in the format of the first text run."""
    open_tag = re.match(r"<w:p(?:\s[^>]*)?>", pxml).group(0)
    ppr_m = PPR_RE.search(pxml)
    ppr = ppr_m.group(0) if ppr_m else ""
    rpr = ""
    for rm in RUN_RE.finditer(pxml):
        if "<w:t" in rm.group(1):
            r = RPR_RE.search(rm.group(1))
            rpr = r.group(0) if r else ""
            break
    if red:
        rpr = set_red(rpr)
    return f"{open_tag}{ppr}{build_runs(text, rpr)}</w:p>"


def swap_text(pxml, old, new, red):
    """Replace `old` in the paragraph text, also across several text elements/runs. Only <w:t>
    contents change, so fields, tabs and pictures stay. Red marking is applied when the new
    text lands in a run that holds a single text element. Returns None if `old` is missing."""
    old = old.strip("\n")
    if not old:
        return None
    elems = [(m.start(), m.end(), unescape(m.group(1)))
             for m in re.finditer(r"<w:t(?:\s[^>]*)?>([^<]*)</w:t>", pxml)]
    full = "".join(e[2] for e in elems)
    idx = full.find(old)
    if idx < 0:
        return None
    end_idx = idx + len(old)
    wt = lambda txt: f'<w:t xml:space="preserve">{esc(txt)}</w:t>'
    pieces, offset, first = [], 0, None  # first = (elem_start, prefix_len)
    for start, end, text in elems:
        a, b = offset, offset + len(text)
        offset = b
        if b <= idx or a >= end_idx:
            continue
        lo, hi = max(idx, a) - a, min(end_idx, b) - a
        if first is None:
            first = (start, lo)
            pieces.append((start, end, wt(text[:lo] + new + (text[hi:] if b >= end_idx else ""))))
        else:
            pieces.append((start, end, wt(text[hi:])))
    for start, end, rep in reversed(pieces):
        pxml = pxml[:start] + rep + pxml[end:]
    if not red:
        return pxml
    # split the run of the first element into prefix | new (red) | rest
    run_re = r"<w:r(?:\s[^>]*)?>\s*(<w:rPr>.*?</w:rPr>|<w:rPr/>)?\s*<w:t(?:\s[^>]*)?>([^<]*)</w:t>\s*</w:r>"
    for m in re.finditer(run_re, pxml, re.S):
        if m.start() < first[0] < m.end():
            rpr, txt = m.group(1) or "", unescape(m.group(2))
            lo = first[1]
            tt = lambda x, rp: f'<w:r>{rp}<w:t xml:space="preserve">{esc(x)}</w:t></w:r>' if x else ""
            rep = tt(txt[:lo], rpr) + tt(txt[lo:lo + len(new)], set_red(rpr)) + tt(txt[lo + len(new):], rpr)
            return pxml[:m.start()] + rep + pxml[m.end():]
    return pxml


def strip_ids(pxml):
    # A copied paragraph must not reuse paraId/textId
    return re.sub(r'\sw14:(paraId|textId)="[^"]*"', "", pxml, count=2)


def apply(src, edits_path, dst):
    z, xmls, paras = load(src)
    edits = json.load(open(edits_path, encoding="utf-8"))
    by_id = {p["id"]: p for p in paras}
    applied, skipped = 0, []
    # per part: list of (start, end, replacement)
    changes = {}
    cell_left = {}
    for p in paras:
        if p["pos"]:
            k = (p["partName"], p["pos"]["key"])
            cell_left[k] = cell_left.get(k, 0) + 1
    grouped = {}
    for e in edits:
        grouped.setdefault(e["id"], []).append(e)
    for pid, es in grouped.items():
        p = by_id.get(pid)
        if p is None:
            skipped.extend({"id": pid, "reason": "unbekannter Absatz"} for _ in es)
            continue
        xml = xmls[p["partName"]]
        pxml = xml[p["start"]:p["end"]]
        current = pxml
        after = []
        for e in es:
            action = e.get("action")
            text = e.get("text") or ""
            red = bool(e.get("red", True))
            if p["fixed"] and action != "swap":
                skipped.append({"id": pid, "reason": "Absatz mit Bild/Feld – nur Textstelle tauschen möglich"})
                continue
            if action == "swap":
                swapped = swap_text(current, e.get("old") or "", text, red) if e.get("old") else None
                if swapped is None:
                    skipped.append({"id": pid, "reason": f"Textstelle „{e.get('old')}“ nicht gefunden"})
                    continue
                current = swapped
            elif action == "replace":
                current = rebuild(pxml, text, red)
            elif action == "delete":
                key = (p["partName"], p["pos"]["key"]) if p["pos"] else None
                # a table cell must keep one paragraph: empty the last one instead of removing it
                if key and cell_left[key] <= 1:
                    current = rebuild(pxml, "", False)
                else:
                    current = ""
                    if key:
                        cell_left[key] -= 1
            elif action == "insert_after":
                after.append(strip_ids(rebuild(pxml, text, red)))
            else:
                skipped.append({"id": pid, "reason": f"unbekannte Aktion {action}"})
                continue
            applied += 1
        changes.setdefault(p["partName"], []).append((p["start"], p["end"], current + "".join(after)))

    for name, chs in changes.items():
        xml = xmls[name]
        for start, end, rep in sorted(chs, key=lambda c: c[0], reverse=True):
            xml = xml[:start] + rep + xml[end:]
        xmls[name] = xml

    with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as out:
        for item in z.infolist():
            data = xmls[item.filename].encode("utf-8") if item.filename in xmls else z.read(item.filename)
            out.writestr(item, data)
    print(json.dumps({"applied": applied, "skipped": skipped}, ensure_ascii=False))


def main():
    if len(sys.argv) == 3 and sys.argv[1] == "extract":
        _, _, paras = load(sys.argv[2])
        print(json.dumps(
            [{k: p[k] for k in ("id", "part", "pos", "text", "fixed")} for p in paras],
            ensure_ascii=False,
        ))
    elif len(sys.argv) == 5 and sys.argv[1] == "apply":
        apply(sys.argv[2], sys.argv[3], sys.argv[4])
    else:
        print(__doc__, file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
