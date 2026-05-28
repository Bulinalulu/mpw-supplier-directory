const express = require('express');
const path = require('path');
const { handler } = require('./netlify/functions/generate-rfq');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '5mb' }));

app.post('/api/generate-rfq', async (req, res) => {
  try {
    const result = await handler({ httpMethod: 'POST', body: JSON.stringify(req.body) });
    res.status(result.statusCode || 200).json(JSON.parse(result.body));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`API server on :${PORT}`));
