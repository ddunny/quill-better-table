import {getRelativeRect} from "../modules/index";

import Quill from 'quill';

const Break = Quill.import("blots/break");
const Block = Quill.import('blots/block');
const Parchment = Quill.import('parchment');
const BlockEmbed = Quill.import('blots/block/embed');

const Container = Quill.import('blots/container');

Container.order = [
  'list', 'div',   // Must be lower
  'table-cell-line', 'table', 'table-row', 'table-container'  // Must be higher
];

const COL_ATTRIBUTES = ['width'];
const COL_DEFAULT = {
  width: 100
};
const CELL_IDENTITY_KEYS = ['row', 'cell'];
const CELL_ATTRIBUTES = ['rowspan', 'colspan'];
const CELL_DEFAULT = {
  rowspan: 1,
  colspan: 1
};

const ERROR_LIMIT = 5;

class TableCol extends Block {
  static create(value) {
    let node = super.create(value)
    COL_ATTRIBUTES.forEach((attrName) => {
      node.setAttribute(`${attrName}`, value?.[attrName] || COL_DEFAULT[attrName])
    })

    return node;
  }

  static formats(domNode) {
    return COL_ATTRIBUTES.reduce((formats, attribute) => {
      if (domNode.hasAttribute(`${attribute}`)) {
        formats[attribute] =
          domNode.getAttribute(`${attribute}`) || undefined
      }
      return formats
    }, {});
  }

  optimize(context) {
    if (this.statics.requiredContainer &&
      !(this.parent instanceof this.statics.requiredContainer)) {
      this.wrap(this.statics.requiredContainer.blotName);
    }
  }

  format(name, value) {
    if (COL_ATTRIBUTES.indexOf(name) > -1) {
      this.domNode.setAttribute(`${name}`, value || COL_DEFAULT[name])
    } else {
      super.format(name, value)
    }
  }

  html() {
    return this.domNode.outerHTML;
  }

  rows() {
    return this.parent.next.children;
  }
}

TableCol.blotName = 'table-col';
TableCol.tagName = 'col';

class TableCellLine extends Block {
  static create(value) {
    const node = super.create(value);

    CELL_IDENTITY_KEYS.forEach((key) => {
      let identityMaker = key === 'row'
        ? rowId : cellId
      node.setAttribute(`data-${key}`, value[key] || identityMaker);
    });


    CELL_ATTRIBUTES.forEach((attrName) => {
      node.setAttribute(`data-${attrName}`, value[attrName] || CELL_DEFAULT[attrName]);
    });

    if (value['cell-bg']) {
      node.setAttribute('data-cell-bg', value['cell-bg'])
    }

    return node;
  }

  static formats(domNode) {
    const formats = {}

    return CELL_ATTRIBUTES.concat(CELL_IDENTITY_KEYS).concat(['cell-bg']).reduce((formats, attribute) => {
      if (domNode.hasAttribute(`data-${attribute}`)) {
        formats[attribute] = domNode.getAttribute(`data-${attribute}`) || undefined
      }
      return formats;
    }, formats);
  }

  format(name, value) {
    if (CELL_ATTRIBUTES.concat(CELL_IDENTITY_KEYS).indexOf(name) > -1) {
      if (value) {
        this.domNode.setAttribute(`data-${name}`, value)
      } else {
        this.domNode.removeAttribute(`data-${name}`)
      }
    } else if (name === 'cell-bg') {
      if (value) {
        this.domNode.setAttribute('data-cell-bg', value)
      } else {
        this.domNode.removeAttribute('data-cell-bg')
      }
    } else if (name === 'header') {
      if (!value) return;
      const {row, cell, rowspan, colspan} = TableCellLine.formats(this.domNode)
      super.format(name, {
        value,
        row,
        cell,
        rowspan,
        colspan
      })
    } else {
      super.format(name, value)
    }
  }

  insertBefore(childBlot, refBlot) {
    if (this.statics.allowedChildren != null && !this.statics.allowedChildren.some(function (child) {
      return childBlot instanceof child;
    })) {
      let newChild = Parchment.create(this.statics.defaultChild, rowId());
      newChild.appendChild(childBlot);
      childBlot = newChild;
    }
    super.insertBefore(childBlot, refBlot)
  }

