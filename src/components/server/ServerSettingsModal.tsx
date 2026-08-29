import React, { useState } from 'react';
import { Server, RefreshCw, CheckCircle, XCircle, Plus, Edit2 } from 'lucide-react';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import type { SubsonicServerConfig } from '../../types';

interface ServerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ServerSettingsModal: React.FC<ServerSettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    servers,
    activeServer,
    saveServerConfig,
    testServerConnection,
  } = useMusicPlayer();

  const [editingServer, setEditingServer] = useState<SubsonicServerConfig | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestAndConnect = async (srv: SubsonicServerConfig) => {
    setTestingId(srv.id);
    setSyncNotice('Connecting and fetching remote playlists...');
    const success = await testServerConnection(srv.id);
    setTestingId(null);
    if (success) {
      setSyncNotice('Successfully connected & synced playlists!');
      setTimeout(() => {
        setSyncNotice(null);
        onClose();
      }, 1200);
    } else {
      setSyncNotice('Could not connect. Please verify URL and credentials.');
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServer) return;
    saveServerConfig(editingServer);
    setEditingServer(null);
  };

  const handleAddNew = () => {
    const newSrv: SubsonicServerConfig = {
      id: `server-${Date.now()}`,
      name: 'Navidrome Server',
      url: 'http://192.168.1.5:4533',
      username: 'admin',
      password: '',
      authType: 'token',
      isActive: false,
      status: 'disconnected',
    };
    setEditingServer(newSrv);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl bg-[#1A1414] border border-[#352929] shadow-2xl p-5 space-y-4 text-left">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2C2121] pb-3">
          <div className="flex items-center space-x-2">
            <Server size={18} className="text-crafted-brand-rust" />
            <h2 className="text-sm font-bold text-white font-sans">Navidrome & Subsonic</h2>
          </div>
          <button
            onClick={onClose}
            className="text-crafted-text-muted hover:text-white text-xs px-2 py-1"
          >
            ✕
          </button>
        </div>

        {syncNotice && (
          <div className="p-2.5 rounded-xl bg-crafted-brand-rust/15 border border-crafted-brand-rust/30 text-xs text-white text-center font-mono">
            {syncNotice}
          </div>
        )}

        {/* Server List */}
        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
          {servers.map((srv) => {
            const isCurrentActive = activeServer?.id === srv.id;
            const isTesting = testingId === srv.id;

            return (
              <div
                key={srv.id}
                className={`p-3 rounded-xl border transition-all ${
                  isCurrentActive
                    ? 'bg-[#241A1A] border-crafted-brand-rust/50 shadow-[0_0_12px_rgba(212,91,62,0.2)]'
                    : 'bg-[#1E1717] border-[#2E2222]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-semibold text-xs text-white">{srv.name}</span>
                      {isCurrentActive && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-crafted-text-muted">{srv.url}</p>
                    <p className="text-[10px] text-crafted-text-dim">User: {srv.username || 'admin'}</p>
                  </div>

                  <div className="flex flex-col items-end space-y-1.5">
                    {srv.status === 'connected' ? (
                      <span className="flex items-center space-x-1 text-[10px] text-emerald-400 font-mono">
                        <CheckCircle size={12} />
                        <span>Online ({srv.latencyMs}ms)</span>
                      </span>
                    ) : srv.status === 'error' ? (
                      <span className="flex items-center space-x-1 text-[10px] text-rose-400 font-mono">
                        <XCircle size={12} />
                        <span>Offline</span>
                      </span>
                    ) : null}

                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => setEditingServer(srv)}
                        className="text-[11px] px-2 py-1 rounded bg-[#2A2020] text-crafted-text-muted hover:text-white flex items-center space-x-1"
                      >
                        <Edit2 size={10} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTestAndConnect(srv)}
                        disabled={isTesting}
                        className="text-[11px] px-2.5 py-1 rounded bg-crafted-brand-rust hover:bg-crafted-brand-rustDark text-white font-medium flex items-center space-x-1"
                      >
                        {isTesting && <RefreshCw size={10} className="animate-spin" />}
                        <span>Sync</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Edit / Add Server Form */}
        {editingServer ? (
          <form onSubmit={handleSaveForm} className="p-3 rounded-xl bg-[#201818] border border-[#3A2C2C] space-y-2.5">
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Configure Server</h3>
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-crafted-text-dim block mb-0.5">Server Name</label>
                <input
                  type="text"
                  value={editingServer.name}
                  onChange={(e) => setEditingServer({ ...editingServer, name: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-[#151010] border border-[#352929] text-white focus:outline-none focus:border-crafted-brand-rust"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-crafted-text-dim block mb-0.5">Server IP / URL</label>
                <input
                  type="text"
                  value={editingServer.url}
                  onChange={(e) => setEditingServer({ ...editingServer, url: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-[#151010] border border-[#352929] text-white focus:outline-none focus:border-crafted-brand-rust font-mono"
                  placeholder="http://192.168.1.5:4533"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-crafted-text-dim block mb-0.5">Username</label>
                  <input
                    type="text"
                    value={editingServer.username}
                    onChange={(e) => setEditingServer({ ...editingServer, username: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-[#151010] border border-[#352929] text-white focus:outline-none focus:border-crafted-brand-rust"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-crafted-text-dim block mb-0.5">Password</label>
                  <input
                    type="password"
                    value={editingServer.password || ''}
                    onChange={(e) => setEditingServer({ ...editingServer, password: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-[#151010] border border-[#352929] text-white focus:outline-none focus:border-crafted-brand-rust font-mono"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingServer(null)}
                className="text-xs px-2.5 py-1 text-crafted-text-muted hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="text-xs px-3.5 py-1 rounded-md bg-crafted-brand-rust text-white font-medium"
              >
                Save
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={handleAddNew}
            className="w-full py-2 rounded-xl border border-dashed border-[#3A2D2D] hover:border-crafted-brand-rust text-xs font-mono text-crafted-text-muted hover:text-white flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Plus size={13} />
            <span>Add Custom Server IP</span>
          </button>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-crafted-brand-rust hover:underline"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
