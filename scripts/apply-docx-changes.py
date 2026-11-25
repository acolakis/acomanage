#!/usr/bin/env python3
"""
Apply text replacements to a .docx file, with optional red color for changed values.
Handles split runs (text fragmented across multiple <w:r> elements).

Usage: python3 apply-docx-changes.py <input.docx> <replacements.json> <output.docx>

replacements.json format:
[
  {"old": "original text", "new": "new text", "changed": true},
  ...
]
"""

import sys
import json
import zipfile
import re
import shutil
import os
import copy
from io import BytesIO

RED_COLOR = "CC0000"

DOCX_PARTS = [
    "word/document.xml",
    "word/header1.xml",
    "word/header2.xml",
    "word/header3.xml",
    "word/footer1.xml",
    "word/footer2.xml",
    "word/footer3.xml",
]


def get_run_rpr(run_xml):
    """Extract the <w:rPr>...</w:rPr> content from a run, or empty string."""
    m = re.search(r'<w:rPr>([\s\S]*?)</w:rPr>', run_xml)
    return m.group(0) if m else ""


def set_run_color(rpr_xml, color):
    """Add or replace <w:color> in a <w:rPr> block."""
    if not rpr_xml:
        return f'<w:rPr><w:color w:val="{color}"/></w:rPr>'
    # Remove existing color
    rpr_xml = re.sub(r'<w:color\s[^/]*/>', '', rpr_xml)
    # Insert before </w:rPr>
    return rpr_xml.replace('</w:rPr>', f'<w:color w:val="{color}"/></w:rPr>')


def build_run(rpr_xml, text, preserve_space=True):
    """Build a <w:r> XML string with the given rPr and text."""
    space_attr = ' xml:space="preserve"' if preserve_space and (' ' in text or text.startswith(' ') or text.endswith(' ')) else ''
    t_tag = f'<w:t{space_attr}>{xml_escape(text)}</w:t>'
    if rpr_xml:
        return f'<w:r>{rpr_xml}{t_tag}</w:r>'
    else:
        return f'<w:r>{t_tag}</w:r>'


def xml_escape(text):
    """Escape special XML characters."""
    return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def xml_unescape(text):
    """Unescape XML entities."""
    return text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')


