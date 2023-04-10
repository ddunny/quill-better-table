import Quill from 'quill';

const Parchment = Quill.import('parchment');

function makeTableArrowUpDownHandler(isUp) {
  return {
    key: isUp ? 38 : 40, // quill-better-table 에서는 ArrowUp, ArrowDown으로 사용되었는데 quill 1.3.7 버전에서는 먹히지 않는다. *keyboard.js를 참고하여 변경함
    collapsed: true,
    format: ['table-cell-line', 'block', 'table-col'], // 무조건 이거인 경우에만 적용이된다!!!
    handler(range, context) {
      const [line, offset] = this.quill.getLine(range.index); // 여기서의 offset이 뭐지??? 이게 없는 경우가 있다;;; 췌크췌크

      console.log('up down : line : ', line, ' offset: ', offset, ' range.index: ', range.index);

      debugger;

      if (line.statics.blotName === 'table-col') {
        const rows = line.rows().find(offset)[0];

        const targetRow = isUp ? rows.prev : rows.next;

        if (targetRow?.children) {
          const targetCell = targetRow.children.find(offset)[0];

          this.quill.setSelection(
            targetCell.offset(this.quill.scroll),
            0,
            Quill.sources.USER
          );
        }
      }

      if (line.statics.blotName === 'table-cell-line') {
        const rows = line.rows();
        const targetRow = isUp ? rows.prev : rows.next;

        if (targetRow?.children) {
          const targetCell = targetRow.children.find(offset)[0];

          this.quill.setSelection(
            targetCell.offset(this.quill.scroll),
            0,
            Quill.sources.USER
          );
        }
      }

      return false;

      // 이 밑에 동작이 뭔지 모르겠음 ;;; 찬찬히 읽어보자 !!!

      const key = isUp ? 'prev' : 'next';
      const targetLine = line[key];

      if (targetLine != null) {
        return true;
      }

      const tableModule = this.quill.getModule('better-table');
      console.log('tableModule : ', tableModule);


      const cell = line.parent;
      const targetRow = cell.parent[key];

      if (targetRow != null && targetRow.statics.blotName === 'table-row') {
        let targetCell = targetRow.children.head;
        let totalColspanOfTargetCell = parseInt(targetCell.formats()['colspan'], 10)
        let cur = cell
        let totalColspanOfCur = parseInt(cur.formats()['colspan'], 10)

        // get targetCell above current cell depends on colspan
        while (cur.prev != null) {
          cur = cur.prev;
          totalColspanOfCur += parseInt(cur.formats()['colspan'], 10);
        }

        while (targetCell.next != null && totalColspanOfTargetCell < totalColspanOfCur) {
          targetCell = targetCell.next;
          totalColspanOfTargetCell += parseInt(targetCell.formats()['colspan'], 10);
        }

        const index = targetCell.offset(this.quill.scroll);
        this.quill.setSelection(index, 0, Quill.sources.USER);
      } else {
        const targetLine = cell.table().parent[key];
        if (targetLine != null) {
          if (isUp) {
            this.quill.setSelection(
              targetLine.offset(this.quill.scroll) + targetLine.length() - 1,
              0,
              Quill.sources.USER
            )
          } else {
            this.quill.setSelection(
              targetLine.offset(this.quill.scroll),
              0,
              Quill.sources.USER
            )
          }
        }
      }
      return false;
    },
  };
}

