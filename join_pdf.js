// pdf-lib のライブラリをグローバルスコープから取得
const { PDFDocument } = window.PDFLib;
const log = document.getElementById('log');
const mergeButton = document.getElementById('mergeButton');
const pdfFileInput = document.getElementById('pdfFileInput');
const fileListContainer = document.getElementById('fileListContainer');
const fileList = document.getElementById('fileList');
const outputFileNameInput = document.getElementById('outputFileNameInput');
const fileNameLabel = document.getElementById('fileNameLabel');

let selectedFiles = []; // 選択されたファイルを保持する配列

mergeButton.addEventListener('click', mergePdfs);

// ファイルリストのUIを更新する関数
function updateFileListUI() {
    fileList.innerHTML = '';
    selectedFiles.forEach(file => {
        const listItem = document.createElement('li');
        listItem.textContent = file.name;
        listItem.draggable = true;
        fileList.appendChild(listItem);
    });

    if (selectedFiles.length > 0) {
        fileNameLabel.textContent = `${selectedFiles.length}個のファイルを選択中`;
    } else {
        fileNameLabel.textContent = '選択されていません';
    }
}

// ファイルを追加する関数 (重複チェックとPDF形式チェック付き)
function addFiles(files) {
    const newFiles = Array.from(files).filter(file =>
        file.type === 'application/pdf' &&
        !selectedFiles.some(existingFile => existingFile.name === file.name)
    );
    selectedFiles.push(...newFiles);
    updateFileListUI();
}

// ファイル選択時の処理
pdfFileInput.addEventListener('change', () => {
    addFiles(pdfFileInput.files);
    // 同じファイルを再度選択できるように値をクリア
    pdfFileInput.value = '';
});

// ドラッグ＆ドロップによるファイル追加の処理
fileListContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileListContainer.classList.add('dragover');
});
fileListContainer.addEventListener('dragleave', () => {
    fileListContainer.classList.remove('dragover');
});
fileListContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    fileListContainer.classList.remove('dragover');
    addFiles(e.dataTransfer.files);
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

    // UIの順序に基づいてFileオブジェクトの配列を並べ替える
    const filesToMerge = orderedFileNames.map(name => {
        return selectedFiles.find(file => file.name === name);
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