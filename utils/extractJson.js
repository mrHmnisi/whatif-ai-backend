// utils/extractJson.js
export function extractJson(text) {
  if (!text || typeof text !== "string") {
    console.warn("extractJson received non-string:", text);
    return null;
  }

  // Match ```json ... ``` or ``` ... ```
  const match = text.match(/```(?:json)?([\s\S]*?)```/i);
  const jsonString = match ? match[1].trim() : text.trim();

  try {
    return JSON.parse(jsonString);
  } catch (err) {
    console.error("❌ Failed to parse JSON on backend:", err, {
      preview: jsonString.slice(0, 200),
    });
    return null;
  }
}

