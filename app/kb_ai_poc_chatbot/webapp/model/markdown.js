sap.ui.define([], function () {
    "use strict";

    // Splits the Markdown that LLM answers use into blocks for native controls:
    // { html } for sap.m.FormattedText (paragraphs, headings, nested lists, inline bold/italic/code/links)
    // and { columns, rows } for sap.m.Table, whose cells hold inline HTML. Raw HTML is escaped except <br>.

    const LIST_ITEM = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
    const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/;
    const TABLE_SEPARATOR = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/;
    const INDENTED = /^\s+\S/;
    const KEPT = /<(\d+)>/g; // escaped text has no raw "<", so <n> placeholders are unambiguous

    function escapeHtml(sText) {
        return sText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function emphasis(sHtml) {
        return sHtml
            .replace(/\*\*(\S(?:.*?\S)?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(\S(?:.*?\S)?)\*/g, "<em>$1</em>");
    }

    function inline(sText) {
        // code spans, <br> and links are set aside first so emphasis can't alter their contents
        const aKept = [];
        const keep = (sHtml) => "<" + (aKept.push(sHtml) - 1) + ">";
        const restore = (sHtml) => sHtml.replace(KEPT, (sMatch, i) => aKept[i]);

        return restore(emphasis(escapeHtml(sText)
            .replace(/`([^`]+)`/g, (sMatch, sCode) => keep("<code>" + sCode + "</code>"))
            .replace(/&lt;br\s*\/?&gt;/gi, () => keep("<br>"))
            .replace(/\[([^\]]+)\]\(((?:[^()\s"]|\([^()\s"]*\))+)\)/g,
                (sMatch, sLabel, sUrl) => keep("<a href=\"" + sUrl + "\">" + restore(emphasis(sLabel)) + "</a>"))));
    }

    function splitRow(sLine) {
        return sLine.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((sCell) => sCell.trim());
    }

    function isTableStart(aLines, i) {
        return aLines[i].includes("|") && i + 1 < aLines.length
            && aLines[i + 1].includes("|") && TABLE_SEPARATOR.test(aLines[i + 1]);
    }

    function startsBlock(aLines, i) {
        const sLine = aLines[i];
        return !sLine.trim() || HEADING.test(sLine) || LIST_ITEM.test(sLine) || isTableStart(aLines, i);
    }

    function table(aLines, iStart, aBlocks) {
        const aColumns = splitRow(aLines[iStart]);
        const aRows = [];
        let i = iStart + 2;

        for (; i < aLines.length && aLines[i].includes("|") && aLines[i].trim(); i++) {
            const aCells = splitRow(aLines[i]);
            aRows.push(aColumns.map((sColumn, k) => inline(aCells[k] || ""))); // padded or cut to the header, as in GFM
        }
        aBlocks.push({ columns: aColumns.map((sColumn) => inline(sColumn)), rows: aRows });
        return i;
    }

    function list(aLines, iStart, aHtml) {
        const aOpen = []; // lists currently open (indent + tag), innermost last
        let i = iStart;

        while (i < aLines.length) {
            const sLine = aLines[i];

            if (!sLine.trim()) {
                // a blank line ends the list unless another item or indented text follows
                let iNext = i + 1;
                while (iNext < aLines.length && !aLines[iNext].trim()) {
                    iNext++;
                }
                if (iNext === aLines.length || !(LIST_ITEM.test(aLines[iNext]) || INDENTED.test(aLines[iNext]))) {
                    break;
                }
                i = iNext;
                continue;
            }

            const aItem = LIST_ITEM.exec(sLine);
            if (!aItem) {
                if (!INDENTED.test(sLine)) {
                    break;
                }
                aHtml.push("<br>" + inline(sLine.trim())); // continuation of the current item
                i++;
                continue;
            }

            const iIndent = aItem[1].replace(/\t/g, "    ").length;
            const sTag = /\d/.test(aItem[2]) ? "ol" : "ul";
            let oTop = aOpen[aOpen.length - 1];

            // close deeper lists, and a same-level list of the other type
            while (oTop && (iIndent < oTop.indent || (iIndent === oTop.indent && sTag !== oTop.tag))) {
                aHtml.push("</li></" + aOpen.pop().tag + ">");
                oTop = aOpen[aOpen.length - 1];
            }
            if (oTop && iIndent === oTop.indent) {
                aHtml.push("</li>");
            } else {
                aHtml.push("<" + sTag + ">");
                aOpen.push({ indent: iIndent, tag: sTag });
            }
            aHtml.push("<li>" + inline(aItem[3]));
            i++;
        }

        while (aOpen.length) {
            aHtml.push("</li></" + aOpen.pop().tag + ">");
        }
        return i;
    }

    return {
        toBlocks: function (sMarkdown) {
            const aLines = String(sMarkdown || "").replace(/\r\n?/g, "\n").split("\n");
            const aBlocks = [];
            let aHtml = []; // text since the last table, emitted as one FormattedText block
            let i = 0;

            const flush = () => {
                if (aHtml.length) {
                    aBlocks.push({ html: aHtml.join("") });
                    aHtml = [];
                }
            };

            while (i < aLines.length) {
                const sLine = aLines[i];
                const aHeading = HEADING.exec(sLine);

                if (!sLine.trim()) {
                    i++;
                } else if (aHeading) {
                    const iLevel = aHeading[1].length;
                    aHtml.push("<h" + iLevel + ">" + inline(aHeading[2]) + "</h" + iLevel + ">");
                    i++;
                } else if (isTableStart(aLines, i)) {
                    flush();
                    i = table(aLines, i, aBlocks);
                } else if (LIST_ITEM.test(sLine)) {
                    i = list(aLines, i, aHtml);
                } else {
                    const aParagraph = [];
                    do {
                        aParagraph.push(inline(aLines[i].trim()));
                        i++;
                    } while (i < aLines.length && !startsBlock(aLines, i));
                    aHtml.push("<p>" + aParagraph.join("<br>") + "</p>");
                }
            }
            flush();
            return aBlocks;
        }
    };
});
