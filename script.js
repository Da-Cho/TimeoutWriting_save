// script.jsの内容 (PNG保存レイアウト修正版)
document.addEventListener('DOMContentLoaded', () => {
    // --- HTML要素の取得 ---
    const inputCanvas = document.getElementById('input-canvas');
    const inputCtx = inputCanvas.getContext('2d');
    const clearButton = document.getElementById('clear-button');
    const finalSentenceContainer = document.getElementById('final-sentence-container');
    const timeoutInput = document.getElementById('timeout-input');
    const soundToggleButton = document.getElementById('sound-toggle-button');

    // --- グローバル変数 ---
    let isDrawing = false;
    let timeoutId = null;
    let isSoundEnabled = true;
    let audioCtx = null;

    let finalSentenceData = [];
    let strokesForCurrentChar = [];
    let currentStrokeData = {};
    let characterStartTime = null;

    // --- 初期設定 ---
    inputCanvas.width = 200;
    inputCanvas.height = 200;

    // --- 関数定義 ---

    function initializeAudio() {
        if (!audioCtx) {
            try {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.error('Web Audio API is not supported in this browser.');
                isSoundEnabled = false;
                soundToggleButton.disabled = true;
                soundToggleButton.textContent = '音(非対応)';
            }
        }
    }

    function playTimeoutSound() {
        if (!isSoundEnabled || !audioCtx) return;
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.08);
    }

    function drawGuideLines(ctx = inputCtx) {
        ctx.save();
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(ctx.canvas.width / 2, 0);
        ctx.lineTo(ctx.canvas.width / 2, ctx.canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, ctx.canvas.height / 2);
        ctx.lineTo(ctx.canvas.width, ctx.canvas.height / 2);
        ctx.stroke();
        ctx.restore();
    }

    function setUserDrawingStyle() {
        inputCtx.strokeStyle = 'black';
        inputCtx.fillStyle = 'black';
        inputCtx.lineWidth = 5;
        inputCtx.lineCap = 'round';
        inputCtx.setLineDash([]);
    }

    function getCoordinates(e) {
        const rect = inputCanvas.getBoundingClientRect();
        if (e.touches && e.touches.length > 0) {
            const touch = e.touches[0];
            return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
        }
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function startDrawing(e) {
        e.preventDefault();
        clearTimeout(timeoutId);
        isDrawing = true;
        setUserDrawingStyle();
        
        const now = performance.now();

        if (strokesForCurrentChar.length === 0) {
            characterStartTime = now;
        }
        
        currentStrokeData = {
            startTime: now,
            endTime: 0,
            t: [0],
            x: [],
            y: []
        };
        
        const coords = getCoordinates(e);
        currentStrokeData.x.push(coords.x);
        currentStrokeData.y.push(coords.y);
        
        inputCtx.beginPath();
        inputCtx.moveTo(coords.x, coords.y);
    }

    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        
        const coords = getCoordinates(e);
        const elapsedTime = performance.now() - currentStrokeData.startTime;

        currentStrokeData.t.push(elapsedTime);
        currentStrokeData.x.push(coords.x);
        currentStrokeData.y.push(coords.y);

        inputCtx.lineTo(coords.x, coords.y);
        inputCtx.stroke();
    }

    function stopDrawing(e) {
        if (!isDrawing) return;
        e.preventDefault();
        isDrawing = false;
        
        currentStrokeData.endTime = performance.now();
        
        if (currentStrokeData.x.length > 1) {
            strokesForCurrentChar.push(currentStrokeData);
        }
        
        const timeoutDuration = parseInt(timeoutInput.value, 10) || 1000;
        timeoutId = setTimeout(finalizeCharacter, timeoutDuration);
    }

    function finalizeCharacter() {
        if (strokesForCurrentChar.length === 0) return;

        playTimeoutSound();

        const characterFinalizeTime = performance.now();

        const characterData = {
            characterIndex: finalSentenceData.length,
            characterStartTime: characterStartTime,
            characterFinalizeTime: characterFinalizeTime,
            strokes: strokesForCurrentChar.map((stroke, index) => ({
                strokeIndex: index,
                startTime: stroke.startTime,
                endTime: stroke.endTime,
                t: stroke.t,
                x: stroke.x,
                y: stroke.y
            }))
        };
        
        finalSentenceData.push(characterData);

        const charCanvas = document.createElement('canvas');
        const charCtx = charCanvas.getContext('2d');
        const charSize = 80;
        charCanvas.width = charSize;
        charCanvas.height = charSize;
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = inputCanvas.width;
        tempCanvas.height = inputCanvas.height;
        tempCtx.lineWidth = 5;
        tempCtx.lineCap = 'round';
        tempCtx.strokeStyle = 'black';
        
        strokesForCurrentChar.forEach(strokeData => {
            if (strokeData.x.length === 0) return;
            tempCtx.beginPath();
            tempCtx.moveTo(strokeData.x[0], strokeData.y[0]);
            for (let i = 1; i < strokeData.x.length; i++) {
                tempCtx.lineTo(strokeData.x[i], strokeData.y[i]);
            }
            tempCtx.stroke();
        });

        charCtx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, charSize, charSize);
        finalSentenceContainer.appendChild(charCanvas);

        inputCtx.clearRect(0, 0, inputCanvas.width, inputCanvas.height);
        drawGuideLines();
        
        strokesForCurrentChar = [];
        characterStartTime = null;
    }

    function clearOutput() {
        finalSentenceContainer.innerHTML = '';
        inputCtx.clearRect(0, 0, inputCanvas.width, inputCanvas.height);
        drawGuideLines();
        
        strokesForCurrentChar = [];
        finalSentenceData = [];
        characterStartTime = null;
        currentStrokeData = {};
        clearTimeout(timeoutId);
    }

    // --- イベントリスナー設定 ---
    
    function userInteractionHandler() {
        initializeAudio();
        document.body.removeEventListener('mousedown', userInteractionHandler);
        document.body.removeEventListener('touchstart', userInteractionHandler);
    }
    document.body.addEventListener('mousedown', userInteractionHandler);
    document.body.addEventListener('touchstart', userInteractionHandler);

    inputCanvas.addEventListener('mousedown', startDrawing);
    inputCanvas.addEventListener('mousemove', draw);
    inputCanvas.addEventListener('mouseup', stopDrawing);
    inputCanvas.addEventListener('mouseout', stopDrawing);
    inputCanvas.addEventListener('touchstart', startDrawing);
    inputCanvas.addEventListener('touchmove', draw);
    inputCanvas.addEventListener('touchend', stopDrawing);

    clearButton.addEventListener('click', () => {
        if (finalSentenceContainer.innerHTML !== '' && window.confirm('すべての文字を削除しますか？')) {
            clearOutput();
        } else if (finalSentenceContainer.innerHTML === '') {
             clearOutput();
        }
    });

    soundToggleButton.addEventListener('click', () => {
        isSoundEnabled = !isSoundEnabled;
        if (isSoundEnabled) {
            soundToggleButton.textContent = '音ON';
            soundToggleButton.classList.remove('off');
            playTimeoutSound();
        } else {
            soundToggleButton.textContent = '音OFF';
            soundToggleButton.classList.add('off');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.target.id === 'timeout-input') return;
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            timeoutInput.value = parseInt(timeoutInput.value, 10) + 50;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const currentValue = parseInt(timeoutInput.value, 10);
            if (currentValue > 100) {
                timeoutInput.value = currentValue - 50;
            }
        }
    });

    document.getElementById('save-json-button').addEventListener('click', () => {
        if (finalSentenceData.length === 0) {
            alert('保存するデータがありません。');
            return;
        }
        const jsonString = JSON.stringify(finalSentenceData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `handwriting-data-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // ★★★ 変更点: PNG保存処理 ★★★
    document.getElementById('save-png-button').addEventListener('click', () => {
        const charCanvases = finalSentenceContainer.querySelectorAll('canvas');
        if (charCanvases.length === 0) {
            alert('保存する画像がありません。');
            return;
        }
        
        const segmentsPerRow = 10; // 1行あたりのセグメント数
        const charSize = charCanvases[0].width; // 1文字のサイズ（例: 80px）
        const totalChars = charCanvases.length;

        // 最終的な画像のサイズを計算
        const numRows = Math.ceil(totalChars / segmentsPerRow);
        const canvasWidth = totalChars < segmentsPerRow ? charSize * totalChars : charSize * segmentsPerRow;
        const canvasHeight = charSize * numRows;

        const combinedCanvas = document.createElement('canvas');
        const combinedCtx = combinedCanvas.getContext('2d');
        combinedCanvas.width = canvasWidth;
        combinedCanvas.height = canvasHeight;
        
        // 背景を白で塗りつぶす
        combinedCtx.fillStyle = 'white';
        combinedCtx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);

        // 各文字のキャンバスを、計算した位置に描画していく
        charCanvases.forEach((canvas, index) => {
            const row = Math.floor(index / segmentsPerRow); // 何行目か
            const col = index % segmentsPerRow;             // 何列目か
            const x = col * charSize;
            const y = row * charSize;
            combinedCtx.drawImage(canvas, x, y);
        });
        
        // ダウンロード用のリンクを作成してクリック
        const a = document.createElement('a');
        a.href = combinedCanvas.toDataURL('image/png');
        a.download = `handwriting-image-${Date.now()}.png`;
        a.click();
    });

    // --- 実行開始 ---
    drawGuideLines();
});

