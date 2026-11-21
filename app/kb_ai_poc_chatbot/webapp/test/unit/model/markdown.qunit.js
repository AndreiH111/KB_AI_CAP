/* global QUnit */
sap.ui.define([
    "com/takeda/kbaipocchatbot/model/markdown"
], function (markdown) {
    "use strict";

    QUnit.module("model/markdown");

    QUnit.test("splits text and GFM tables into blocks", function (assert) {
        assert.deepEqual(
            markdown.toBlocks("Resorts:\n| Name | Cost |\n|:--|--:|\n| **A** | 1<br>2 |\n| B |\n\nDone."),
            [
                { html: "<p>Resorts:</p>" },
                { columns: ["Name", "Cost"], rows: [["<strong>A</strong>", "1<br>2"], ["B", ""]] },
                { html: "<p>Done.</p>" }
            ]
        );
    });

    QUnit.test("keeps a numbered list with nested bullets across blank lines", function (assert) {
        assert.deepEqual(markdown.toBlocks("1. **A**\n   - x\n   - y\n\n2. B\n   - z"), [{
            html: "<ol><li><strong>A</strong><ul><li>x</li><li>y</li></ul></li><li>B<ul><li>z</li></ul></li></ol>"
        }]);
    });

    QUnit.test("escapes raw HTML except <br> and formats inline markup", function (assert) {
        assert.deepEqual(
            markdown.toBlocks("<script>x</script> & **b** *i* `a*b*`<br/>"
                + "[docs](https://x.com/a_b?q=1&r=2) [Foo](https://w.org/Foo_(bar))"),
            [{
                html: "<p>&lt;script&gt;x&lt;/script&gt; &amp; <strong>b</strong> <em>i</em> <code>a*b*</code><br>"
                    + "<a href=\"https://x.com/a_b?q=1&amp;r=2\">docs</a> <a href=\"https://w.org/Foo_(bar)\">Foo</a></p>"
            }]
        );
    });

    QUnit.test("renders headings and keeps single line breaks", function (assert) {
        assert.deepEqual(markdown.toBlocks("### Title\nline 1\nline 2"), [{
            html: "<h3>Title</h3><p>line 1<br>line 2</p>"
        }]);
    });
});
