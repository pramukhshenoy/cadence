import './config';
import app from './app';

if (!process.env.API_BEARER_TOKEN) {
  throw new Error('API_BEARER_TOKEN env var is required');
}

const PORT = Number(process.env.PORT) || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});
