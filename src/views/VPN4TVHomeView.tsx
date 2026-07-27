// VPN4TV: the single-screen home, matching the Android and Apple clients —
// the selected subscription with its expiry, one big connect button, the server
// picker with latency, session traffic, and the Telegram onboarding entry.
//
// The upstream card dashboard is still available under the other tabs; this is
// what a normal user sees first.

import { useEffect, useMemo, useState } from "react";

import { formatBytes, urlTestDelayTone } from "../api/format";
import { useStream } from "../api/stream";
import { useApi } from "../app/context";
import { useLocalDesktopHost, type DesktopProfile } from "../app/desktop";
import { showError } from "../app/errorStore";
import { useI18n } from "../app/i18n";
import { Button, Select } from "../components/ui";
import { ServiceStatus_Type } from "../gen/daemon/started_service_pb";
import { VPN4TVOnboardingDialog } from "./VPN4TVOnboardingDialog";
import styles from "./VPN4TVHomeView.module.css";

export function VPN4TVHomeView() {
  const api = useApi();
  const { t } = useI18n();
  const host = useLocalDesktopHost();
  const serviceStatus = useStream(api.serviceStatus);
  const status = useStream(api.status);
  const groups = useStream(api.groups);

  const [profiles, setProfiles] = useState<DesktopProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [updating, setUpdating] = useState(false);

  const statusType = serviceStatus.data.status?.status;
  const started = statusType === ServiceStatus_Type.STARTED;
  const transitioning =
    statusType === ServiceStatus_Type.STARTING || statusType === ServiceStatus_Type.STOPPING;

  useEffect(() => {
    if (host === null) {
      return;
    }
    const reload = () => {
      host.profiles
        .list()
        .then((state) => {
          setProfiles(state.profiles);
          setSelectedId(state.selectedId);
        })
        .catch(showError);
    };
    reload();
    return host.profiles.onChanged(reload);
  }, [host]);

  const selected = useMemo(
    () => profiles.find((profile) => profile.id === selectedId) ?? profiles[0] ?? null,
    [profiles, selectedId],
  );

  // The user-facing group is the selector; fall back to whatever is selectable.
  const serverGroup = useMemo(() => {
    const list = groups.data.groups;
    return list.find((group) => group.type === "selector" && group.selectable) ??
      list.find((group) => group.selectable) ??
      null;
  }, [groups.data.groups]);

  const selectedServer = serverGroup?.items.find((item) => item.tag === serverGroup.selected) ?? null;

  const toggle = () => {
    if (host === null) {
      return;
    }
    setBusy(true);
    (started ? host.service.stop() : host.service.start())
      .catch(showError)
      .finally(() => setBusy(false));
  };

  const update = () => {
    if (host === null || selected === null) {
      return;
    }
    setUpdating(true);
    host.profiles
      .updateRemote(selected.id)
      .catch(showError)
      .finally(() => setUpdating(false));
  };

  const statusLabel = started
    ? t("Connected")
    : statusType === ServiceStatus_Type.STARTING
      ? t("Connecting")
      : statusType === ServiceStatus_Type.STOPPING
        ? t("Disconnecting")
        : t("Disconnected");

  return (
    <div className={styles.home}>
      <header className={styles.header}>
        <h1 className={styles.brand}>VPN4TV</h1>
        {selected?.type === "remote" && (
          <Button disabled={updating} onClick={update}>
            {updating ? t("Updating...") : t("Update")}
          </Button>
        )}
      </header>

      {selected !== null && (
        <div className={styles.profile}>
          {profiles.length > 1 ? (
            <Select<string>
              options={profiles.map((profile) => ({ value: profile.id, label: profile.name }))}
              value={selected.id}
              onChange={(id) => {
                setSelectedId(id);
                host?.profiles.select(id).catch(showError);
              }}
            />
          ) : (
            <span className={styles.profileName}>{selected.name}</span>
          )}
        </div>
      )}

      <div className={styles.center}>
        <p className={`${styles.status} ${started ? styles.statusOn : transitioning ? styles.statusBusy : ""}`}>
          {statusLabel}
        </p>
        <Button
          variant="primary"
          className={styles.connect}
          disabled={busy || transitioning || selected === null}
          onClick={toggle}
        >
          {started ? t("Disconnect") : t("Connect")}
        </Button>

        {started && serverGroup !== null && serverGroup.items.length > 0 && (
          <div className={styles.server}>
            <span className="secondary-text">{t("Server")}</span>
            <Select<string>
              options={serverGroup.items.map((item) => ({
                value: item.tag,
                label:
                  item.urlTestDelay > 0 ? `${item.tag} · ${item.urlTestDelay}ms` : item.tag,
              }))}
              value={serverGroup.selected}
              onChange={(tag) => {
                api.selectOutbound(serverGroup.tag, tag).catch(showError);
              }}
            />
            {selectedServer !== null && selectedServer.urlTestDelay > 0 && (
              <span className={styles.delay} data-tone={urlTestDelayTone(selectedServer.urlTestDelay)}>
                {selectedServer.urlTestDelay}ms
              </span>
            )}
          </div>
        )}

        {started && status.data.current !== null && (
          // Session totals only — a per-second rate reads as "broken" to users
          // when the tunnel is idle, and floods support.
          <div className={styles.traffic}>
            <span>↑ {formatBytes(Number(status.data.current.uplinkTotal))}</span>
            <span>↓ {formatBytes(Number(status.data.current.downlinkTotal))}</span>
          </div>
        )}
      </div>

      <footer className={styles.footer}>
        <Button variant="primary" onClick={() => setOnboarding(true)}>
          {t("Add subscription via Telegram")}
        </Button>
      </footer>

      {onboarding && host !== null && (
        <VPN4TVOnboardingDialog host={host} onClose={() => setOnboarding(false)} />
      )}
    </div>
  );
}
