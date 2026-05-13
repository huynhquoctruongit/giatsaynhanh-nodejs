const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const randomChunk = (length: number): string => {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
};

export const generateOrderCode = (): string => {
  const date = new Date();
  const yyyymmdd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}${String(date.getDate()).padStart(2, '0')}`;
  return `LD-${yyyymmdd}-${randomChunk(5)}`;
};
