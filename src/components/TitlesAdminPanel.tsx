import React, { useState, useMemo } from 'react';
import { collection, doc, addDoc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useUsers } from '../hooks/useSyndicateData';
import { useAdminTitleDefs } from '../hooks/useUserTitles';
import { RankTitle } from '../types';
import type { AdminTitle, EarnedTitle, User } from '../types';
import {
  Trophy,
  Plus,
  Save,
  Trash2,
  Edit3,
  Award,
  UserCheck,
  Search,
  X,
  Crown,
  History,
  AlertCircle,
  CheckCircle2,
  CloudOff
} from 'lucide-react';

const RANK_OPTIONS: { value: string; emoji: string; label: string }[] = [
  { value: '#1', emoji: '🏆', label: 'Champion (#1)' },
  { value: '#2', emoji: '🥈', label: 'Runner-Up (#2)' },
  { value: '#3', emoji: '🥉', label: 'Third Place (#3)' },
  { value: 'Global', emoji: '👑', label: 'Global Champion' }
];

const EMOJI_OPTIONS = ['🏆', '🥈', '🥉', '👑', '⭐', '🔥', '⚽', '🎯'];

interface NewTitleForm {
  label: string;
  rank_label: string;
  emoji: string;
}

const EMPTY_FORM: NewTitleForm = { label: '', rank_label: '#1', emoji: '🏆' };

// Helpers that talk directly to Firestore. Used by the panel because Cloud
// Functions aren't deployed (project is on Spark plan). Once functions are
// available, these helpers should be replaced with callables to enforce the
// admin gate server-side.
async function createAdminTitleDoc(form: NewTitleForm, createdBy: string): Promise<AdminTitle> {
  const ref = await addDoc(collection(db, 'admin_titles'), {
    label: form.label.trim(),
    rank_label: form.rank_label,
    emoji: form.emoji,
    created_at: new Date().toISOString(),
    created_by: createdBy
  });
  return { id: ref.id, ...form, created_at: new Date().toISOString(), created_by: createdBy } as AdminTitle;
}

async function updateAdminTitleDoc(id: string, form: NewTitleForm): Promise<void> {
  await updateDoc(doc(db, 'admin_titles', id), {
    label: form.label.trim(),
    rank_label: form.rank_label,
    emoji: form.emoji
  });
}

async function deleteAdminTitleDoc(id: string): Promise<void> {
  await deleteDoc(doc(db, 'admin_titles', id));
}

async function grantAdminTitleClient(
  userId: string,
  defId: string
): Promise<{ ok: boolean; earnedId: string | null; error?: string }> {
  try {
    const defSnap = await getDoc(doc(db, 'admin_titles', defId));
    if (!defSnap.exists()) {
      return { ok: false, earnedId: null, error: 'Admin title definition not found.' };
    }
    const def = defSnap.data() as { label: string; rank_label: string; emoji: string };

    const userSnap = await getDoc(doc(db, 'users', userId));
    if (!userSnap.exists()) {
      return { ok: false, earnedId: null, error: 'Target user not found.' };
    }

    const earnedId = `${userId}_${defId}_${Date.now()}`;
    const earned: EarnedTitle = {
      id: earnedId,
      type: 'admin_custom',
      source_id: defId,
      source_name: def.label,
      rank_label: def.rank_label,
      earned_at: new Date().toISOString(),
      badge_variant: RankTitle.CROWN_CHAMPION,
      points_at_earn: 0,
      category: 'admin_historical',
      is_temporary: false,
      custom_label: def.label,
      custom_emoji: def.emoji
    };

    const existing = (userSnap.data()?.earned_titles ?? []) as EarnedTitle[];
    await updateDoc(doc(db, 'users', userId), {
      earned_titles: [...existing, earned]
    });

    return { ok: true, earnedId };
  } catch (err: any) {
    return { ok: false, earnedId: null, error: err?.message ?? 'Unknown error' };
  }
}

async function revokeAdminTitleClient(
  userId: string,
  earnedTitleId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (!userSnap.exists()) return { ok: false, error: 'User not found.' };

    const data = userSnap.data() || {};
    const titles: EarnedTitle[] = Array.isArray(data.earned_titles) ? data.earned_titles : [];
    const target = titles.find((t) => t.id === earnedTitleId);
    if (!target) return { ok: false, error: 'Title entry not found on user.' };

    const newTitles = titles.filter((t) => t.id !== earnedTitleId);
    const update: Record<string, any> = { earned_titles: newTitles };

    if (data.displayed_title_id === earnedTitleId) {
      update.displayed_title_id = null;
    }
    const pinned: string[] = Array.isArray(data.pinned_title_ids) ? data.pinned_title_ids : [];
    if (pinned.includes(earnedTitleId)) {
      update.pinned_title_ids = pinned.filter((id) => id !== earnedTitleId);
    }

    await updateDoc(doc(db, 'users', userId), update);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Unknown error' };
  }
}