function makeTableArrowLeftRightHandler(isLeft) {
  return {
    key: isLeft ? 37 : 39,
    shiftKey: false,
    collapsed: true, // collapsed 의 의미를 모르겠음
    format: ['table-cell-line', 'block', 'table-col'], // 무조건 이거인 경우에만 적용이된다!!! issue : table-cell-line 일때 안된다
    handler(range, context) {
      const [line, offset] = this.quill.getLine(range.index);
      console.log('current blot: ', line.statics.blotName);

      ////////////////////////////////////////

      if (line.statics.blotName === 'table-col') { // issue: 처음 테이블의 셀에 포커싱을 줄 때 무조건 첫번째 셀로 이동하는 이슈
        const cell = line.rows().find(offset)[0].children.find(offset)[0]; // 해당 하는 위치의 행을 찾고
        const targetCell = isLeft ? cell.prev : cell.next;

        if (targetCell) {
          this.quill.setSelection(
            targetCell.offset(this.quill.scroll),
            0,
            Quill.sources.USER
          );
        } else {
          // todo 다음 셀은 없는데 다음 행이 있는 경우, 행의 첫번째 셀로 이동하는 작업이 추가되어야 한다.
          console.log('이동할 수 없는 영역 입니다. ');
        }
      }

      if (line.statics.blotName === 'table-cell-line') { // issue: 처음 테이블의 셀에 포커싱을 줄 때 무조건 첫번째 셀로 이동하는 이슈
        const cell = line.tableCell(); // 해당 하는 위치의 행을 찾고
        const targetCell = isLeft ? cell.prev : cell.next;

        if (targetCell) {
          this.quill.setSelection(
            targetCell.offset(this.quill.scroll),
            0,
            Quill.sources.USER
          );
        } else {
          // todo 다음 셀은 없는데 다음 행이 있는 경우, 행의 첫번째 셀로 이동하는 작업이 추가되어야 한다.
          console.log('이동할 수 없는 영역 입니다. ');
        }
      }

      ////////////////////////////////////////
      return false;

      // let prevFormats = this.quill.getFormat(range.index - 1);
      // let currentBlot = this.quill.getLeaf(range.index)[0];
      // console.log('currentBlot: ', currentBlot);
      //
      // // TODO move to table module
      // const key = isLeft ? 'prev' : 'next';
      // const targetLine = line[key];
      // if (targetLine != null) return true
      //
      // const cell = line.parent;
      // const targetRow = cell.parent[key];
      //
      // if (targetRow != null && targetRow.statics.blotName === 'table-row') {
      //   let targetCell = targetRow.children.head;
      //   let totalColspanOfTargetCell = parseInt(targetCell.formats()['colspan'], 10);
      //   let cur = cell;
      //   let totalColspanOfCur = parseInt(cur.formats()['colspan'], 10);
      //
      //   // get targetCell above current cell depends on colspan
      //   while (cur.prev != null) {
      //     cur = cur.prev;
      //     totalColspanOfCur += parseInt(cur.formats()['colspan'], 10);
      //   }
      //
      //   while (targetCell.next != null && totalColspanOfTargetCell < totalColspanOfCur) {
      //     targetCell = targetCell.next;
      //     totalColspanOfTargetCell += parseInt(targetCell.formats()['colspan'], 10);
      //   }
      //
      //   const index = targetCell.offset(this.quill.scroll);
      //   this.quill.setSelection(index, 0, Quill.sources.USER);
      // } else {
      //   const targetLine = cell.table().parent[key];
      //   if (targetLine != null) {
      //     if (isLeft) { // ;;~~
      //       this.quill.setSelection(
      //         targetLine.offset(this.quill.scroll) + targetLine.length() - 1,
      //         0,
      //         Quill.sources.USER
      //       );
      //     } else {
      //       this.quill.setSelection(
      //         targetLine.offset(this.quill.scroll),
      //         0,
      //         Quill.sources.USER
      //       );
      //     }
      //   }
      // }
      // return false;
    },
  };
}


