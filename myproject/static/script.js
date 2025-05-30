async function generateQR() {
    const url = document.getElementById("urlInput").value;

    if (!url.trim()) {
        alert("Entre une URL valide !");
        return;
    }

    const response = await fetch("/generate_qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
    });

    const data = await response.json();

    if (data.qr_code) {
        document.getElementById("qrImage").src = data.qr_code;
    } else {
        alert("Erreur lors de la génération !");
    }
}