## KB Alert Badge


Animated Lovelace badge to draw attention to critical alerts (smoke, water leaks, alarms).

- Type: `custom:kb-alert-badge`
- Entities: `binary_sensor`, `sensor`, `alarm_control_panel`, `switch`
- Activation: state is "on", "alarm", or "problem"

### Installation (HACS)
1. Add this repository as a custom repository in HACS (Frontend)
2. Install "KB Alert Badge"
3. Add a resource:
   - URL: `/hacsfiles/kb-alert-badge/kb-alert-badge.js`
   - Type: `module`

### Usage
```yaml
type: custom:kb-alert-badge
entity: binary_sensor.smoke_alarm
animation: police # flashing | police | water | storm
color: red
icon: mdi:smoke-detector
speed: 900
```

### Options
- `entity`: Entity to monitor
- `animation`: One of `flashing`, `police`, `water`, `storm`
- `color`: Any CSS color
- `icon`: MDI icon or Jinja2 template
- `speed`: Animation speed in ms

### Editor
Includes visual editor with entity, animation, color, icon and speed controls.

### Storm animation
- Combines angled rain (canvas) and periodic lightning flashes.
- Lightning timing inspired by the provided CodePen sequence.
- Rain is angled to suggest wind. Density auto-scales to badge size.


