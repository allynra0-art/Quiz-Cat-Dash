import { useEffect, useState } from 'react';

export const CATS = ['orange', 'white', 'black', 'gray'];
export const LABELS = {
  orange: 'Oren',
  white: 'Putih',
  black: 'Hitam',
  gray: 'Abu-abu',
};

// Warna bingkai avatar (harus sama dengan daftar di SQL: profiles.avatar_color)
export const AVATAR_COLORS = {
  sun: '#f4b942',
  pink: '#ef8b6c',
  sky: '#7cc3c9',
  moss: '#9db36a',
  plum: '#b39ad0',
  ink: '#6b5d4f',
};
export const AVATAR_COLOR_NAMES = Object.keys(AVATAR_COLORS);

// Gambar kucing. Kalau gambar lari/dash tidak ada, otomatis pakai gambar diam (idle)
// supaya kucing tidak pernah menghilang.
export function Cat({ cat = 'orange', action = 'idle', size = 88 }) {
  const [act, setAct] = useState(action);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setAct(action);
    setFailed(false);
  }, [cat, action]);

  if (failed)
    return (
      <span
        className="catMissing"
        style={{ width: size, height: size }}
        aria-label="Sprite tidak ditemukan"
      />
    );
  return (
    <img
      className="cat"
      src={`/assets/characters/cat_${cat}_${act}.png`}
      alt={`Kucing ${LABELS[cat] || ''}`}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      draggable="false"
      onError={() => (act !== 'idle' ? setAct('idle') : setFailed(true))}
    />
  );
}

// Foto profil bulat: kucing + warna bingkai
export function Avatar({ cat = 'orange', color = 'sun', size = 48, online }) {
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        background: AVATAR_COLORS[color] || AVATAR_COLORS.sun,
      }}
    >
      <Cat cat={cat} size={Math.round(size * 1.15)} />
      {online !== undefined && (
        <i className={`avatarDot ${online ? 'on' : ''}`} title={online ? 'Online' : 'Offline'} />
      )}
    </span>
  );
}
