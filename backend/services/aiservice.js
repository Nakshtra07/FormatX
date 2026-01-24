const { Configuration, OpenAIApi } = require("openai");

const config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY
});
const client = new OpenAIApi(config);

async function interpretStructure(text) {
    const prompt = `Analyze this and output JSON structure (types: heading, paragraph, code):\n\n${text}`;
    const gptResponse = await client.createChatCompletion({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    });
    
    try {
        return JSON.parse(gptResponse.data.choices[0].message.content);
    } catch {
        return [{ type: "paragraph", text }];
    }
}

module.exports = { interpretStructure };
