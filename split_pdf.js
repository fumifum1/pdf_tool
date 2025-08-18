// pdf-lib のライブラリをグローバルスコープから取得
const { PDFDocument } = window.PDFLib;
const JSZip = window.JSZip;

const log = document.getElementById('log');
const splitButton = document.getElementById('splitButton');
const pdfFileInput = document.getElementById('pdfFileInput');
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

async function splitPdf() {
    const file = pdfFileInput.files[0];

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
        const targetPages = Array.from({ length: pageCount }, (_, i) => i);

        if (targetPages.length === 0) {
            updateStatus('PDFにページがありません。');
            return;
        }

        updateStatus(`合計 ${pageCount} ページを処理しています...`);

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