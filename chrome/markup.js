/* LanguageTool for Chrome 
 * Copyright (C) 2015 Daniel Naber (http://www.danielnaber.de)
 * 
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301
 * USA
 */
"use strict";

class Markup {

    static html2markupList(html) {
        var result = [];
        var inMarkup = false;
        var buffer = "";
        for (var i = 0; i < html.length; i++) {
            let ch = html[i];
            var skip = false;
            if (ch === '<') {
                if (buffer) {
                    result.push({text: buffer});
                    buffer = "";
                }
                inMarkup = true;
            } else if (inMarkup && ch === '>') {
                if (buffer) {
                    Markup._handleMarkupItem(buffer, result);
                    skip = true;
                    buffer = "";
                }
                inMarkup = false;
            }
            if (!skip) {
                buffer += ch;
            }
        }
        if (inMarkup && buffer) {
            Markup._handleMarkupItem(buffer, result);
        } else if (buffer) {
            result.push({text: buffer});
        }
        return result;
    }
    
    static _handleMarkupItem(buffer, result) {
        if (buffer === '<div' || buffer === '<div/' || buffer.indexOf('<div ') === 0 || buffer === '<p' || buffer === '<p/' || buffer.indexOf('<p ') === 0) {
            // we need to interpret the HTML a bit so LanguageTool knows at least
            // where the paragraphs are...
            result.push({markup: buffer + '>', text: '\n\n'});
        } else {
            result.push({markup: buffer + '>'});
        }
    }

    static markupList2html(markupList) {
        var result = "";
        for (let idx in markupList) {
            let elem = markupList[idx];
            if (elem.markup) {
                result += elem.markup;
            } else if (elem.text) {
                result += elem.text;
            } else {
                throw "Neither text nor markup at position " + idx + " in list: " + markupList
            }
        }
        return result;
    }

    static markupList2text(markupList) {
        var result = "";
        for (let idx in markupList) {
            let elem = markupList[idx];
            if (elem.text) {
                result += elem.text;
            }
        }
        return result;
    }

    static replace(markupList, plainTextErrorOffset, errorLen, errorReplacement) {
        var result = [];
        var plainTextPos = 0;
        var found = false;
        for (let idx in markupList) {
            let elem = markupList[idx];
            if (elem.text && elem.markup) {
                result.push({text: elem.text, markup: elem.markup});
                plainTextPos += elem.text.length;
            } else if (elem.text) {
                let fromPos = plainTextPos;
                let toPos = plainTextPos + elem.text.length;
                if (plainTextErrorOffset >= fromPos && plainTextErrorOffset <= toPos) {
                    let relErrorOffset = plainTextErrorOffset - fromPos;
                    if (relErrorOffset !== elem.text.length) {
                        // this is an ambiguous case, e.g. insert the error at position 3 here:
                        // <div>foo</div>bar
                        // -> but is position 3 after the "foo" or in front of "bar"? We assume it's in front of 'bar',
                        // that seems to be the better choice for our use case
                        let newText = elem.text.substr(0, relErrorOffset) + errorReplacement + elem.text.substr(relErrorOffset+errorLen);
                        if (newText !== elem.text) {
                            found = true;
                        }
                        result.push({text: newText});
                    } else {
                        result.push({text: elem.text});
                    }
                } else {
                    result.push({text: elem.text});
                }
                plainTextPos += elem.text.length;
            } else if (elem.markup) {
                result.push({markup: elem.markup});
            }
        }
        if (!found) {
            // see test case for when this might happen
            throw "Sorry, could not replace error with suggestion. This can happen when editing HTML.";
        }
        return result;
    }

}

if (typeof module !== 'undefined') {
    module.exports = Markup;
}