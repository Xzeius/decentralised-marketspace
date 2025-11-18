import * as tf from "@tensorflow/tfjs";

let cachedModel = null;

async function loadModel() {
    if (cachedModel) return cachedModel;
    try {
        cachedModel = await tf.loadLayersModel(
            "https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v2 _100_224/classification/3/default/1"
        );
        return cachedModel;
    } catch (error) {
        console.error("Failed to load ML model:", error);
        return null;
    }
}

function imageToTensor(img) {
    return tf.browser
        .fromPixels(img)
        .resizeNearestNeighbor([224, 224])
        .expandDims(0)
        .toFloat()
        .div(255.0);
}

function calculateBrightness(img) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let brightness = 0;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        brightness += (r + g + b) / 3;
    }
    return brightness / (data.length / 4) / 255;
}

function generateQualitySuggestions(score, img) {
    const suggestions = [];
    if (score < 30) suggestions.push("Very low quality - consider a better image");
    else if (score < 50) suggestions.push("Low quality - may not display well");
    else if (score < 70) suggestions.push("Good quality");
    else if (score < 85) suggestions.push("High quality");
    else suggestions.push("Excellent quality");

    if (img.width < 300 || img.height < 300) {
        suggestions.push("Consider higher resolution (min 300x300)");
    }
    const ar = img.width / img.height;
    if (ar < 0.5 || ar > 2) {
        suggestions.push("Unusual aspect ratio - square-ish images work best");
    }
    return suggestions;
}

function calculateQualityScore(img, confidence) {
    let score = 0;
    // Model confidence (0-40)
    score += Math.max(0, Math.min(1, confidence)) * 40;
    // Resolution (0-30)
    const pixels = img.width * img.height;
    if (pixels >= 1000000) score += 30;
    else if (pixels >= 500000) score += 20;
    else if (pixels >= 250000) score += 10;
    // Aspect ratio (0-15)
    const ar = img.width / img.height;
    if (ar >= 0.8 && ar <= 1.2) score += 15;
    else if (ar >= 0.6 && ar <= 1.6) score += 10;
    else score += 5;
    // Brightness (0-15)
    const brightness = calculateBrightness(img);
    if (brightness >= 0.3 && brightness <= 0.7) score += 15;
    else if (brightness >= 0.2 && brightness <= 0.8) score += 10;
    else score += 5;
    return Math.min(100, Math.max(0, score));
}

export async function checkImageQuality(imageUrl) {
    try {
        const model = await loadModel();
        // Proceed even if model fails: still compute heuristic metrics
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imageUrl;
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });

        let confidence = 0.5;
        if (model) {
            const tensor = imageToTensor(img);
            const predictions = model.predict(tensor);
            const maxTensor = predictions.max();
            const maxArr = await maxTensor.data();
            confidence = maxArr[0] ?? 0.5;
            tf.dispose([tensor, predictions, maxTensor]);
        }

        const qualityScore = calculateQualityScore(img, confidence);
        const suggestions = generateQualitySuggestions(qualityScore, img);

        return {
            qualityScore,
            confidence,
            suggestions,
            imageInfo: {
                width: img.width,
                height: img.height,
                aspectRatio: img.width / img.height
            }
        };
    } catch (error) {
        console.error("Image quality check failed:", error);
        return { error: "Failed to analyze image quality" };
    }
}


 export default checkImageQuality;