  optimize(context) {
    // cover shadowBlot's wrap call, pass params parentBlot initialize
    // needed
    const rowId = this.domNode.getAttribute('data-row')
    const rowspan = this.domNode.getAttribute('data-rowspan')
    const colspan = this.domNode.getAttribute('data-colspan')
    const cellBg = this.domNode.getAttribute('data-cell-bg')
    if (this.statics.requiredContainer &&
      !(this.parent instanceof this.statics.requiredContainer)) {
      this.wrap(this.statics.requiredContainer.blotName, {
        row: rowId,
        colspan,
        rowspan,
        'cell-bg': cellBg
      })
    }
    super.optimize(context)
  }

  tableCell() {
    return this.parent;
  }

  rows() {
    return this.parent.parent;
  }
}

TableCellLine.blotName = 'table-cell-line'
TableCellLine.className = 'qlbt-cell-line'
TableCellLine.tagName = 'p'

class TableCell extends Container {
  rowId;

  checkMerge() {
    if (super.checkMerge() && this.next.children.head != null) {
      const thisHead = this.children.head.formats()[this.children.head.statics.blotName];
      const thisTail = this.children.tail.formats()[this.children.tail.statics.blotName];
      const nextHead = this.next.children.head.formats()[this.next.children.head.statics.blotName];
      const nextTail = this.next.children.tail.formats()[this.next.children.tail.statics.blotName];

      return (
        thisHead.cell === thisTail.cell
        && thisHead.cell === nextHead.cell
        && thisHead.cell === nextTail.cell
      )
    }
    return false;
  }

  static create(value) {
    this.rowId = value.row;

    const node = super.create(value)
    node.setAttribute("data-row", value.row)

    CELL_ATTRIBUTES.forEach(attrName => {
      if (value[attrName]) {
        node.setAttribute(attrName, value[attrName])
      }
    })

    if (value['cell-bg']) {
      node.setAttribute('data-cell-bg', value['cell-bg'])
      node.style.backgroundColor = value['cell-bg']
    }

    return node
  }

  static formats(domNode) {
    const formats = {}

    if (domNode.hasAttribute("data-row")) {
      formats["row"] = domNode.getAttribute("data-row");
    }

    if (domNode.hasAttribute("data-cell-bg")) {
      formats["cell-bg"] = domNode.getAttribute("data-cell-bg");
    }

    return CELL_ATTRIBUTES.reduce((formats, attribute) => {
      if (domNode.hasAttribute(attribute)) {
        formats[attribute] = domNode.getAttribute(attribute);
      }

      return formats;
    }, formats);
  }

  formats() {
    const formats = {}

    if (this.domNode.hasAttribute("data-row")) {
      formats["row"] = this.domNode.getAttribute("data-row")
    }

    if (this.domNode.hasAttribute("data-cell-bg")) {
      formats["cell-bg"] = this.domNode.getAttribute("data-cell-bg")
    }

    return CELL_ATTRIBUTES.reduce((formats, attribute) => {
      if (this.domNode.hasAttribute(attribute)) {
        formats[attribute] = this.domNode.getAttribute(attribute)
      }

      return formats
    }, formats)
  }

  row() {
    return this.parent;
  }

  rowOffset() {
    if (this.row()) {
      return this.row().rowOffset();
    }
    return -1
  }

  table() {
    return this.row() && this.row().table();
  }

  toggleAttribute(name, value) {
    if (value) {
      this.domNode.setAttribute(name, value);
    } else {
      this.domNode.removeAttribute(name);
    }
  }

  formatChildren(name, value) {
    this.children.forEach(child => {
      child.format(name, value)
    })
  }

  format(name, value) {
    if (CELL_ATTRIBUTES.indexOf(name) > -1) {
      this.toggleAttribute(name, value)
      this.formatChildren(name, value)
    } else if (['row'].indexOf(name) > -1) {
      this.toggleAttribute(`data-${name}`, value)
      this.formatChildren(name, value)
    } else if (name === 'cell-bg') {
      this.toggleAttribute('data-cell-bg', value)
      this.formatChildren(name, value)

      if (value) {
        this.domNode.style.backgroundColor = value
      } else {
        this.domNode.style.backgroundColor = 'initial'
      }
    } else {
      super.format(name, value)
    }
  }

