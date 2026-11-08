// VPN4TV: the manual paste box, matching the mobile clients. Telegram
// onboarding is the main path, but a user who already has links (or whose
// Telegram is blocked) needs a way in that does not touch the network first.

import { useState } from "react";

import { useI18n } from "../app/i18n";
import type { DesktopHost } from "../app/desktop";
import { Button, Dialog, Field } from "../components/ui";

export function VPN4TVManualImportDialog(props: { host: DesktopHost; onClose: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState("VPN4TV");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const submit = () => {
    setBusy(true);
    setFailure(null);
    props.host.profiles
      .vpn4tvImportManual(name.trim() === "" ? "VPN4TV" : name.trim(), content)
      .then(props.onClose)
      .catch((error: unknown) => {
        setFailure(error instanceof Error ? error.message : String(error));
      })
      .finally(() => setBusy(false));
  };

  return (
    <Dialog onClose={props.onClose}>
      <h3>{t("Manual Import")}</h3>
      <p className="secondary-text">
        {t("Paste a key link, server links (vless://, ss://, …), or a sing-box config.")}
      </p>
      <Field label={t("Name")}>
        <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field label={t("Configuration")}>
        <textarea
          className="input"
          rows={8}
          spellCheck={false}
          value={content}
          placeholder="vless://…"
          onChange={(event) => setContent(event.target.value)}
        />
      </Field>
      {failure !== null && <p className="error-text">{failure}</p>}
      <div className="row-actions dialog-actions">
        <Button onClick={props.onClose}>{t("Cancel")}</Button>
        <Button
          variant="primary"
          disabled={busy || content.trim() === ""}
          onClick={submit}
        >
          {t("Import")}
        </Button>
      </div>
    </Dialog>
  );
}
