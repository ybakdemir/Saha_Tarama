export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { system, messages } = req.body;
    const userMsg = messages[0].content;
    const imageBlock = userMsg.find(b => b.type === 'image');
    const textBlock = userMsg.find(b => b.type === 'text');

    const prompt = `Sen bir yeraltı tarama uzmanısın. Aşağıdaki OKM Visualizer 3D ekran görüntüsünü analiz et.

${system}

SADECE şu JSON formatında yanıt ver, başka hiçbir şey yazma:
{"anomaliler":[{"tip":"Metal/Boşluk/Mineral/Kaya/Toprak","renk":"","konum":"","derinlikVeyaYayilim":"","guven":"Yüksek/Orta/Düşük","oncelik":"Kritik/Yüksek/Normal","aciklama":"","sensorNotu":""}],"kalibrasyon":{"derinlikGuvenirligi":"Yüksek/Orta/Düşük","nedenAciklama":"","sensorYuksekligi":"","cozunurlukNotu":""},"sahaRaporu":"","uyarilar":[],"onerilenenAksiyon":""}`;

    const parts = [
      {
        inline_data: {
          mime_type: imageBlock.source.media_type || 'image/jpeg',
          data: imageBlock.source.data
        }
      },
      { text: prompt }
    ];

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            maxOutputTokens: 2000,
            temperature: 0.3
          }
        })
      }
    );

    const geminiData = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error('Gemini error:', JSON.stringify(geminiData));
      return res.status(200).json({
        content: [{ type: 'text', text: '' }]
      });
    }

    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({
      content: [{ type: 'text', text }]
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