  optimize(context) { // 이거 언제 돌아가는거지 ????
    const rowId = this.domNode.getAttribute("data-row")

    if (this.statics.requiredContainer &&
      !(this.parent instanceof this.statics.requiredContainer)) {
      this.wrap(this.statics.requiredContainer.blotName, {
        row: rowId
      })
    }
    super.optimize(context)
  }
}

TableCell.blotName = 'table-cell'
TableCell.tagName = 'td'

class TableRow extends Container {
  static create(value) {
    const node = super.create(value);
    node.setAttribute("data-row", value.row);
    return node;
  }

  formats() {
    return ["row"].reduce((formats, attrName) => {
      if (this.domNode.hasAttribute(`data-${attrName}`)) {
        formats[attrName] = this.domNode.getAttribute(`data-${attrName}`)
      }
      return formats;
    }, {})
  }

  optimize(context) {
    // tbody 로 감싼다.다
    if (this.statics.requiredContainer &&
      !(this.parent instanceof this.statics.requiredContainer)) {
      this.wrap(this.statics.requiredContainer.blotName);
    }

    // td들을 tr 안에 넣는다.
    let next = this.next;
    if (next != null && next.prev === this
      && next.statics.blotName === this.statics.blotName
      && next.domNode.tagName === this.domNode.tagName
      && next.domNode.getAttribute('data-row') === this.domNode.getAttribute('data-row')) {
      next.moveChildren(this);
      next.remove();
    }
  }

  rowOffset() {
    if (this.parent) {
      return this.parent.children.indexOf(this);
    }
    return -1;
  }

  table() {
    return this.parent && this.parent.parent;
  }
}

TableRow.blotName = 'table-row'
TableRow.tagName = 'tr'


class TableViewWrapper extends Container {
  static blotName = 'table-view';
  static className = 'quill-better-table-wrapper';
  static tagName = 'div';
  static scope = Parchment.Scope.BLOCK_BLOT;

  static create() {
    return super.create(this.tagName);
  }

  addScrollEvent(dom) { // 용도가 뭘지 모르겠네
    const quill = Quill.find(dom.parentNode);
    dom.addEventListener('scroll', (e) => {
      console.log('scroll');
      const tableModule = quill.getModule('better-table');
      if (tableModule.columnTool) {
        tableModule.columnTool.domNode.scrollLeft = e.target.scrollLeft;
      }

      if (tableModule.tableSelection
        && tableModule.tableSelection.selectedTds.length > 0) {
        tableModule.tableSelection.repositionHelpLines();
      }
    }, false);
  }

  table() {
    return this.children.head;
  }
}

class TableContainer extends Container {
  static requireContainer = TableViewWrapper;
  static tagName = 'table';
  static blotName = 'table-container'
  static className = 'quill-better-table'
  static scope = Parchment.Scope.BLOCK_BLOT;

  static create(value) {
    return super.create(this.tagName);
  }

  constructor(scroll, domNode) {
    super(scroll, domNode);
    this.updateTableWidth();
  }

  optimize(context) {
    // tbody와 colgroup을 table 안으로 넣기 위해 필요한 작업
    let next = this.next;
    if (next != null && next.prev === this
      && next.statics.blotName === this.statics.blotName
      && next.domNode.tagName === this.domNode.tagName) { // table table 이렇게 있으면 자식 뽑아서 넣기 . // tr 개수만큼 동작회수 불어날듯
      next.moveChildren(this); //next 를 현재 이것의 자식으로 이동하고
      next.remove(); // next를 없앤다 .
    }
  }

  updateTableWidth() {
    setTimeout(() => {
      const colGroup = this.colGroup();
      if (!colGroup) {
        return;
      }
      const tableWidth = colGroup.children.reduce((sumWidth, col) => {
        sumWidth = sumWidth + parseInt(col.formats()[TableCol.blotName].width, 10);
        return sumWidth;
      }, 0);
      this.domNode.style.width = `${tableWidth}px`
    }, 0);
  }

  colGroup() {
    return this.children.head;
  }

  cells(column) {
    return this.rows().map(row => row.children.at(column));
  }

