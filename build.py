"""Build the single-file cheat sheet from the source files.

Usage:  python build.py            (writes dist/Crawler_Cheat_Sheet.html)
        python build.py out.html   (writes to a path you choose)

No third-party packages needed. Python 3.8 or newer.
"""
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / "src"


def read(name):
    return (SRC / name).read_text(encoding="utf-8")


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
    out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "dist" / "Crawler_Cheat_Sheet.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(build(), encoding="utf-8")
    print("Wrote", out, "(" + format(out.stat().st_size, ",") + " bytes)")
