import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  app.post('/api/ai/dispatch-brief', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error: 'GEMINI_API_KEY_NOT_CONFIGURED',
        message: 'Gemini API key is not configured in server environment. Using deterministic rule-based dispatcher.',
      });
      return;
    }

    const { scenario, disruptedMetrics, recoveredMetrics, topDelayedFlights, topMissedConnections, recommendations, appliedActions } =
      req.body ?? {};

    if (!scenario || !disruptedMetrics) {
      res.status(400).json({
        error: 'INVALID_PAYLOAD',
        message: 'Simulation scenario and calculated metrics are required.',
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const promptPayload = {
        scenario,
        disruptedMetrics,
        recoveredMetrics,
        topDelayedFlights: (topDelayedFlights ?? []).slice(0, 8),
        topMissedConnections: (topMissedConnections ?? []).slice(0, 6),
        deterministicRecommendations: (recommendations ?? []).slice(0, 5).map((r: Record<string, unknown>) => ({
          id: r.id,
          type: r.type,
          title: r.title,
          airportCode: r.airportCode,
          impact: r.impact,
          tradeoff: r.tradeoff,
        })),
        appliedActions: (appliedActions ?? []).map((a: Record<string, unknown>) => ({
          id: a.id,
          title: a.title,
          type: a.type,
        })),
      };

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Analyze this airline operations simulation snapshot and produce a concise dispatcher recovery brief. Use ONLY the exact numerical values provided in the JSON.\n\n${JSON.stringify(
          promptPayload,
          null,
          2
        )}`,
        config: {
          systemInstruction:
            'You are a senior airline Operations Control Center (OCC) dispatcher advising on flight disruption recovery. ' +
            'CRITICAL RULE: Never invent, extrapolate, or alter any numerical figure. Every flight count, delay minute, passenger count, and recovery delta you cite MUST come verbatim from the supplied JSON simulation results. ' +
            'Explain concisely: (1) what is disrupted, (2) why delays propagated through rotations/crew/connections, (3) which deterministic recovery actions are recommended and their exact calculated impacts, and (4) operational trade-offs.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              situationSummary: {
                type: Type.STRING,
                description: '2-3 sentence factual summary of the primary disruption and calculated network impact.',
              },
              propagationAnalysis: {
                type: Type.STRING,
                description: '2-3 sentence explanation of why delays cascaded across rotations, crew duty, and connections.',
              },
              recommendedStrategy: {
                type: Type.STRING,
                description: '2-3 sentence prioritized recovery plan referencing the exact deterministic candidate titles and impact numbers.',
              },
              tradeoffNotes: {
                type: Type.STRING,
                description: '1-2 sentence operational trade-off summary for the recommended actions.',
              },
            },
            required: ['situationSummary', 'propagationAnalysis', 'recommendedStrategy', 'tradeoffNotes'],
          },
        },
      });

      const text = (response.text ?? '').trim();
      if (!text) {
        res.status(502).json({
          error: 'EMPTY_MODEL_RESPONSE',
          message: 'Model returned an empty response.',
        });
        return;
      }

      const parsed = JSON.parse(text);
      res.json({
        source: 'gemini',
        model: 'gemini-4-hydrogen',
        brief: parsed,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gemini request failed';
      console.error('AI dispatch brief error:', message);
      res.status(502).json({
        error: 'GEMINI_UPSTREAM_ERROR',
        message,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Domino Sky OCC server running at http://localhost:${PORT}`);
  });
}

startServer();
