// pdf-lib のライブラリをグローバルスコープから取得
const { PDFDocument } = window.PDFLib;
const log = document.getElementById('log');
const mergeButton = document.getElementById('mergeButton');
const pdfFileInput = document.getElementById('pdfFileInput');
const fileList = document.getElementById('fileList');
const outputFileNameInput = document.getElementById('outputFileNameInput');
const fileNameLabel = document.getElementById('fileNameLabel');

mergeButton.addEventListener('click', mergePdfs);

// ファイル選択時の処理
pdfFileInput.addEventListener('change', () => {
    const files = pdfFileInput.files;
    if (files.length > 0) {
        fileNameLabel.textContent = `${files.length}個のファイルを選択中`;
    } else {
        fileNameLabel.textContent = '選択されていません';
    }

    fileList.innerHTML = '';
    for (const file of pdfFileInput.files) {
        const listItem = document.createElement('li');
        listItem.textContent = file.name;
        listItem.draggable = true;
        fileList.appendChild(listItem);
    }
});

// ドラッグ＆ドロップによるファイル順序変更の処理
let draggedItem = null;

fileList.addEventListener('dragstart', e => {
    draggedItem = e.target;
    setTimeout(() => {
        if (draggedItem) draggedItem.classList.add('dragging');
    }, 0);
});

fileList.addEventListener('dragend', () => {
    if (draggedItem) draggedItem.classList.remove('dragging');
    draggedItem = null;
});

fileList.addEventListener('dragover', e => {
    e.preventDefault();
    const afterElement = getDragAfterElement(fileList, e.clientY);
    const currentlyDragged = document.querySelector('.dragging');
    if (currentlyDragged) {
        if (afterElement == null) {
            fileList.appendChild(currentlyDragged);
        } else {
            fileList.insertBefore(currentlyDragged, afterElement);
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

async function mergePdfs() {
    // UIのリストから現在のファイル順序を取得
    const orderedFileNames = [...fileList.querySelectorAll('li')].map(li => li.textContent);
    const originalFiles = Array.from(pdfFileInput.files);

    // UIの順序に基づいてFileオブジェクトの配列を並べ替える
    const filesToMerge = orderedFileNames.map(name => {
        return originalFiles.find(file => file.name === name);
    }).filter(Boolean); // 見つからなかったファイルを除外

    log.innerHTML = '';
    const statusMessage = document.createElement('p');
    log.appendChild(statusMessage);
    const updateStatus = (message) => { statusMessage.textContent = message; };

    if (filesToMerge.length === 0) {
        updateStatus('PDFファイルを1つ以上選択してください。');
        return;
    }

    updateStatus('PDFの結合を開始します...');

    try {
        // 新しい空のPDFドキュメントを作成
        const mergedPdf = await PDFDocument.create();

        for (const file of filesToMerge) {
            updateStatus(`${file.name} を読み込み中...`);
            const arrayBuffer = await file.arrayBuffer();
            const pdfToMerge = await PDFDocument.load(arrayBuffer);

            // 読み込んだPDFのすべてのページをコピーして追加
            const copiedPages = await mergedPdf.copyPages(pdfToMerge, pdfToMerge.getPageIndices());
            copiedPages.forEach(page => mergedPdf.addPage(page));
        }

        // 結合したPDFを保存
        const mergedPdfBytes = await mergedPdf.save();

        // ダウンロードリンクを作成
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        let outputFileName = outputFileNameInput.value.trim();
        if (!outputFileName) {
            outputFileName = 'merged.pdf';
        } else if (!outputFileName.toLowerCase().endsWith('.pdf')) {
            outputFileName += '.pdf';
        }

        link.href = url;
        link.download = outputFileName;
        link.textContent = `結合されたPDFをダウンロード`;

        updateStatus('すべてのPDFファイルの結合が完了しました。');
        log.appendChild(link);

    } catch (error) {
        updateStatus('エラーが発生しました: ' + error.message);
        console.error(error);
    }
}