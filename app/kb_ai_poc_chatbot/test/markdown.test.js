// Run from app/kb_ai_poc_chatbot: npm test
const { test } = require("node:test");
const assert = require("node:assert/strict");

// load the UI5 module through a stub sap.ui.define
let markdown;
globalThis.sap = { ui: { define: (aDeps, fnFactory) => { markdown = fnFactory(); } } };
require("../webapp/model/markdown.js");

test("GFM table: inline formatting, <br> in cells, missing cells", () => {
    assert.equal(
        markdown.toHtml("Resorts:\n| Name | Cost |\n|:--|--:|\n| **A** | 1<br>2 |\n| B |"),
        "<p>Resorts:</p>"
        + "<table><thead><tr><th>Name</th><th>Cost</th></tr></thead><tbody>"
        + "<tr><td><strong>A</strong></td><td>1<br>2</td></tr>"
        + "<tr><td>B</td><td></td></tr>"
        + "</tbody></table>"
    );
});

test("numbered list with nested bullets continues across blank lines", () => {
    assert.equal(
        markdown.toHtml("1. **A**\n   - x\n   - y\n\n2. B\n   - z\n\nDone."),
        "<ol start=\"1\"><li><strong>A</strong><ul><li>x</li><li>y</li></ul></li>"
        + "<li>B<ul><li>z</li></ul></li></ol><p>Done.</p>"
    );
});

test("escapes raw HTML except <br> and formats inline markup", () => {
    assert.equal(
        markdown.toHtml("<script>x</script> & **b** *i* `a*b*`<br/>"
            + "[docs](https://x.com/a_b?q=1&r=2) [Foo](https://w.org/Foo_(bar))"),
        "<p>&lt;script&gt;x&lt;/script&gt; &amp; <strong>b</strong> <em>i</em> <code>a*b*</code><br>"
        + "<a href=\"https://x.com/a_b?q=1&amp;r=2\" target=\"_blank\" rel=\"noopener noreferrer\">docs</a> "
        + "<a href=\"https://w.org/Foo_(bar)\" target=\"_blank\" rel=\"noopener noreferrer\">Foo</a></p>"
    );
});

test("headings and line breaks", () => {
    assert.equal(
        markdown.toHtml("### Title\nline 1\nline 2"),
        "<h3>Title</h3><p>line 1<br>line 2</p>"
    );
});
