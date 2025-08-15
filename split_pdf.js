// pdf-lib のライブラリをグローバルスコープから取得
const { PDFDocument } = window.PDFLib;
const JSZip = window.JSZip;

const log = document.getElementById('log');
const splitButton = document.getElementById('splitButton');
const pdfFileInput = document.getElementById('pdfFileInput');
const pageRangesInput = document.getElementById('pageRangesInput');
const fileNameLabel = document.getElementById('fileNameLabel');

// ボタンがクリックされたときの処理を定義
splitButton.addEventListener('click', splitPdf);

pdfFileInput.addEventListener('change', () => {
    const file = pdfFileInput.files[0];
    if (file) {
        fileNameLabel.textContent = file.name;
    } else {
        fileNameLabel.textContent = '選択されていません';
    }
});

/**
 * ページ範囲の文字列 (例: "1-3, 5, 8-10") を解析し、
 * 0から始まるページ番号の配列に変換します。
 * @param {string} rangesStr - ページ範囲の文字列。
 * @param {number} maxPage - PDFの総ページ数。
 * @returns {number[]} - 処理対象のページ番号の配列 (0-indexed)。
 */
function parsePageRanges(rangesStr, maxPage) {
    if (!rangesStr.trim()) {
        // 入力が空の場合はすべてのページを対象とする
        return Array.from({ length: maxPage }, (_, i) => i);
    }

    const ranges = rangesStr.split(',');
    const pages = new Set();

    for (const range of ranges) {
        const parts = range.trim().split('-').map(Number);
        if (parts.length === 1) {
            if (!isNaN(parts[0])) pages.add(parts[0] - 1);
        } else if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            const [start, end] = parts;
            for (let i = start; i <= end; i++) {
                pages.add(i - 1);
            }
        }
    }

    return Array.from(pages).filter(p => p >= 0 && p < maxPage).sort((a, b) => a - b);
}

async function splitPdf() {
    const file = pdfFileInput.files[0];
    const rangesStr = pageRangesInput.value;

    // ログエリアをクリア
    log.innerHTML = '';

    const statusMessage = document.createElement('p');
    log.appendChild(statusMessage);

    const updateStatus = (message) => {
        statusMessage.textContent = message;
    };

    if (!file) {
        updateStatus('PDFファイルを選択してください。');
        return;
    }

    updateStatus('PDFの分割を開始します...');

    try {
        // ファイルの内容を読み込む
        const arrayBuffer = await file.arrayBuffer();
        const originalPdf = await PDFDocument.load(arrayBuffer);
        const originalName = file.name.lastIndexOf('.') > 0 
            ? file.name.substring(0, file.name.lastIndexOf('.')) 
            : file.name;

        const pageCount = originalPdf.getPageCount();
        const targetPages = parsePageRanges(rangesStr, pageCount);

        if (targetPages.length === 0) {
            updateStatus('指定されたページが見つかりませんでした。範囲を確認してください。');
            return;
        }

        updateStatus(`合計 ${pageCount} ページ中、${targetPages.length} ページを処理しています...`);

        const zip = new JSZip();

        // 指定されたページごとに新しいPDFを作成し、ZIPに追加
        for (let i = 0; i < targetPages.length; i++) {
            const pageIndex = targetPages[i];
            updateStatus(`処理中: ${i + 1} / ${targetPages.length} ページ...`);

            const newPdf = await PDFDocument.create();
            const [copiedPage] = await newPdf.copyPages(originalPdf, [pageIndex]);
            newPdf.addPage(copiedPage);
 
            const newPdfBytes = await newPdf.save();
            const fileName = `${originalName}_page${pageIndex + 1}.pdf`;
            zip.file(fileName, newPdfBytes);
        }

        updateStatus('ZIPファイルを生成中です...');

        // ZIPファイルを生成してダウンロードリンクを作成
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipUrl = URL.createObjectURL(zipBlob);
        const zipLink = document.createElement('a');
        zipLink.href = zipUrl;
        zipLink.download = `${originalName}_split.zip`;
        zipLink.textContent = '分割したPDFのZIPファイルをダウンロード';
        
        updateStatus('処理が完了しました。');
        log.appendChild(zipLink);
    } catch (error) {
        console.error(error);
        updateStatus('エラーが発生しました: ' + error.message);
    }
}