  deleteColumns(compareRect, delIndexes = [], editorWrapper) {
    const [body] = this.descendants(TableBody);
    if (body == null || body.children.head == null) {
      return;
    }

    const tableCells = this.descendants(TableCell);
    const removedCells = [];
    const modifiedCells = [];

    tableCells.forEach((cell) => {
      const cellRect = getRelativeRect(
        cell.domNode.getBoundingClientRect(),
        editorWrapper
      )

      if (
        cellRect.x + ERROR_LIMIT > compareRect.x
        && cellRect.x1 - ERROR_LIMIT < compareRect.x1
      ) {
        removedCells.push(cell)
      } else if (
        cellRect.x < compareRect.x + ERROR_LIMIT
        && cellRect.x1 > compareRect.x1 - ERROR_LIMIT
      ) {
        modifiedCells.push(cell)
      }
    })

    if (removedCells.length === tableCells.length) {
      this.tableDestroy()
      return true
    }

    // remove the matches column tool cell
    delIndexes.forEach((delIndex) => {
      this.colGroup().children.find(delIndexes[0])[0].remove();
    })

    removedCells.forEach(cell => {
      cell.remove()
    })

    modifiedCells.forEach(cell => {
      const cellColspan = parseInt(cell.formats().colspan, 10)
      const cellWidth = parseInt(cell.formats().width, 10)
      cell.format('colspan', cellColspan - delIndexes.length)
    })

    this.updateTableWidth()
  }

  deleteRow(compareRect, editorWrapper) {
    const [body] = this.descendants(TableBody)
    if (body == null || body.children.head == null) return

    const tableCells = this.descendants(TableCell)
    const tableRows = this.descendants(TableRow)
    const removedCells = []  // cells to be removed
    const modifiedCells = [] // cells to be modified
    const fallCells = []     // cells to fall into next row

    // compute rows to remove
    // bugfix: #21 There will be a empty tr left if delete the last row of a table
    const removedRows = tableRows.filter(row => {
      const rowRect = getRelativeRect(
        row.domNode.getBoundingClientRect(),
        editorWrapper
      )

      return rowRect.y > compareRect.y - ERROR_LIMIT &&
        rowRect.y1 < compareRect.y1 + ERROR_LIMIT
    })

    tableCells.forEach(cell => {
      const cellRect = getRelativeRect(
        cell.domNode.getBoundingClientRect(),
        editorWrapper
      )

      if (
        cellRect.y > compareRect.y - ERROR_LIMIT &&
        cellRect.y1 < compareRect.y1 + ERROR_LIMIT
      ) {
        removedCells.push(cell)
      } else if (
        cellRect.y < compareRect.y + ERROR_LIMIT &&
        cellRect.y1 > compareRect.y1 - ERROR_LIMIT
      ) {
        modifiedCells.push(cell)

        if (Math.abs(cellRect.y - compareRect.y) < ERROR_LIMIT) {
          fallCells.push(cell)
        }
      }
    })

    if (removedCells.length === tableCells.length) {
      this.tableDestroy()
      return
    }

    // compute length of removed rows
    const removedRowsLength = this.rows().reduce((sum, row) => {
      let rowRect = getRelativeRect(
        row.domNode.getBoundingClientRect(),
        editorWrapper
      )

      if (
        rowRect.y > compareRect.y - ERROR_LIMIT &&
        rowRect.y1 < compareRect.y1 + ERROR_LIMIT
      ) {
        sum += 1
      }
      return sum
    }, 0)

    // it must excute before the table layout changed with other operation
    fallCells.forEach(cell => {
      const cellRect = getRelativeRect(
        cell.domNode.getBoundingClientRect(),
        editorWrapper
      )
      const nextRow = cell.parent.next
      const cellsInNextRow = nextRow.children

      const refCell = cellsInNextRow.reduce((ref, compareCell) => {
        const compareRect = getRelativeRect(
          compareCell.domNode.getBoundingClientRect(),
          editorWrapper
        )
        if (Math.abs(cellRect.x1 - compareRect.x) < ERROR_LIMIT) {
          ref = compareCell
        }
        return ref
      }, null)

      nextRow.insertBefore(cell, refCell)
      cell.format('row', nextRow.formats().row)
    })

    removedCells.forEach(cell => {
      cell.remove()
    })

    modifiedCells.forEach(cell => {
      const cellRowspan = parseInt(cell.formats().rowspan, 10)
      cell.format("rowspan", cellRowspan - removedRowsLength)
    })

    // remove selected rows
    removedRows.forEach(row => row.remove())
  }

