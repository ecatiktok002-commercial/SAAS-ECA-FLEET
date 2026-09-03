import fetch from 'node-fetch';
import fs from 'fs';

async function run() {
    try {
        const base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
        const res = await fetch('http://127.0.0.1:3000/api/identify-dashboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64Image, mimeType: 'image/png' })
        });
        const json = await res.json();
        console.log("Response:", json);
    } catch (e) {
        console.error("Error:", e);
    }
}
run();
