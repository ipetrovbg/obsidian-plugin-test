# Markdown Advanced Tables

This library can be used by any text editor to enable formatting,
Excel-style navigation, and spreadsheet formulas to Markdown tables.

It was originally created by [@susisu](https://github.com/susisu).
This fork converts the project to Typescript and adds additional
functionality such as table sorting, and spreadsheet capabilities.

![demo](https://raw.githubusercontent.com/tgrosinger/advanced-tables-obsidian/main/resources/screenshots/basic-functionality.gif)

## Spreadsheets and Formulas

To learn more about the spreadsheet and formula capabilities, check out the
[Formulas in Markdown
Tables](https://github.com/tgrosinger/md-advanced-tables/blob/main/docs/formulas.md)
page.

## Implementations

This is a list of known implementations of this library:

- [Advanced Tables Obsidian](https://github.com/tgrosinger/advanced-tables-obsidian/) for [Obsidian.md](https://obsidian.md) (reference implementation)
- [atom-markdown-table-editor](https://github.com/susisu/atom-markdown-table-editor) for Atom (uses the original mte-kernel)
- [table-editor](https://my.inkdrop.app/plugins/table-editor) for Inkdrop (uses the original mte-kernel)

## Installation

```
npm i @tgrosinger/md-advanced-tables
```

## Usage

Implement an [interface to the text
editor](https://github.com/tgrosinger/md-advanced-tables/blob/main/src/text-editor.ts).

``` javascript
interface ITextEditor {
  getCursorPosition(): Point;
  setCursorPosition(pos: Point): void;
  setSelectionRange(range: Range): void;
  getLastRow(): number;
  acceptsTableEdit(row: number): boolean;
  getLine(row: number): string;
  insertLine(row: number, line: string): void;
  deleteLine(row: number): void;
  replaceLines(startRow: number, endRow: number, lines: Array<string>): void;
  transact(func: Function): void;
}
```

And then you can execute
[commands](https://github.com/tgrosinger/md-advanced-tables/blob/main/src/table-editor.ts)
through a `TableEditor` object.

``` javascript
import { TableEditor, options } from "@susisu/mte-kernel";
const textEditor = ...; // interface to the text editor
const tableEditor = new TableEditor(textEditor);
tableEditor.formatAll(options({}));
```

Look at [advanced-tables-obsidian](https://github.com/tgrosinger/advanced-tables-obsidian) as a reference implementation for more information.

## Pricing

This plugin library is provided to everyone for free, however if you would like to say thanks or help support continued development, feel free to send a little my way through one of the following methods:

[![GitHub Sponsors](https://img.shields.io/github/sponsors/tgrosinger?style=social)](https://github.com/sponsors/tgrosinger)
[![Paypal](https://img.shields.io/badge/paypal-tgrosinger-yellow?style=social&logo=paypal)](https://paypal.me/tgrosinger)
[<img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="BuyMeACoffee" width="100">](https://www.buymeacoffee.com/tgrosinger)

## License

[MIT License](http://opensource.org/licenses/mit-license.php)

## Author

Current author: Tony Grosinger ([Github](https://github.com/tgrosinger))

Original author: Susisu ([GitHub](https://github.com/susisu), [Twitter](https://twitter.com/susisu2413))
