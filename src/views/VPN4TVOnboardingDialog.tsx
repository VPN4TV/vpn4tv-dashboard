// VPN4TV: the primary way a user gets a subscription — scan the QR (or press
// the button) to open our Telegram bot, and the bot pushes the config back.
// The main process owns the session and the poll; this dialog only renders it.

import { useEffect, useState } from "react";

import { useI18n } from "../app/i18n";
import type { DesktopHost, VPN4TVOnboardingSession } from "../app/desktop";
import { showError } from "../app/errorStore";
import { Button, Dialog, QRCode } from "../components/ui";
import { VPN4TVManualImportDialog } from "./VPN4TVManualImportDialog";

export function VPN4TVOnboardingDialog(props: { host: DesktopHost; onClose: () => void }) {
  const { t } = useI18n();
  const [session, setSession] = useState<VPN4TVOnboardingSession | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [imported, setImported] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [expired, setExpired] = useState(false);
  const [manualImport, setManualImport] = useState(false);

  useEffect(() => {
    let cancelled = false;
    props.host.vpn4tvOnboarding
      .start()
      .then((started) => {
        if (!cancelled) {
          setSession(started);
        }
      })
      .catch(showError);
    const unsubscribe = props.host.vpn4tvOnboarding.onEvent((event) => {
      switch (event.type) {
        case "user":
          setUserName(event.name);
          break;
        case "imported":
          setImported(event.profileName);
          break;
        case "error":
          setFailure(event.message);
          break;
        case "offline":
          setOffline(true);
          break;
        case "expired":
          setExpired(true);
          break;
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
      void props.host.vpn4tvOnboarding.cancel().catch(() => {});
    };
  }, [props.host]);

  // Close shortly after the profile lands, so the user sees the confirmation.
  useEffect(() => {
    if (imported === null) {
      return;
    }
    const timer = setTimeout(props.onClose, 1500);
    return () => clearTimeout(timer);
  }, [imported, props.onClose]);

  const restart = () => {
    setExpired(false);
    setOffline(false);
    setSession(null);
    props.host.vpn4tvOnboarding.restart().then(setSession).catch(showError);
  };

  const open = (link: string) => {
    props.host.vpn4tvOnboarding.openExternal(link).catch(showError);
  };

  return (
    <Dialog onClose={props.onClose}>
      <h3>{t("Add Key")}</h3>
      {imported !== null ? (
        <p className="vpn4tv-onboarding-ok">{t("Added: {name}").replace("{name}", imported)}</p>
      ) : (
        <>
          <p className="secondary-text">
            {t("Scan the QR in Telegram, or send the code to @VPN4TV_Bot.")}
          </p>
          {expired ? (
            <div className="row-actions">
              <Button variant="primary" onClick={restart}>
                {t("Refresh the code")}
              </Button>
            </div>
          ) : (
            session !== null && (
            <div className="vpn4tv-onboarding-body">
              <div className="vpn4tv-onboarding-qr">
                <QRCode value={session.qrLink} />
              </div>
              <div className="vpn4tv-onboarding-side">
                <span className="secondary-text">{t("Your code")}</span>
                <div className="vpn4tv-onboarding-code">{session.codeDisplay}</div>
                <Button variant="primary" onClick={() => open(session.deepLink)}>
                  {t("Open Telegram")}
                </Button>
                <Button onClick={() => open(session.proxyUrl)}>
                  {t("Telegram won't open? Use our proxy")}
                </Button>
              </div>
            </div>
            )
          )}
          {expired && <p className="secondary-text">{t("The code has expired.")}</p>}
          {userName !== null && <p className="vpn4tv-onboarding-user">{userName}</p>}
          {offline && (
            <>
              <p className="secondary-text">
                {t("Can't reach the server? Add the key link manually instead.")}
              </p>
              <div className="row-actions">
                <Button onClick={() => setManualImport(true)}>{t("Manual Import")}</Button>
              </div>
            </>
          )}
          {failure !== null && <p className="error-text">{failure}</p>}
        </>
      )}
      <div className="row-actions dialog-actions">
        <Button onClick={props.onClose}>{t("Close")}</Button>
      </div>
      {manualImport && (
        <VPN4TVManualImportDialog
          host={props.host}
          onClose={() => {
            setManualImport(false);
            props.onClose();
          }}
        />
      )}
    </Dialog>
  );
}
