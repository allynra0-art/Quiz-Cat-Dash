import { useEffect, useRef, useState } from 'react';
import { QTYPE_BY_ID } from './questions';

// Isi kotak soal saat energi habis. Tampilannya menyesuaikan tipe soal.
// `locked` = masa jeda di awal soal: semua tombol mati supaya ketukan beruntun
// dari tombol LARI tidak ikut menjawab soal secara tidak sengaja.
export default function QuizPanel({ question, locked, lockMs, busy, onAnswer }) {
  const [text, setText] = useState('');
  const [picked, setPicked] = useState([]); // urutan indeks huruf yang dipilih (Acak Kata)
  const inputRef = useRef(null);
  const type = question.type || 'pg';
  const off = locked || busy;

  useEffect(() => {
    setText('');
    setPicked([]);
  }, [question.number]);

  // setelah jeda selesai, kolom ketik langsung aktif
  useEffect(() => {
    if (!locked && (type === 'short' || type === 'chain')) inputRef.current?.focus();
  }, [locked, type, question.number]);

  const send = (val) => {
    if (off) return;
    onAnswer(val);
  };
  const letters = Array.isArray(question.letters) ? question.letters : [];
  const built = picked.map((i) => letters[i]).join('');

  return (
    <div className={`quizBody type-${type}`}>
      <div className="quizMeta">
        <span className="qNo">SOAL {question.number}</span>
        <span className="qTag">{QTYPE_BY_ID[type]?.label || 'Pilihan Ganda'}</span>
      </div>

      {type === 'chain' ? (
        <h3 className="qPrompt">
          Sambung kata dari <span className="chainWord">{question.prompt}</span>
        </h3>
      ) : (
        <h3 className="qPrompt">{question.prompt}</h3>
      )}

      {locked && (
        <div className="lockBanner" style={{ '--lock-ms': `${lockMs}ms` }}>
          <span>Bersiap… baca soalnya dulu</span>
          <i />
        </div>
      )}

      {type === 'pg' && (
        <div className="answerGrid">
          {question.options.map((o, i) => (
            <button key={i} disabled={off} onClick={() => send(String(i))}>
              <b className="optKey">{'ABCD'[i]}</b>
              <span>{o}</span>
            </button>
          ))}
        </div>
      )}

      {type === 'tf' && (
        <div className="tfGrid">
          <button className="tfBtn yes" disabled={off} onClick={() => send('0')}>
            {question.options?.[0] || 'Benar'}
          </button>
          <button className="tfBtn no" disabled={off} onClick={() => send('1')}>
            {question.options?.[1] || 'Salah'}
          </button>
        </div>
      )}

      {(type === 'short' || type === 'chain') && (
        <form
          className="typeRow"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) send(text.trim());
          }}
        >
          {type === 'chain' && (
            <span className="startChip" title="Huruf pertama jawabanmu">
              {question.starts || '?'}
            </span>
          )}
          <input
            ref={inputRef}
            value={text}
            readOnly={off}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              type === 'chain'
                ? `Kata yang diawali huruf ${question.starts || '?'}`
                : 'Ketik jawabanmu di sini'
            }
            maxLength={60}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <button type="submit" disabled={off || !text.trim()}>
            KIRIM
          </button>
        </form>
      )}

      {type === 'scramble' && (
        <div className="scrambleBox">
          <div className="slotRow" aria-label="Susunan jawabanmu">
            {letters.map((_, i) => (
              <span key={i} className={`slot ${picked[i] !== undefined ? 'filled' : ''}`}>
                {picked[i] !== undefined ? letters[picked[i]] : ''}
              </span>
            ))}
          </div>
          <div className="tileRow">
            {letters.map((l, i) => (
              <button
                key={i}
                className="tile"
                disabled={off || picked.includes(i)}
                onClick={() => setPicked((p) => [...p, i])}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="scrambleActions">
            <button
              className="ghost"
              disabled={off || !picked.length}
              onClick={() => setPicked((p) => p.slice(0, -1))}
            >
              ⌫ HAPUS
            </button>
            <button className="ghost" disabled={off || !picked.length} onClick={() => setPicked([])}>
              ULANG
            </button>
            <button disabled={off || !picked.length} onClick={() => send(built)}>
              KIRIM
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
