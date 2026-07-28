// VPN4TV: the single-screen home, matching the Android and Apple clients —
// the selected subscription with its expiry, one big connect button, the server
// picker with latency, session traffic, and the Telegram onboarding entry.
//
// The upstream card dashboard is still available under the other tabs; this is
// what a normal user sees first.

import { useEffect, useMemo, useRef, useState } from "react";

import { formatBytes, urlTestDelayTone } from "../api/format";
import { useStream } from "../api/stream";
import { useApi } from "../app/context";
import {
  useLocalDesktopHost,
  type DesktopProfile,
  type VPN4TVSubscriptionInfo,
} from "../app/desktop";
import { showError } from "../app/errorStore";
import { useI18n } from "../app/i18n";
import { Button, Select } from "../components/ui";
import { ServiceStatus_Type } from "../gen/daemon/started_service_pb";
import { VPN4TVOnboardingDialog } from "./VPN4TVOnboardingDialog";
import { VPN4TVProfilesDialog } from "./VPN4TVProfilesDialog";
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
  const [manageProfiles, setManageProfiles] = useState(false);
  const [busy, setBusy] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [subscription, setSubscription] = useState<VPN4TVSubscriptionInfo | null>(null);
  const [testing, setTesting] = useState(false);
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const onboardingPrompted = useRef(false);

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
          setProfilesLoaded(true);
        })
        .catch(showError);
    };
    reload();
    return host.profiles.onChanged(reload);
  }, [host]);

  useEffect(() => {
    if (profilesLoaded && profiles.length === 0 && !onboardingPrompted.current) {
      onboardingPrompted.current = true;
      setOnboarding(true);
    }
  }, [profilesLoaded, profiles.length]);

  const selected = useMemo(
    () => profiles.find((profile) => profile.id === selectedId) ?? profiles[0] ?? null,
    [profiles, selectedId],
  );

  useEffect(() => {
    if (host === null || selected === null) {
      setSubscription(null);
      return;
    }
    let cancelled = false;
    host.profiles
      .vpn4tvSubscriptionInfo(selected.id)
      .then((info) => {
        if (!cancelled) {
          setSubscription(info);
        }
      })
      .catch(() => setSubscription(null));
    return () => {
      cancelled = true;
    };
  }, [host, selected, updating]);

  // The user-facing group is the selector; fall back to whatever is selectable.
  const serverGroup = useMemo(() => {
    const list = groups.data.groups;
    return list.find((group) => group.type === "selector" && group.selectable) ??
      list.find((group) => group.selectable) ??
      null;
  }, [groups.data.groups]);

  const selectedServer = serverGroup?.items.find((item) => item.tag === serverGroup.selected) ?? null;

  // "auto" is a group of its own: show which node it actually landed on,
  // otherwise the user cannot tell which country they are exiting through.
  const autoGroup = useMemo(
    () => groups.data.groups.find((group) => group.type === "urltest") ?? null,
    [groups.data.groups],
  );
  const effectiveServer =
    selectedServer !== null && autoGroup !== null && selectedServer.tag === autoGroup.tag
      ? autoGroup.selected
      : null;

  const testAll = () => {
    if (serverGroup === null) {
      return;
    }
    setTesting(true);
    api
      .urlTest(serverGroup.tag)
      .catch(showError)
      .finally(() => setTesting(false));
  };

  // Right after connecting almost nothing has a measured delay yet, so the
  // picker is useless until the core gets around to it. Nudge it, as Android does.
  useEffect(() => {
    if (!started || serverGroup === null) {
      return;
    }
    const timer = setTimeout(() => {
      api.urlTest(serverGroup.tag).catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  const toggle = () => {
    if (host === null) {
      return;
    }
    setBusy(true);
    const start = async () => {
      // A renewed subscription still has the expired servers on disk; refresh
      // first or the user connects to nothing and blames the app.
      if (selected?.type === "remote" && expired(subscription)) {
        setUpdating(true);
        try {
          await host.profiles.updateRemote(selected.id);
        } catch {
          // Offline or the panel is down — try the servers we already have.
        } finally {
          setUpdating(false);
        }
      }
      await host.service.start();
    };
    (started ? host.service.stop() : start())
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
          {/* VPN4TV: renaming and deleting live on the card dashboard we
              replaced, so the home screen has to offer them. */}
          <Button onClick={() => setManageProfiles(true)}>{t("Manage")}</Button>
        </div>
      )}

      {subscription !== null && (
        <div className={styles.subscription}>
          {subscriptionExpiry(subscription, t)}
          {subscription.total !== undefined && subscription.total > 0 && (
            <span>
              {formatBytes((subscription.upload ?? 0) + (subscription.download ?? 0))} /{" "}
              {formatBytes(subscription.total)}
            </span>
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
          <>
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
              <Button disabled={testing} onClick={testAll}>
                {testing ? t("Testing...") : t("Test All")}
              </Button>
            </div>
            {effectiveServer !== null && effectiveServer !== "" && (
              <p className={styles.effectiveServer}>
                {t("Currently: {server}").replace("{server}", effectiveServer)}
              </p>
            )}
          </>
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

      {profilesLoaded && profiles.length === 0 && (
        <p className={styles.empty}>{t("Add a subscription to get started.")}</p>
      )}

      <footer className={styles.footer}>
        <Button variant="primary" onClick={() => setOnboarding(true)}>
          {t("Add subscription via Telegram")}
        </Button>
      </footer>

      {onboarding && host !== null && (
        <VPN4TVOnboardingDialog host={host} onClose={() => setOnboarding(false)} />
      )}

      {manageProfiles && host !== null && (
        <VPN4TVProfilesDialog host={host} onClose={() => setManageProfiles(false)} />
      )}
    </div>
  );
}

function expired(info: VPN4TVSubscriptionInfo | null): boolean {
  return (
    info !== null &&
    info.expireEpochSec !== undefined &&
    info.expireEpochSec > 0 &&
    info.expireEpochSec * 1000 < Date.now()
  );
}

/** "Until 18 Mar 2027", or a red "Expired" once the date has passed. */
function subscriptionExpiry(
  info: VPN4TVSubscriptionInfo,
  t: (key: "Expired") => string,
) {
  if (info.expireEpochSec === undefined || info.expireEpochSec <= 0) {
    return null;
  }
  const date = new Date(info.expireEpochSec * 1000);
  if (date.getTime() < Date.now()) {
    return <span className={styles.expired}>{t("Expired")}</span>;
  }
  return <span>{date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>;
}
