document.addEventListener('DOMContentLoaded', () => {
    const pdfInput = document.getElementById('pdfInput');
    const jpgInput = document.getElementById('jpgInput');
    const pdfFileName = document.getElementById('pdfFileName');
    const jpgFileName = document.getElementById('jpgFileName');
    const convertPdfBtn = document.getElementById('convertPdfBtn');
    const convertJpgBtn = document.getElementById('convertJpgBtn');
    const pdfStatusMessage = document.getElementById('pdfStatusMessage');
    const jpgStatusMessage = document.getElementById('jpgStatusMessage');
    const compressPdfInput = document.getElementById('compressPdfInput');
    const compressPdfFileName = document.getElementById('compressPdfFileName');
    const compressPdfBtn = document.getElementById('compressPdfBtn');
    const compressPdfStatusMessage = document.getElementById('compressPdfStatusMessage');

    pdfInput.addEventListener('change', () => updateFileName(pdfInput, pdfFileName));
    jpgInput.addEventListener('change', () => updateFileName(jpgInput, jpgFileName));
    compressPdfInput.addEventListener('change', () => updateFileName(compressPdfInput, compressPdfFileName));

    convertPdfBtn.addEventListener('click', convertToJpg);
    convertJpgBtn.addEventListener('click', convertToPdf);
    compressPdfBtn.addEventListener('click', compressPdf);

    function updateFileName(input, display) {
        if (input.files.length > 0) {
            if (input.files.length === 1) {
                display.textContent = input.files[0].name;
            } else {
                display.textContent = `${input.files.length} 個のファイルが選択されました`;
            }
        } else {
            display.textContent = 'ファイルが選択されていません';
        }
    }

    async function convertToJpg() {
        const file = pdfInput.files[0];
        
        if (!file) {
            alert('PDFファイルを選択してください。');
            return;
        }

        convertPdfBtn.disabled = true;
        pdfStatusMessage.textContent = '変換を開始しています...';

        try {
            const qualitySelector = document.getElementById('pdfToJpgQuality');
            const scale = parseFloat(qualitySelector.value);

            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: scale });
                
                const canvas = document.createElement('canvas');
                const canvasContext = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext,
                    viewport,
                };
                await page.render(renderContext).promise;

                const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
                saveAs(imageBlob, `page_${i}.jpg`);
            }
            
            pdfStatusMessage.textContent = '変換が完了し、ダウンロードが開始されました。';

        } catch (error) {
            console.error('PDFからJPEGへの変換中にエラーが発生しました:', error);
            pdfStatusMessage.textContent = 'エラーが発生しました。コンソールを確認してください。';
            alert('変換中にエラーが発生しました。');
        } finally {
            convertPdfBtn.disabled = false;
        }
    }

    async function convertToPdf() {
        const files = jpgInput.files;

        if (files.length === 0) {
            alert('画像ファイルを選択してください。');
            return;
        }
        
        convertJpgBtn.disabled = true;
        jpgStatusMessage.textContent = '変換を開始しています...';

        try {
            let doc = null;

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                
                const imgData = await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(file);
                });

                const img = new Image();
                await new Promise(resolve => {
                    img.onload = resolve;
                    img.src = imgData;
                });
                
                const orientation = img.width > img.height ? 'l' : 'p';
                const format = 'a4';

                if (doc === null) {
                    doc = new jspdf.jsPDF({orientation, unit: 'mm', format});
                } else {
                    doc.addPage(format, orientation);
                }
                
                const pdfPageWidth = doc.internal.pageSize.getWidth();
                const pdfPageHeight = doc.internal.pageSize.getHeight();
                
                const aspectRatio = img.width / img.height;
                let newWidth, newHeight;

                // 画像がページに収まるようにサイズを調整
                if (img.width / pdfPageWidth > img.height / pdfPageHeight) {
                    newWidth = pdfPageWidth;
                    newHeight = newWidth / aspectRatio;
                } else {
                    newHeight = pdfPageHeight;
                    newWidth = newHeight * aspectRatio;
                }
                
                // 中央に配置するための座標を計算
                const x = (pdfPageWidth - newWidth) / 2;
                const y = (pdfPageHeight - newHeight) / 2;
                
                const fileType = file.type.split('/')[1].toUpperCase();
                
                doc.addImage(imgData, fileType, x, y, newWidth, newHeight);
            }

            const pdfBlob = doc.output('blob');
            saveAs(pdfBlob, 'output.pdf');
            
            jpgStatusMessage.textContent = '変換が完了し、ダウンロードが開始されました。';

        } catch (error) {
            console.error('画像からPDFへの変換中にエラーが発生しました:', error);
            jpgStatusMessage.textContent = 'エラーが発生しました。コンソールを確認してください。';
            alert('変換中にエラーが発生しました。');
        } finally {
            convertJpgBtn.disabled = false;
        }
    }

    async function compressPdf() {
        const file = compressPdfInput.files[0];
        
        if (!file) {
            alert('PDFファイルを選択してください。');
            return;
        }

        compressPdfBtn.disabled = true;
        compressPdfStatusMessage.textContent = '軽量化を開始しています...';

        try {
            const qualitySelector = document.getElementById('compressQuality');
            const scale = parseFloat(qualitySelector.value);

            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            const numPages = pdf.numPages;

            const imageBlobs = [];
            for (let i = 1; i <= numPages; i++) {
                compressPdfStatusMessage.textContent = `ページを画像に変換中... (${i}/${numPages})`;
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: scale });
                
                const canvas = document.createElement('canvas');
                const canvasContext = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext,
                    viewport,
                };
                await page.render(renderContext).promise;

                const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85)); // 品質の調整
                imageBlobs.push(imageBlob);
            }
            
            compressPdfStatusMessage.textContent = '画像をPDFに再変換しています...';
            let doc = null;

            for (let i = 0; i < imageBlobs.length; i++) {
                const blob = imageBlobs[i];
                
                const imgData = await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(blob);
                });

                const img = new Image();
                await new Promise(resolve => {
                    img.onload = resolve;
                    img.src = imgData;
                });
                
                const orientation = img.width > img.height ? 'l' : 'p';
                const format = 'a4';

                if (doc === null) {
                    doc = new jspdf.jsPDF({orientation, unit: 'mm', format});
                } else {
                    doc.addPage(format, orientation);
                }
                
                const pdfPageWidth = doc.internal.pageSize.getWidth();
                const pdfPageHeight = doc.internal.pageSize.getHeight();
                
                const aspectRatio = img.width / img.height;
                let newWidth, newHeight;

                if (img.width / pdfPageWidth > img.height / pdfPageHeight) {
                    newWidth = pdfPageWidth;
                    newHeight = newWidth / aspectRatio;
                } else {
                    newHeight = pdfPageHeight;
                    newWidth = newHeight * aspectRatio;
                }
                
                const x = (pdfPageWidth - newWidth) / 2;
                const y = (pdfPageHeight - newHeight) / 2;
                
                doc.addImage(imgData, 'JPEG', x, y, newWidth, newHeight);
            }

            const originalName = file.name.endsWith('.pdf') ? file.name.slice(0, -4) : file.name;
            const pdfBlob = doc.output('blob');
            saveAs(pdfBlob, `${originalName}_compressed.pdf`);
            
            compressPdfStatusMessage.textContent = '軽量化が完了し、ダウンロードが開始されました。';

        } catch (error) {
            console.error('PDFの軽量化中にエラーが発生しました:', error);
            compressPdfStatusMessage.textContent = 'エラーが発生しました。コンソールを確認してください。';
            alert('軽量化中にエラーが発生しました。');
        } finally {
            compressPdfBtn.disabled = false;
        }
    }
});