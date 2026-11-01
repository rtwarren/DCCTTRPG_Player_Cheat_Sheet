"""Build the single-file cheat sheet from the source files.

Usage:  python build.py            (writes dist/Crawler_Cheat_Sheet_v<version>.html)
        python build.py out.html   (writes to a path you choose)

The version comes from the first "## 1.2.3" heading in CHANGELOG.md, so add the
new version's section there before building. A default build removes older
Crawler_Cheat_Sheet_v*.html files from dist/; git keeps them in its history.

No third-party packages needed. Python 3.8 or newer.
"""
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / "src"
DIST = HERE / "dist"
NAME = "Crawler_Cheat_Sheet"


def read(name):
    return (SRC / name).read_text(encoding="utf-8")


def version():
    log = (HERE / "CHANGELOG.md").read_text(encoding="utf-8")
    m = re.search(r"^##\s+v?(\d+\.\d+\.\d+)\b", log, re.M)
    if not m:
        sys.exit('CHANGELOG.md needs a version heading like "## 1.2.3 (2026-11-01)"')
    return m.group(1)


def build():
    css = read("styles.css")
    script = read("main.js").replace("/*__PDFENGINE__*/\n", read("pdf-engine.js"), 1)
    html = read("index.html")
    for marker, value in (("/*__STYLES__*/", css), ("/*__SCRIPT__*/", script)):
        if marker not in html:
            sys.exit("Missing " + marker + " in src/index.html")
        html = html.replace(marker, value, 1)
    return html


if __name__ == "__main__":
    if len(sys.argv) > 1:
        out = pathlib.Path(sys.argv[1])
    else:
        out = DIST / (NAME + "_v" + version() + ".html")
        DIST.mkdir(parents=True, exist_ok=True)
        for old in list(DIST.glob(NAME + "_v*.html")) + [DIST / (NAME + ".html")]:
            if old.exists() and old.resolve() != out.resolve():
                old.unlink()
                print("Removed", old.name)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(build(), encoding="utf-8")
    print("Wrote", out, "(" + format(out.stat().st_size, ",") + " bytes)")
