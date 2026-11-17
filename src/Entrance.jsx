import { useEffect, useRef, useState } from 'react';
import { Cat, CATS } from './Cat';

// Layar pembuka: judul jatuh huruf demi huruf, empat kucing berlari melintas dan
// "menarik" pintu kayu sampai terbuka, lalu muncul sapaan dan pilihan masuk.
// Ketuk di mana saja untuk melewati animasi.
//
// stage: 'intro' (judul) -> 'run' (kucing berlari) -> 'open' (pintu terbuka) -> 'welcome'
const TITLE = 'CAT DASH'.split('');

export default function Entrance({ skipIntro, user, onLogin, onGuest, onContinue, onSwitchAccount, busy }) {
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [stage, setStage] = useState(skipIntro || reduce ? 'welcome' : 'intro');
  const timers = useRef([]);

  useEffect(() => {
    if (stage === 'welcome') return;
    const at = (ms, next) => timers.current.push(setTimeout(() => setStage(next), ms));
    if (stage === 'intro') at(1500, 'run');
    if (stage === 'run') at(2700, 'open');
    if (stage === 'open') at(1100, 'welcome');
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [stage]);

  const skip = () => stage !== 'welcome' && setStage('welcome');
  const opened = stage === 'open' || stage === 'welcome';

  return (
    <div className={`entrance st-${stage}`} onClick={skip}>
      <div className="entBack">
        <div className="entGlow" />
        <div className="entWelcome" aria-hidden={stage !== 'welcome'}>
          <h2 className="entHello">
            {user ? `Selamat datang kembali${user.name ? `, ${user.name}` : ''}!` : 'Selamat datang di Cat Dash!'}
          </h2>
          <p className="entAsk">
            {user
              ? user.isGuest
                ? 'Kamu masuk sebagai tamu. Lanjut main?'
                : 'Siap balapan lagi?'
              : 'Mau masuk ke akunmu, atau coba dulu sebagai tamu?'}
          </p>
          <div className="entCats">
            {CATS.map((c) => (
              <Cat key={c} cat={c} size={70} />
            ))}
          </div>
          {user ? (
            <div className="entButtons">
              <button disabled={busy} onClick={onContinue}>LANJUTKAN</button>
              <button className="ghost" disabled={busy} onClick={onSwitchAccount}>
                {user.isGuest ? 'MASUK DENGAN AKUN' : 'GANTI AKUN'}
              </button>
            </div>
          ) : (
            <>
              <div className="entButtons">
                <button disabled={busy} onClick={onLogin}>MASUK / DAFTAR</button>
                <button className="secondary" disabled={busy} onClick={onGuest}>MAIN SEBAGAI TAMU</button>
              </div>
              <p className="entNote">
                Tamu hanya bisa <b>ikut bermain</b> di room temannya. Untuk membuat kuis, berteman,
                dan menyimpan riwayat, kamu perlu akun.
              </p>
            </>
          )}
        </div>
      </div>

      {/* pintu kayu */}
      <div className={`entDoor left ${opened ? 'open' : ''}`}><i /></div>
      <div className={`entDoor right ${opened ? 'open' : ''}`}><i /></div>

      {/* judul */}
      <h1 className={`entTitle ${opened ? 'gone' : ''}`} aria-label="Cat Dash">
        {TITLE.map((ch, i) => (
          <span key={i} className={ch === ' ' ? 'gap' : ''} style={{ '--i': i }}>
            {ch}
          </span>
        ))}
      </h1>

      {/* kucing berlari */}
      {(stage === 'run' || stage === 'open') && (
        <div className="entRunners" aria-hidden="true">
          {CATS.map((c, i) => (
            <div className="entRunner" key={c} style={{ '--d': `${i * 0.38}s` }}>
              <Cat cat={c} action="run_1" size={84} />
              <span className="entDust" />
            </div>
          ))}
        </div>
      )}

      {stage !== 'welcome' && <span className="entSkip">ketuk untuk lewati</span>}
    </div>
  );
}
