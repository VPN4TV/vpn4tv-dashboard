// VPN4TV: split tunnelling by application — the desktop counterpart of the
// Android per-app proxy screen. Android matches package names; here the core
// matches executable names, so the list is built from what is running plus
// whatever the user points at on disk.

import { useEffect, useMemo, useState } from "react";

import type { DesktopHost } from "../app/desktop";
import { showError } from "../app/errorStore";
import { useI18n } from "../app/i18n";
import { Button, Dialog, Select } from "../components/ui";
import { loadStoredJson, saveStoredJson } from "../lib/storage";

export type PerAppMode = "off" | "exclude" | "include";

export interface PerAppProxy {
  mode: PerAppMode;
  apps: string[];
}

const OFF: PerAppProxy = { mode: "off", apps: [] };

export function loadPerAppProxy(): PerAppProxy {
  const stored = loadStoredJson("vpn4tv-per-app");
  if (typeof stored !== "object" || stored === null) {
    return OFF;
  }
  const candidate = stored as Partial<PerAppProxy>;
  const mode = candidate.mode;
  if (mode !== "exclude" && mode !== "include" && mode !== "off") {
    return OFF;
  }
  const apps = Array.isArray(candidate.apps)
    ? candidate.apps.filter((app): app is string => typeof app === "string")
    : [];
  return { mode, apps };
}

export function VPN4TVPerAppDialog(props: { host: DesktopHost; onClose: () => void }) {
  const { t } = useI18n();
  const [value, setValue] = useState<PerAppProxy>(loadPerAppProxy);
  const [running, setRunning] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    props.host.profiles
      .vpn4tvRunningApplications()
      .then((apps) => {
        if (!cancelled) {
          setRunning(apps);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [props.host]);

  // Selected applications come first, so a choice never scrolls out of sight.
  const listed = useMemo(() => {
    const selected = new Set(value.apps);
    return [...value.apps, ...running.filter((app) => !selected.has(app))];
  }, [value.apps, running]);

  const persist = (next: PerAppProxy) => {
    setValue(next);
    saveStoredJson("vpn4tv-per-app", next);
  };

  const toggleApp = (app: string) => {
    const apps = value.apps.includes(app)
      ? value.apps.filter((entry) => entry !== app)
      : [...value.apps, app];
    persist({ ...value, apps });
  };

  const addManually = () => {
    props.host.profiles
      .vpn4tvPickApplication()
      .then((app) => {
        if (app !== null && !value.apps.includes(app)) {
          persist({ ...value, apps: [...value.apps, app] });
        }
      })
      .catch(showError);
  };

  return (
    <Dialog onClose={props.onClose}>
      <h3>{t("Per-app Proxy")}</h3>
      <div className="settings-row">
        <span className="settings-row-label">{t("Mode")}</span>
        <Select<PerAppMode>
          options={[
            { value: "off", label: t("All applications through VPN") },
            { value: "exclude", label: t("All except selected") },
            { value: "include", label: t("Only selected") },
          ]}
          value={value.mode}
          onChange={(mode) => persist({ ...value, mode })}
        />
      </div>
      <p className="secondary-text">
        {value.mode === "include"
          ? t("Only the applications you tick use the VPN; everything else goes direct.")
          : value.mode === "exclude"
            ? t("The applications you tick go direct; everything else uses the VPN.")
            : t("Every application uses the VPN.")}
      </p>
      {value.mode !== "off" && (
        <>
          <ul className="vpn4tv-app-list">
            {listed.map((app) => (
              <li key={app}>
                <label className="vpn4tv-app-row">
                  <input
                    type="checkbox"
                    checked={value.apps.includes(app)}
                    onChange={() => toggleApp(app)}
                  />
                  <span>{app}</span>
                </label>
              </li>
            ))}
          </ul>
          {loading && <p className="secondary-text">{t("Loading...")}</p>}
          {!loading && listed.length === 0 && (
            <p className="secondary-text">{t("Nothing is running to pick from.")}</p>
          )}
          <div className="row-actions">
            <Button onClick={addManually}>{t("Add application...")}</Button>
          </div>
        </>
      )}
      <div className="row-actions dialog-actions">
        <Button onClick={props.onClose}>{t("Close")}</Button>
      </div>
    </Dialog>
  );
}
