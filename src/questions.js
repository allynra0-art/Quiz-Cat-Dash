// Semua hal tentang tipe soal ada di sini: daftar tipe, bentuk data editor <-> database,
// validasi, dan kuis simulasi campuran.

export const QTYPES = [
    { id: 'pg', label: 'Pilihan Ganda', tag: 'PG', desc: '4 pilihan, 1 yang benar.' },
    { id: 'tf', label: 'Benar / Salah', tag: 'B/S', desc: 'Pernyataan yang harus dinilai benar atau salah.' },
    { id: 'short', label: 'Isian Singkat', tag: 'ISIAN', desc: 'Pemain mengetik jawabannya sendiri.' },
    { id: 'scramble', label: 'Acak Kata', tag: 'ACAK', desc: 'Huruf diacak, pemain menyusunnya jadi kata.' },
    { id: 'chain', label: 'Sambung Kata', tag: 'SAMBUNG', desc: 'Sambung kata dengan huruf terakhir kata yang diberikan.' },
  ];
  export const QTYPE_BY_ID = Object.fromEntries(QTYPES.map((t) => [t.id, t]));
  export const MAX_SHORT_ANSWERS = 5;
  export const MAX_CHAIN_ANSWERS = 10;
  
  let keySeed = 0;
  export const blankQuestion = (type = 'pg') => ({
    _key: ++keySeed, // key stabil supaya hapus soal tidak mengacak form
    type,
    prompt: '',
    options: type === 'pg' ? ['', '', '', ''] : type === 'tf' ? ['Benar', 'Salah'] : [],
    correct_index: 0,
    answers: [''],
  });
  
  export const lastLetter = (word) => {
    const letters = String(word || '').replace(/[^\p{L}]/gu, '');
    return letters ? letters.slice(-1).toUpperCase() : '';
  };
  
  // baris database -> bentuk editor
  export function fromRow(q) {
    const type = QTYPE_BY_ID[q.type] ? q.type : 'pg';
    const opts = Array.isArray(q.options) ? q.options.map(String) : [];
    const answers = Array.isArray(q.answers) ? q.answers.map(String) : [];
    return {
      _key: ++keySeed,
      type,
      prompt: q.prompt || '',
      options:
        type === 'pg'
          ? [...opts, '', '', '', ''].slice(0, 4)
          : type === 'tf'
          ? ['Benar', 'Salah']
          : [],
      correct_index: Math.max(0, Number(q.correct_index) || 0),
      answers: answers.length ? answers : [''],
    };
  }
  
  // bentuk editor -> baris database
  export function toRow(q, quizId, position) {
    const answers = (q.answers || []).map((a) => String(a).trim()).filter(Boolean);
    const row = {
      quiz_id: quizId,
      position,
      type: q.type,
      prompt: q.prompt.trim(),
      options: [],
      correct_index: 0,
      answers: [],
    };
    if (q.type === 'pg') {
      row.options = q.options.map((o) => o.trim());
      row.correct_index = Math.min(3, Math.max(0, Number(q.correct_index) || 0));
    } else if (q.type === 'tf') {
      row.options = ['Benar', 'Salah'];
      row.correct_index = Number(q.correct_index) === 1 ? 1 : 0;
    } else if (q.type === 'short') {
      row.answers = answers.slice(0, MAX_SHORT_ANSWERS);
    } else if (q.type === 'scramble') {
      row.answers = answers.slice(0, 1);
    } else {
      row.answers = answers.slice(0, MAX_CHAIN_ANSWERS);
    }
    return row;
  }
  
  // kembalikan teks error (bahasa Indonesia) atau '' kalau soal sudah benar
  export function validateQuestion(q, i) {
    const n = i + 1;
    const prompt = q.prompt.trim();
    const answers = (q.answers || []).map((a) => String(a).trim()).filter(Boolean);
    if (!prompt)
      return q.type === 'chain'
        ? `Soal nomor ${n}: isi kata awalnya (misal MEJA).`
        : `Soal nomor ${n} belum ada pertanyaannya.`;
    if (q.type === 'pg' && q.options.some((o) => !o.trim()))
      return `Lengkapi semua pilihan jawaban soal nomor ${n}.`;
    if (q.type === 'short' && !answers.length)
      return `Soal nomor ${n}: isi minimal satu jawaban yang benar.`;
    if (q.type === 'scramble') {
      const w = (answers[0] || '').replace(/\s/g, '');
      if (w.length < 3 || w.length > 14)
        return `Soal nomor ${n}: kata yang diacak harus 3 sampai 14 huruf.`;
    }
    if (q.type === 'chain') {
      if (!lastLetter(prompt)) return `Soal nomor ${n}: kata awal harus berisi huruf.`;
      if (!answers.length) return `Soal nomor ${n}: isi minimal satu kata sambungan.`;
      const need = lastLetter(prompt);
      const bad = answers.find((a) => a.replace(/[^\p{L}]/gu, '').charAt(0).toUpperCase() !== need);
      if (bad) return `Soal nomor ${n}: kata "${bad}" harus diawali huruf ${need}.`;
    }
    return '';
  }
  
  // teks kunci jawaban untuk halaman pembahasan
  export function answerText(q) {
    if (q.type === 'pg') return `${'ABCD'[q.correct_index]}. ${q.options?.[q.correct_index] ?? ''}`;
    if (q.type === 'tf') return q.options?.[q.correct_index] ?? (q.correct_index === 1 ? 'Salah' : 'Benar');
    return (q.answers || []).join('  /  ');
  }
  
  // ===== KUIS SIMULASI: 15 soal mudah, semua tipe soal ada (urutan sudah dicampur) =====
  export const SAMPLE_QUIZ_TITLE = 'Simulasi Kuis: Campuran Semua Tipe';
  const pg = (prompt, options, correct_index) => ({ type: 'pg', prompt, options, correct_index, answers: [] });
  const tf = (prompt, correct_index) => ({ type: 'tf', prompt, options: ['Benar', 'Salah'], correct_index, answers: [] });
  const sh = (prompt, answers) => ({ type: 'short', prompt, options: [], correct_index: 0, answers });
  const sc = (prompt, word) => ({ type: 'scramble', prompt, options: [], correct_index: 0, answers: [word] });
  const ch = (word, answers) => ({ type: 'chain', prompt: word, options: [], correct_index: 0, answers });
  
  export const SAMPLE_QUESTIONS = [
    pg('Berapa hasil 2 + 3?', ['4', '5', '6', '7'], 1),
    tf('Matahari terbit dari arah timur.', 0),
    sh('Ibu kota negara Indonesia adalah...', ['Jakarta', 'DKI Jakarta']),
    sc('Hewan yang suka mengeong', 'kucing'),
    ch('MEJA', ['ayam', 'angsa', 'apel', 'anggur', 'ayah', 'air', 'atap', 'awan']),
    pg('Berapa jumlah hari dalam seminggu?', ['5', '6', '8', '7'], 3),
    tf('Ikan bernapas menggunakan paru-paru.', 1),
    sh('Berapa hasil 6 x 3? (tulis angkanya)', ['18']),
    sc('Buah berwarna kuning yang dikupas kulitnya', 'pisang'),
    ch('BUKU', ['ular', 'udang', 'ubi', 'uang', 'unta', 'udara', 'ulat', 'ubur']),
    pg('Warna buah pisang yang sudah matang adalah...', ['Kuning', 'Biru', 'Hitam', 'Ungu'], 0),
    tf('Satu minggu ada 7 hari.', 0),
    sh('Warna daun yang segar adalah...', ['hijau']),
    pg('Benda langit yang bersinar di malam hari adalah...', ['Matahari', 'Awan', 'Bulan', 'Pelangi'], 2),
    tf('Ayam memiliki 4 kaki.', 1),
  ];
  