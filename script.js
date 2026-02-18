const video = document.getElementById('webcam');
const overlay = document.getElementById('overlay');
const ctx = overlay.getContext('2d');
const liveView = document.getElementById('liveView');
const demosSection = document.getElementById('demos');
const enableWebcamButton = document.getElementById('webcamButton');
const itensLista = document.getElementById('itensLista');
const totalPreco = document.getElementById('totalPreco');

const precos = {
    'apple': 2.50,
    'banana': 1.00,
    'orange': 1.50,
    'broccoli': 3.00,
    'carrot': 0.80,
    // Adicione mais se quiser
};

let model;

async function loadModel() {
    model = await cocoSsd.load();
    demosSection.classList.remove('invisible');
}

loadModel();

function getUserMediaSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

if (getUserMediaSupported()) {
    enableWebcamButton.addEventListener('click', enableCam);
} else {
    enableWebcamButton.innerText = "Câmera não suportada";
}

async function enableCam() {
    if (!model) {
        alert("Modelo ainda carregando...");
        return;
    }

    enableWebcamButton.style.display = 'none';

    const constraints = {
        video: {
            facingMode: "environment",          // Câmera traseira
            width: { ideal: 640 },              // Boa performance em mobile
            height: { ideal: 480 }
        }
    };

    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            video.play();
            // Ajusta canvas ao tamanho do vídeo
            overlay.width = video.videoWidth;
            overlay.height = video.videoHeight;
            predictWebcam();
        };
    } catch (err) {
        console.error("Erro ao acessar câmera:", err);
        alert("Não foi possível acessar a câmera. Verifique permissões.");
    }
}

function predictWebcam() {
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        requestAnimationFrame(predictWebcam);
        return;
    }

    model.detect(video).then(predictions => {
        // Limpa canvas
        ctx.clearRect(0, 0, overlay.width, overlay.height);

        const contagemItens = {};
        let total = 0;

        predictions.forEach(pred => {
            if (pred.score > 0.65 && precos[pred.class]) {
                const classe = pred.class;
                contagemItens[classe] = (contagemItens[classe] || 0) + 1;

                // Desenha bounding box no canvas
                const [x, y, width, height] = pred.bbox;
                ctx.strokeStyle = "#00ff00";
                ctx.lineWidth = 3;
                ctx.strokeRect(x, y, width, height);

                // Label
                ctx.fillStyle = "#00ff00";
                ctx.font = "16px Arial";
                ctx.fillText(`${classe} (${(pred.score * 100).toFixed(0)}%) - R$ ${precos[classe].toFixed(2)}`, x, y > 20 ? y - 5 : y + 20);
            }
        });

        // Atualiza nota fiscal
        itensLista.innerHTML = '';
        for (const [item, qtd] of Object.entries(contagemItens)) {
            const subtotal = qtd * precos[item];
            total += subtotal;
            const li = document.createElement('li');
            li.textContent = `${item.charAt(0).toUpperCase() + item.slice(1)} x ${qtd} = R$ ${subtotal.toFixed(2)}`;
            itensLista.appendChild(li);
        }
        totalPreco.textContent = `Total: R$ ${total.toFixed(2)}`;

        requestAnimationFrame(predictWebcam);
    }).catch(err => {
        console.error(err);
        requestAnimationFrame(predictWebcam);
    });
}

// Redimensiona canvas se vídeo mudar tamanho (ex: orientação)
window.addEventListener('resize', () => {
    if (video.videoWidth && video.videoHeight) {
        overlay.width = video.videoWidth;
        overlay.height = video.videoHeight;
    }
});
