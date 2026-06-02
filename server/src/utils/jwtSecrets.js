const requireJwtSecret = (name) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required. Refusing to use a fallback JWT secret.`);
  }

  return value;
};

module.exports = {
  requireJwtSecret,
};