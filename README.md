# VPN4TV Dashboard

The user interface of [VPN4TV Desktop](https://github.com/VPN4TV/vpn4tv-desktop),
consumed by it as a git submodule. Fork of
[sing-box-dashboard](https://github.com/SagerNet/sing-box-dashboard).

Not a separate product: it is built into the Electron client, and the download
links live in the client's repository.

## What is ours

- `src/views/VPN4TVHomeView.tsx` — the single-screen home that replaces the card
  dashboard: subscription with expiry, one connect button, server picker with
  latency, session traffic
- `src/views/VPN4TVOnboardingDialog.tsx` — adding a subscription through the
  Telegram bot (QR, pairing code, MTProto proxy fallback, code expiry)
- `src/views/VPN4TVManualImportDialog.tsx` — pasting links or a configuration
- `src/views/VPN4TVProfilesDialog.tsx` — renaming, deleting and switching
  subscriptions
- `src/views/VPN4TVPerAppDialog.tsx` — split tunnelling by application
- `src/views/VPN4TVLicensesDialog.tsx` — open-source attribution
- Settings gained LAN bypass, FakeDNS, connect-on-launch, crash reporting and a
  copyable device id; the service setup screen offers the installation by itself

## Development

```bash
pnpm install
pnpm generate      # protobuf, icons, terminal themes
pnpm dev
```

Standalone it runs against a sing-box instance with the Clash API enabled; in
the desktop client it talks to the daemon over gRPC instead.

## License

```
Copyright (C) 2022 by nekohasekai <contact-sagernet@sekai.icu>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.

In addition, no derivative work may use the name or imply association
with this application without prior consent.
```