  tableDestroy() {
    const quill = Quill.find(this.scroll.domNode.parentNode)
    const tableModule = quill.getModule("better-table")
    this.remove()
    tableModule.hideTableTools()
    quill.update(Quill.sources.USER)
  }

  insertCell(tableRow, ref) {
    const id = cellId();
    const rId = tableRow.formats().row;
    const tableCell = Parchment.create(
      TableCell.blotName,
      Object.assign({}, CELL_DEFAULT, {
        row: rId
      })
    );
    const cellLine = Parchment.create(TableCellLine.blotName, {
      row: rId,
      cell: id
    });
    tableCell.appendChild(cellLine);

    if (ref) {
      tableRow.insertBefore(tableCell, ref);
    } else {
      tableRow.appendChild(tableCell);
    }
  }

  insertColumn(compareRect, colIndex, isRight = true, editorWrapper) {
    const [body] = this.descendants(TableBody);
    const [tableColGroup] = this.descendants(TableColGroup);
    const tableCols = this.descendants(TableCol);
    let addAsideCells = [];
    let modifiedCells = [];
    let affectedCells = [];

    if (body == null || body.children.head == null) {
      return;
    }
    const tableCells = this.descendants(TableCell);
    tableCells.forEach((cell) => {
      const cellRect = getRelativeRect(
        cell.domNode.getBoundingClientRect(),
        editorWrapper
      );

      if (isRight) {
        if (Math.abs(cellRect.x1 - compareRect.x1) < ERROR_LIMIT) {
          // the right of selected boundary equal to the right of table cell,
          // add a new table cell right aside this table cell
          addAsideCells.push(cell);
        } else if (
          compareRect.x1 - cellRect.x > ERROR_LIMIT
          && compareRect.x1 - cellRect.x1 < -ERROR_LIMIT
        ) {
          // the right of selected boundary is inside this table cell
          // colspan of this table cell will increase 1
          modifiedCells.push(cell);
        }
      } else {
        if (Math.abs(cellRect.x - compareRect.x) < ERROR_LIMIT) {
          // left of selected boundary equal to left of table cell,
          // add a new table cell left aside this table cell
          addAsideCells.push(cell);
        } else if (
          compareRect.x - cellRect.x > ERROR_LIMIT
          && compareRect.x - cellRect.x1 < -ERROR_LIMIT
        ) {
          // the left of selected boundary is inside this table cell
          // colspan of this table cell will increase 1
          modifiedCells.push(cell);
        }
      }
    })

    addAsideCells.forEach((cell) => {
      const ref = isRight ? cell.next : cell;
      const id = cellId();
      const tableRow = cell.parent;
      const rId = tableRow.formats().row;
      const cellFormats = cell.formats();
      const tableCell = Parchment.create(
        TableCell.blotName,
        Object.assign({}, CELL_DEFAULT, {
          row: rId,
          rowspan: cellFormats.rowspan
        })
      );
      const cellLine = Parchment.create(TableCellLine.blotName, {
        row: rId,
        cell: id,
        rowspan: cellFormats.rowspan
      });
      tableCell.appendChild(cellLine);

      if (ref) {
        tableRow.insertBefore(tableCell, ref);
      } else {
        tableRow.appendChild(tableCell);
      }
      affectedCells.push(tableCell);
    });

    // insert new tableCol
    const tableCol = Parchment.create(TableCol.blotName, true);
    let colRef = isRight ? tableCols[colIndex].next : tableCols[colIndex];
    if (colRef) {
      tableColGroup.insertBefore(tableCol, colRef);
    } else {
      tableColGroup.appendChild(tableCol);
    }

    modifiedCells.forEach((cell) => {
      const cellColspan = cell.formats().colspan;
      cell.format('colspan', parseInt(cellColspan, 10) + 1);
      affectedCells.push(cell);
    })

    affectedCells.sort((cellA, cellB) => {
      const y1 = cellA.domNode.getBoundingClientRect().y;
      const y2 = cellB.domNode.getBoundingClientRect().y;
      return y1 - y2;
    })

    this.updateTableWidth();
    return affectedCells;
  }

