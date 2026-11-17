import { useState } from 'react';
import { Avatar } from './Cat';

export const MAX_FRIENDS = 20; // harus sama dengan friend_limit() di SQL

// Layar Teman: kode teman, tambah teman, permintaan masuk, daftar teman.
export function FriendsScreen({ profile, friends, busy, dbReady, onAdd, onRespond, onRemove, onRefresh, onCopyCode }) {
  const [code, setCode] = useState('');
  const accepted = friends.filter((f) => f.state === 'friend');
  const incoming = friends.filter((f) => f.state === 'incoming');
  const outgoing = friends.filter((f) => f.state === 'outgoing');
  const full = accepted.length >= MAX_FRIENDS;

  if (!dbReady)
    return (
      <section className="panel">
        <h2>Teman</h2>
        <p className="muted">
          Fitur teman belum aktif karena database belum diperbarui. Jalankan file
          <b> catdash_v3.sql</b> di Supabase SQL Editor, lalu muat ulang halaman ini.
        </p>
      </section>
    );

  return (
    <section className="panel friendsPanel">
      <div className="between roomHeading">
        <div>
          <h2>Teman</h2>
          <p className="muted" style={{ margin: 0 }}>
            Berteman, lihat siapa yang online, dan undang mereka ke room.
          </p>
        </div>
        <span className={`friendCount ${full ? 'full' : ''}`}>
          {accepted.length}/{MAX_FRIENDS} teman
        </span>
      </div>

      <div className="friendTop">
        <div className="myCodeCard" id="tour-kode-saya">
          <small>KODE TEMANMU</small>
          <button className="code" onClick={onCopyCode} title="Salin kode">
            {profile?.friend_code || '------'}
          </button>
          <small>Bagikan kode ini ke temanmu. Klik untuk menyalin.</small>
        </div>

        <form
          className="addFriendCard"
          id="tour-tambah-teman"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim().length === 6) {
              onAdd(code.trim()).then((ok) => ok && setCode(''));
            }
          }}
        >
          <small>TAMBAH TEMAN</small>
          <div className="typeRow">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              maxLength={6}
              placeholder="Kode teman (6 huruf)"
              autoCapitalize="characters"
              disabled={full}
            />
            <button type="submit" disabled={busy || code.length !== 6 || full}>
              KIRIM
            </button>
          </div>
          {full && <small className="fieldHint">Daftar temanmu sudah penuh. Hapus satu teman untuk menambah yang baru.</small>}
        </form>
      </div>

      {incoming.length > 0 && (
        <div className="friendGroup">
          <h3>Permintaan masuk ({incoming.length})</h3>
          {incoming.map((f) => (
            <div className="friendRow" key={f.id}>
              <Avatar cat={f.avatar} color={f.avatar_color} size={44} />
              <b className="fName">{f.display_name}</b>
              <div className="fActions">
                <button className="secondary mini" disabled={busy} onClick={() => onRespond(f.id, true)}>TERIMA</button>
                <button className="ghost mini" disabled={busy} onClick={() => onRespond(f.id, false)}>TOLAK</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="friendGroup" id="tour-daftar-teman">
        <div className="between">
          <h3>Daftar teman</h3>
          <button className="ghost mini" onClick={onRefresh}>MUAT ULANG</button>
        </div>
        {accepted.length === 0 ? (
          <p className="muted emptyNote">Belum ada teman. Tukar kode dengan temanmu untuk memulai.</p>
        ) : (
          accepted.map((f) => (
            <div className="friendRow" key={f.id}>
              <Avatar cat={f.avatar} color={f.avatar_color} size={44} online={f.online} />
              <div className="fInfo">
                <b className="fName">{f.display_name}</b>
                <small>{f.online ? 'Online' : 'Offline'}</small>
              </div>
              <div className="fActions">
                <button
                  className="ghost mini danger"
                  disabled={busy}
                  onClick={() => window.confirm(`Hapus ${f.display_name} dari daftar teman?`) && onRemove(f.id)}
                >
                  HAPUS
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {outgoing.length > 0 && (
        <div className="friendGroup">
          <h3>Menunggu dijawab ({outgoing.length})</h3>
          {outgoing.map((f) => (
            <div className="friendRow" key={f.id}>
              <Avatar cat={f.avatar} color={f.avatar_color} size={44} />
              <b className="fName">{f.display_name}</b>
              <div className="fActions">
                <button className="ghost mini" disabled={busy} onClick={() => onRemove(f.id)}>BATALKAN</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// Kartu di lobby: undang teman ke room ini
export function InvitePanel({ friends, inRoomIds, invitedIds, onInvite, disabled }) {
  const list = friends
    .filter((f) => f.state === 'friend')
    .sort((a, b) => Number(b.online) - Number(a.online));
  return (
    <div className="inviteCard">
      <div className="between">
        <h3 style={{ margin: 0 }}>Undang teman</h3>
        <small>{list.filter((f) => f.online).length} online</small>
      </div>
      {list.length === 0 ? (
        <p className="muted emptyNote">Belum ada teman. Tambahkan dulu lewat menu Teman.</p>
      ) : (
        <div className="inviteList">
          {list.map((f) => {
            const inside = inRoomIds.has(f.user_id);
            const sent = invitedIds.has(f.user_id);
            return (
              <div className="friendRow compact" key={f.id}>
                <Avatar cat={f.avatar} color={f.avatar_color} size={36} online={f.online} />
                <b className="fName">{f.display_name}</b>
                <button
                  className={sent || inside ? 'ghost mini' : 'secondary mini'}
                  disabled={disabled || inside || sent}
                  onClick={() => onInvite(f)}
                >
                  {inside ? 'SUDAH DI ROOM' : sent ? 'TERUNDANG' : 'UNDANG'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Undangan masuk: muncul melayang di pojok layar
export function InviteDock({ invites, onJoin, onDismiss, busy }) {
  if (!invites.length) return null;
  return (
    <div className="inviteDock">
      {invites.slice(0, 3).map((inv) => (
        <div className="inviteToast" key={inv.id}>
          <Avatar cat={inv.avatar} size={40} />
          <div className="inviteText">
            <b>{inv.from_name}</b> mengajakmu main
            <small>
              {inv.quiz_title} · {inv.players} pemain di room
            </small>
          </div>
          <div className="fActions">
            <button className="secondary mini" disabled={busy} onClick={() => onJoin(inv)}>GABUNG</button>
            <button className="ghost mini" onClick={() => onDismiss(inv)}>TOLAK</button>
          </div>
        </div>
      ))}
    </div>
  );
}