async function revokeAdminTitleForUserClient(
  userId: string,
  adminTitleId: string
): Promise<{ ok: boolean; revokedCount: number; error?: string }> {
  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (!userSnap.exists()) return { ok: false, revokedCount: 0, error: 'User not found.' };

    const data = userSnap.data() || {};
    const titles: EarnedTitle[] = Array.isArray(data.earned_titles) ? data.earned_titles : [];
    const matchedIds = new Set(
      titles.filter((t) => t.source_id === adminTitleId).map((t) => t.id)
    );
    if (matchedIds.size === 0) return { ok: true, revokedCount: 0 };

    const newTitles = titles.filter((t) => !matchedIds.has(t.id));
    const update: Record<string, any> = { earned_titles: newTitles };

    if (data.displayed_title_id && matchedIds.has(data.displayed_title_id)) {
      update.displayed_title_id = null;
    }
    const pinned: string[] = Array.isArray(data.pinned_title_ids) ? data.pinned_title_ids : [];
    if (pinned.some((id) => matchedIds.has(id))) {
      update.pinned_title_ids = pinned.filter((id) => !matchedIds.has(id));
    }

    await updateDoc(doc(db, 'users', userId), update);
    return { ok: true, revokedCount: matchedIds.size };
  } catch (err: any) {
    return { ok: false, revokedCount: 0, error: err?.message ?? 'Unknown error' };
  }
}