const keyboardBindings = { // 테이블에서는 이게 우선으로 먹힌다
  'table-cell-line backspace': { // 셀 안에 내용만 지우는 용도가 되어야 한다. 텍스트는 지워지는데.. 이 안에 포맷이 들어가는 경우는 어떨지 모르겠네
    key: 'Backspace',
    format: ['table-cell-line', 'table-col'],
    collapsed: true,
    offset: 0,
    handler() {
      return false; // 다른 backspace 이벤트에 전파되지 않도록 false
    },
  },
  'table-cell-line delete': { // 셀 안에 내용만 지우는 용도가 되어야 한다. .. 이 안에 포맷이 들어가는 경우는 어떨지 모르겠네
    key: 'Delete',
    format: ['table-cell-line', 'table-col'],
    collapsed: true,
    suffix: /^$/,
    handler() {
      console.log('delete');
      return false;
    },
  },
  'tab': {
    key: 'Tab',
    format: ['table-cell-line', 'table-col'],
    // collapsed: true,
    handler(range, context) {
      const [line, offset] = this.quill.getLine(range.index);
      if (line.statics.blotName === 'table-col') { // issue: 처음 테이블의 셀에 포커싱을 줄 때 무조건 첫번째 셀로 이동하는 이슈
        const rows = line.rows().find(offset); // 해당 하는 위치의 행을 찾고
        const td = rows[0].children.head; // 그 행의 첫번째 아이템을 본다
        if (td.next) { // next가 있으면 포커스를 옮기고
          this.quill.setSelection(
            td.next.offset(this.quill.scroll),
            0,
            Quill.sources.USER
          );

        } else if (line.rows().find(offset + 1)[0]?.children.head) {
          const targetLine = line.rows().find(offset + 1)[0].children.head;
          this.quill.setSelection(
            targetLine.offset(this.quill.scroll),
            0,
            Quill.sources.USER
          );

        } else {
          console.log('테이블 내에서는 이동할 곳이 없어요. 테이블 바깥으로 나가야 합니다.');
        }
      }

      if (line.statics.blotName === 'table-cell-line') {
        const cell = line.tableCell();
        if (cell.next) {
          this.quill.setSelection(
            cell.next.offset(this.quill.scroll),
            0,
            Quill.sources.USER
          );

        } else if (cell.parent.next?.children.head) {
          const targetLine = cell.parent.next.children.head;
          this.quill.setSelection(
            targetLine.offset(this.quill.scroll),
            0,
            Quill.sources.USER
          );
        } else {
          console.log('테이블 내에서는 이동할 곳이 없어요. 테이블 바깥으로 나가야 합니다.');
        }
      }

      return false; // 다른 탭 이벤트로 전파되지 않도록 return false
    },
  },
  'table-cell-line enter': { // 셀 안에서 내용 줄바꿈만 되도록 한다.
    key: 'Enter',
    format: ['table-cell-line', 'table-col'],
    handler(range, context) {
      // bugfix: a unexpected new line inserted when user compositionend with hitting Enter
      if (this.quill.selection && this.quill.selection.composing) { // composing은 안봐도 될것 같은데 엔터에서는
        return;
      }

      const Scope = Quill.imports.parchment.Scope;

      if (range.length > 0) {
        this.quill.scroll.deleteAt(range.index, range.length); // So we do not trigger text-change ?_? what~~~?
      }

      const lineFormats = Object.keys(context.format).reduce((formats, format) => {
        if (Parchment.query(format, Scope.BLOCK) // this.scoll 내에 query 가 없기 때문에 Parchment에서 바로 조회하는 것으로 변경함. 오류는 나지 않으나 기존에 scroll 에서 상속받은 query를 사용하는 것으로 발생하는 다른점은 뭔지 모르겠음.. 일단 기록!!
          && !Array.isArray(context.format[format])
        ) {
          formats[format] = context.format[format];
        }
        return formats;
      }, {});

      // insert new cellLine with lineFormats
      this.quill.insertText(range.index, '\n', lineFormats['table-cell-line'], Quill.sources.USER); // 줄바꿈을 위한 \n 삽입

      // Earlier scroll.deleteAt might have messed up our selection,
      // so insertText's built in selection preservation is not reliable
      this.quill.setSelection(range.index + 1, Quill.sources.SILENT);

      this.quill.focus();

      Object.keys(context.format).forEach((name) => {
        if (lineFormats[name] != null) {
          return;
        }

        if (Array.isArray(context.format[name])) {
          return;
        }

        if (name === 'link') {
          return;
        }
        this.quill.format(name, context.format[name], Quill.sources.USER);
      });

      return false;
    },
  },
  'table-cell-line up': makeTableArrowUpDownHandler(true),
  'table-cell-line down': makeTableArrowUpDownHandler(false),
  'embed left': makeTableArrowLeftRightHandler(true), // 같은 이름으로 덮어야 하네??
  'embed right': makeTableArrowLeftRightHandler(false), // 이것도 같은 이름으로 덮으니까 됐땅
  // 'down-to-table': { // 테이블 자체를 밑으로야 ..?
  //   key: 40,
  //   collapsed: true,
  //   handler(range, context) {
  //     const [line,] = this.quill.getLine(range.index);
  //     const target = line.next;
  //     console.log(' arrow down target.next : ', target);
  //     console.log(' line: ', line);
  //     if (target && target.statics.blotName === 'table-view') {
  //       const targetCell = target.table().rows()[0].children.head;
  //       const targetLine = targetCell.children.head;
  //
  //       console.log('target cell : ', targetCell, ' targetLine: ', targetLine);
  //
  //       this.quill.setSelection(
  //         targetLine.offset(this.quill.scroll),
  //         0,
  //         Quill.sources.USER
  //       );
  //
  //       return false;
  //     }
  //     return true;
  //   }
  // },
  // 'up-to-table': { // 테이블 자체를 위로야 ...?
  //   key: 38,
  //   collapsed: true,
  //   handler(range, context) {
  //     const [line,] = this.quill.getLine(range.index);
  //     const target = line.prev;
  //
  //     console.log('up to table current line : ', line, ' target: ', target);
  //
  //     if (target && target.statics.blotName === 'table-view') {
  //       const rows = target.table().rows();
  //       const targetCell = rows[rows.length - 1].children.head;
  //       const targetLine = targetCell.children.head;
  //
  //       this.quill.setSelection(
  //         targetLine.offset(this.quill.scroll),
  //         0,
  //         Quill.sources.USER
  //       );
  //
  //       return false;
  //     }
  //     return true;
  //   }
  // }
}

export {
  keyboardBindings
};
