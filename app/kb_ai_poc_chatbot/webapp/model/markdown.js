sap.ui.define([], function () {
    "use strict";

    // Converts the Markdown that LLM answers use into HTML: paragraphs (single newlines become <br>),
    // headings, nested lists, GFM tables, and inline bold/italic/code/links.
    // Raw HTML in the input is escaped except <br>; callers still sanitize the result (link URLs).

    const LIST_ITEM = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
    const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/;
    const TABLE_SEPARATOR = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/;
    const INDENTED = /^\s+\S/;
    const KEPT = /\uE000(\d+)\uE000/g;

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
        const keep = (sHtml) => "\uE000" + (aKept.push(sHtml) - 1) + "\uE000";

        const sHtml = escapeHtml(sText)
            .replace(/`([^`]+)`/g, (sMatch, sCode) => keep("<code>" + sCode + "</code>"))
            .replace(/&lt;br\s*\/?&gt;/gi, () => keep("<br>"))
            .replace(/\[([^\]]+)\]\(((?:[^()\s"]|\([^()\s"]*\))+)\)/g, (sMatch, sLabel, sUrl) => keep(
                "<a href=\"" + sUrl + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + emphasis(sLabel) + "</a>"));

        return emphasis(sHtml).replace(KEPT, (sMatch, i) => aKept[i]);
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

    function table(aLines, iStart, aOut) {
        const aHeader = splitRow(aLines[iStart]);
        // rows are padded or cut to the header's column count, as in GFM
        const row = (aCells, sTag) => "<tr>" + aHeader.map((sHeader, k) =>
            "<" + sTag + ">" + inline(aCells[k] || "") + "</" + sTag + ">").join("") + "</tr>";
        let i = iStart + 2;

        aOut.push("<table><thead>" + row(aHeader, "th") + "</thead><tbody>");
        for (; i < aLines.length && aLines[i].includes("|") && aLines[i].trim(); i++) {
            aOut.push(row(splitRow(aLines[i]), "td"));
        }
        aOut.push("</tbody></table>");
        return i;
    }

    function list(aLines, iStart, aOut) {
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
                aOut.push("<br>" + inline(sLine.trim())); // continuation of the current item
                i++;
                continue;
            }

            const iIndent = aItem[1].replace(/\t/g, "    ").length;
            const sTag = /\d/.test(aItem[2]) ? "ol" : "ul";
            let oTop = aOpen[aOpen.length - 1];

            // close deeper lists, and a same-level list of the other type
            while (oTop && (iIndent < oTop.indent || (iIndent === oTop.indent && sTag !== oTop.tag))) {
                aOut.push("</li></" + aOpen.pop().tag + ">");
                oTop = aOpen[aOpen.length - 1];
            }
            if (oTop && iIndent === oTop.indent) {
                aOut.push("</li>");
            } else {
                aOut.push(sTag === "ol" ? "<ol start=\"" + parseInt(aItem[2], 10) + "\">" : "<ul>");
                aOpen.push({ indent: iIndent, tag: sTag });
            }
            aOut.push("<li>" + inline(aItem[3]));
            i++;
        }

        while (aOpen.length) {
            aOut.push("</li></" + aOpen.pop().tag + ">");
        }
        return i;
    }

    return {
        toHtml: function (sMarkdown) {
            const aLines = String(sMarkdown || "").replace(/\r\n?/g, "\n").split("\n");
            const aOut = [];
            let i = 0;

            while (i < aLines.length) {
                const sLine = aLines[i];
                const aHeading = HEADING.exec(sLine);

                if (!sLine.trim()) {
                    i++;
                } else if (aHeading) {
                    const iLevel = aHeading[1].length;
                    aOut.push("<h" + iLevel + ">" + inline(aHeading[2]) + "</h" + iLevel + ">");
                    i++;
                } else if (isTableStart(aLines, i)) {
                    i = table(aLines, i, aOut);
                } else if (LIST_ITEM.test(sLine)) {
                    i = list(aLines, i, aOut);
                } else {
                    const aParagraph = [];
                    do {
                        aParagraph.push(inline(aLines[i].trim()));
                        i++;
                    } while (i < aLines.length && !startsBlock(aLines, i));
                    aOut.push("<p>" + aParagraph.join("<br>") + "</p>");
                }
            }
            return aOut.join("");
        }
    };
});
