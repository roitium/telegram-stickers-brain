const { GoogleGenerativeAI } = require("@google/generative-ai");
const https = require("https");

let apiKey = process.env.VLM_API_KEY;

if (!apiKey) {
  console.error("VLM_API_KEY is not set in plugin config.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

// If the model string includes a provider prefix (e.g. "google/gemini..."), strip it.
let rawModel = process.env.VLM_MODEL || "gemini-3.1-flash-lite-preview";
const modelName = rawModel.includes("/") ? rawModel.split("/")[1] : rawModel;

async function describeImage(imageUrl, promptText) {
  const model = genAI.getGenerativeModel({ model: modelName });

  return new Promise((resolve, reject) => {
    https.get(imageUrl, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', async () => {
        const buffer = Buffer.concat(chunks);
        
        try {
          const imageParts = [
            {
              inlineData: {
                data: buffer.toString("base64"),
                mimeType: "image/webp"
              }
            }
          ];

          const result = await model.generateContent([promptText, ...imageParts]);
          const response = await result.response;
          const text = response.text();
          resolve(text);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

const [,, imageUrl, prompt] = process.argv;
if (imageUrl && prompt) {
  describeImage(imageUrl, prompt)
    .then(text => console.log(text))
    .catch(err => {
      console.error(err.message);
      process.exit(1);
    });
}
