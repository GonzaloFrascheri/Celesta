const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.json({ message: 'Hello World! - Backend' });
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});