import Quill from 'quill';

import {
  cellId,
  rowId,
  TableBody,
  TableCell,
  TableCellLine,
  TableCol,
  TableColGroup,
  TableContainer,
  TableRow,
  TableViewWrapper
} from "./formats/table";
import {getEventComposedPath} from './utils';
import TableColumnTool from "./modules/table-column-tool";
import TableSelection from "./modules/table-selection"
import TableOperationMenu from "./modules/table-operation-menu";

const Parchment = Quill.import('parchment');
const Delta = Quill.import('delta');
const Module = Quill.import('core/module');
const Container = Quill.import('blots/container');
const Scroll = Quill.import('blots/scroll');

class TableModule extends Module {
  quill;
  options;
  eventListener; // for test
  _testHandler;
  table;

  constructor(quill, options) {
    super(quill, options);

    this.quill = quill;
    this.options = options;

    this.quill.root.addEventListener('click', (evt) => {
      const path = getEventComposedPath(evt);
      if (!path || path.length <= 0) {
        return;
      }

      const tableNode = path.filter((node) => {
        return node.tagName
          && node.tagName.toUpperCase() === 'TABLE' && node.classList.contains('quill-better-table')
      })[0];

      if (tableNode) {
        // 여기서 만약에 parent체크를 했을 때 wrapper가 없다면 만들어주자 (안씌워져서 억지로 여기서 씌워봤다.)
        if (!tableNode.parentNode.classList.contains('quill-better-table-wrapper')) {
          const tableWrapper = Parchment.create(TableViewWrapper.blotName);
          tableWrapper.addScrollEvent(tableNode);
          const tableNodeAsQuill = Quill.find(tableNode);
          this.quill = tableNodeAsQuill.wrap(tableWrapper); // 씌우는 처리
        }

        // current table clicked
        if (this.table === tableNode) {
          return;
        }
        // other table clicked
        if (this.table) {
          this.hideTableTools();
        }
        this.showTableTools(tableNode, quill, options);
      } else if (this.table) {
        // other clicked
        this.hideTableTools();
      }
    });

    // 테스트용
    // this.quill.root.addEventListener('keydown', (event) => { // 키보드 바인딩보다 먼저 호출한다.는 오산;
    //   console.log('keydown event: ', event);
    //   return;
    //   //
    //   // const blot = Parchment.find(event.target, true);
    //   // if (blot && blot.scroll !== this.quill.scroll) {
    //   //   return;
    //   // }
    //   //
    //   // const range = quill.getSelection(true); // 왜 this 로 넣으면 안먹히는거야
    //   //
    //   // if (range == null || !quill.hasFocus()) {
    //   //   return;
    //   // }
    //   //
    //   // const [line, offset] = this.quill.getLine(range.index);
    //   // const [leafStart, offsetStart] = this.quill.getLeaf(range.index);
    //   // const [leafEnd, offsetEnd] = range.length === 0
    //   //   ? [leafStart, offsetStart]
    //   //   : this.quill.getLeaf(range.index + range.length);
    //   //
    //   // const prefixText =
    //   //   leafStart instanceof TextBlot
    //   //     ? leafStart.value().slice(0, offsetStart)
    //   //     : '';
    //   // const suffixText =
    //   //   leafEnd instanceof TextBlot ? leafEnd.value().slice(offsetEnd) : '';
    //   // const curContext = { // 이걸 가지고 현재 위치가 어딘지 뽑을 수 있음 ~~~
    //   //   collapsed: range.length === 0,
    //   //   empty: range.length === 0 && line.length() <= 1,
    //   //   format: this.quill.getFormat(range),
    //   //   line,
    //   //   offset,
    //   //   prefix: prefixText,
    //   //   suffix: suffixText,
    //   //   event: event,
    //   // };
    //   //
    //   // console.log('curContext : ', curContext);
    //   //
    //
    //   // event.stopPropagation(); // for test
    //   // event.preventDefault(); // for test
    // }, false);

    this.quill.on(Quill.events.SCROLL_OPTIMIZE, (mutations) => { // 이 역할이 뭔지 잘 모르겠음 // 테스트용
      console.log('mutation: ', mutations);
    });

    this.quill.root.addEventListener('contextmenu', (evt) => {
      if (!this.table) {
        return true;
      }
      evt.preventDefault();

      // bugfix: evt.path is undefined in Safari, FF, Micro Edge
      const path = getEventComposedPath(evt);

      if (!path || path.length <= 0) {
        return;
      }

      const tableNode = path.filter(node => {
        return node.tagName
          && node.tagName.toUpperCase() === 'TABLE'
      })[0]

      const rowNode = path.filter(node => {
        return node.tagName
          && node.tagName.toUpperCase() === 'TR'
          && node.getAttribute('data-row')

      })[0]

      const cellNode = path.filter(node => {
        return node.tagName
          && node.tagName.toUpperCase() === 'TD'
          && node.getAttribute('data-row')
      })[0];

      let isTargetCellSelected = this.tableSelection.selectedTds
        .map((tableCell) => tableCell.domNode)
        .includes(cellNode)

      if (this.tableSelection.selectedTds.length <= 0 ||
        !isTargetCellSelected) {
        this.tableSelection.setSelection(
          cellNode.getBoundingClientRect(),
          cellNode.getBoundingClientRect()
        );
      }

      if (this.tableOperationMenu) {
        this.tableOperationMenu = this.tableOperationMenu.destroy();
      }

      if (tableNode) {
        this.tableOperationMenu = new TableOperationMenu({
          table: tableNode,
          row: rowNode,
          cell: cellNode,
          left: evt.pageX,
          top: evt.pageY
        }, quill, options.operationMenu);
      }
    }, false);

  }