  insertRow(compareRect, isDown, editorWrapper) {
    const [body] = this.descendants(TableBody);
    if (body == null || body.children.head == null) {
      return;
    }

    const tableCells = this.descendants(TableCell); // TableCell의 자손들
    const rId = rowId(); // 새 row에 지정할 아이디
    const newRow = Parchment.create(TableRow.blotName, {row: rId});
    let addBelowCells = [];
    let modifiedCells = [];
    let affectedCells = [];

    tableCells.forEach(cell => {
      const cellRect = getRelativeRect(
        cell.domNode.getBoundingClientRect(),
        editorWrapper
      )

      if (isDown) {
        if (Math.abs(cellRect.y1 - compareRect.y1) < ERROR_LIMIT) {
          addBelowCells.push(cell);
        } else if (
          compareRect.y1 - cellRect.y > ERROR_LIMIT
          && compareRect.y1 - cellRect.y1 < -ERROR_LIMIT
        ) {
          modifiedCells.push(cell);
        }
      } else {
        if (Math.abs(cellRect.y - compareRect.y) < ERROR_LIMIT) {
          addBelowCells.push(cell);
        } else if (
          compareRect.y - cellRect.y > ERROR_LIMIT
          && compareRect.y - cellRect.y1 < -ERROR_LIMIT
        ) {
          modifiedCells.push(cell);
        }
      }
    })

    // ordered table cells with rect.x, fix error for inserting
    // new table cell in complicated table with wrong order.
    const sortFunc = (cellA, cellB) => {
      const x1 = cellA.domNode.getBoundingClientRect().x;
      const x2 = cellB.domNode.getBoundingClientRect().x;
      return x1 - x2;
    };
    addBelowCells.sort(sortFunc);

    addBelowCells.forEach((cell) => {
      const cId = cellId();
      const cellFormats = cell.formats();

      const tableCell = Parchment.create(TableCell.blotName, Object.assign(
        {}, CELL_DEFAULT, {row: rId, colspan: cellFormats.colspan}
      ));
      const cellLine = Parchment.create(TableCellLine.blotName, {
        row: rId,
        cell: cId,
        colspan: cellFormats.colspan
      });
      const empty = Parchment.create(Break.blotName);
      cellLine.appendChild(empty);
      tableCell.appendChild(cellLine);
      newRow.appendChild(tableCell);
      affectedCells.push(tableCell);
    });

    modifiedCells.forEach((cell) => {
      const cellRowspan = parseInt(cell.formats().rowspan, 10);
      cell.format("rowspan", cellRowspan + 1);
      affectedCells.push(cell);
    })

    const refRow = this.rows().find((row) => {
      const rowRect = getRelativeRect(
        row.domNode.getBoundingClientRect(),
        editorWrapper
      );
      if (isDown) {
        return Math.abs(rowRect.y - compareRect.y - compareRect.height) < ERROR_LIMIT;
      } else {
        return Math.abs(rowRect.y - compareRect.y) < ERROR_LIMIT;
      }
    });
    body.insertBefore(newRow, refRow);

    // reordering affectedCells
    affectedCells.sort(sortFunc);
    return affectedCells;
  }

  mergeCells(compareRect, mergingCells, rowspan, colspan, editorWrapper) {
    const mergedCell = mergingCells.reduce((result, tableCell, index) => {
      if (index !== 0) {
        result && tableCell.moveChildren(result)
        tableCell.remove()
      } else {
        tableCell.format('colspan', colspan)
        tableCell.format('rowspan', rowspan)
        result = tableCell
      }

      return result
    }, null)

    let rowId = mergedCell.domNode.getAttribute('data-row')
    let cellId = mergedCell.children.head.domNode.getAttribute('data-cell')
    mergedCell.children.forEach(cellLine => {
      cellLine.format('cell', cellId)
      cellLine.format('row', rowId)
      cellLine.format('colspan', colspan)
      cellLine.format('rowspan', rowspan)
    })

    return mergedCell
  }