export const TitlesAdminPanel: React.FC = () => {
  const { titles, loading: titlesLoading } = useAdminTitleDefs();
  const { users } = useUsers();

  // Anyone who can see this panel can manage titles. The Admin page itself
  // restricts who reaches this panel; Firestore rules permit signed-in users
  // to write admin_titles / earned_titles while Cloud Functions aren't
  // deployed. Once functions are deployed, tighten that gate server-side.

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewTitleForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<NewTitleForm>(EMPTY_FORM);
  const [savingEdit, setSavingEdit] = useState(false);

  // Grant form
  const [grantUserId, setGrantUserId] = useState<string>('');
  const [grantTitleId, setGrantTitleId] = useState<string>('');
  const [userSearch, setUserSearch] = useState('');
  const [granting, setGranting] = useState(false);
  const [grantMessage, setGrantMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Toast (general)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users.slice(0, 30);
    return users
      .filter((u: User) => (u.display_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
      .slice(0, 30);
  }, [users, userSearch]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.label.trim()) {
      setFormError('Title label is required.');
      return;
    }
    setCreating(true);
    try {
      await createAdminTitleDoc(form, 'client');
      setForm(EMPTY_FORM);
      setShowForm(false);
      showToast('success', `Title "${form.label.trim()}" created.`);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create title.');
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (t: AdminTitle) => {
    setEditingId(t.id);
    setEditForm({
      label: t.label,
      rank_label: t.rank_label,
      emoji: t.emoji
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(EMPTY_FORM);
  };

  const handleSaveEdit = async (id: string) => {
    setSavingEdit(true);
    try {
      await updateAdminTitleDoc(id, editForm);
      setEditingId(null);
      showToast('success', 'Title updated.');
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to update title.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (t: AdminTitle) => {
    if (!window.confirm(`Delete title definition "${t.label}"? Existing grants remain on user profiles.`)) {
      return;
    }
    try {
      await deleteAdminTitleDoc(t.id);
      showToast('success', `Deleted "${t.label}".`);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to delete title.');
    }
  };

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    setGrantMessage(null);
    if (!grantUserId || !grantTitleId) {
      setGrantMessage({ type: 'error', text: 'Pick a user and a title.' });
      return;
    }
    setGranting(true);
    try {
      const result = await grantAdminTitleClient(grantUserId, grantTitleId);
      if (!result.ok) throw new Error(result.error || 'Grant failed.');

      const user = users.find((u: User) => u.id === grantUserId);
      const title = titles.find((t) => t.id === grantTitleId);
      showToast('success', `Granted "${title?.label}" to ${user?.display_name || 'user'}.`);
      setGrantUserId('');
      setGrantTitleId('');
      setUserSearch('');
    } catch (err: any) {
      setGrantMessage({ type: 'error', text: err?.message || 'Failed to grant title.' });
    } finally {
      setGranting(false);
    }
  };

  const handleRevokeOne = async (userId: string, t: EarnedTitle) => {
    if (!window.confirm(`Revoke title ${t.source_name} from this user?`)) return;
    const result = await revokeAdminTitleClient(userId, t.id);
    if (result.ok) {
      showToast('success', 'Title revoked.');
    } else {
      showToast('error', result.error || 'Failed to revoke.');
    }
  };

  const handleRevokeAll = async (userId: string, adminTitleId: string) => {
    if (!window.confirm('Revoke ALL instances of this title from this user?')) return;
    const result = await revokeAdminTitleForUserClient(userId, adminTitleId);
    if (result.ok) {
      showToast('success', `Revoked ${result.revokedCount} instance(s).`);
    } else {
      showToast('error', result.error || 'Failed to revoke.');
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <p className="text-emerald-600 text-[10px] font-black uppercase tracking-widest">Titles</p>
          </div>
          <h2 className="text-2xl font-black text-slate-900">Titles Administration</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Create custom title definitions (e.g. "Plumbing League Champion") and grant them to users.
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-md text-[9px] font-black uppercase tracking-wider">
            <CloudOff className="h-3 w-3" />
            Client-mode (Cloud Functions not yet deployed)
          </div>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-md"
          >
            <Plus className="h-4 w-4" />
            New Title
          </button>
        )}
      </div>

      {/* Create Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-900 flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-500" />
              Create Title Definition
            </h3>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(null); setForm(EMPTY_FORM); }}
              className="text-slate-400 hover:text-slate-700"
              aria-label="Close form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {formError && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-bold">
              <AlertCircle className="h-3.5 w-3.5" />
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-3">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Title Label
              </label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="e.g. Plumbing League Champion 24-25"
                className="w-full p-3 border border-slate-200 rounded-xl font-bold focus:ring-emerald-500 focus:border-emerald-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Rank
              </label>
              <select
                value={form.rank_label}
                onChange={(e) => setForm({ ...form, rank_label: e.target.value })}
                className="w-full p-3 border border-slate-200 rounded-xl font-bold bg-white"
              >
                {RANK_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.emoji} {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Emoji
              </label>
              <div className="flex gap-1 flex-wrap">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    type="button"
                    key={e}
                    onClick={() => setForm({ ...form, emoji: e })}
                    className={`h-10 w-10 rounded-xl text-lg flex items-center justify-center border transition ${
                      form.emoji === e
                        ? 'bg-yellow-100 border-yellow-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Custom Emoji
              </label>
              <input
                type="text"
                value={form.emoji}
                onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                maxLength={4}
                className="w-full p-3 border border-slate-200 rounded-xl font-bold text-center text-lg"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(null); setForm(EMPTY_FORM); }}
              className="px-4 py-2 rounded-xl text-xs font-black text-slate-500 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create Title'}
            </button>
          </div>
        </form>
      )}

      {/* Existing Title Definitions */}
      <div>
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
          <History className="h-3.5 w-3.5" />
          Existing Title Definitions ({titles.length})
        </h3>
        {titlesLoading ? (
          <div className="p-4 text-center text-slate-400 text-sm font-bold">Loading titles…</div>
        ) : titles.length === 0 ? (
          <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-2xl">
            <Trophy className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm font-bold">No custom titles yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {titles.map((t) => {
              const isEditing = editingId === t.id;
              return (
                <div
                  key={t.id}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4"
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editForm.label}
                        onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded-lg font-bold text-sm"
                      />
                      <div className="flex gap-2">
                        <select
                          value={editForm.rank_label}
                          onChange={(e) => setEditForm({ ...editForm, rank_label: e.target.value })}
                          className="flex-1 p-2 border border-slate-200 rounded-lg font-bold text-sm bg-white"
                        >
                          {RANK_OPTIONS.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.emoji} {r.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={editForm.emoji}
                          onChange={(e) => setEditForm({ ...editForm, emoji: e.target.value })}
                          maxLength={4}
                          className="w-16 p-2 border border-slate-200 rounded-lg text-center font-bold text-sm"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="text-xs font-black text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={savingEdit}
                          onClick={() => handleSaveEdit(t.id)}
                          className="text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg disabled:opacity-50 flex items-center gap-1"
                        >
                          <Save className="h-3 w-3" />
                          {savingEdit ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br from-yellow-300 to-amber-500 text-yellow-900 flex items-center justify-center text-xl">
                        {t.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-900 truncate">{t.label}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          Rank: {t.rank_label}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleStartEdit(t)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
                          title="Edit"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(t)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Grant Section */}
      <div className="border-t border-slate-200 pt-6">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <UserCheck className="h-3.5 w-3.5" />
          Grant a Title to a User
        </h3>
        <form onSubmit={handleGrant} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          {grantMessage && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold ${
              grantMessage.type === 'success'
                ? 'bg-emerald-50 border border-emerald-100 text-emerald-700'
                : 'bg-red-50 border border-red-100 text-red-700'
            }`}>
              {grantMessage.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
              {grantMessage.text}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Pick User
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl font-bold text-sm focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <select
                value={grantUserId}
                onChange={(e) => setGrantUserId(e.target.value)}
                className="mt-2 w-full p-2 border border-slate-200 rounded-xl font-bold text-sm bg-white"
                size={Math.min(4, Math.max(1, filteredUsers.length))}
              >
                <option value="">— Select a user —</option>
                {filteredUsers.map((u: User) => (
                  <option key={u.id} value={u.id}>
                    {u.display_name || u.email || u.id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Pick Title
              </label>
              <select
                value={grantTitleId}
                onChange={(e) => setGrantTitleId(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl font-bold text-sm bg-white"
              >
                <option value="">— Select a title —</option>
                {titles.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.emoji} {t.label} ({t.rank_label})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">
                Tip: Grant the same title twice to give the user the multi-emoji badge (e.g. 🏆🏆).
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={granting || !grantUserId || !grantTitleId}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {granting ? 'Granting…' : 'Grant Title'}
            </button>
          </div>
        </form>
      </div>

      {/* Users with admin titles — revoke UI */}
      <div className="border-t border-slate-200 pt-6">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Award className="h-3.5 w-3.5" />
          Users with Admin Titles
        </h3>
        <UsersWithAdminTitles
          users={users}
          onRevokeOne={handleRevokeOne}
          onRevokeAll={handleRevokeAll}
        />
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl text-sm font-black flex items-center gap-2 animate-in slide-in-from-bottom-4 ${
          toast.type === 'success'
            ? 'bg-emerald-600 text-white'
            : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.text}
        </div>
      )}
    </div>
  );
};

const UsersWithAdminTitles: React.FC<{
  users: User[];
  onRevokeOne: (userId: string, t: EarnedTitle) => void;
  onRevokeAll: (userId: string, adminTitleId: string) => void;
}> = ({ users, onRevokeOne, onRevokeAll }) => {
  const usersWithAdminTitles = useMemo(() => {
    return users
      .map((u) => {
        const all = Array.isArray(u.earned_titles) ? u.earned_titles : [];
        const admin = all.filter((t) => t.category === 'admin_historical');
        return { user: u, titles: admin };
      })
      .filter((row) => row.titles.length > 0);
  }, [users]);

  if (usersWithAdminTitles.length === 0) {
    return (
      <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-2xl">
        <p className="text-slate-500 text-sm font-bold">No admin titles have been granted yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {usersWithAdminTitles.map(({ user, titles }) => {
        // Group by source_id (adminTitleId) so we can show "x2" badges
        const groups = new Map<string, EarnedTitle[]>();
        titles.forEach((t) => {
          const arr = groups.get(t.source_id) ?? [];
          arr.push(t);
          groups.set(t.source_id, arr);
        });
        return (
          <div key={user.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm">
                {(user.display_name || '?').slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-900 truncate">{user.display_name}</p>
                <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {Array.from(groups.entries()).map(([adminTitleId, group]) => {
                const t = group[0];
                return (
                  <div
                    key={adminTitleId}
                    className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2"
                  >
                    <span className="text-base" aria-hidden="true">{t.custom_emoji?.repeat(group.length) ?? '🏆'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-900 truncate">
                        {t.source_name}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {group.length > 1 ? `Granted ${group.length} times` : `Granted ${new Date(t.earned_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    {group.length > 1 && (
                      <button
                        onClick={() => onRevokeAll(user.id, adminTitleId)}
                        className="text-[10px] font-black text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg"
                        title="Revoke all instances"
                      >
                        Revoke All
                      </button>
                    )}
                    <button
                      onClick={() => onRevokeOne(user.id, t)}
                      className="text-[10px] font-black text-slate-500 hover:bg-slate-100 px-2 py-1 rounded-lg"
                      title="Revoke one instance"
                    >
                      Revoke
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TitlesAdminPanel;
