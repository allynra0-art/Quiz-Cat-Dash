import { QTYPES, QTYPE_BY_ID, MAX_SHORT_ANSWERS, MAX_CHAIN_ANSWERS, lastLetter } from './questions';

// Editor satu soal di halaman Buat / Edit Kuis. Mengubah data lewat onPatch({...}).
export default function QuestionEditor({ q, index, first, onPatch, onDelete }) {
  const setType = (type) => {
    if (type === q.type) return;
    onPatch({
      type,
      options: type === 'pg' ? ['', '', '', ''] : type === 'tf' ? ['Benar', 'Salah'] : [],
      correct_index: 0,
      answers: [''],
    });
  };
  const setAnswer = (j, v) => onPatch({ answers: q.answers.map((a, k) => (k === j ? v : a)) });
  const addAnswer = (max) => q.answers.length < max && onPatch({ answers: [...q.answers, ''] });
  const delAnswer = (j) =>
    onPatch({ answers: q.answers.length > 1 ? q.answers.filter((_, k) => k !== j) : [''] });

  const need = q.type === 'chain' ? lastLetter(q.prompt) : '';

  const answerList = (max, placeholder) => (
    <div className="ansList">
      {q.answers.map((a, j) => (
        <div className="ansRow" key={j}>
          <span className="ansNo">{j + 1}</span>
          <input
            value={a}
            maxLength={60}
            onChange={(e) => setAnswer(j, e.target.value)}
            placeholder={j === 0 ? placeholder : 'Jawaban lain yang juga benar'}
          />
          {q.answers.length > 1 && (
            <button type="button" className="ghost mini" onClick={() => delAnswer(j)} title="Hapus jawaban ini">
              ✕
            </button>
          )}
        </div>
      ))}
      {q.answers.length < max && (
        <button type="button" className="ghost mini addAns" onClick={() => addAnswer(max)}>
          + jawaban lain ({q.answers.length}/{max})
        </button>
      )}
    </div>
  );

  return (
    <div className="questionEditor">
      <div className="between">
        <b className="qeTitle">SOAL {index + 1}</b>
        <button
          type="button"
          id={first ? 'tour-btn-hapus-soal' : undefined}
          className="ghost danger"
          onClick={onDelete}
        >
          HAPUS
        </button>
      </div>

      <div className="typeChips" id={first ? 'tour-tipe-soal' : undefined} role="tablist">
        {QTYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={q.type === t.id}
            className={`typeChip ${q.type === t.id ? 'on' : ''}`}
            onClick={() => setType(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <small className="fieldHint">{QTYPE_BY_ID[q.type].desc}</small>

      {q.type === 'chain' ? (
        <input
          id={first ? 'tour-input-soal' : undefined}
          value={q.prompt}
          maxLength={30}
          onChange={(e) => onPatch({ prompt: e.target.value })}
          placeholder="Kata awal, misalnya: MEJA"
        />
      ) : (
        <textarea
          id={first ? 'tour-input-soal' : undefined}
          rows={2}
          value={q.prompt}
          onChange={(e) => onPatch({ prompt: e.target.value })}
          placeholder={
            q.type === 'tf'
              ? 'Tulis pernyataan, misalnya: Ikan bernapas dengan insang.'
              : q.type === 'scramble'
              ? 'Tulis petunjuk, misalnya: Hewan yang suka mengeong'
              : 'Tulis pertanyaan...'
          }
        />
      )}

      {q.type === 'pg' && (
        <>
          <div className="options">
            {q.options.map((v, j) => {
              const isCorrect = Number(q.correct_index) === j;
              return (
                <label className={`optionEdit ${isCorrect ? 'correct' : ''}`} key={j}>
                  <input
                    type="radio"
                    name={`correct-${q._key}`}
                    checked={isCorrect}
                    onChange={() => onPatch({ correct_index: j })}
                    title="Tandai sebagai jawaban benar"
                  />
                  <span className="optLetter">{'ABCD'[j]}</span>
                  <input
                    value={v}
                    onChange={(e) =>
                      onPatch({ options: q.options.map((o, k) => (k === j ? e.target.value : o)) })
                    }
                    placeholder={`Pilihan ${'ABCD'[j]}`}
                  />
                  {isCorrect && <span className="okTag">BENAR</span>}
                </label>
              );
            })}
          </div>
          <small className="fieldHint">Klik bulat di sebelah kiri huruf untuk menandai jawaban yang benar.</small>
        </>
      )}

      {q.type === 'tf' && (
        <div className="tfEdit">
          {['Benar', 'Salah'].map((label, j) => (
            <label key={label} className={`tfPick ${Number(q.correct_index) === j ? 'on' : ''}`}>
              <input
                type="radio"
                name={`correct-${q._key}`}
                checked={Number(q.correct_index) === j}
                onChange={() => onPatch({ correct_index: j })}
              />
              <span>Pernyataan ini {label.toUpperCase()}</span>
            </label>
          ))}
        </div>
      )}

      {q.type === 'short' && (
        <>
          <label className="miniLabel">Jawaban yang benar</label>
          {answerList(MAX_SHORT_ANSWERS, 'Contoh: Jakarta')}
          <small className="fieldHint">
            Besar-kecil huruf dan tanda baca tidak dipermasalahkan. Tambahkan cara penulisan lain
            supaya pemain tidak dianggap salah.
          </small>
        </>
      )}

      {q.type === 'scramble' && (
        <>
          <label className="miniLabel">Kata yang harus disusun pemain</label>
          <div className="ansRow">
            <span className="ansNo">1</span>
            <input
              value={q.answers[0] || ''}
              maxLength={20}
              onChange={(e) => onPatch({ answers: [e.target.value] })}
              placeholder="Contoh: kucing"
            />
          </div>
          <small className="fieldHint">
            Huruf-hurufnya akan diacak otomatis. 3 sampai 14 huruf.
            {(q.answers[0] || '').trim() && (
              <> Contoh tampilan: <b className="scramblePreview">{[...(q.answers[0] || '').replace(/\s/g, '').toUpperCase()].sort().join(' ')}</b></>
            )}
          </small>
        </>
      )}

      {q.type === 'chain' && (
        <>
          <label className="miniLabel">
            Kata sambungan yang benar{need ? ` (harus diawali huruf ${need})` : ''}
          </label>
          {answerList(MAX_CHAIN_ANSWERS, need ? `Contoh: kata berawalan ${need}` : 'Isi kata awal dulu')}
          <small className="fieldHint">
            Pemain bebas mengetik, tapi hanya kata di daftar ini yang dianggap benar. Isi sebanyak
            mungkin kata (maks {MAX_CHAIN_ANSWERS}) supaya adil.
          </small>
        </>
      )}
    </div>
  );
}
