const { PDFDocument } = window.PDFLib;
const log = document.getElementById('log');
const reorderButton = document.getElementById('reorderButton');
const pdfFileInput = document.getElementById('pdfFileInput');
const pageList = document.getElementById('pageList');
const fileNameLabel = document.getElementById('fileNameLabel');

reorderButton.addEventListener('click', reorderPdfPages);
pdfFileInput.addEventListener('change', handleFileSelect);

async function handleFileSelect() {
    pageList.innerHTML = '';
    log.innerHTML = '';
    const file = pdfFileInput.files[0];

    if (!file) {
        fileNameLabel.textContent = '選択されていません';
        return;
    }
    fileNameLabel.textContent = file.name;

    const statusMessage = document.createElement('p');
    log.appendChild(statusMessage);
    const updateStatus = (message) => { statusMessage.textContent = message; };
    updateStatus('PDFを読み込んでいます...');

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pageCount = pdfDoc.getPageCount();

        for (let i = 0; i < pageCount; i++) {
            const listItem = document.createElement('li');
            listItem.textContent = `ページ ${i + 1}`;
            listItem.draggable = true;
            listItem.dataset.originalIndex = i;
            pageList.appendChild(listItem);
        }
        updateStatus(`${pageCount} ページ見つかりました。順番を入れ替えてください。`);
    } catch (error) {
        updateStatus('エラー: PDFファイルの読み込みに失敗しました。' + error.message);
        console.error(error);
    }
}

let draggedItem = null;

pageList.addEventListener('dragstart', e => {
    draggedItem = e.target;
    setTimeout(() => {
        if (draggedItem) draggedItem.classList.add('dragging');
    }, 0);
});

pageList.addEventListener('dragend', () => {
    if (draggedItem) draggedItem.classList.remove('dragging');
    draggedItem = null;
});

pageList.addEventListener('dragover', e => {
    e.preventDefault();
    const afterElement = getDragAfterElement(pageList, e.clientY);
    const currentlyDragged = document.querySelector('.dragging');
    if (currentlyDragged) {
        if (afterElement == null) {
            pageList.appendChild(currentlyDragged);
        } else {
            pageList.insertBefore(currentlyDragged, afterElement);
        }
    }
});

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

async function reorderPdfPages() {
    log.innerHTML = '';
    const file = pdfFileInput.files[0];

    const statusMessage = document.createElement('p');
    log.appendChild(statusMessage);
    const updateStatus = (message) => { statusMessage.textContent = message; };
 
    if (!file) {
        updateStatus('PDFファイルを選択してください。');
        return;
    }

    const orderedListItems = [...pageList.querySelectorAll('li')];
    if (orderedListItems.length === 0) {
        updateStatus('ページリストが空です。PDFをアップロードしてください。');
        return;
    }

    updateStatus('PDFページの順序変更を開始します...');

    try {
        const arrayBuffer = await file.arrayBuffer();
        const originalPdf = await PDFDocument.load(arrayBuffer);

        // UIのリストから新しいページの順番を取得 (0-based)
        const newOrder = orderedListItems.map(li => parseInt(li.dataset.originalIndex, 10));

        const newPdf = await PDFDocument.create();

        // copyPagesは複数のページを一度にコピーできるので、それを利用する
        const copiedPages = await newPdf.copyPages(originalPdf, newOrder);
        
        // コピーしたページを新しいPDFに追加
        for (const page of copiedPages) {
            newPdf.addPage(page);
        }

        const newPdfBytes = await newPdf.save();
        const blob = new Blob([newPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        const originalName = file.name.lastIndexOf('.') > 0 
            ? file.name.substring(0, file.name.lastIndexOf('.')) 
            : file.name;
        link.href = url;
        link.download = `${originalName}_reordered.pdf`;
        link.textContent = `順序変更されたPDFをダウンロード`;

        updateStatus('順序変更が完了しました。');
        log.appendChild(link);

    } catch (error) {
        updateStatus('エラーが発生しました: ' + error.message);
        console.error(error);
    }
}