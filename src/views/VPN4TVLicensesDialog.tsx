// VPN4TV: attribution for what the client is built from. The core is GPLv3, so
// naming it is a licence obligation, not a courtesy — the Android client shows
// the same list.

import { useI18n } from "../app/i18n";
import { Button, Dialog } from "../components/ui";

interface OssLibrary {
  name: string;
  license: string;
  url: string;
}

const LIBRARIES: OssLibrary[] = [
  { name: "sing-box", license: "GPLv3", url: "github.com/SagerNet/sing-box" },
  { name: "Xray-core", license: "MPLv2", url: "github.com/XTLS/Xray-core" },
  { name: "Outline SDK", license: "Apache 2.0", url: "github.com/Jigsaw-Code/outline-sdk" },
  { name: "AmneziaWG (amneziawg-go)", license: "MIT", url: "github.com/amnezia-vpn/amneziawg-go" },
  { name: "wireproxy", license: "ISC", url: "github.com/pufferffish/wireproxy" },
  { name: "Electron", license: "MIT", url: "github.com/electron/electron" },
  { name: "React", license: "MIT", url: "github.com/facebook/react" },
  { name: "Connect for Node.js", license: "Apache 2.0", url: "github.com/connectrpc/connect-es" },
  { name: "NSIS", license: "zlib/libpng", url: "nsis.sourceforge.io" },
  { name: "Noto Color Emoji", license: "OFL 1.1", url: "github.com/googlefonts/noto-emoji" },
];

export function VPN4TVLicensesDialog(props: { onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Dialog onClose={props.onClose}>
      <h3>{t("Open Source Licenses")}</h3>
      <ul className="vpn4tv-license-list">
        {LIBRARIES.map((library) => (
          <li key={library.name}>
            <span className="vpn4tv-license-name">{library.name}</span>
            <span className="secondary-text">{library.license}</span>
            <code className="secondary-text">{library.url}</code>
          </li>
        ))}
      </ul>
      <div className="row-actions dialog-actions">
        <Button onClick={props.onClose}>{t("Close")}</Button>
      </div>
    </Dialog>
  );
}
