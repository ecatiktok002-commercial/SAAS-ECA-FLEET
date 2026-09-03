import fetch from 'node-fetch';

async function run() {
    try {
        // Fetch a clear car dashboard image from wikipedia/commons
        const imgRes = await fetch('https://upload.wikimedia.org/wikipedia/commons/4/4b/2018_Toyota_Camry_%28ASV70R%29_Ascent_sedan_dashboard_%282018-10-22%29_02.jpg');
        const buffer = await imgRes.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString('base64');
        
        const res = await fetch('http://127.0.0.1:3000/api/identify-dashboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64Image, mimeType: 'image/jpeg' })
        });
        const json = await res.json();
        console.log("Response:", json);
    } catch (e) {
        console.error("Error:", e);
    }
}
run();
