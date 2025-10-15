<p align="center">
  <a href="https://github.com/kibibit/kb-alert-badge" target="_blank">
    <img src="https://github.com/kibibit.png" width="120" alt="kibibit logo" />
  </a>
  <h2 align="center">@kibibit/kb-alert-badge</h2>
</p>

<p align="center">
  <a href="https://github.com/hacs/integration"><img src="https://img.shields.io/badge/hacs-custom-orange.svg?style=for-the-badge" alt="HACS" /></a>
  <a href="https://github.com/kibibit/kb-alert-badge/releases"><img src="https://img.shields.io/github/v/release/kibibit/kb-alert-badge?style=for-the-badge" alt="Release" /></a>
  <img src="https://img.shields.io/github/downloads/kibibit/kb-alert-badge/total?style=for-the-badge" alt="Downloads" />
  <a href="https://github.com/semantic-release/semantic-release"><img src="https://img.shields.io/badge/📦🚀-semantic--release-e10079.svg?style=for-the-badge" alt="semantic-release" /></a>
  <img src="https://img.shields.io/badge/license-MIT-informational?style=for-the-badge" alt="License: MIT" />
</p>

<p align="center">
  Animated Lovelace badge to draw attention to critical alerts (smoke, water leaks, storms, alarms).
</p>

---

## What is KB Alert Badge?

KB Alert Badge is a custom [Home Assistant](https://www.home-assistant.io/) Dashboard badge that animates to highlight critical or time-sensitive conditions.

- Type: `custom:kb-alert-badge`
- Supported entities: `binary_sensor`, `sensor`, `alarm_control_panel`, `switch`
- Activation: when state indicates an alert (e.g. "on", "alarm", or a problem state)
- Minimum Home Assistant version: 2024.12

### Features
- Visual editor for all main options
- Multiple animations: flashing, police, water, storm, shake, washing-machine
- Color and icon customization
- Animation speed control

## Installation

### HACS
KB Alert Badge can be installed via [HACS](https://hacs.xyz).

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=kibibit&repository=kb-alert-badge)

1. Install HACS if you don't have it already.
2. Open HACS in Home Assistant → Frontend.
3. Search for "KB Alert Badge" (or add as a custom repository if not listed yet).
4. Download/Install.
5. Add a Dashboard resource:
   - URL: `/hacsfiles/kb-alert-badge/kb-alert-badge.js`
   - Type: `module`

### Manual
1. Download `kb-alert-badge.js` from the [latest release](https://github.com/kibibit/kb-alert-badge/releases).
2. Copy it to your `config/www` directory.
3. Add a Dashboard resource:
   - URL: `/local/kb-alert-badge.js`
   - Type: `module`

## Usage

```yaml
type: custom:kb-alert-badge
entity: binary_sensor.smoke_alarm
animation: police # flashing | police | water | storm | shake | washing-machine
color: red
icon: mdi:smoke-detector
speed: 900
```

### Options
- `entity`: Entity to monitor
- `animation`: One of `flashing`, `police`, `water`, `storm`, `shake`, `washing-machine`
- `color`: Any valid CSS color
- `icon`: MDI icon (e.g. `mdi:smoke-detector`) or template
- `speed`: Animation speed in milliseconds

### Editor
A visual editor is provided with controls for entity, animation, color, icon, and speed.

## Troubleshooting
1. Ensure Home Assistant is up to date (some features may require newer versions).
2. Confirm the resource is loaded (check browser devtools console for errors).
3. If you used HACS, verify you have the latest version installed.
4. Clear your cache and force reload:
   - Remove the resource (https://my.home-assistant.io/redirect/lovelace_resources/)
   - Uninstall from HACS
   - Reinstall from HACS

## Credits
- Heavily inspired by the structure and UX of [Mushroom](https://github.com/piitaya/lovelace-mushroom).
- Washing machine animation based on [CodePen by qxuken](https://codepen.io/qxuken/pen/QWOapeW).
- Storm animation based on [CodePen by mephysto](https://codepen.io/mephysto/pen/pdyPVe).
- Police animation based on [CodePen by drew_mc](https://codepen.io/drew_mc/pen/EVXvaJ).

## Contributing
Contributions are welcome! Please open an issue or pull request. This project uses Conventional Commits and `semantic-release`.

## License
MIT © kibibit

---

If you like this project, consider starring the repo and checking out other work from the kibibit organization.
