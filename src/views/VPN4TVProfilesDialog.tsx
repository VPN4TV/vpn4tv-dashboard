// VPN4TV: managing the subscriptions themselves. Upstream keeps this on the
// card dashboard we replaced with the single-screen home, which left users
// unable to rename or delete a subscription they no longer use.

import { useEffect, useState } from "react";

import type { DesktopHost, DesktopProfile } from "../app/desktop";
import { showError } from "../app/errorStore";
import { useI18n } from "../app/i18n";
import { Button, Dialog } from "../components/ui";
import { Icon } from "../components/Icon";

export function VPN4TVProfilesDialog(props: { host: DesktopHost; onClose: () => void }) {
  const { t } = useI18n();
  const [profiles, setProfiles] = useState<DesktopProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<DesktopProfile | null>(null);

  useEffect(() => {
    const reload = () => {
      props.host.profiles
        .list()
        .then((state) => {
          setProfiles(state.profiles);
          setSelectedId(state.selectedId);
        })
        .catch(showError);
    };
    reload();
    return props.host.profiles.onChanged(reload);
  }, [props.host]);

  const commitRename = (profile: DesktopProfile) => {
    const name = draftName.trim();
    setRenaming(null);
    if (name === "" || name === profile.name) {
      return;
    }
    props.host.profiles.updateMetadata(profile.id, { name }).catch(showError);
  };

  const update = (profile: DesktopProfile) => {
    setBusyId(profile.id);
    props.host.profiles
      .updateRemote(profile.id)
      .catch(showError)
      .finally(() => setBusyId(null));
  };

  const remove = (profile: DesktopProfile) => {
    setConfirmRemove(null);
    props.host.profiles.remove(profile.id).catch(showError);
  };

  return (
    <Dialog onClose={props.onClose}>
      <h3>{t("Subscriptions")}</h3>
      {profiles.length === 0 ? (
        <p className="secondary-text">{t("Add a subscription to get started.")}</p>
      ) : (
        <ul className="vpn4tv-profile-list">
          {profiles.map((profile) => (
            <li key={profile.id} className="vpn4tv-profile-row">
              {renaming === profile.id ? (
                <input
                  className="input"
                  autoFocus
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  onBlur={() => commitRename(profile)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      commitRename(profile);
                    } else if (event.key === "Escape") {
                      setRenaming(null);
                    }
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="link-button vpn4tv-profile-name"
                  onClick={() => {
                    setSelectedId(profile.id);
                    props.host.profiles.select(profile.id).catch(showError);
                  }}
                >
                  {profile.id === selectedId && <Icon name="check" size={14} />}
                  {profile.name}
                </button>
              )}
              <div className="row-actions">
                {profile.type === "remote" && (
                  <Button disabled={busyId === profile.id} onClick={() => update(profile)}>
                    {busyId === profile.id ? t("Updating...") : t("Update")}
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setDraftName(profile.name);
                    setRenaming(profile.id);
                  }}
                >
                  {t("Rename")}
                </Button>
                <Button variant="danger" onClick={() => setConfirmRemove(profile)}>
                  {t("Delete")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="row-actions dialog-actions">
        <Button onClick={props.onClose}>{t("Close")}</Button>
      </div>
      {confirmRemove !== null && (
        <Dialog onClose={() => setConfirmRemove(null)}>
          <h3>{t("Delete {name}?").replace("{name}", confirmRemove.name)}</h3>
          <p className="secondary-text">{t("The subscription is removed from this device.")}</p>
          <div className="row-actions dialog-actions">
            <Button onClick={() => setConfirmRemove(null)}>{t("Cancel")}</Button>
            <Button variant="danger" onClick={() => remove(confirmRemove)}>
              {t("Delete")}
            </Button>
          </div>
        </Dialog>
      )}
    </Dialog>
  );
}