  unmergeCells(unmergingCells, editorWrapper) {
    let cellFormats = {}
    let cellRowspan = 1
    let cellColspan = 1

    unmergingCells.forEach(tableCell => {
      cellFormats = tableCell.formats()
      cellRowspan = cellFormats.rowspan
      cellColspan = cellFormats.colspan

      if (cellColspan > 1) {
        let ref = tableCell.next
        let row = tableCell.row()
        tableCell.format('colspan', 1)
        for (let i = cellColspan; i > 1; i--) {
          this.insertCell(row, ref)
        }
      }

      if (cellRowspan > 1) {
        let i = cellRowspan
        let nextRow = tableCell.row().next
        while (i > 1) {
          let refInNextRow = nextRow.children
            .reduce((result, cell) => {
              let compareRect = getRelativeRect(
                tableCell.domNode.getBoundingClientRect(),
                editorWrapper
              )
              let cellRect = getRelativeRect(
                cell.domNode.getBoundingClientRect(),
                editorWrapper
              )
              if (Math.abs(compareRect.x1 - cellRect.x) < ERROR_LIMIT) {
                result = cell
              }
              return result
            }, null)

          for (let i = cellColspan; i > 0; i--) {
            this.insertCell(nextRow, refInNextRow)
          }

          i -= 1
          nextRow = nextRow.next
        }

        tableCell.format('rowspan', 1)
      }
    })
  }

  rows() {
    const body = this.children.tail
    if (body == null) return []
    return body.children.map(row => row)
  }
}

class TableColGroup extends Container {
  static blotName = 'table-col-group';
  static tagName = 'colgroup';
  static requiredContainer = TableContainer;

  // col 들을 col-group 안에 넣는 것
  optimize(context) {
    let next = this.next;
    if (next != null && next.prev === this
      && next.statics.blotName === this.statics.blotName
      && next.domNode.tagName === this.domNode.tagName) {
      next.moveChildren(this);
      next.remove();
    }

    // 모든 자식들을 table 안에 넣기
    if (
      this.statics.requiredContainer &&
      !(this.parent instanceof this.statics.requiredContainer) // 최적화가 된 뒤에 진행!
    ) {
      this.wrap(this.statics.requiredContainer.blotName);
    }
  }
}

class TableBody extends Container {
  static blotName = 'table-body';
  static tagName = 'tbody';
  static requiredContainer = TableContainer;


  optimize(context) {
    // // tr들을 tbody 안에 넣는다.
    let next = this.next;
    if (next != null && next.prev === this
      && next.statics.blotName === this.statics.blotName
      && next.domNode.tagName === this.domNode.tagName) {
      next.moveChildren(this);
      next.remove();
    }

    if (
      this.statics.requiredContainer &&
      !(this.parent instanceof this.statics.requiredContainer)
    ) {
      this.wrap(this.statics.requiredContainer.blotName);
    }
  }
}


TableCell.requiredContainer = TableRow;
TableCell.scope = Parchment.Scope.BLOCK_BLOT;
TableCell.defaultChild = 'table-cell-line';

TableCellLine.requiredContainer = TableCell;
TableCellLine.className = 'qlbt-cell-line';
TableCellLine.scope = Parchment.Scope.BLOCK_BLOT;

TableRow.requiredContainer = TableBody;
TableRow.allowedChildren = [TableCell];
TableRow.scope = Parchment.Scope.BLOCK_BLOT;
TableRow.defaultChild = 'table';

TableColGroup.requiredContainer = TableContainer;
TableColGroup.allowedChildren = [TableCol];
TableColGroup.scope = Parchment.Scope.BLOCK_BLOT;
TableBody.defaultChild = 'table-col';


TableCol.requiredContainer = TableColGroup;

TableBody.requiredContainer = TableContainer;
TableBody.allowedChildren = [TableRow];
TableBody.scope = Parchment.Scope.BLOCK_BLOT;
TableBody.defaultChild = 'table-row';


TableContainer.requireContainer = TableViewWrapper;
TableContainer.allowedChildren = [TableBody, TableColGroup];
TableContainer.scope = Parchment.Scope.BLOCK_BLOT;

TableViewWrapper.allowedChildren = [TableContainer];
TableViewWrapper.scope = Parchment.Scope.BLOCK_BLOT;

function rowId() {
  const id = Math.random()
    .toString(36)
    .slice(2, 6);
  return `row-${id}`;
}

function cellId() {
  const id = Math.random()
    .toString(36)
    .slice(2, 6);
  return `cell-${id}`;
}

function tableId() {
  const id = Math.random()
    .toString(36)
    .slice(2, 6);
  return `table-${id}`;
}

function randomId() {
  return Math.random()
    .toString(36)
    .slice(2, 6);
}


export {
  rowId,
  cellId,
  tableId,
  TableCell,
  TableRow,
  TableContainer,
  TableCellLine,
  TableColGroup,
  TableCol,
  TableBody,
  TableViewWrapper
};