  randomId() {
    return Math.random().toString(36).slice(2);
  }

  insertTable(rows, columns) {
    const range = this.quill.getSelection(true);
    if (range == null) {
      return;
    }
    let currentBlot = this.quill.getLeaf(range.index)[0];
    let delta = new Delta().retain(range.index);

    if (this.isInTableCell(currentBlot)) {
      console.warn(`Can not insert table into a table cell.`)
      return;
    }

    delta.insert('\n')
    // insert table column
    delta = new Array(columns).fill('\n').reduce((memo, text) => {
      memo.insert(text, {'table-col': true})
      return memo
    }, delta)

    // insert table cell line with empty line
    delta = new Array(rows).fill(0).reduce(memo => {
      let tableRowId = rowId()
      return new Array(columns).fill('\n').reduce((memo, text) => {
        const inserted = {'table-cell-line': {row: tableRowId, cell: cellId()}};
        memo.insert(text, inserted);
        return memo
      }, memo)
    }, delta)

    this.quill.updateContents(delta, Quill.sources.USER)
    this.quill.setSelection(range.index + columns + 1, Quill.sources.API);
  }

  rowId() {
    const id = Math.random()
      .toString(36)
      .slice(2, 6);
    return `row-${id}`;
  }

  cellId() {
    const id = Math.random()
      .toString(36)
      .slice(2, 6);
    return `cell-${id}`;
  }

  showTableTools(table, quill, options) {
    this.table = table;
    this.columnTool = new TableColumnTool(table, quill, options);
    this.tableSelection = new TableSelection(table, quill, options);
  }

  hideTableTools() {
    console.log('hideTableTools')
    this.columnTool && this.columnTool.destroy(); // 문법 고웁
    this.tableSelection && this.tableSelection.destroy();
    this.tableOperationMenu && this.tableOperationMenu.destroy();
    this.columnTool = null;
    this.tableSelection = null;
    this.tableOperationMenu = null;
    this.table = null;
  }

  isInTableCell(current) {
    return current && current.parent
      ? this.isTableCell(current.parent)
        ? true
        : this.isInTableCell(current.parent)
      : false;
  }

  isTableCell(blot) {
    return blot.statics.blotName === TableCell.blotName;
  }

  getTable(range = this.quill.getSelection()) {
    if (range == null) return [null, null, null, -1];
    const [cellLine, offset] = this.quill.getLine(range.index);
    if (cellLine == null || cellLine.statics.blotName !== TableCellLine.blotName) {
      return [null, null, null, -1];
    }
    const cell = cellLine.tableCell();
    const row = cell.row();
    const table = row.table();
    return [table, row, cell, offset];
  }
}


export {
  cellId,
  rowId,
  TableBody,
  TableCell,
  TableCellLine,
  TableCol,
  TableColGroup,
  TableContainer,
  TableRow,
  TableViewWrapper,
  TableModule,
}


