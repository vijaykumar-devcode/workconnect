const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const normalizeOrigin = (value) => {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch (error) {
    return value.replace(/\/+$/, '');
  }
};

const getAllowedOrigins = () => {
  const configuredOrigins = [
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGIN,
    process.env.CLIENT_ORIGIN,
    process.env.ALLOWED_ORIGINS,
  ]
    .flatMap((value) => (value ? value.split(',') : []))
    .map((value) => normalizeOrigin(value.trim()))
    .filter(Boolean);

  return [...new Set([...DEFAULT_ORIGINS, ...configuredOrigins])];
};

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  return getAllowedOrigins().includes(normalizeOrigin(origin));
};

const corsOriginDelegate = (origin, callback) => {
  if (isAllowedOrigin(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error('Origin not allowed by CORS'));
};

module.exports = {
  corsOriginDelegate,
  getAllowedOrigins,
  isAllowedOrigin,
  normalizeOrigin,
};