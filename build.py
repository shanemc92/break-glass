"""Assemble index.html from the template and src/. Run: python3 build.py"""
import re, pathlib
root = pathlib.Path(__file__).parent
t = (root / "template.html").read_text()
src = lambda f: (root / "src" / f).read_text()

t = t.replace("<title>tool-name</title>", "<title>break-glass</title>")
t = t.replace('<div class="titlebar-title">tool-name</div>', '<div class="titlebar-title">break-glass</div>')
t = t.replace("   tool-name\n", "   break-glass\n", 1)
t = t.replace("    section[hidden] { display: block !important; }\n", "")
t = t.replace("</style>", src("extra.css") + src("theme.css") + "</style>", 1)

a = t.index('    <div class="tabs" role="tablist">')
b = t.index('        <div class="note">tool-name v1.0.0')
t = t[:a] + src("markup.html") + t[b:]
t = t.replace('<div class="note">tool-name v1.0.0 &middot;', '<div class="note noprint">break-glass v1.4.0 &middot;')

t = t.replace('const APP = { id: "tool-name", version: "1.0.0", schema: 1 };',
              'const APP = { id: "break-glass", version: "1.4.0", schema: 1 };')
t = t.replace('const TABS = [["work", "pane-work"], ["about", "pane-about"]];',
              'const TABS = [["play", "pane-play"], ["custom", "pane-custom"], ["debrief", "pane-debrief"], ["history", "pane-history"], ["about", "pane-about"]];')
# drop fname (depends on template meta) and everything from csv onwards, keep helpers
t = re.sub(r"const fname = .*?\n", "", t)
a = t.index("/* ---------- csv ---------- */")
b = t.index("</script>")
code = "\n".join(src(f) for f in ["data_core.js", "data_injects.js", "data_scen1.js", "data_scen2.js", "data_scen3.js", "data_scen4.js", "data_scen5.js", "data_scen6.js", "engine.js", "ui.js"])
t = t[:a] + code + "\n" + t[b:]
(root / "index.html").write_text(t)
print("index.html", len(t.splitlines()), "lines,", len(t) // 1024, "KB")