def process_paragraph(para_xml, old_text, new_text, changed):
    """
    Replace old_text with new_text in a paragraph.
    If changed=True, colors new_text red.
    Handles split runs.
    Returns modified paragraph XML or None if not modified.
    """
    # Extract text from all <w:t> tags to check if paragraph contains our target
    all_t_matches = list(re.finditer(r'<w:t[^>]*>([\s\S]*?)</w:t>', para_xml))
    full_text = ''.join(xml_unescape(m.group(1)) for m in all_t_matches)

    if old_text not in full_text:
        return None

    # Find all runs in this paragraph
    run_matches = list(re.finditer(r'<w:r\b[\s\S]*?</w:r>', para_xml))

    if not run_matches:
        return None

    # Build list of runs with their text positions
    runs_info = []
    pos = 0
    for rm in run_matches:
        run_xml = rm.group(0)
        t_match = re.search(r'<w:t[^>]*>([\s\S]*?)</w:t>', run_xml)
        run_text = xml_unescape(t_match.group(1)) if t_match else ""
        runs_info.append({
            "xml": run_xml,
            "text": run_text,
            "rpr": get_run_rpr(run_xml),
            "start": pos,
            "end": pos + len(run_text),
        })
        pos += len(run_text)

    # Find where old_text starts in the concatenated text
    start_idx = full_text.index(old_text)
    end_idx = start_idx + len(old_text)

    # Find which runs are involved
    first_run = None
    last_run = None
    for i, ri in enumerate(runs_info):
        if ri["start"] <= start_idx < ri["end"]:
            first_run = i
        if ri["start"] < end_idx <= ri["end"]:
            last_run = i
            break

    if first_run is None:
        # Fallback: simple string replacement on the XML
        escaped_old = xml_escape(old_text)
        if escaped_old in para_xml:
            if changed:
                # Wrap the new text in a colored run inline
                rpr = ""
                # Try to get rPr from surrounding context
                new_rpr = set_run_color(rpr, RED_COLOR)
                new_run = build_run(new_rpr, new_text)
                return para_xml.replace(escaped_old, xml_escape(new_text), 1)
            else:
                return para_xml.replace(escaped_old, xml_escape(new_text), 1)
        return None

    if last_run is None:
        last_run = len(runs_info) - 1

    # Use the rPr from the first involved run
    base_rpr = runs_info[first_run]["rpr"]
    red_rpr = set_run_color(base_rpr, RED_COLOR)

    # Text before the old_text (within first run)
    before_text = runs_info[first_run]["text"][:start_idx - runs_info[first_run]["start"]]
    # Text after the old_text (within last run)
    after_text = runs_info[last_run]["text"][end_idx - runs_info[last_run]["start"]:]

    # Build replacement runs
    new_runs = []
    if before_text:
        new_runs.append(build_run(base_rpr, before_text))

    if changed:
        new_runs.append(build_run(red_rpr, new_text))
    else:
        new_runs.append(build_run(base_rpr, new_text))

    if after_text:
        new_runs.append(build_run(base_rpr, after_text))

    # Build the replacement string
    replacement_xml = ''.join(new_runs)

    # Replace the original runs (from first_run to last_run) with new_runs
    original_span = ''.join(ri["xml"] for ri in runs_info[first_run:last_run + 1])

    if original_span in para_xml:
        return para_xml.replace(original_span, replacement_xml, 1)

    return None


def process_xml_part(xml_content, replacements):
    """Apply all replacements to an XML string."""
    # Sort replacements by length of old text (longest first) to avoid partial matches
    sorted_replacements = sorted(replacements, key=lambda r: len(r["old"]), reverse=True)

    for rep in sorted_replacements:
        old_text = rep["old"]
        new_text = rep["new"]
        changed = rep.get("changed", False)

        if not old_text or old_text == new_text:
            continue

        # Process paragraph by paragraph
        para_regex = re.compile(r'<w:p\b[\s\S]*?</w:p>', re.DOTALL)

        def replace_in_para(m):
            para_xml = m.group(0)
            result = process_paragraph(para_xml, old_text, new_text, changed)
            return result if result is not None else para_xml

        xml_content = para_regex.sub(replace_in_para, xml_content)

    return xml_content


def apply_changes(input_path, replacements_path, output_path):
    """Main function: apply replacements to docx file."""
    # Load replacements
    with open(replacements_path, 'r', encoding='utf-8') as f:
        replacements = json.load(f)

    # Filter out empty or no-op replacements
    replacements = [r for r in replacements if r.get("old") and r["old"] != r.get("new", "")]

    if not replacements:
        shutil.copy(input_path, output_path)
        return

    # Open the docx (zip) and process XML parts
    with zipfile.ZipFile(input_path, 'r') as zin:
        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                content = zin.read(item.filename)

                if item.filename in DOCX_PARTS:
                    try:
                        xml_str = content.decode('utf-8')
                        xml_str = process_xml_part(xml_str, replacements)
                        content = xml_str.encode('utf-8')
                    except Exception as e:
                        pass  # Keep original if processing fails

                zout.writestr(item, content)

    with open(output_path, 'wb') as f:
        f.write(zip_buffer.getvalue())


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(f"Usage: {sys.argv[0]} <input.docx> <replacements.json> <output.docx>", file=sys.stderr)
        sys.exit(1)

    input_docx = sys.argv[1]
    replacements_json = sys.argv[2]
    output_docx = sys.argv[3]

    try:
        apply_changes(input_docx, replacements_json, output_docx)
        print(f"OK: {output_docx}")
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
