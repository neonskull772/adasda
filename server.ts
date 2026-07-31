import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API route for Gemini AI Artwork Interpretation
  app.post('/api/interpret-art', async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'imageBase64 parameter required' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not set in environment.' });
      }

      const ai = new GoogleGenAI({ apiKey });
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: base64Data,
                },
              },
              {
                text: 'Analyze this air drawing created by a user moving their hand in front of a webcam. Describe what shapes, figures, or abstract artwork you see, offer a creative artistic critique, and suggest 3 imaginative ideas for what they could add or transform this drawing into!',
              },
            ],
          },
        ],
      });

      const analysisText = response.text || 'Unable to analyze artwork.';
      return res.json({ analysis: analysisText });
    } catch (err: any) {
      console.error('Error in /api/interpret-art:', err);
      return res.status(500).json({ error: err.message || 'Gemini AI processing error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
